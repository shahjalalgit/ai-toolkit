// Tests for scripts/setup.sh and scripts/lib/toolkit.mjs.
// Every test installs into a fresh temporary directory; nothing touches a
// real project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { relativePathProblem, validateManifest } from '../../scripts/lib/toolkit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETUP = path.join(ROOT, 'scripts', 'setup.sh');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures', 'modules');

const temps = [];
function tmp(prefix = 'ai-toolkit-test-') {
  const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  temps.push(d);
  return d;
}
afterEach(() => {
  while (temps.length) fs.rmSync(temps.pop(), { recursive: true, force: true });
});

function setup(args, { modulesDir = FIXTURES, script = SETUP } = {}) {
  return spawnSync('bash', [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, AI_TOOLKIT_MODULES_DIR: modulesDir },
  });
}
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const state = (target, id) => JSON.parse(read(target, '.ai-toolkit', 'state', `${id}.json`));

describe('discovery', () => {
  test('lists real modules', () => {
    const r = setup(['list', '--json'], { modulesDir: path.join(ROOT, 'modules') });
    assert.equal(r.status, 0, r.stderr);
    const ids = JSON.parse(r.stdout).map((m) => m.id);
    for (const id of ['claude-code-toolkit', 'daily-automation', 'ecommerce-automation', 'harness-engineering', 'seo-automation']) {
      assert.ok(ids.includes(id), id);
    }
    assert.deepEqual(ids, [...ids].sort());
  });

  test('flags invalid modules in the list without failing', () => {
    const r = setup(['--list']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /bad-manifest\s+-\s+INVALID/);
    assert.match(r.stdout, /good-module\s+1\.0\.0\s+stable/);
  });

  test('info shows manifest details', () => {
    const r = setup(['--info', 'good-module']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Good Module \(good-module\)/);
    assert.match(r.stdout, /files -> <target>\/vendor\/good/);
  });

  test('unknown module is rejected', () => {
    const r = setup(['info', 'does-not-exist']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unknown module "does-not-exist"/);
  });

  test('malformed module ids are rejected before touching the filesystem', () => {
    for (const id of ['../good-module', 'Good', 'a/b', '']) {
      const r = setup(['info', id]);
      assert.notEqual(r.status, 0, id);
    }
  });

  test('help and usage errors', () => {
    assert.equal(setup(['--help']).status, 0);
    assert.equal(setup([]).status, 2);
    assert.equal(setup(['frobnicate']).status, 2);
    assert.equal(setup(['list', '--bogus']).status, 2);
    assert.equal(setup(['install', 'good-module', '--target']).status, 2);
  });
});

describe('manifest validation', () => {
  test('valid fixture passes', () => {
    const r = setup(['validate', 'good-module']);
    assert.equal(r.status, 0, r.stdout);
  });

  test('invalid manifest is rejected with every problem listed', () => {
    const r = setup(['validate', 'bad-manifest']);
    assert.equal(r.status, 1);
    for (const re of [/unknown field "postinstall"/, /id must be kebab-case/, /version must be semver/, /type must be one of/, /name must be/, /missing required file README\.md/]) {
      assert.match(r.stdout, re);
    }
  });

  test('installing an invalid module is refused', () => {
    const target = tmp();
    const r = setup(['install', 'bad-manifest', '--target', target]);
    assert.notEqual(r.status, 0);
    assert.deepEqual(fs.readdirSync(target), []);
  });

  test('unsafe install paths are rejected', () => {
    const r = setup(['validate', 'unsafe-target']);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /target must not contain "\.\."/);
    assert.match(r.stdout, /source must not contain "\.\."/);
    assert.match(r.stdout, /target must be relative/);
    const target = tmp();
    assert.notEqual(setup(['install', 'unsafe-target', '--target', target]).status, 0);
    assert.equal(fs.existsSync(path.join(path.dirname(target), 'outside.txt')), false);
  });

  test('validateManifest rejects state-directory and .git targets', () => {
    const base = { schemaVersion: 1, id: 'x', name: 'X', version: '1.0.0', description: 'd', type: 'cli', status: 'stable' };
    const errs = (target) => validateManifest({ ...base, install: { files: [{ source: 'a', target }] } });
    assert.ok(errs('.git/hooks/pre-commit').some((e) => /\.git/.test(e)));
    assert.ok(errs('.ai-toolkit/state/x.json').some((e) => /\.ai-toolkit\/state/.test(e)));
    assert.ok(errs('.ai-toolkit').some((e) => /\.ai-toolkit\/state/.test(e)));
    assert.deepEqual(errs('.ai-toolkit/modules/x'), []);
  });

  test('relativePathProblem', () => {
    assert.equal(relativePathProblem('a/b.txt'), null);
    for (const bad of ['', '/abs', '../x', 'a/../b', 'a//b', './a', 'a\\b', 'C:/x', 'a\0b']) {
      assert.ok(relativePathProblem(bad), bad);
    }
  });

  test('real modules all validate', () => {
    const r = setup(['validate'], { modulesDir: path.join(ROOT, 'modules') });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

describe('install', () => {
  test('installs into a temporary directory and records ownership', () => {
    const target = tmp();
    const r = setup(['install', 'good-module', '--target', target]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(read(target, 'vendor/good/hello.txt'), 'hello v1\n');
    assert.equal(read(target, 'config/hello.txt'), 'hello v1\n');
    const script = path.join(target, 'vendor/good/sub/run.sh');
    assert.ok(fs.statSync(script).mode & 0o100, 'executable bit preserved');
    assert.match(r.stdout, /3 created, 0 updated, 0 unchanged, 0 skipped/);
    const s = state(target, 'good-module');
    assert.equal(s.version, '1.0.0');
    assert.deepEqual(Object.keys(s.files).sort(), ['config/hello.txt', 'vendor/good/hello.txt', 'vendor/good/sub/run.sh']);
  });

  test('--module alias installs too', () => {
    const target = tmp();
    assert.equal(setup(['--module', 'good-module', '--target', target]).status, 0);
    assert.ok(fs.existsSync(path.join(target, 'config/hello.txt')));
  });

  test('repeated installation is idempotent', () => {
    const target = tmp();
    setup(['install', 'good-module', '--target', target]);
    const r = setup(['install', 'good-module', '--target', target]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /0 created, 0 updated, 3 unchanged, 0 skipped/);
  });

  test('existing user files are preserved without --force', () => {
    const target = tmp();
    fs.mkdirSync(path.join(target, 'config'));
    fs.writeFileSync(path.join(target, 'config/hello.txt'), 'mine\n');
    const r = setup(['install', 'good-module', '--target', target]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /skip\s+config\/hello\.txt/);
    assert.equal(read(target, 'config/hello.txt'), 'mine\n');
    assert.equal(state(target, 'good-module').files['config/hello.txt'], undefined, 'unowned file not recorded');
  });

  test('--force overwrites explicitly', () => {
    const target = tmp();
    fs.mkdirSync(path.join(target, 'config'));
    fs.writeFileSync(path.join(target, 'config/hello.txt'), 'mine\n');
    const r = setup(['install', 'good-module', '--target', target, '--force']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /update\s+config\/hello\.txt/);
    assert.equal(read(target, 'config/hello.txt'), 'hello v1\n');
  });

  test('--dry-run writes nothing', () => {
    const target = tmp();
    const r = setup(['install', 'good-module', '--target', target, '--dry-run']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\[dry-run\] Installing good-module@1\.0\.0/);
    assert.match(r.stdout, /\[dry-run\] create/);
    assert.deepEqual(fs.readdirSync(target), []);
  });

  test('invalid targets are rejected', () => {
    const missing = path.join(tmp(), 'nope');
    assert.equal(setup(['install', 'good-module', '--target', missing]).status, 1);
    const file = path.join(tmp(), 'file.txt');
    fs.writeFileSync(file, '');
    assert.match(setup(['install', 'good-module', '--target', file]).stderr, /not a directory/);
    assert.match(setup(['install', 'good-module', '--target', '/']).stderr, /filesystem root/);
    assert.equal(setup(['install', 'good-module']).status, 2);
    assert.match(setup(['install', 'good-module', '--target', FIXTURES]).stderr, /toolkit modules directory/);
  });

  test('refuses to write through a symlink that escapes the target', () => {
    const target = tmp();
    const outside = tmp();
    fs.symlinkSync(outside, path.join(target, 'config'));
    const r = setup(['install', 'good-module', '--target', target]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /escapes the target/);
    assert.deepEqual(fs.readdirSync(outside), []);
  });

  test('refuses to write through a dangling symlink, even with --force', () => {
    const target = tmp();
    const outside = path.join(tmp(), 'victim.txt');
    fs.mkdirSync(path.join(target, 'config'));
    fs.symlinkSync(outside, path.join(target, 'config/hello.txt'));
    for (const extra of [[], ['--force']]) {
      const r = setup(['install', 'good-module', '--target', target, ...extra]);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /symlink/);
    }
    assert.equal(fs.existsSync(outside), false);
  });

  test('--force is rejected for commands that do not overwrite', () => {
    assert.equal(setup(['uninstall', 'good-module', '--target', tmp(), '--force']).status, 2);
  });
});

describe('update and uninstall', () => {
  function copyFixture() {
    const modulesDir = tmp('ai-toolkit-modules-');
    fs.cpSync(path.join(FIXTURES, 'good-module'), path.join(modulesDir, 'good-module'), { recursive: true });
    return modulesDir;
  }

  test('update requires a previous install', () => {
    const r = setup(['update', 'good-module', '--target', tmp()]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not installed/);
  });

  test('update replaces unmodified files and keeps user-modified ones', () => {
    const modulesDir = copyFixture();
    const target = tmp();
    assert.equal(setup(['install', 'good-module', '--target', target], { modulesDir }).status, 0);
    fs.writeFileSync(path.join(target, 'config/hello.txt'), 'locally edited\n');
    fs.writeFileSync(path.join(modulesDir, 'good-module/files/hello.txt'), 'hello v2\n');

    const dry = setup(['update', 'good-module', '--target', target, '--dry-run'], { modulesDir });
    assert.equal(dry.status, 0);
    assert.equal(read(target, 'vendor/good/hello.txt'), 'hello v1\n', 'dry run changed nothing');

    const r = setup(['update', 'good-module', '--target', target], { modulesDir });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(read(target, 'vendor/good/hello.txt'), 'hello v2\n');
    assert.equal(read(target, 'config/hello.txt'), 'locally edited\n');
    assert.match(r.stdout, /1 updated, 1 unchanged, 1 skipped/);
  });

  test('uninstall removes unmodified files, keeps modified ones, and cleans state', () => {
    const target = tmp();
    fs.writeFileSync(path.join(target, 'unrelated.txt'), 'keep me');
    setup(['install', 'good-module', '--target', target]);
    fs.writeFileSync(path.join(target, 'config/hello.txt'), 'locally edited\n');

    const dry = setup(['uninstall', 'good-module', '--target', target, '--dry-run']);
    assert.equal(dry.status, 0);
    assert.ok(fs.existsSync(path.join(target, 'vendor/good/hello.txt')));

    const r = setup(['uninstall', 'good-module', '--target', target]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /keep\s+config\/hello\.txt/);
    assert.equal(fs.existsSync(path.join(target, 'vendor')), false, 'empty dirs removed');
    assert.equal(read(target, 'config/hello.txt'), 'locally edited\n');
    assert.equal(read(target, 'unrelated.txt'), 'keep me');
    assert.equal(fs.existsSync(path.join(target, '.ai-toolkit')), false);
    assert.equal(setup(['uninstall', 'good-module', '--target', target]).status, 1);
  });

  test('status lists installed modules', () => {
    const target = tmp();
    assert.match(setup(['status', '--target', target]).stdout, /No AI Toolkit modules/);
    setup(['install', 'good-module', '--target', target]);
    assert.match(setup(['status', '--target', target]).stdout, /good-module\s+1\.0\.0\s+3 file\(s\)/);
  });

  test('corrupt state is reported, not silently ignored', () => {
    const target = tmp();
    setup(['install', 'good-module', '--target', target]);
    fs.writeFileSync(path.join(target, '.ai-toolkit/state/good-module.json'), '{"files":{"../../etc/passwd":"x"}}');
    const r = setup(['uninstall', 'good-module', '--target', target]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /corrupt/);
  });
});

describe('module tests and scaffolding', () => {
  test('test command runs a module test suite', () => {
    const r = setup(['test', 'good-module']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });

  test('new module from template validates and its tests pass', () => {
    const modulesDir = tmp('ai-toolkit-modules-');
    const script = path.join(ROOT, 'scripts', 'new-module.sh');
    const dry = setup(['demo-tool', '--name', 'Demo "Tool"', '--dry-run'], { modulesDir, script });
    assert.equal(dry.status, 0, dry.stderr);
    assert.deepEqual(fs.readdirSync(modulesDir), []);

    const r = setup(['demo-tool', '--name', 'Demo "Tool"', '--description', 'Says hello.'], { modulesDir, script });
    assert.equal(r.status, 0, r.stderr);
    const manifest = JSON.parse(read(modulesDir, 'demo-tool/module.json'));
    assert.equal(manifest.name, 'Demo "Tool"');
    assert.equal(manifest.id, 'demo-tool');
    assert.ok(!fs.existsSync(path.join(modulesDir, 'demo-tool/TEMPLATE.md')));
    assert.ok(!read(modulesDir, 'demo-tool/README.md').includes('{{'));
    assert.equal(setup(['validate', 'demo-tool'], { modulesDir }).status, 0);
    assert.equal(setup(['test', 'demo-tool'], { modulesDir }).status, 0);
    assert.equal(setup(['new', 'demo-tool', '--name', 'Again'], { modulesDir }).status, 1, 'refuses to overwrite');
    assert.equal(setup(['new', 'Bad_Id', '--name', 'X'], { modulesDir }).status, 2);
  });

  test('wrapper scripts delegate to setup.sh', () => {
    const target = tmp();
    const r = setup(['good-module', '--target', target], { script: path.join(ROOT, 'scripts', 'install-module.sh') });
    assert.equal(r.status, 0, r.stderr);
    const u = setup(['good-module', '--target', target], { script: path.join(ROOT, 'scripts', 'update-module.sh') });
    assert.equal(u.status, 0, u.stderr);
    assert.match(u.stdout, /Updating good-module/);
  });
});
