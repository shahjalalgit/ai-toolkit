import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { analyze } from '../src/cli.mjs';

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.mjs');

test('analyze counts non-empty lines', () => {
  assert.deepEqual(analyze('a\n\nb\n'), { lines: 2, ok: true });
  assert.equal(analyze('').ok, false);
});

test('CLI returns 2 on usage errors', () => {
  assert.equal(spawnSync(process.execPath, [cli], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [cli, '/nonexistent'], { encoding: 'utf8' }).status, 2);
});
