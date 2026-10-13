import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProgress, saveProgress } from '../src/state/store.mjs';
import { runVerification } from '../src/verify/loop.mjs';
import { currentRepositories } from '../src/hooks/operations.mjs';
import { dispatchEvent } from '../src/hooks/dispatch.mjs';
import { fileURLToPath } from 'node:url';

const modules = {};
for (const name of ['graph', 'handoff', 'coordinator']) {
  try { Object.assign(modules, await import(`../src/orchestration/${name}.mjs`)); }
  catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
}
const call = (name, ...args) => {
  assert.equal(typeof modules[name], 'function', `Missing orchestration feature: ${name}`);
  return modules[name](...args);
};
const task = (id, more = {}) => ({ id, status: 'pending', paths: [`src/${id}.mjs`], dependsOn: [],
  scope: 'Approved source change', checks: ['unit'], ...more });
const context = () => ({ instructionPaths: ['AGENTS.md'], knowledgeRefs: ['.vault/index.md'],
  resolution: { readInstructions: ['AGENTS.md'] },
  approvedScopeHash: 'scope-1', approvals: [{ kind: 'design', scopeHash: 'scope-1', evidence: 'chat:approval-1' }],
  combinedChecks: [{ id: 'combined', command: process.execPath, args: ['-e', 'process.exit(0)'], cwd: '.', requires: [] }] });
const batchIds = batches => batches.map(batch => batch.map(value => value.id));

test('overlapping files and ancestor directories prevent parallel dispatch on Windows and Linux', () => {
  for (const paths of [['src/a.mjs', 'src/a.mjs'], ['src', 'src/a.mjs'], ['SRC\\feature', 'src/feature/a.mjs']]) {
    assert.deepEqual(batchIds(call('schedule', [task('a', { paths: [paths[0]] }), task('b', { paths: [paths[1]] })],
      { concurrency: 2, capabilities: { delegation: true } })), [['a'], ['b']]);
  }
  assert.deepEqual(batchIds(call('schedule', [task('a', { paths: ['src/app'] }), task('b', { paths: ['src/apple/x'] })],
    { capabilities: { delegation: true } })), [['a', 'b']]);
});

test('dependencies run in order, default concurrency is two and explicit host cap is respected', () => {
  const tasks = [task('c', { dependsOn: ['a'] }), task('a'), task('b'), task('d')];
  assert.deepEqual(batchIds(call('schedule', tasks, { capabilities: { delegation: true } })), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(batchIds(call('schedule', tasks, { concurrency: 4, capabilities: { delegation: true, maxWorkers: 1 } })),
    [['a'], ['c'], ['b'], ['d']]);
});

test('unsupported or undeclared delegation uses sequential inline scheduling', () => {
  for (const capabilities of [{}, { delegation: false }]) {
    assert.deepEqual(batchIds(call('schedule', [task('a'), task('b')], { concurrency: 8, capabilities })), [['a'], ['b']]);
  }
});

test('running workers consume configured concurrency including the host cap', () => {
  const tasks = [task('a', { status: 'running' }), task('b'), task('c')];
  assert.deepEqual(batchIds(call('schedule', tasks, { concurrency: 2, capabilities: { delegation: true } })), [['b'], ['c']]);
  assert.deepEqual(batchIds(call('schedule', tasks, { concurrency: 8, capabilities: { delegation: true, maxWorkers: 2 } })), [['b'], ['c']]);
  assert.deepEqual(batchIds(call('schedule', tasks, { concurrency: 1, capabilities: { delegation: true } })), []);
});

test('graph rejects cycles, missing dependencies, duplicates and unsafe ownership before dispatch', () => {
  assert.throws(() => call('schedule', [task('a', { dependsOn: ['b'] }), task('b', { dependsOn: ['a'] })]), /cycle/i);
  assert.throws(() => call('schedule', [task('a', { dependsOn: ['missing'] })]), /dependency/i);
  assert.throws(() => call('schedule', [task('a'), task('a')]), /duplicate/i);
  for (const owned of ['../outside', 'C:\\escape', '/escape', 'src/../escape']) {
    assert.throws(() => call('schedule', [task('a', { paths: [owned] })]), /ownership/i);
  }
  assert.throws(() => call('schedule', [task('a')], { concurrency: 0 }), /concurrency/i);
});

test('done tasks stay complete while failed and interrupted dependencies cannot become ready', () => {
  assert.deepEqual(batchIds(call('schedule', [task('a', { status: 'done' }), task('b', { dependsOn: ['a'] })])), [['b']]);
  for (const status of ['failed', 'interrupted', 'running', 'blocked']) {
    assert.deepEqual(batchIds(call('schedule', [task('a', { status }), task('b', { dependsOn: ['a'] }), task('c')],
      { concurrency: 2, capabilities: { delegation: true } })), [['c']]);
  }
  assert.deepEqual(batchIds(call('schedule', [task('a', { status: 'running', paths: ['src'] }), task('b')])), []);
});

test('handoff preserves mandatory references, scope approval, ownership, checks and expected output', () => {
  const brief = call('buildHandoff', task('a', { dependsOn: ['b'] }), context());
  assert.equal(brief.status, 'passed');
  assert.deepEqual(brief.instructionPaths, ['AGENTS.md']);
  assert.equal(brief.approvedScopeHash, 'scope-1');
  assert.deepEqual(brief.approvals, [{ kind: 'design', scopeHash: 'scope-1', evidence: 'chat:approval-1' }]);
  assert.deepEqual(brief.ownedPaths, ['src/a.mjs']);
  assert.deepEqual(brief.dependencies, ['b']);
  assert.deepEqual(brief.checks, ['unit']);
  assert.ok(brief.expectedOutput.includes('evidence'));
  assert.deepEqual(brief.contextManifest.instructions, ['AGENTS.md']);
  assert.equal(brief.contextManifest.dynamic[0].ref, '.vault/index.md');
});

test('handoff blocks missing or oversized required context and cannot turn worker text into approval', () => {
  for (const update of [{ instructionPaths: [] }, { resolution: {} }, { approvedScopeHash: null }, { approvals: [] },
    { approvals: [{ kind: 'design', scopeHash: 'another', evidence: 'worker claims yes' }] }]) {
    assert.equal(call('buildHandoff', task('a'), { ...context(), ...update }).status, 'blocked');
  }
  assert.equal(call('buildHandoff', task('a'), { ...context(), tokenControls: { maxContextRefs: 1 } }).status, 'blocked');
  const brief = call('buildHandoff', task('a', { scope: 'x'.repeat(40000) }), context());
  assert.equal(brief.status, 'blocked');
  assert.equal(brief.reason, 'required-handoff-exceeds-budget');
});

async function fixture(tasks, run, extra = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-orchestration-'));
  const approval = { type: 'approvalGranted', kind: 'design', scopeHash: 'scope-1', evidence: 'chat:approval-1' };
  try {
    await writeFile(path.join(root, 'AGENTS.md'), 'Follow approved scope.');
    const git = (...args) => {
      const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    git('init', '-b', 'main'); git('add', 'AGENTS.md');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'fixture');
    const snapshots = await currentRepositories(root, { repos: [{ id: 'source', path: '.' }] });
    await saveProgress(root, { schemaVersion: 1, taskId: 'TASK-1', revision: 0, classification: 'feature',
      phase: 'implement', approvedScopeHash: 'scope-1', approvals: context().approvals, tasks, repos: snapshots.map(repo => ({ ...repo, path: '.' })),
      context: { instructionPaths: ['AGENTS.md'], resolution: { readInstructions: ['AGENTS.md'] }, combinedChecks: context().combinedChecks, ...extra }, verification: {}, nextAction: 'execute' },
    { expectedRevision: 0, trustedCoordinator: true, approvalEvent: approval });
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
const outcome = id => ({ status: 'passed', changedPaths: [`src/${id}.mjs`], evidence: [`logs/${id}.json`], openIssues: [], knowledgeCandidates: [] });
const verify = async ({ root, checks, getCodeState }) => runVerification({ checks, getCodeState, repositoryRoot: root });
const run = (root, deps, options = {}) => call('runOrchestration', { root, taskId: 'TASK-1', ...options }, deps);

test('coordinator reserves ownership before worker launch and retains isolated worker evidence', async () => fixture([task('a'), task('b')], async root => {
  let active = 0, maximum = 0;
  const response = await run(root, { launchWorker: async (brief, worker) => {
    const saved = await loadProgress(root, 'TASK-1');
    assert.equal(saved.tasks.find(value => value.id === brief.workerId).status, 'running');
    assert.equal(saved.verification.status, 'blocked');
    maximum = Math.max(maximum, ++active);
    await new Promise(resolve => setTimeout(resolve, 15));
    await worker.writeRecord(outcome(brief.workerId));
    active--;
  }, verifyCombined: verify }, { capabilities: { delegation: true } });
  assert.equal(response.status, 'passed', JSON.stringify(response));
  assert.equal(maximum, 2);
  const saved = await loadProgress(root, 'TASK-1');
  assert.deepEqual(saved.tasks.map(value => value.status), ['done', 'done']);
  assert.equal(saved.approvedScopeHash, 'scope-1');
  assert.equal(saved.verification.results[0].checkId, 'combined');
  for (const item of saved.tasks) {
    const separate = JSON.parse(await readFile(path.join(root, item.workerRecordPath), 'utf8'));
    assert.equal(separate.schemaVersion, 1);
    assert.equal(separate.workerId, item.id);
    assert.deepEqual(separate.changedPaths, [`src/${item.id}.mjs`]);
    assert.equal(separate.approvals, undefined);
  }
}));

test('coordinator inline fallback runs the explicit inline callback and does not guess a launcher', async () => fixture([task('a'), task('b')], async root => {
  const response = await run(root, { launchWorker: async () => { throw new Error('must not launch'); },
    executeInline: async brief => outcome(brief.workerId), verifyCombined: verify });
  assert.equal(response.status, 'passed', JSON.stringify(response));
  assert.equal(response.mode, 'inline');
}));

test('missing worker or combined verifier callback blocks without fabricating success', async () => fixture([task('a')], async root => {
  const missing = await run(root, { verifyCombined: verify });
  assert.equal(missing.status, 'blocked');
  assert.equal((await loadProgress(root, 'TASK-1')).tasks[0].status, 'pending');
  const noVerifier = await run(root, { executeInline: async brief => outcome(brief.workerId) });
  assert.equal(noVerifier.status, 'blocked');
  assert.equal((await loadProgress(root, 'TASK-1')).tasks[0].status, 'pending');
}));

test('worker failure or interruption halts dependents and combined integration, preserves independent done work', async () => {
  for (const status of ['failed', 'interrupted']) await fixture([task('a'), task('b'), task('c', { dependsOn: ['a'] })], async root => {
    const response = await run(root, { launchWorker: async brief => brief.workerId === 'a'
      ? { ...outcome('a'), status } : outcome(brief.workerId), verifyCombined: async () => { throw new Error('must not integrate'); } },
    { capabilities: { delegation: true } });
    assert.equal(response.status, 'blocked');
    const saved = await loadProgress(root, 'TASK-1');
    assert.deepEqual(saved.tasks.map(value => value.status), [status, 'done', 'blocked']);
    const resumed = await run(root, { launchWorker: async () => { throw new Error('no redispatch'); }, verifyCombined: verify },
      { capabilities: { delegation: true } });
    assert.equal(resumed.status, 'blocked');
    assert.equal((await loadProgress(root, 'TASK-1')).tasks[1].status, 'done');
  });
});

test('worker exception becomes interrupted and raw callback secrets cannot enter records', async () => fixture([task('a')], async root => {
  const response = await run(root, { executeInline: async () => { throw new Error('SECRET'); }, verifyCombined: verify });
  assert.equal(response.status, 'blocked');
  const saved = await loadProgress(root, 'TASK-1');
  assert.equal(saved.tasks[0].status, 'interrupted');
  assert.doesNotMatch(JSON.stringify(saved) + JSON.stringify(response), /SECRET/);
}));

test('completed tasks are not redispatched on resume and combined checks actually execute again', async () => fixture([task('a')], async root => {
  assert.equal((await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: verify })).status, 'passed');
  const saved = await loadProgress(root, 'TASK-1');
  saved.context.combinedChecks[0].args = ['-e', 'process.exit(7)'];
  await saveProgress(root, saved, { expectedRevision: saved.revision });
  const resumed = await run(root, { executeInline: async () => { throw new Error('must not redispatch done'); }, verifyCombined: verify });
  assert.equal(resumed.status, 'failed', JSON.stringify(resumed));
  assert.equal((await loadProgress(root, 'TASK-1')).tasks[0].status, 'done');
  assert.equal(resumed.verification.results[0].exitCode, 7);
}));

test('all-done resume invalidates obsolete checks proof before a throwing verifier and completion stays blocked', async () => fixture([task('a')], async root => {
  assert.equal((await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: verify })).status, 'passed');
  const saved = await loadProgress(root, 'TASK-1');
  saved.context.combinedChecks[0].args = ['-e', 'process.exit(7)'];
  await saveProgress(root, saved, { expectedRevision: saved.revision });
  let beforeCallback;
  const resumed = await run(root, { verifyCombined: async () => {
    beforeCallback = await loadProgress(root, 'TASK-1');
    throw new Error('SECRET callback failure');
  } });
  assert.equal(resumed.status, 'blocked');
  assert.equal(beforeCallback.verification.status, 'blocked');
  assert.equal(beforeCallback.verification.results[0].valid, false);
  const after = await loadProgress(root, 'TASK-1');
  assert.equal(after.tasks[0].status, 'done');
  assert.equal(after.verification.status, 'blocked');
  assert.equal(after.verification.results[0].valid, false);
  assert.equal(after.verification.results[0].evidence[0].valid, false);
  assert.doesNotMatch(JSON.stringify(after) + JSON.stringify(resumed), /SECRET/);
  const completion = await dispatchEvent({ root, taskId: 'TASK-1', id: 'completion-after-throw', type: 'complete', affectedConfigFiles: ['AGENTS.md'] });
  assert.equal(completion.status, 'blocked');
  assert.equal(completion.reasons[0], 'valid-verification-required');
}));

test('all-done resumed blocked or malformed verifier cannot restore prior passed proof', async () => {
  for (const response of [{ status: 'blocked' }, { status: 'passed', results: {} }, { status: 'failed', results: {} }]) await fixture([task('a')], async root => {
    assert.equal((await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: verify })).status, 'passed');
    const resumed = await run(root, { verifyCombined: async () => response });
    assert.equal(resumed.status, 'blocked');
    assert.notEqual((await loadProgress(root, 'TASK-1')).verification.status, 'passed');
  });
});

test('bare passed combined status cannot replace current code-state and command evidence', async () => fixture([task('a')], async root => {
  const response = await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: async () => ({ status: 'passed' }) });
  assert.equal(response.status, 'blocked');
  assert.notEqual((await loadProgress(root, 'TASK-1')).verification.status, 'passed');
}));

test('changed paths outside ownership and changed interfaces stop affected tasks for reconciliation', async () => {
  for (const extra of [{ changedPaths: ['src/b.mjs'] }, { changedPaths: ['.pegatus/work/TASK-1/progress.json'] }, { changedInterfaces: ['api:v2'] }]) {
    await fixture([task('a'), task('b', { dependsOn: ['a'] })], async root => {
      const response = await run(root, { executeInline: async () => ({ ...outcome('a'), ...extra }), verifyCombined: verify });
      assert.equal(response.status, 'blocked');
      assert.deepEqual((await loadProgress(root, 'TASK-1')).tasks.map(value => value.status), ['blocked', 'blocked']);
    });
  }
});

test('simultaneous coordinators cannot duplicate dispatch under aggregate CAS', async () => fixture([task('a')], async root => {
  let launches = 0;
  const deps = { executeInline: async brief => { launches++; await new Promise(resolve => setTimeout(resolve, 25)); return outcome(brief.workerId); }, verifyCombined: verify };
  const responses = await Promise.all([run(root, deps), run(root, deps)]);
  assert.equal(launches, 1);
  assert.equal(responses.filter(value => value.status === 'passed').length, 1, JSON.stringify(responses));
  assert.equal(responses.filter(value => value.status === 'blocked').length, 1);
}));

test('running workers require explicit stopped-worker reconciliation before retry, and retain previous records', async () => fixture([task('a')], async root => {
  const saved = await loadProgress(root, 'TASK-1');
  const attemptId = 'prior-attempt';
  saved.tasks[0] = { ...saved.tasks[0], status: 'running', attemptId,
    workerRecordPath: `.pegatus/work/TASK-1/workers/a/${attemptId}.json` };
  const reserved = await saveProgress(root, saved, { expectedRevision: saved.revision });
  const held = await run(root, { executeInline: async () => { throw new Error('no blind redispatch'); }, verifyCombined: verify });
  assert.equal(held.status, 'blocked');
  assert.equal((await loadProgress(root, 'TASK-1')).tasks[0].status, 'running');
  await assert.rejects(() => call('reconcileWorker', { root, taskId: 'TASK-1', workerId: 'a', expectedRevision: reserved.revision,
    retry: true, evidence: 'chat:worker-stopped' }), /stopped/i);
  const reconciled = await call('reconcileWorker', { root, taskId: 'TASK-1', workerId: 'a', expectedRevision: reserved.revision,
    stopped: true, retry: true, evidence: 'chat:worker-stopped' });
  assert.equal(reconciled.tasks[0].status, 'pending');
  assert.equal((await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: verify })).status, 'passed');
}));

test('durable terminal worker record is imported on resume without executing the completed task', async () => fixture([task('a')], async root => {
  const saved = await loadProgress(root, 'TASK-1');
  saved.tasks[0] = { ...saved.tasks[0], status: 'running', attemptId: 'crashed-after-record',
    workerRecordPath: '.pegatus/work/TASK-1/workers/a/crashed-after-record.json' };
  await saveProgress(root, saved, { expectedRevision: saved.revision });
  await call('saveWorkerRecord', { root, taskId: 'TASK-1', workerId: 'a', attemptId: 'crashed-after-record', scopeHash: 'scope-1',
    paths: ['src/a.mjs'], outcome: outcome('a') });
  const response = await run(root, { verifyCombined: verify });
  assert.equal(response.status, 'passed', JSON.stringify(response));
  assert.equal((await loadProgress(root, 'TASK-1')).tasks[0].status, 'done');
}));

test('worker records are write-once and wrong scope cannot be imported as done', async () => fixture([task('a')], async root => {
  const binding = { root, taskId: 'TASK-1', workerId: 'a', attemptId: 'attempt', scopeHash: 'wrong-scope', paths: ['src/a.mjs'], outcome: outcome('a') };
  await call('saveWorkerRecord', binding);
  await assert.rejects(() => call('saveWorkerRecord', binding), /exist/i);
  const saved = await loadProgress(root, 'TASK-1');
  saved.tasks[0] = { ...saved.tasks[0], status: 'running', attemptId: 'attempt', workerRecordPath: '.pegatus/work/TASK-1/workers/a/attempt.json' };
  await saveProgress(root, saved, { expectedRevision: saved.revision });
  assert.equal((await run(root, { verifyCombined: verify })).status, 'blocked');
  assert.equal((await loadProgress(root, 'TASK-1')).tasks[0].status, 'running');
}));

test('approved scope changes invalidate prior orchestration instead of reusing completed outcomes', async () => fixture([task('a')], async root => {
  assert.equal((await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: verify })).status, 'passed');
  const saved = await loadProgress(root, 'TASK-1');
  saved.approvedScopeHash = 'scope-2'; saved.approvals = [{ kind: 'design', scopeHash: 'scope-2', evidence: 'chat:new-scope' }];
  await saveProgress(root, saved, { expectedRevision: saved.revision, trustedCoordinator: true,
    approvalEvent: { type: 'approvalGranted', kind: 'design', scopeHash: 'scope-2', evidence: 'chat:new-scope' } });
  const response = await run(root, { verifyCombined: verify });
  assert.equal(response.status, 'blocked');
  assert.equal(response.reasons[0], 'scope-or-graph-reconciliation-required');
}));

test('combined evidence for a different command working directory cannot authorize integration', async () => fixture([task('a')], async root => {
  const response = await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: async input => {
    const proof = await verify(input);
    proof.results[0].evidence[0].cwd = path.join(root, 'different');
    return proof;
  } });
  assert.equal(response.status, 'blocked');
}));

test('combined verification that changes source cannot pass for the prior code state', async () => fixture([task('a')], async root => {
  const response = await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: async input => {
    const proof = await verify(input);
    await writeFile(path.join(root, 'AGENTS.md'), 'Changed after verifier finished');
    return proof;
  } });
  assert.equal(response.status, 'blocked');
  assert.notEqual((await loadProgress(root, 'TASK-1')).verification.status, 'passed');
}));

test('CLI orchestration plan reports planning only and leaves aggregate progress unchanged', async () => fixture([task('a'), task('b')], async root => {
  const cli = fileURLToPath(new URL('../bin/pegatus.mjs', import.meta.url));
  const response = spawnSync(process.execPath, [cli, 'orchestrate', 'plan', '--root', root, '--task', 'TASK-1'], { encoding: 'utf8' });
  assert.equal(response.status, 0, response.stdout + response.stderr);
  const value = JSON.parse(response.stdout);
  assert.equal(value.status, 'skipped');
  assert.equal(value.planningOnly, true);
  assert.deepEqual(value.batches, [['a'], ['b']]);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 1);
}));

test('CLI run requires explicit injected host execution and verification callbacks', async () => fixture([task('a')], async root => {
  const cli = fileURLToPath(new URL('../bin/pegatus.mjs', import.meta.url));
  const response = spawnSync(process.execPath, [cli, 'orchestrate', 'run', '--root', root, '--task', 'TASK-1'], { encoding: 'utf8' });
  assert.equal(response.status, 3, response.stdout + response.stderr);
  assert.equal(JSON.parse(response.stdout).status, 'blocked');
  assert.equal((await loadProgress(root, 'TASK-1')).tasks[0].status, 'pending');
}));

test('invalid combined checks block before any worker runs', async () => fixture([task('a')], async root => {
  const saved = await loadProgress(root, 'TASK-1');
  saved.context.combinedChecks[0].cwd = '../outside';
  await saveProgress(root, saved, { expectedRevision: saved.revision });
  const response = await run(root, { executeInline: async brief => outcome(brief.workerId), verifyCombined: verify });
  assert.equal(response.status, 'blocked');
  assert.equal((await loadProgress(root, 'TASK-1')).tasks[0].status, 'pending');
}));

test('a corrupt worker record blocks its dependents while preserving a parallel completed worker', async () => fixture([task('a'), task('b'), task('c', { dependsOn: ['a'] })], async root => {
  const response = await run(root, { launchWorker: async (brief, worker) => {
    await worker.writeRecord(outcome(brief.workerId));
    if (brief.workerId === 'a') await writeFile(path.join(root, worker.recordPath), '{corrupt');
  }, verifyCombined: verify }, { capabilities: { delegation: true } });
  assert.equal(response.status, 'blocked');
  assert.deepEqual((await loadProgress(root, 'TASK-1')).tasks.map(value => value.status), ['blocked', 'done', 'blocked']);
}));

test('dependent workers receive completed dependency record and evidence references', async () => fixture([task('a'), task('b', { dependsOn: ['a'] })], async root => {
  let dependent;
  const response = await run(root, { executeInline: async brief => {
    if (brief.workerId === 'b') dependent = brief;
    return outcome(brief.workerId);
  }, verifyCombined: verify });
  assert.equal(response.status, 'passed');
  assert.ok(Array.isArray(dependent.dependencyRecords), 'Dependency evidence references must reach the worker');
  assert.equal(dependent.dependencyRecords[0].workerId, 'a');
  assert.equal(dependent.dependencyRecords[0].status, 'done');
  assert.deepEqual(dependent.dependencyRecords[0].evidence, ['logs/a.json']);
  assert.ok(dependent.contextManifest.dynamic.some(value => value.ref === dependent.dependencyRecords[0].workerRecordPath));
}));
