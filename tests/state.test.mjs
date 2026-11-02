import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { saveProgress, loadProgress } from '../src/state/store.mjs';
import { transition } from '../src/state/transitions.mjs';

const record = () => ({
  schemaVersion: 1, taskId: 'TASK-1', revision: 0, classification: 'feature',
  phase: 'design', approvedScopeHash: null, approvals: [], tasks: [], repos: [],
  context: {}, verification: {}, nextAction: 'review design',
});

async function fixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-state-'));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('checkpoint increments revision and a repeated checkpoint preserves prior state', async () => fixture(async root => {
  const first = await saveProgress(root, record(), { expectedRevision: 0 });
  assert.equal(first.revision, 1);
  assert.deepEqual(await loadProgress(root, 'TASK-1'), first);
  const second = await saveProgress(root, first, { expectedRevision: 1 });
  assert.equal(second.revision, 2);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
}));

test('concurrent stale writer cannot overwrite a checkpoint', async () => fixture(async root => {
  await saveProgress(root, record(), { expectedRevision: 0 });
  await assert.rejects(saveProgress(root, record(), { expectedRevision: 0 }), /revision/i);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
}));

test('competing checkpoints have exactly one winner and leave a complete record', async () => fixture(async root => {
  const candidates = ['worker A', 'worker B'].map(nextAction => saveProgress(root, { ...record(), nextAction }, { expectedRevision: 0 }));
  const results = await Promise.allSettled(candidates);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  const saved = await loadProgress(root, 'TASK-1');
  assert.equal(saved.revision, 1);
  assert.ok(['worker A', 'worker B'].includes(saved.nextAction));
}));

test('existing lock blocks checkpoint until explicit recovery', async () => fixture(async root => {
  const dir = path.join(root, '.pegatus', 'work', 'TASK-1');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'progress.lock'), JSON.stringify({ pid: 999999, host: 'old', createdAt: '2000-01-01T00:00:00.000Z' }));
  await assert.rejects(saveProgress(root, record(), { expectedRevision: 0 }), /lock/i);
  assert.equal(await readFile(path.join(dir, 'progress.lock'), 'utf8').then(JSON.parse).then(v => v.pid), 999999);
}));

test('an interrupted temporary write does not replace the last checkpoint', async () => fixture(async root => {
  const first = await saveProgress(root, record(), { expectedRevision: 0 });
  const dir = path.join(root, '.pegatus', 'work', 'TASK-1');
  await writeFile(path.join(dir, '.progress-interrupted.tmp'), '{partial');
  assert.deepEqual(await loadProgress(root, 'TASK-1'), first);
}));

test('rename failure preserves the previous progress and releases the lock', async () => fixture(async root => {
  const first = await saveProgress(root, record(), { expectedRevision: 0 });
  await assert.rejects(saveProgress(root, { ...first, nextAction: 'changed' }, {
    expectedRevision: 1, renameFile: async () => { throw new Error('injected rename failure'); },
  }), /injected rename failure/);
  assert.deepEqual(await loadProgress(root, 'TASK-1'), first);
  const retry = await saveProgress(root, { ...first, nextAction: 'retry' }, { expectedRevision: 1 });
  assert.equal(retry.revision, 2);
}));

test('invalid replacement leaves the last valid checkpoint intact', async () => fixture(async root => {
  const first = await saveProgress(root, record(), { expectedRevision: 0 });
  await assert.rejects(saveProgress(root, { ...first, taskId: '../escape' }, { expectedRevision: 1 }), /taskId/i);
  assert.deepEqual(await loadProgress(root, 'TASK-1'), first);
}));

test('checkpoint rejects repository paths that escape the workspace', async () => fixture(async root => {
  const unsafe = { ...record(), repos: [{ id: 'backend', path: '../outside', branch: 'main', head: 'abc', dirty: false }] };
  await assert.rejects(saveProgress(root, unsafe, { expectedRevision: 0 }), /repos.*path/i);
}));

test('checkpoint rejects malformed repository content fingerprints', async () => fixture(async root => {
  const invalid = { ...record(), repos: [{ id: 'backend', path: 'backend', branch: 'main', head: 'abc', dirty: true, fingerprint: 'not-a-hash' }] };
  await assert.rejects(saveProgress(root, invalid, { expectedRevision: 0 }), /fingerprint/i);
}));

test('checkpoint rejects malformed dirty-submodule paths', async () => fixture(async root => {
  const invalid = { ...record(), repos: [{ id: 'backend', path: 'backend', branch: 'main', head: 'abc', dirty: true, dirtySubmodules: ['../outside'] }] };
  await assert.rejects(saveProgress(root, invalid, { expectedRevision: 0 }), /dirtySubmodules/i);
}));

test('corrupt JSON and unknown schema fail explicitly', async () => fixture(async root => {
  const dir = path.join(root, '.pegatus', 'work', 'TASK-1');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'progress.json'), '{bad');
  await assert.rejects(loadProgress(root, 'TASK-1'), /corrupt/i);
  await writeFile(path.join(dir, 'progress.json'), JSON.stringify({ ...record(), schemaVersion: 99 }));
  await assert.rejects(loadProgress(root, 'TASK-1'), /schema/i);
}));

test('scope change invalidates design approval and verification', () => {
  const approved = { ...record(), approvedScopeHash: 'old', approvals: [{ kind: 'design', scopeHash: 'old', evidence: 'user approved design' }], verification: { passed: true } };
  const next = transition(approved, { type: 'scopeChanged', scopeHash: 'new' });
  assert.equal(next.approvedScopeHash, null);
  assert.deepEqual(next.approvals, []);
  assert.deepEqual(next.verification, {});
  assert.equal(approved.approvedScopeHash, 'old');
});

test('approval event requires explicit coordinator authority and user evidence', () => {
  assert.throws(() => transition(record(), { type: 'approvalGranted', kind: 'design', scopeHash: 's1', evidence: 'approved' }), /coordinator/i);
  assert.throws(() => transition(record(), { type: 'approvalGranted', kind: 'design', scopeHash: 's1' }, { trustedCoordinator: true }), /evidence/i);
  const next = transition(record(), { type: 'approvalGranted', kind: 'design', scopeHash: 's1', evidence: 'user approved design in task chat' }, { trustedCoordinator: true });
  assert.equal(next.approvedScopeHash, 's1');
  assert.equal(next.approvals.length, 1);
});

test('ordinary checkpoint cannot manufacture approvals but preserves existing ones', async () => fixture(async root => {
  const first = await saveProgress(root, record(), { expectedRevision: 0 });
  const invented = transition(first, { type: 'approvalGranted', kind: 'design', scopeHash: 's1', evidence: 'user chat' }, { trustedCoordinator: true });
  await assert.rejects(saveProgress(root, invented, { expectedRevision: 1 }), /approval/i);
  const approved = await saveProgress(root, invented, { expectedRevision: 1, approvalEvent: { type: 'approvalGranted', kind: 'design', scopeHash: 's1', evidence: 'user chat' }, trustedCoordinator: true });
  const repeated = await saveProgress(root, approved, { expectedRevision: 2 });
  assert.deepEqual(repeated.approvals, approved.approvals);
}));

test('ordinary checkpoint cannot clear approval for unchanged scope', async () => fixture(async root => {
  const first = await saveProgress(root, record(), { expectedRevision: 0 });
  const event = { type: 'approvalGranted', kind: 'design', scopeHash: 's1', evidence: 'user chat' };
  const authorized = transition(first, event, { trustedCoordinator: true });
  const approved = await saveProgress(root, authorized, { expectedRevision: 1, approvalEvent: event, trustedCoordinator: true });
  await assert.rejects(saveProgress(root, { ...approved, approvedScopeHash: null, approvals: [] }, { expectedRevision: 2 }), /approval/i);
  assert.deepEqual(await loadProgress(root, 'TASK-1'), approved);
  const scopeEvent = { type: 'scopeChanged', scopeHash: 's2' };
  const changed = transition(approved, scopeEvent);
  const saved = await saveProgress(root, changed, { expectedRevision: 2, scopeEvent, trustedCoordinator: true });
  assert.equal(saved.approvedScopeHash, null);
}));
