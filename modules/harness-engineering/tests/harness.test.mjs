import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { diffContracts } from '../src/contract.mjs';
import { validateTicket } from '../src/ticket.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const ex = (f) => path.join(dir, '..', 'examples', f);
const text = (f) => fs.readFileSync(ex(f), 'utf8');
const json = (f) => JSON.parse(text(f));
const cli = path.join(dir, '..', 'src', 'cli.mjs');
const run = (...a) => spawnSync(process.execPath, [cli, ...a], { encoding: 'utf8' });

test('ready ticket passes with four criteria', () => {
  const r = validateTicket(text('ticket-ready.md'));
  assert.equal(r.ready, true, JSON.stringify(r.findings));
  assert.equal(r.criteria, 4);
  assert.deepEqual(r.findings, []);
});

test('vague ticket fails with specific findings', () => {
  const r = validateTicket(text('ticket-not-ready.md'));
  assert.equal(r.ready, false);
  const rules = r.findings.map((f) => f.rule);
  for (const rule of ['criteria-format', 'placeholder', 'section-recommended']) assert.ok(rules.includes(rule), rule);
});

test('vague wording in checklist criteria is a warning', () => {
  const r = validateTicket('# T\n## Summary\nx\n## Acceptance Criteria\n- [ ] The page loads fast for every user\n## Test Plan\nmanual\n## Out of Scope\n-\n## Risks\n-\n');
  assert.equal(r.ready, true);
  assert.deepEqual(r.findings.map((f) => f.rule), ['criteria-vague']);
});

test('headings inside code fences are ignored', () => {
  const r = validateTicket('# T\n```\n## Summary\n```\n');
  assert.ok(r.findings.some((f) => f.rule === 'section-missing' && /Summary/.test(f.message)));
});

test('compatible contract change has no breaking changes', () => {
  const r = diffContracts(json('openapi-v1.json'), json('openapi-v2-compatible.json'));
  assert.equal(r.breaking, 0, JSON.stringify(r.changes));
  assert.ok(r.changes.some((c) => c.rule === 'operation-added'));
});

test('breaking contract change is detected', () => {
  const rules = diffContracts(json('openapi-v1.json'), json('openapi-v2-breaking.json')).changes.map((c) => c.rule);
  for (const rule of ['path-removed', 'parameter-became-required', 'response-property-removed', 'request-property-required']) {
    assert.ok(rules.includes(rule), `${rule} in ${rules}`);
  }
});

test('non-OpenAPI input is rejected', () => {
  assert.throws(() => diffContracts({}, json('openapi-v1.json')), /not an OpenAPI 3/);
});

test('CLI gates and exit codes', () => {
  assert.equal(run('ticket', ex('ticket-ready.md')).status, 0);
  assert.equal(run('ticket', ex('ticket-not-ready.md')).status, 1);
  assert.equal(run('contract', ex('openapi-v1.json'), ex('openapi-v2-compatible.json')).status, 0);
  const breaking = run('contract', ex('openapi-v1.json'), ex('openapi-v2-breaking.json'), '--json');
  assert.equal(breaking.status, 1);
  assert.ok(JSON.parse(breaking.stdout).breaking >= 4);
  assert.equal(run('contract', ex('openapi-v1.json'), ex('ticket-ready.md')).status, 2);
  assert.equal(run('bogus').status, 2);
});
