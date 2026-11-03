import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main } from '../bin/pegatus.mjs';
import { mkdtemp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const cli = fileURLToPath(new URL('../bin/pegatus.mjs', import.meta.url));

test('bare command prints help with command descriptions without a terminal', () => {
  const result = spawnSync(process.execPath, [cli], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: pegatus/);
  assert.match(result.stdout, /setup\s+.*guided/i);
  assert.match(result.stdout, /doctor\s+.*inspect/i);
});

test('CLI starts through an npm-style directory link', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pegatus-cli-link-'));
  try {
    const linked = path.join(root, 'linked checkout');
    await symlink(path.dirname(path.dirname(cli)), linked, process.platform === 'win32' ? 'junction' : 'dir');
    for (const args of [[], ['--help'], ['execute']]) {
      const result = spawnSync(process.execPath, [path.join(linked, 'bin/pegatus.mjs'), ...args], { encoding: 'utf8', timeout: 5000 });
      assert.equal(result.status, args[0] === 'execute' ? 2 : 0, result.stderr);
      assert.match(result.stdout + result.stderr, args[0] === 'execute' ? /Host workflow:/ : /Usage: pegatus/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('help succeeds and unknown operations return usage error', async () => {
  assert.equal(await main(['--help'], { cwd: process.cwd(), home: process.cwd() }), 0);
  assert.equal(await main(['unknown'], { cwd: process.cwd(), home: process.cwd() }), 2);
});

test('host workflow names provide an actionable invocation direction', () => {
  const result = spawnSync(process.execPath, [cli, 'execute'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Host workflow: invoke installed pegatus-execute/i);
});
