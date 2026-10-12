import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main } from '../bin/pegatus.mjs';

const cli = fileURLToPath(new URL('../bin/pegatus.mjs', import.meta.url));

test('help succeeds and unknown operations return usage error', async () => {
  assert.equal(await main(['--help'], { cwd: process.cwd(), home: process.cwd() }), 0);
  assert.equal(await main(['unknown'], { cwd: process.cwd(), home: process.cwd() }), 2);
});

test('a future operation fails visibly until implemented', () => {
  const result = spawnSync(process.execPath, [cli, 'catalog', 'lint'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not implemented/i);
});
