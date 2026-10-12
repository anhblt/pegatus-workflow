import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcile } from '../src/state/reconcile.mjs';

const record = () => ({
  schemaVersion: 1, taskId: 'TASK-1', revision: 1, classification: 'feature', phase: 'execute',
  approvedScopeHash: 's1', approvals: [{ kind: 'design', scopeHash: 's1', evidence: 'user chat' }],
  tasks: [{ id: 'build', status: 'pending' }],
  repos: [{ id: 'backend', path: 'backend', branch: 'main', head: 'abc', dirty: false }],
  context: {}, verification: { passed: true }, nextAction: 'build',
});

test('matching repository fingerprint allows pending work to resume', () => {
  const result = reconcile(record(), [{ id: 'backend', branch: 'main', head: 'abc', dirty: false }]);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.discrepancies, []);
  assert.ok(result.nextActions.includes('build'));
});

test('changed branch blocks dependent resume without discarding approval', () => {
  const saved = record();
  const result = reconcile(saved, [{ id: 'backend', branch: 'other', head: 'abc', dirty: true }]);
  assert.equal(result.status, 'blocked');
  assert.ok(result.discrepancies.some(item => item.type === 'branchChanged'));
  assert.ok(result.nextActions.some(item => /reconcile/i.test(item)));
  assert.equal(saved.approvedScopeHash, 's1');
});

test('new commit or dirty state invalidates verification evidence', () => {
  const result = reconcile(record(), [{ id: 'backend', branch: 'main', head: 'def', dirty: true }]);
  assert.equal(result.status, 'blocked');
  assert.ok(result.discrepancies.some(item => item.type === 'headChanged'));
  assert.ok(result.discrepancies.some(item => item.type === 'dirtyChanged'));
  assert.ok(result.nextActions.some(item => /verification/i.test(item)));
});

test('missing repository and incomplete task are surfaced', () => {
  const result = reconcile(record(), []);
  assert.equal(result.status, 'blocked');
  assert.ok(result.discrepancies.some(item => item.type === 'missingRepository'));
  assert.ok(result.nextActions.includes('build'));
});
