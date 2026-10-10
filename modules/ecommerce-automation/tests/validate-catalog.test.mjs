import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isValidGtin, validateCatalog } from '../src/validate-catalog.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const examples = path.join(dir, '..', 'examples');
const load = (f) => JSON.parse(fs.readFileSync(path.join(examples, f), 'utf8'));
const rulesAt = (findings, level) => findings.filter((f) => f.level === level).map((f) => f.rule);

test('GTIN check digits', () => {
  for (const ok of ['4006381333931', '012345678905', '96385074', '10012345678902']) assert.ok(isValidGtin(ok), ok);
  for (const bad of ['4006381333932', '12345', 'abcdefghijklm', '']) assert.ok(!isValidGtin(bad), bad);
});

test('clean sample has no findings', () => {
  assert.deepEqual(validateCatalog(load('products.clean.json'), load('inventory.clean.json')), []);
});

test('faulty sample reports every seeded defect', () => {
  const f = validateCatalog(load('products.sample.json'), load('inventory.sample.json'));
  const errors = rulesAt(f, 'error');
  for (const rule of ['price-precision', 'gtin-invalid', 'sku-duplicate', 'sku-format', 'price-invalid',
    'currency-format', 'availability-invalid', 'parent-missing', 'required-field',
    'inventory-duplicate', 'inventory-unknown-sku', 'inventory-quantity']) {
    assert.ok(errors.includes(rule), `expected error ${rule}`);
  }
  const warnings = rulesAt(f, 'warning');
  for (const rule of ['currency-mismatch', 'url-not-https', 'stock-mismatch', 'inventory-missing']) {
    assert.ok(warnings.includes(rule), `expected warning ${rule}`);
  }
});

test('rejects malformed top-level shapes', () => {
  assert.equal(validateCatalog({})[0].rule, 'catalog-shape');
  assert.equal(validateCatalog({ products: [] }, { nope: 1 })[0].rule, 'inventory-shape');
});

test('CLI exit codes', () => {
  const cli = path.join(dir, '..', 'src', 'validate-catalog.mjs');
  const run = (...a) => spawnSync(process.execPath, [cli, ...a], { encoding: 'utf8' });
  assert.equal(run('--catalog', path.join(examples, 'products.clean.json'), '--inventory', path.join(examples, 'inventory.clean.json')).status, 0);
  const bad = run('--catalog', path.join(examples, 'products.sample.json'), '--json');
  assert.equal(bad.status, 1);
  assert.ok(JSON.parse(bad.stdout).errors > 0);
  assert.equal(run().status, 2);
  assert.equal(run('--catalog', '/nonexistent.json').status, 2);
});
