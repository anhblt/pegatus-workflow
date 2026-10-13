import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dispatchEvent } from '../src/hooks/dispatch.mjs';
import { mapNativeEvent, nativeResponse, activationFor } from '../src/hooks/operations.mjs';
import { loadProgress, saveProgress } from '../src/state/store.mjs';
import { runAdministration } from '../src/install/admin.mjs';

const initial = () => ({
  schemaVersion: 1, taskId: 'TASK-1', revision: 0, classification: 'small', phase: 'implement',
  approvedScopeHash: null, approvals: [], tasks: [], repos: [], context: {},
  verification: { status: 'passed', codeState: 'old', results: [{ checkId: 'unit', valid: true,
    evidence: [{ outputPath: '.pegatus/work/TASK-1/evidence/unit.json', valid: true }] }] },
  nextAction: 'verify',
});
async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-hooks-'));
  try { await saveProgress(root, initial(), { expectedRevision: 0 }); await run(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}
const event = (root, id, type, more = {}) => ({ root, taskId: 'TASK-1', id, type, ...more });
const cli = fileURLToPath(new URL('../bin/pegatus.mjs', import.meta.url));
const native = (root, env, payload) => spawnSync(process.execPath, [cli, 'hook-native', '--host', 'codex'], {
  cwd: root, encoding: 'utf8', input: JSON.stringify(payload), env: { ...process.env, ...env },
});

test('replayed checkpoint survives a fresh dispatch call without duplicate save', async () => fixture(async root => {
  const first = await dispatchEvent(event(root, 'session-1:compact-1', 'pre-compact'));
  const second = await dispatchEvent(event(root, 'session-1:compact-1', 'pre-compact'));
  assert.equal(first.status, 'passed');
  assert.equal(second.status, 'skipped');
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
  assert.doesNotMatch(JSON.stringify(await loadProgress(root, 'TASK-1')), /session-1:compact-1/);
}));

test('concurrent replay records one event under progress CAS', async () => fixture(async root => {
  const results = await Promise.all(Array.from({ length: 5 }, () => dispatchEvent(event(root, 'same-event', 'session-end'))));
  assert.equal(results.filter(item => item.status === 'passed').length, 1);
  assert.equal(results.filter(item => item.status === 'skipped').length, 4, JSON.stringify(results));
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
}));

test('failed checkpoint leaves event retryable', async () => fixture(async root => {
  let attempts = 0;
  const broken = await dispatchEvent(event(root, 'retryable', 'session-end'), {
    saveProgress: async () => { attempts++; throw new Error('synthetic write failure with secret'); },
  });
  assert.equal(broken.status, 'failed');
  assert.equal(attempts, 1);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
  const retried = await dispatchEvent(event(root, 'retryable', 'session-end'));
  assert.equal(retried.status, 'passed');
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
  assert.doesNotMatch(JSON.stringify(broken), /secret/);
}));

test('post edit marks verification and evidence stale while retaining provenance and approvals', async () => fixture(async root => {
  const before = await loadProgress(root, 'TASK-1');
  const result = await dispatchEvent(event(root, 'edit-1', 'post-edit', { changedPaths: ['src/app.mjs'] }));
  const after = await loadProgress(root, 'TASK-1');
  assert.equal(result.status, 'passed');
  assert.equal(after.verification.results[0].valid, false);
  assert.equal(after.verification.results[0].evidence[0].valid, false);
  assert.equal(after.verification.results[0].evidence[0].outputPath, before.verification.results[0].evidence[0].outputPath);
  assert.equal(after.verification.invalidation.reason, 'post-edit');
  assert.deepEqual(after.approvals, before.approvals);
}));

test('before-action cannot pass without trusted authorization', async () => fixture(async root => {
  const denied = await dispatchEvent(event(root, 'action-1', 'before-action'));
  assert.equal(denied.status, 'blocked');
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
  const allowed = await dispatchEvent(event(root, 'action-1', 'before-action'), {
    authorizeAction: async () => ({ status: 'passed' }),
  });
  assert.equal(allowed.status, 'passed');
}));

test('start reports ready reconciliation with the bound task', async () => fixture(async root => {
  const result = await dispatchEvent(event(root, 'start-1', 'session-start'), {
    currentRepositories: async () => [{ id: 'unexpected', branch: 'main', head: 'a', dirty: false }],
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.reconciliation.status, 'ready');
}));

test('start blocks a missing declared repository without consuming its event', async () => fixture(async root => {
  const before = await loadProgress(root, 'TASK-1');
  await saveProgress(root, { ...before, repos: [{ id: 'repo', path: 'missing', branch: 'main', head: 'a', dirty: false }] }, { expectedRevision: 1 });
  const blocked = await dispatchEvent(event(root, 'start-missing', 'session-start'));
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.reconciliation.discrepancies[0].type, 'snapshotFailed');
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
}));

test('completion requires explicit configuration scope and blocks scanner findings without consuming event', async () => fixture(async root => {
  const missing = await dispatchEvent(event(root, 'done-1', 'complete'));
  assert.equal(missing.status, 'blocked');
  const blocked = await dispatchEvent(event(root, 'done-1', 'complete', { affectedConfigFiles: ['CLAUDE.md'] }), {
    scanAgentConfig: async options => {
      assert.deepEqual(options.files, ['CLAUDE.md']);
      return { schemaVersion: 1, status: 'blocked', findings: [{ id: 'critical', severity: 'critical', path: 'CLAUDE.md' }], evidence: [], reasons: ['critical'] };
    },
  });
  assert.equal(blocked.status, 'blocked');
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
  const passed = await dispatchEvent(event(root, 'done-1', 'complete', { affectedConfigFiles: ['CLAUDE.md'] }), {
    scanAgentConfig: async () => ({ schemaVersion: 1, status: 'passed', findings: [], evidence: [], reasons: [], codeState: 'a'.repeat(64) }),
  });
  assert.equal(passed.status, 'passed');
  assert.equal((await loadProgress(root, 'TASK-1')).context.lifecycle.security.codeState, 'a'.repeat(64));
}));

test('malformed successful scanner response cannot complete task', async () => fixture(async root => {
  const result = await dispatchEvent(event(root, 'done-invalid', 'complete', { affectedConfigFiles: ['CLAUDE.md'] }), {
    scanAgentConfig: async () => ({ status: 'passed', codeState: 'not-a-fingerprint' }),
  });
  assert.equal(result.status, 'failed');
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
}));

test('learning collection receives metadata after checkpoint and cannot erase it on failure', async () => fixture(async root => {
  let input;
  const checkpoint = await dispatchEvent(event(root, 'learning-1', 'pre-compact'), {
    collectLearning: async value => { input = value; throw new Error('synthetic secret in collector failure'); },
  });
  assert.equal(checkpoint.status, 'passed');
  assert.deepEqual(input, { taskId: 'TASK-1', eventId: '15dc54460ae8e5c30e0a3b4f2bb7b12e0bfc29d8567f3170041ec56847055e0c', revision: 2 });
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
  assert.doesNotMatch(JSON.stringify(checkpoint), /secret/);
}));

test('native mapping only uses audited events and explicit binding', () => {
  assert.equal(mapNativeEvent('claude', { hook_event_name: 'PostToolUse', tool_name: 'Edit', session_id: 's', tool_use_id: 't' }).status, 'skipped');
  const mapped = mapNativeEvent('claude', { hook_event_name: 'PostToolUse', tool_name: 'Edit', session_id: 's', tool_use_id: 't', tool_response: { password: 'SECRET' } },
    { root: 'C:/workspace', taskId: 'TASK-1' });
  assert.equal(mapped.status, 'passed');
  assert.equal(mapped.event.type, 'post-edit');
  assert.doesNotMatch(JSON.stringify(mapped), /SECRET/);
  assert.equal(mapNativeEvent('antigravity', { hook_event_name: 'PostToolUse' }, { root: 'C:/workspace', taskId: 'TASK-1' }).status, 'skipped');
});

test('native bridge requires task and session binding and replays across processes', async () => fixture(async root => {
  const payload = { session_id: 'session-1', hook_event_name: 'PostToolUse', tool_name: 'apply_patch',
    tool_use_id: 'tool-1', tool_response: { password: 'SECRET' } };
  const unbound = native(root, {}, payload);
  assert.equal(unbound.status, 0, unbound.stderr);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
  const env = { PEGATUS_ROOT: root, PEGATUS_TASK_ID: 'TASK-1' };
  const wrong = native(root, env, payload);
  assert.equal(wrong.status, 0, wrong.stderr);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
  const started = native(root, env, { session_id: 'session-1', hook_event_name: 'SessionStart', source: 'startup' });
  assert.equal(started.status, 0, started.stderr);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
  const other = native(root, env, { ...payload, session_id: 'other-session' });
  assert.equal(other.status, 0, other.stderr);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
  const first = native(root, env, payload);
  const replay = native(root, env, payload);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(replay.status, 0, replay.stderr);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 3);
  assert.doesNotMatch(first.stdout + first.stderr + replay.stdout + replay.stderr, /SECRET/);
  assert.doesNotMatch(JSON.stringify(await loadProgress(root, 'TASK-1')), /session-1/);
}));

test('precompact native bridge needs a per-invocation event ID', async () => fixture(async root => {
  const payload = { session_id: 'session-1', hook_event_name: 'PreCompact', trigger: 'auto' };
  const env = { PEGATUS_ROOT: root, PEGATUS_TASK_ID: 'TASK-1' };
  assert.equal(native(root, env, payload).status, 0);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
  assert.equal(native(root, env, { session_id: 'session-1', hook_event_name: 'SessionStart', source: 'startup' }).status, 0);
  assert.equal(native(root, { ...env, PEGATUS_EVENT_ID: 'compact-1' }, payload).status, 0);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 3);
}));

test('native response respects advisory PostToolUse and blocking PreCompact semantics', () => {
  const blocked = { status: 'blocked', evidence: [], reasons: ['repository-reconciliation-required'] };
  const after = nativeResponse('codex', 'PostToolUse', blocked);
  assert.equal(after.exitCode, 0);
  assert.equal(JSON.parse(after.stdout).systemMessage.includes('checkpoint'), true);
  assert.equal(JSON.parse(after.stdout).hookSpecificOutput.hookEventName, 'PostToolUse');
  const compact = nativeResponse('codex', 'PreCompact', blocked);
  assert.equal(JSON.parse(compact.stdout).continue, false);
  const claude = nativeResponse('claude', 'PreCompact', blocked);
  assert.equal(claude.exitCode, 2);
  assert.equal(nativeResponse('claude', 'SessionEnd', blocked).exitCode, 0);
});

test('activation proposal uses static commands and leaves task binding in environment', () => {
  const activation = activationFor('codex', 'C:/Safe Workspace');
  const serialized = JSON.stringify(activation);
  assert.match(serialized, /hook-native/);
  assert.doesNotMatch(serialized, /TASK-1|PEGATUS_TASK_ID=/);
  assert.throws(() => activationFor('claude', 'C:/Unsafe & command'), /safe/i);
});

test('doctor exposes an opt-in native proposal while reporting hooks as explicit-call', async () => fixture(async root => {
  const doctor = await runAdministration(['doctor', '--host', 'codex', '--scope', 'project', '--root', root], { cwd: root });
  assert.equal(doctor.capabilities.hooks, 'explicit-call');
  assert.equal(doctor.hookActivation.target, '.codex/hooks.json');
  assert.equal(doctor.hookActivation.merge.hooks.PostToolUse[0].matcher, 'apply_patch');
}));
