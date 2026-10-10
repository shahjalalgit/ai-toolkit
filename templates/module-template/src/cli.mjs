#!/usr/bin/env node
// {{MODULE_NAME}} entry point. Replace this example with the module's logic.
//
// Usage: node src/cli.mjs <input-file> [--json]
// Exit codes: 0 success, 1 the input failed a check, 2 usage or I/O error.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Pure function holding the module's logic, so tests can call it directly. */
export function analyze(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  return { lines: lines.length, ok: lines.length > 0 };
}

export function run(argv) {
  const json = argv.includes('--json');
  const [file, extra] = argv.filter((a) => a !== '--json');
  if (!file || extra) {
    process.stderr.write('Usage: node src/cli.mjs <input-file> [--json]\n');
    return 2;
  }
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    process.stderr.write(`error: cannot read ${file}: ${e.code ?? e.message}\n`);
    return 2;
  }
  const result = analyze(text);
  process.stdout.write(json ? `${JSON.stringify(result)}\n` : `${result.lines} non-empty line(s)\n`);
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = run(process.argv.slice(2));
}
