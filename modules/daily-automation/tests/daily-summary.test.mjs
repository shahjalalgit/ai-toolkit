import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSummary, localDate, validateInput } from '../src/daily-summary.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const moduleDir = path.join(dir, '..');
const tasksFile = path.join(moduleDir, 'examples', 'tasks.json');
const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
const cli = path.join(moduleDir, 'src', 'daily-summary.mjs');

test('summary groups tasks deterministically', () => {
  const md = buildSummary(tasks, '2026-10-10');
  assert.equal(md, buildSummary(tasks, '2026-10-10'));
  assert.match(md, /^# Daily summary - 2026-10-10/);
  assert.match(md, /1 done today, 1 in progress, 1 blocked, 1 overdue\./);
  assert.match(md, /## Done today\n\n- \*\*ENG-101\*\* Fix pagination bug/);
  assert.match(md, /## Blocked\n\n- \*\*ENG-103\*\*.*\n {2}- Waiting for platform team approval\./);
  assert.match(md, /## Overdue\n\n- \*\*ENG-104\*\*/);
  assert.match(md, /## Due today\n\n- \*\*ENG-105\*\*/);
  const next = md.split('## Next up')[1];
  assert.ok(next.indexOf('ENG-105') < next.indexOf('ENG-106'), 'medium (due) before medium (no due)');
  assert.ok(next.indexOf('ENG-106') < next.indexOf('ENG-104'), 'medium before low');
  assert.match(md, /## Notes\n\n- Team sync moved to 15:00\./);
});

test('validation rejects bad input', () => {
  assert.deepEqual(validateInput(tasks), []);
  assert.equal(validateInput({}).length, 1);
  const errors = validateInput({ tasks: [{ title: '', status: 'doing', due: '10/10/2026' }, { id: 'A', title: 'x', status: 'todo' }, { id: 'A', title: 'y', status: 'todo' }] });
  assert.equal(errors.length, 4);
});

test('localDate formats local time', () => {
  assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('CLI refuses to overwrite output without --force', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-'));
  const out = path.join(tmp, 'summary.md');
  const run = (...a) => spawnSync(process.execPath, [cli, ...a], { encoding: 'utf8' });
  assert.equal(run('--input', tasksFile, '--date', '2026-10-10', '--output', out).status, 0);
  fs.writeFileSync(out, 'my notes');
  const again = run('--input', tasksFile, '--date', '2026-10-10', '--output', out);
  assert.equal(again.status, 2);
  assert.equal(fs.readFileSync(out, 'utf8'), 'my notes');
  assert.equal(run('--input', tasksFile, '--date', '2026-10-10', '--output', out, '--force').status, 0);
  assert.match(fs.readFileSync(out, 'utf8'), /# Daily summary/);
  assert.equal(run('--input', tasksFile, '--date', 'yesterday').status, 2);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('scheduler wrapper writes a dated file and validates arguments', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-'));
  const script = path.join(moduleDir, 'scripts', 'run-daily-summary.sh');
  assert.equal(spawnSync('bash', [script], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync('bash', [script, tasksFile, path.join(tmp, 'missing')], { encoding: 'utf8' }).status, 2);
  const r = spawnSync('bash', [script, tasksFile, tmp], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readdirSync(tmp).length, 1);
  fs.rmSync(tmp, { recursive: true, force: true });
});
