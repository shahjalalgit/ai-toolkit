#!/usr/bin/env node
// AI Toolkit CLI core. Invoked through scripts/setup.sh.
//
// Design rules (see ARCHITECTURE.md):
// - Manifests are data, never code. Nothing from a manifest is executed.
// - Every path from a manifest or the command line is validated before use.
// - Existing files are never overwritten silently; ownership is tracked with
//   SHA-256 checksums in <target>/.ai-toolkit/state/<module>.json.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODULES_DIR = path.resolve(process.env.AI_TOOLKIT_MODULES_DIR || path.join(REPO_ROOT, 'modules'));
const MODULE_TEMPLATE_DIR = path.join(REPO_ROOT, 'templates', 'module-template');
const STATE_DIR = path.join('.ai-toolkit', 'state');

export const SCHEMA_VERSION = 1;
export const MODULE_TYPES = ['cli', 'claude-code', 'workflow', 'library'];
export const MODULE_STATUSES = ['stable', 'experimental', 'planned'];
export const PERMISSIONS = ['fs:read', 'fs:write', 'network', 'exec', 'notify'];
export const OPERATING_SYSTEMS = ['macos', 'linux'];
export const RUNTIMES = ['node', 'bash', 'python', 'jq', 'claude-code'];
export const REQUIRED_FILES = ['module.json', 'README.md', 'CHANGELOG.md'];
export const REQUIRED_README_SECTIONS = [
  'Purpose',
  'Status',
  'Prerequisites',
  'Installation',
  'Usage',
  'Inputs and outputs',
  'Permissions and side effects',
  'Testing',
  'Uninstall',
  'Limitations',
  'Troubleshooting',
  'Compatibility',
];

const ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const ENV_RE = /^[A-Z][A-Z0-9_]*$/;
const RANGE_RE = /^[0-9A-Za-z.<>=^~* |-]{1,40}$/;
const ALLOWED_KEYS = [
  'schemaVersion', 'id', 'name', 'version', 'description', 'type', 'status',
  'runtime', 'dependencies', 'entryPoints', 'env', 'permissions', 'install',
  'tests', 'compatibility',
];

class UsageError extends Error {}
class ToolkitError extends Error {}

// ---------------------------------------------------------------- paths

/** Returns an error message if `p` is not a safe, normalized relative path. */
export function relativePathProblem(p) {
  if (typeof p !== 'string' || p.length === 0) return 'must be a non-empty string';
  if (p.length > 255) return 'is too long';
  if (p.includes('\0')) return 'contains a NUL byte';
  if (p.includes('\\')) return 'must use forward slashes';
  if (path.posix.isAbsolute(p) || /^[A-Za-z]:/.test(p)) return 'must be relative';
  const segments = p.replace(/\/$/, '').split('/');
  if (segments.some((s) => s === '..')) return 'must not contain ".."';
  if (segments.some((s) => s === '' || s === '.')) return 'must be normalized (no empty or "." segments)';
  return null;
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// ------------------------------------------------------------- manifests

/** Validates a parsed manifest. Returns a list of error strings. */
export function validateManifest(m, { moduleDir, dirName } = {}) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  if (m === null || typeof m !== 'object' || Array.isArray(m)) return ['manifest must be a JSON object'];

  for (const key of Object.keys(m)) {
    if (!ALLOWED_KEYS.includes(key)) err(`unknown field "${key}" (manifests are data only; see docs/module-manifest.md)`);
  }
  if (m.schemaVersion !== SCHEMA_VERSION) err(`schemaVersion must be ${SCHEMA_VERSION}`);
  if (typeof m.id !== 'string' || !ID_RE.test(m.id) || m.id.length > 64) err('id must be kebab-case (a-z, 0-9, "-"), max 64 chars');
  else if (dirName && m.id !== dirName) err(`id "${m.id}" must match directory name "${dirName}"`);
  if (typeof m.name !== 'string' || m.name.trim() === '' || m.name.length > 80) err('name must be a non-empty string (max 80 chars)');
  if (typeof m.version !== 'string' || !SEMVER_RE.test(m.version)) err('version must be semver (e.g. 0.1.0)');
  if (typeof m.description !== 'string' || m.description.trim() === '' || m.description.length > 300) err('description must be a non-empty string (max 300 chars)');
  if (!MODULE_TYPES.includes(m.type)) err(`type must be one of: ${MODULE_TYPES.join(', ')}`);
  if (!MODULE_STATUSES.includes(m.status)) err(`status must be one of: ${MODULE_STATUSES.join(', ')}`);

  if (m.runtime !== undefined) {
    if (!isPlainObject(m.runtime)) err('runtime must be an object');
    else for (const [k, v] of Object.entries(m.runtime)) {
      if (!RUNTIMES.includes(k)) err(`runtime.${k} is not a known runtime (${RUNTIMES.join(', ')})`);
      if (typeof v !== 'string' || !RANGE_RE.test(v)) err(`runtime.${k} must be a version range string such as ">=22"`);
    }
  }
  if (m.dependencies !== undefined) {
    if (!Array.isArray(m.dependencies) || m.dependencies.some((d) => typeof d !== 'string' || !/^[a-z0-9@/._-]{1,64}$/i.test(d))) {
      err('dependencies must be an array of package/tool names');
    }
  }
  if (m.entryPoints !== undefined) {
    if (!isPlainObject(m.entryPoints)) err('entryPoints must be an object of name -> relative path');
    else for (const [k, v] of Object.entries(m.entryPoints)) {
      if (!ID_RE.test(k)) err(`entryPoints key "${k}" must be kebab-case`);
      checkModulePath(v, `entryPoints.${k}`, moduleDir, err);
    }
  }
  if (m.env !== undefined) {
    if (!Array.isArray(m.env)) err('env must be an array');
    else m.env.forEach((e, i) => {
      if (!isPlainObject(e) || typeof e.name !== 'string' || !ENV_RE.test(e.name)) err(`env[${i}].name must be UPPER_SNAKE_CASE`);
      else if (typeof e.required !== 'boolean' || typeof e.description !== 'string') err(`env[${i}] needs boolean "required" and string "description"`);
    });
  }
  if (m.permissions !== undefined) {
    if (!Array.isArray(m.permissions) || m.permissions.some((p) => !PERMISSIONS.includes(p))) {
      err(`permissions must be an array of: ${PERMISSIONS.join(', ')}`);
    }
  }
  if (m.install !== undefined) {
    if (!isPlainObject(m.install) || Object.keys(m.install).some((k) => k !== 'files') || !Array.isArray(m.install.files)) {
      err('install must be an object with a single "files" array');
    } else m.install.files.forEach((f, i) => {
      if (!isPlainObject(f) || Object.keys(f).some((k) => k !== 'source' && k !== 'target')) {
        err(`install.files[${i}] must be {"source", "target"}`);
        return;
      }
      checkModulePath(f.source, `install.files[${i}].source`, moduleDir, err);
      const problem = relativePathProblem(f.target);
      if (problem) err(`install.files[${i}].target ${problem}`);
      else if (f.target.split('/')[0] === '.git') err(`install.files[${i}].target must not write into .git`);
      else if (isInside(STATE_DIR, f.target) || isInside(f.target, STATE_DIR)) err(`install.files[${i}].target must not touch ${STATE_DIR}`);
    });
  }
  if (m.tests !== undefined) checkModulePath(m.tests, 'tests', moduleDir, err);
  if (m.compatibility !== undefined) {
    if (!isPlainObject(m.compatibility)) err('compatibility must be an object');
    else for (const [k, v] of Object.entries(m.compatibility)) {
      if (k === 'os') {
        if (!Array.isArray(v) || v.length === 0 || v.some((o) => !OPERATING_SYSTEMS.includes(o))) err(`compatibility.os must list: ${OPERATING_SYSTEMS.join(', ')}`);
      } else if (k === 'notes') {
        if (typeof v !== 'string') err('compatibility.notes must be a string');
      } else err(`compatibility.${k} is not supported (use "os" or "notes")`);
    }
  }
  return errors;
}

function checkModulePath(p, label, moduleDir, err) {
  const problem = relativePathProblem(p);
  if (problem) return err(`${label} ${problem}`);
  if (!moduleDir) return;
  const abs = path.join(moduleDir, p);
  let st;
  try {
    st = fs.lstatSync(abs);
  } catch {
    return err(`${label} "${p}" does not exist in the module`);
  }
  if (st.isSymbolicLink()) err(`${label} "${p}" is a symlink (not allowed)`);
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function moduleDirFor(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new UsageError(`invalid module id "${id}" (expected kebab-case, e.g. seo-automation)`);
  const dir = path.join(MODULES_DIR, id);
  if (!fs.existsSync(path.join(dir, 'module.json'))) {
    throw new ToolkitError(`unknown module "${id}". Run "./scripts/setup.sh list" to see available modules.`);
  }
  return dir;
}

function readManifest(dir) {
  const file = path.join(dir, 'module.json');
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { manifest: null, errors: [`module.json is not valid JSON: ${e.message}`] };
  }
  return { manifest, errors: validateManifest(manifest, { moduleDir: dir, dirName: path.basename(dir) }) };
}

function loadModule(id) {
  const dir = moduleDirFor(id);
  const { manifest, errors } = readManifest(dir);
  if (errors.length) {
    throw new ToolkitError(`module "${id}" has an invalid manifest:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
  return { dir, manifest };
}

function listModuleIds() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(MODULES_DIR, d.name, 'module.json')))
    .map((d) => d.name)
    .sort();
}

/** Full module check: manifest, required files and README sections. */
export function checkModule(dir) {
  const problems = [];
  for (const f of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(dir, f))) problems.push(`missing required file ${f}`);
  }
  if (fs.existsSync(path.join(dir, 'module.json'))) problems.push(...readManifest(dir).errors);
  const readme = path.join(dir, 'README.md');
  if (fs.existsSync(readme)) {
    const headings = fs.readFileSync(readme, 'utf8').split('\n')
      .filter((l) => l.startsWith('## '))
      .map((l) => l.slice(3).trim().toLowerCase());
    for (const s of REQUIRED_README_SECTIONS) {
      if (!headings.some((h) => h.startsWith(s.toLowerCase()))) problems.push(`README.md is missing a "## ${s}" section`);
    }
  }
  return problems;
}

// --------------------------------------------------------------- install

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Expands manifest install entries into a flat list of {src, rel}. */
function expandInstallFiles(dir, manifest) {
  const out = [];
  const walk = (srcAbs, rel) => {
    const st = fs.lstatSync(srcAbs);
    if (st.isSymbolicLink()) throw new ToolkitError(`refusing to install symlink ${path.relative(dir, srcAbs)}`);
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(srcAbs).sort()) {
        if (name === '.DS_Store') continue;
        walk(path.join(srcAbs, name), `${rel}/${name}`);
      }
    } else if (st.isFile()) {
      out.push({ src: srcAbs, rel });
    }
  };
  for (const f of manifest.install?.files ?? []) walk(path.join(dir, f.source), f.target.replace(/\/$/, ''));
  const seen = new Set();
  for (const f of out) {
    if (seen.has(f.rel)) throw new ToolkitError(`manifest maps two files to ${f.rel}`);
    seen.add(f.rel);
  }
  return out;
}

function resolveTarget(target) {
  if (!target) throw new UsageError('--target <dir> is required (the project directory to install into)');
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) throw new ToolkitError(`target directory does not exist: ${abs}`);
  const real = fs.realpathSync(abs);
  if (!fs.statSync(real).isDirectory()) throw new ToolkitError(`target is not a directory: ${abs}`);
  if (real === path.parse(real).root) throw new ToolkitError('refusing to install into the filesystem root');
  if (isInside(fs.realpathSync(MODULES_DIR), real)) throw new ToolkitError('refusing to install into the toolkit modules directory');
  return real;
}

/** Ensures the parent directory of `dest` resolves inside `targetReal`. */
function assertDestInside(targetReal, dest) {
  let probe = path.dirname(dest);
  while (!fs.existsSync(probe)) probe = path.dirname(probe);
  const real = fs.realpathSync(probe);
  if (!isInside(targetReal, real)) throw new ToolkitError(`refusing to write ${dest}: path escapes the target via a symlink`);
  let st = null;
  try {
    st = fs.lstatSync(dest);
  } catch {
    // does not exist yet
  }
  // lstat, not exists: a dangling symlink must not be written through.
  if (st?.isSymbolicLink()) throw new ToolkitError(`refusing to write through symlink ${dest}`);
}

function statePath(targetReal, id) {
  return path.join(targetReal, STATE_DIR, `${id}.json`);
}

function readState(targetReal, id) {
  const p = statePath(targetReal, id);
  if (!fs.existsSync(p)) return null;
  try {
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!isPlainObject(s) || !isPlainObject(s.files)) throw new Error('bad shape');
    for (const rel of Object.keys(s.files)) {
      if (relativePathProblem(rel)) throw new Error(`unsafe path ${rel}`);
    }
    return s;
  } catch (e) {
    throw new ToolkitError(`install state ${p} is corrupt (${e.message}). Inspect it and remove it manually to reset.`);
  }
}

function installOrUpdate(id, opts, mode) {
  const { dir, manifest } = loadModule(id);
  const targetReal = resolveTarget(opts.target);
  const state = readState(targetReal, id);
  if (mode === 'update' && !state) throw new ToolkitError(`module "${id}" is not installed in ${targetReal}. Use "install" first.`);

  const files = expandInstallFiles(dir, manifest);
  if (files.length === 0) {
    log(`Module "${id}" declares no installable files. Use it standalone; see modules/${id}/README.md.`);
    return 0;
  }

  const prefix = opts.dryRun ? '[dry-run] ' : '';
  log(`${prefix}${mode === 'update' ? 'Updating' : 'Installing'} ${id}@${manifest.version} into ${targetReal}`);
  const counts = { create: 0, update: 0, unchanged: 0, skip: 0 };
  const newFiles = {};
  for (const { src, rel } of files) {
    const dest = path.join(targetReal, rel);
    assertDestInside(targetReal, dest);
    const desired = sha256(src);
    const recorded = state?.files?.[rel];
    let action;
    if (!fs.existsSync(dest)) action = 'create';
    else if (!fs.statSync(dest).isFile()) throw new ToolkitError(`${rel} exists in the target and is not a regular file`);
    else {
      const current = sha256(dest);
      if (current === desired) action = 'unchanged';
      else if (opts.force) action = 'update';
      else if (recorded && current === recorded) action = 'update';
      else action = 'skip';
    }
    counts[action]++;
    if (action === 'skip') {
      log(`  ${prefix}skip       ${rel}  (exists with different content; use --force to overwrite)`);
      if (recorded) newFiles[rel] = recorded;
      continue;
    }
    log(`  ${prefix}${action.padEnd(10)} ${rel}`);
    newFiles[rel] = desired;
    if (!opts.dryRun && action !== 'unchanged') {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, fs.statSync(src).mode & 0o755);
    }
  }
  const orphaned = Object.keys(state?.files ?? {}).filter((rel) => !(rel in newFiles) && !files.some((f) => f.rel === rel));
  for (const rel of orphaned) log(`  ${prefix}orphaned   ${rel}  (no longer shipped by the module; left in place)`);

  if (!opts.dryRun) {
    const p = statePath(targetReal, id);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const record = { module: id, version: manifest.version, updatedAt: new Date().toISOString(), files: newFiles };
    fs.writeFileSync(p, `${JSON.stringify(record, null, 2)}\n`);
  }
  log(`${prefix}Done: ${counts.create} created, ${counts.update} updated, ${counts.unchanged} unchanged, ${counts.skip} skipped.`);
  if (!opts.dryRun) log(`Install record: ${path.join(STATE_DIR, `${id}.json`)}`);
  return 0;
}

function uninstall(id, opts) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new UsageError(`invalid module id "${id}"`);
  const targetReal = resolveTarget(opts.target);
  const state = readState(targetReal, id);
  if (!state) throw new ToolkitError(`module "${id}" is not installed in ${targetReal} (no install record).`);
  const prefix = opts.dryRun ? '[dry-run] ' : '';
  log(`${prefix}Uninstalling ${id} from ${targetReal}`);
  let kept = 0;
  for (const [rel, hash] of Object.entries(state.files)) {
    const dest = path.join(targetReal, rel);
    assertDestInside(targetReal, dest);
    if (!fs.existsSync(dest)) {
      log(`  ${prefix}absent     ${rel}`);
    } else if (fs.statSync(dest).isFile() && sha256(dest) === hash) {
      log(`  ${prefix}remove     ${rel}`);
      if (!opts.dryRun) {
        fs.unlinkSync(dest);
        removeEmptyParents(targetReal, path.dirname(dest));
      }
    } else {
      kept++;
      log(`  ${prefix}keep       ${rel}  (modified since install; remove manually if unwanted)`);
    }
  }
  if (!opts.dryRun) {
    fs.unlinkSync(statePath(targetReal, id));
    removeEmptyParents(targetReal, path.join(targetReal, STATE_DIR));
  }
  log(`${prefix}Done.${kept ? ` ${kept} modified file(s) kept.` : ''}`);
  return 0;
}

function removeEmptyParents(targetReal, dir) {
  while (dir !== targetReal && isInside(targetReal, dir) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

// -------------------------------------------------------------- commands

function cmdList(opts) {
  const rows = listModuleIds().map((id) => {
    const { manifest, errors } = readManifest(path.join(MODULES_DIR, id));
    return errors.length ? { id, invalid: true } : manifest;
  });
  if (opts.json) {
    log(JSON.stringify(rows.map((m) => (m.invalid ? m : {
      id: m.id, name: m.name, version: m.version, status: m.status, type: m.type, description: m.description,
    })), null, 2));
    return 0;
  }
  if (rows.length === 0) {
    log(`No modules found in ${MODULES_DIR}`);
    return 0;
  }
  log(`${'MODULE'.padEnd(24)} ${'VERSION'.padEnd(9)} ${'STATUS'.padEnd(13)} DESCRIPTION`);
  for (const m of rows) {
    if (m.invalid) log(`${m.id.padEnd(24)} ${'-'.padEnd(9)} ${'INVALID'.padEnd(13)} run: ./scripts/setup.sh validate ${m.id}`);
    else log(`${m.id.padEnd(24)} ${m.version.padEnd(9)} ${m.status.padEnd(13)} ${m.description}`);
  }
  return 0;
}

function cmdInfo(id, opts) {
  const { dir, manifest: m } = loadModule(id);
  if (opts.json) {
    log(JSON.stringify(m, null, 2));
    return 0;
  }
  const kv = (k, v) => log(`${k.padEnd(14)} ${v}`);
  kv('Module', `${m.name} (${m.id})`);
  kv('Version', m.version);
  kv('Status', m.status);
  kv('Type', m.type);
  kv('Description', m.description);
  kv('Runtime', Object.entries(m.runtime ?? {}).map(([k, v]) => `${k} ${v}`).join(', ') || '-');
  kv('Dependencies', (m.dependencies ?? []).join(', ') || '-');
  kv('Permissions', (m.permissions ?? []).join(', ') || '-');
  kv('Env vars', (m.env ?? []).map((e) => `${e.name}${e.required ? ' (required)' : ''}`).join(', ') || '-');
  kv('OS', (m.compatibility?.os ?? []).join(', ') || '-');
  kv('Docs', path.relative(process.cwd(), path.join(dir, 'README.md')));
  log('Entry points:');
  for (const [k, v] of Object.entries(m.entryPoints ?? {})) log(`  ${k.padEnd(12)} ${v}`);
  log('Installs:');
  if (!(m.install?.files?.length)) log('  (nothing; standalone use only)');
  for (const f of m.install?.files ?? []) log(`  ${f.source} -> <target>/${f.target}`);
  return 0;
}

function cmdValidate(id) {
  const ids = id ? [id] : listModuleIds();
  if (id) moduleDirFor(id);
  if (ids.length === 0) throw new ToolkitError(`no modules found in ${MODULES_DIR}`);
  let failed = 0;
  for (const mid of ids) {
    const problems = checkModule(path.join(MODULES_DIR, mid));
    if (problems.length) {
      failed++;
      log(`FAIL ${mid}`);
      for (const p of problems) log(`  - ${p}`);
    } else log(`ok   ${mid}`);
  }
  if (failed) {
    process.stderr.write(`${failed} module(s) failed validation.\n`);
    return 1;
  }
  return 0;
}

function cmdTest(id) {
  const { dir, manifest } = loadModule(id);
  if (!manifest.tests) {
    log(`Module "${id}" declares no tests.`);
    return 0;
  }
  const testDir = path.join(dir, manifest.tests);
  const files = fs.readdirSync(testDir).filter((f) => /\.test\.m?js$/.test(f)).sort().map((f) => path.join(testDir, f));
  if (files.length === 0) throw new ToolkitError(`no *.test.mjs files in ${manifest.tests}`);
  // Fixed command: the manifest only supplies a directory, never a command line.
  const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', cwd: dir });
  return r.status ?? 1;
}

function cmdStatus(opts) {
  const targetReal = resolveTarget(opts.target);
  const dir = path.join(targetReal, STATE_DIR);
  const records = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  if (records.length === 0) {
    log(`No AI Toolkit modules recorded in ${targetReal}`);
    return 0;
  }
  for (const f of records) {
    const s = readState(targetReal, f.replace(/\.json$/, ''));
    log(`${String(s.module).padEnd(24)} ${String(s.version).padEnd(9)} ${Object.keys(s.files).length} file(s)`);
  }
  return 0;
}

function cmdNew(id, opts) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new UsageError(`invalid module id "${id}" (expected kebab-case)`);
  if (!opts.name) throw new UsageError('--name "<Display Name>" is required');
  const dest = path.join(MODULES_DIR, id);
  if (fs.existsSync(dest)) throw new ToolkitError(`modules/${id} already exists; refusing to overwrite`);
  const description = opts.description || `TODO: describe ${opts.name}.`;
  const vars = {
    '{{MODULE_ID}}': id,
    '{{MODULE_NAME}}': opts.name,
    '{{MODULE_DESCRIPTION}}': description,
    '{{DATE}}': new Date().toISOString().slice(0, 10),
  };
  const prefix = opts.dryRun ? '[dry-run] ' : '';
  const walk = (srcDir, rel) => {
    for (const name of fs.readdirSync(srcDir).sort()) {
      const src = path.join(srcDir, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const st = fs.lstatSync(src);
      if (relPath === 'TEMPLATE.md') continue;
      if (st.isDirectory()) walk(src, relPath);
      else if (st.isFile()) {
        log(`  ${prefix}create     modules/${id}/${relPath}`);
        if (opts.dryRun) continue;
        let text = fs.readFileSync(src, 'utf8');
        for (const [k, v] of Object.entries(vars)) text = text.split(k).join(name === 'module.json' ? JSON.stringify(v).slice(1, -1) : v);
        fs.mkdirSync(path.dirname(path.join(dest, relPath)), { recursive: true });
        fs.writeFileSync(path.join(dest, relPath), text, { mode: st.mode & 0o755 });
      }
    }
  };
  log(`${prefix}Creating module ${id} from templates/module-template`);
  walk(MODULE_TEMPLATE_DIR, '');
  log(`${prefix}Next: edit modules/${id}/README.md and module.json, then run ./scripts/setup.sh validate ${id}`);
  return 0;
}

// ------------------------------------------------------------------- cli

const HELP = `AI Toolkit CLI

Usage: ./scripts/setup.sh <command> [args] [options]

Commands:
  list                          List available modules
  info <module>                 Show module details from its manifest
  validate [<module>]           Validate one or all module manifests and docs
  test <module>                 Run a module's test suite
  install <module> --target DIR Copy a module's files into a project
  update <module> --target DIR  Update files previously installed by the toolkit
  uninstall <module> --target DIR
                                Remove installed files that are unmodified
  status --target DIR           Show modules installed in a project
  new <module> --name "Name"    Create a new module from templates/module-template

Options:
  --target DIR       Project directory to operate on (must exist)
  --dry-run          Show what would change without writing anything
  --force            Overwrite existing files that differ (install/update only)
  --json             Machine-readable output (list, info)
  --name, --description  Used by "new"
  -h, --help         Show this help

Aliases: --list = list, --info <m> = info <m>, --module <m> = install <m>

Nothing in a module manifest is ever executed. See docs/installation.md.`;

export function parseArgs(argv) {
  const opts = { positional: [] };
  const aliases = { '--list': 'list', '--info': 'info', '--module': 'install' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`${a} requires a value`);
      return v;
    };
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--target') opts.target = value();
    else if (a === '--name') opts.name = value();
    else if (a === '--description') opts.description = value();
    else if (a in aliases) {
      if (opts.command) throw new UsageError(`${a} cannot be combined with "${opts.command}"`);
      opts.command = aliases[a];
    } else if (a.startsWith('-')) throw new UsageError(`unknown option ${a}`);
    else if (!opts.command) opts.command = a;
    else opts.positional.push(a);
  }
  return opts;
}

// If stdout is closed early (e.g. piped into `head`), keep going silently so an
// install is never left half-done without its state record.
let stdoutClosed = false;
process.stdout.on('error', (e) => {
  if (e.code !== 'EPIPE') throw e;
  stdoutClosed = true;
});

function log(msg) {
  if (!stdoutClosed) process.stdout.write(`${msg}\n`);
}

export function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
    if (opts.help || !opts.command) {
      log(HELP);
      return opts.help ? 0 : 2;
    }
    const [id, extra] = opts.positional;
    if (extra !== undefined) throw new UsageError(`unexpected argument "${extra}"`);
    const needId = () => {
      if (!id) throw new UsageError(`"${opts.command}" requires a module id`);
      return id;
    };
    if (opts.force && !['install', 'update'].includes(opts.command)) throw new UsageError('--force only applies to install and update');
    switch (opts.command) {
      case 'list': return cmdList(opts);
      case 'info': return cmdInfo(needId(), opts);
      case 'validate': return cmdValidate(id);
      case 'test': return cmdTest(needId());
      case 'install': return installOrUpdate(needId(), opts, 'install');
      case 'update': return installOrUpdate(needId(), opts, 'update');
      case 'uninstall': return uninstall(needId(), opts);
      case 'status': return cmdStatus(opts);
      case 'new': return cmdNew(needId(), opts);
      default: throw new UsageError(`unknown command "${opts.command}"`);
    }
  } catch (e) {
    if (e instanceof UsageError) {
      process.stderr.write(`error: ${e.message}\nRun "./scripts/setup.sh --help" for usage.\n`);
      return 2;
    }
    if (e instanceof ToolkitError) {
      process.stderr.write(`error: ${e.message}\n`);
      return 1;
    }
    throw e;
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
