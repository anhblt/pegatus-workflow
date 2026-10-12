import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/pegatus.mjs', import.meta.url));
const invoke = (root, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
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

test('CLI resume detects a second edit to an already dirty source file', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-cli-'));
  try {
    const repo = path.join(root, 'repo');
    await mkdir(repo);
    git(repo, 'init', '-b', 'main');
    await writeFile(path.join(repo, 'source.txt'), 'base\n');
    git(repo, 'add', 'source.txt');
    git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'initial');
    await writeFile(path.join(repo, 'source.txt'), 'first edit\n');
    const input = path.join(root, 'input.json');
    await writeFile(input, JSON.stringify({ ...record(), repos: [{ id: 'repo', path: 'repo', branch: 'main', head: git(repo, 'rev-parse', 'HEAD'), dirty: true }] }));
    const checkpoint = invoke(root, 'checkpoint', 'TASK-1', '--file', input, '--expected-revision', '0');
    assert.equal(checkpoint.status, 0, checkpoint.stderr);
    const saved = JSON.parse(checkpoint.stdout);
    assert.match(saved.repos[0].fingerprint, /^[a-f0-9]{64}$/);
    await writeFile(path.join(repo, 'source.txt'), 'second edit\n');
    const resumed = invoke(root, 'resume', 'TASK-1');
    assert.equal(resumed.status, 3, resumed.stderr);
    assert.ok(JSON.parse(resumed.stdout).reconciliation.discrepancies.some(item => item.type === 'contentChanged'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
