#!/usr/bin/env node
// Harness Engineering CLI: deterministic gates for an AI-assisted SDLC.
//
// Usage:
//   node src/cli.mjs ticket <ticket.md> [--json]
//   node src/cli.mjs contract <old-openapi.json> <new-openapi.json> [--json]
//
// Exit codes: 0 gate passed, 1 gate failed, 2 usage or input error.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { diffContracts } from './contract.mjs';
import { validateTicket } from './ticket.mjs';

const USAGE = `Usage:
  harness ticket <ticket.md> [--json]
  harness contract <old-openapi.json> <new-openapi.json> [--json]`;

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    throw new Error(`cannot read ${file}: ${e.code ?? e.message}`);
  }
}

export function run(argv) {
  const json = argv.includes('--json');
  const args = argv.filter((a) => a !== '--json');
  if (args[0] === '-h' || args[0] === '--help') {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const out = (s) => process.stdout.write(`${s}\n`);
  try {
    if (args[0] === 'ticket' && args.length === 2) {
      const result = validateTicket(read(args[1]));
      if (json) out(JSON.stringify(result, null, 2));
      else {
        for (const f of result.findings) out(`${f.level === 'error' ? 'ERROR' : 'WARN '} ${f.rule}: ${f.message}`);
        out(result.ready ? `READY: ${result.criteria} acceptance criteria.` : 'NOT READY: fix the errors above before implementation.');
      }
      return result.ready ? 0 : 1;
    }
    if (args[0] === 'contract' && args.length === 3) {
      const parse = (f) => {
        try {
          return JSON.parse(read(f));
        } catch (e) {
          throw new Error(e.message.startsWith('cannot read') ? e.message : `${f} is not valid JSON (YAML is not supported): ${e.message}`);
        }
      };
      const result = diffContracts(parse(args[1]), parse(args[2]));
      if (json) out(JSON.stringify(result, null, 2));
      else {
        for (const c of result.changes) out(`${c.severity === 'breaking' ? 'BREAKING' : 'ok      '} ${c.rule}: ${c.message}`);
        out(result.breaking ? `${result.breaking} breaking change(s).` : 'No breaking changes detected.');
      }
      return result.breaking ? 1 : 0;
    }
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    return 2;
  }
  process.stderr.write(`${USAGE}\n`);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = run(process.argv.slice(2));
}
