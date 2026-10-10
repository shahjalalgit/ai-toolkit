#!/usr/bin/env node
// SEO Automation CLI. Reads local files only; makes no network requests.
//
// Usage:
//   node src/cli.mjs page <file.html> [--url <page-url>] [--json]
//   node src/cli.mjs robots <robots.txt> [--json]
//   node src/cli.mjs sitemap <sitemap.xml> [--base-url <url>] [--json]
//   node src/cli.mjs content <file.html> [--json]
//
// Exit codes: 0 no errors, 1 at least one error-level finding, 2 usage error.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { checkContent, checkPage, checkRobots, checkSitemap } from './checks.mjs';

const USAGE = `Usage:
  seo page <file.html> [--url <page-url>] [--json]
  seo robots <robots.txt> [--json]
  seo sitemap <sitemap.xml> [--base-url <url>] [--json]
  seo content <file.html> [--json]`;

const COMMANDS = {
  page: (text, o) => checkPage(text, { url: o.url }),
  robots: (text) => checkRobots(text),
  sitemap: (text, o) => checkSitemap(text, { baseUrl: o['base-url'] }),
  content: (text) => checkContent(text),
};

function parse(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json' || a === '-h' || a === '--help') o[a.replace(/^-+/, '')] = true;
    else if (a === '--url' || a === '--base-url') {
      if (argv[i + 1] === undefined) throw new Error(`${a} requires a value`);
      o[a.slice(2)] = argv[++i];
    } else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else o._.push(a);
  }
  return o;
}

export function format(findings) {
  if (findings.length === 0) return 'No findings.';
  const icon = { error: 'ERROR', warning: 'WARN ', info: 'INFO ' };
  const lines = findings.map((f) => `${icon[f.level]} [${f.kind}] ${f.rule}: ${f.message}`);
  const n = (l) => findings.filter((f) => f.level === l).length;
  lines.push('', `${n('error')} error(s), ${n('warning')} warning(s), ${n('info')} info.`);
  if (findings.some((f) => f.kind !== 'check')) {
    lines.push('Note: "guideline" and "heuristic" findings are conventions and signals, not search-engine rules.');
  }
  return lines.join('\n');
}

export function run(argv) {
  let o;
  try {
    o = parse(argv);
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n${USAGE}\n`);
    return 2;
  }
  if (o.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const [command, file, extra] = o._;
  if (!COMMANDS[command] || !file || extra) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    process.stderr.write(`error: cannot read ${file}: ${e.code ?? e.message}\n`);
    return 2;
  }
  const findings = COMMANDS[command](text, o);
  process.stdout.write(`${o.json ? JSON.stringify({ command, file, findings }, null, 2) : format(findings)}\n`);
  return findings.some((f) => f.level === 'error') ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = run(process.argv.slice(2));
}
