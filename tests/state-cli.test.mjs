import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/pegatus.mjs', import.meta.url));
const invoke = (root, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
const record = () => ({
  schemaVersion: 1, taskId: 'TASK-1', revision: 0, classification: 'small', phase: 'implement',
  approvedScopeHash: null, approvals: [], tasks: [], repos: [], context: {}, verification: {}, nextAction: 'verify',
});

test('CLI checkpoint, status and resume expose durable revision and next action', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-cli-'));
  try {
    const input = path.join(root, 'input.json');
    await writeFile(input, JSON.stringify(record()));
    const checkpoint = invoke(root, 'checkpoint', 'TASK-1', '--file', input, '--expected-revision', '0');
    assert.equal(checkpoint.status, 0, checkpoint.stderr);
    assert.equal(JSON.parse(checkpoint.stdout).revision, 1);
    const status = invoke(root, 'status', 'TASK-1');
    assert.equal(status.status, 0, status.stderr);
    assert.equal(JSON.parse(status.stdout).reconciliation.status, 'ready');
    const resume = invoke(root, 'resume', 'TASK-1');
    assert.equal(resume.status, 0, resume.stderr);
    assert.ok(JSON.parse(resume.stdout).reconciliation.nextActions.includes('verify'));
    assert.equal(invoke(root, 'checkpoint', 'TASK-1', '--file', input, '--expected-revision', '0').status, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CLI checkpoint refuses approval claims from an input file', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-cli-'));
  try {
    const input = path.join(root, 'input.json');
    await writeFile(input, JSON.stringify({ ...record(), approvedScopeHash: 's1', approvals: [{ kind: 'design', scopeHash: 's1', evidence: 'file says yes' }] }));
    const result = invoke(root, 'checkpoint', 'TASK-1', '--file', input, '--expected-revision', '0');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /approval/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});
