import { mkdir, open, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { assertContained } from '../paths.mjs';
import { loadProgress, saveProgress } from '../state/store.mjs';
import { reconcile } from '../state/reconcile.mjs';
import { currentRepositories, repositoryCodeState, invalidateVerification } from '../hooks/operations.mjs';
import { resolveTokenControls } from '../telemetry/usage.mjs';
import { resolveConfig } from '../config.mjs';
import { redactEvidence } from '../verify/runner.mjs';
import { buildHandoff } from './handoff.mjs';
import { completed, pending, schedule, validateGraph, validWorkerId, workerLimit } from './graph.mjs';
import { normalizeOwnedPath, ownedPaths, ownsPath, reservedPath } from './ownership.mjs';

const result = (status, reason, extra = {}) => ({ status, evidence: [], reasons: reason ? [reason] : [], ...extra });
const text = value => typeof value === 'string' && value.trim().length > 0 && !/[\r\n\0]/.test(value);
const taskSignature = tasks => createHash('sha256').update(JSON.stringify(tasks.map(task => ({
  id: task.id, paths: ownedPaths(task), dependsOn: task.dependsOn, scope: task.scope, checks: task.checks, role: task.role,
})))).digest('hex');

function recordPath(taskId, workerId, attemptId) {
  if (![taskId, workerId, attemptId].every(validWorkerId)) throw new TypeError('Invalid worker record identity');
  return `.pegatus/work/${taskId}/workers/${workerId}/${attemptId}.json`;
}

function normalizeOutcome(outcome, paths, maxChars) {
  if (!outcome || !['passed', 'failed', 'blocked', 'interrupted'].includes(outcome.status))
    throw new TypeError('Worker outcome requires explicit status');
  const arrays = {};
  for (const key of ['changedPaths', 'evidence', 'openIssues', 'knowledgeCandidates', 'changedInterfaces']) {
    const values = outcome[key] ?? [];
    if (!Array.isArray(values) || values.length > 128 || values.some(value => !text(value)))
      throw new TypeError('Worker output must contain bounded references');
    arrays[key] = [...values];
  }
  if (outcome.status === 'passed' && !arrays.evidence.length) throw new TypeError('Passed worker requires evidence references');
  let status = outcome.status, reason = null;
  for (const candidate of arrays.changedPaths) {
    normalizeOwnedPath(candidate);
    if (reservedPath(candidate) || !paths.some(owner => ownsPath(owner, candidate))) {
      status = 'blocked'; reason = 'ownership-reconciliation-required';
    }
  }
  if (arrays.changedInterfaces.length) { status = 'blocked'; reason = 'interface-reconciliation-required'; }
  const normalized = { status, reason, ...arrays };
  if (JSON.stringify(normalized).length > maxChars) throw new TypeError('Required worker references exceed budget');
  return normalized;
}

/** Isolated, write-once attempt record; cannot update approvals or aggregate
 * progress. The trusted coordinator binds identity and the authorized paths.
 * A partial/corrupt interrupted write is never accepted as completed work. */
export async function saveWorkerRecord({ root, taskId, workerId, attemptId, scopeHash, paths, outcome, tokenControls = {} }) {
  const limits = resolveTokenControls(tokenControls);
  if (!text(scopeHash)) throw new TypeError('Worker record requires approved scope');
  const relative = recordPath(taskId, workerId, attemptId);
  const record = { schemaVersion: 1, taskId, workerId, attemptId, scopeHash,
    ...normalizeOutcome(outcome, paths, limits.maxContextChars) };
  const source = JSON.stringify(record, null, 2) + '\n';
  if (source.length > limits.maxContextChars) throw new TypeError('Worker record exceeds budget');
  const target = path.resolve(root, relative);
  await assertContained(root, target);
  await mkdir(path.dirname(target), { recursive: true });
  await assertContained(root, target);
  const output = await open(target, 'wx');
  try { await output.writeFile(source); await output.sync(); } finally { await output.close(); }
  return record;
}

export async function loadWorkerRecord({ root, taskId, task, scopeHash, tokenControls = {} }) {
  const expected = recordPath(taskId, task.id, task.attemptId);
  if (task.workerRecordPath !== expected) throw new TypeError('Worker record path does not match reservation');
  const target = path.resolve(root, expected);
  await assertContained(root, target);
  let bytes;
  try { bytes = await readFile(target); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const limits = resolveTokenControls(tokenControls);
  if (bytes.length > limits.maxContextChars * 4) throw new TypeError('Worker record exceeds budget');
  const source = bytes.toString('utf8');
  if (source.length > limits.maxContextChars) throw new TypeError('Worker record exceeds budget');
  const record = JSON.parse(source);
  if (record.schemaVersion !== 1 || record.taskId !== taskId || record.workerId !== task.id
    || record.attemptId !== task.attemptId || record.scopeHash !== scopeHash) throw new TypeError('Worker identity or scope mismatch');
  const normalized = normalizeOutcome(record, ownedPaths(task), limits.maxContextChars);
  return { schemaVersion: 1, taskId, workerId: task.id, attemptId: task.attemptId, scopeHash, ...normalized };
}

function mergeWorker(task, worker) {
  return { ...task, status: worker.status === 'passed' ? 'done' : worker.status,
    reason: worker.reason, changedPaths: worker.changedPaths, evidence: worker.evidence,
    openIssues: worker.openIssues, knowledgeCandidates: worker.knowledgeCandidates };
}

function blockDependencies(tasks) {
  const next = structuredClone(tasks);
  let changed;
  do {
    changed = false;
    const byId = new Map(next.map(task => [task.id, task]));
    for (const task of next) {
      if (pending(task) && task.dependsOn.some(id => ['failed', 'blocked', 'interrupted'].includes(byId.get(id).status))) {
        task.status = 'blocked'; task.reason = 'dependency-reconciliation-required'; changed = true;
      }
    }
  } while (changed);
  return next;
}

function validCombined(verification, checks, codeState, root) {
  if (verification?.status !== 'passed' || verification.invalidation || verification.codeState !== codeState
    || !Array.isArray(verification.results)) return false;
  return checks.every(check => verification.results.some(item => item.checkId === (check.id ?? check.command)
    && item.status === 'passed' && item.valid === true && item.codeState === codeState
    && Array.isArray(item.evidence) && item.evidence.length > 0 && item.evidence.every(evidence =>
      evidence.schemaVersion === 1 && evidence.status === 'passed' && evidence.valid === true
      && evidence.codeState === codeState && evidence.exitCode === 0 && evidence.command === check.command
      && JSON.stringify(evidence.args) === JSON.stringify(check.args) && evidence.cwd === path.resolve(root, check.cwd)
      && text(evidence.startedAt) && text(evidence.finishedAt))))
    && verification.results.every(item => item.status === 'passed' && item.valid === true && item.codeState === codeState);
}

// Retain command provenance and log references without copying callback log
// bodies/history into progress. The existing verifier owns retained command logs.
function compactVerification(verification, limits) {
  const keys = ['checkId', 'status', 'valid', 'codeState', 'exitCode', 'reason', 'evidencePath'];
  const safe = { status: verification?.status, codeState: verification?.codeState ?? null,
    reasons: verification?.reasons ?? [], results: (verification?.results ?? []).map(item => ({
      ...Object.fromEntries(keys.filter(key => item[key] !== undefined).map(key => [key, item[key]])),
      evidence: item.evidence ?? [],
    })) };
  const scrubbed = redactEvidence(safe, { maxOutput: limits.maxOutputChars });
  if (JSON.stringify(scrubbed).length > limits.maxContextChars) throw new TypeError('Combined verification references exceed budget');
  return scrubbed;
}

/** Trusted coordinator recovery after confirming the old host worker is stopped.
 * Evidence records that confirmation; this function never kills a worker or
 * changes approval. Retry restores only dependency-blocked descendants, keeps
 * completed tasks and immutable prior attempt records. Existing host permission
 * and scope decisions continue to apply. */
export async function reconcileWorker({ root, taskId, workerId, expectedRevision, stopped = false, retry = false, evidence } = {}) {
  if (!text(evidence)) throw new TypeError('Coordinator reconciliation evidence is required');
  const record = await loadProgress(root, taskId);
  if (!record) throw new TypeError('Task record is required');
  validateGraph(record.tasks);
  const worker = record.tasks.find(task => task.id === workerId);
  if (!worker || completed(worker)) throw new TypeError('Reconciliation requires an unfinished worker');
  if (worker.status === 'running' && stopped !== true) throw new TypeError('Confirm the running worker is stopped before reconciliation');
  const next = structuredClone(record);
  const target = next.tasks.find(task => task.id === workerId);
  target.priorAttempts = [...(target.priorAttempts ?? []), ...(target.workerRecordPath ? [target.workerRecordPath] : [])];
  target.status = retry ? 'pending' : 'interrupted';
  target.reconciliation = { schemaVersion: 1, evidence, stopped, retry };
  delete target.attemptId; delete target.workerRecordPath; delete target.reason;
  if (retry) {
    const affected = new Set([workerId]);
    let changed;
    do {
      changed = false;
      for (const task of next.tasks) if (task.status === 'blocked' && task.reason === 'dependency-reconciliation-required'
        && task.dependsOn.some(id => affected.has(id))) {
        task.status = 'pending'; delete task.reason; affected.add(task.id); changed = true;
      }
    } while (changed);
  }
  next.verification = { ...invalidateVerification(next.verification, 'worker-reconciliation'), status: 'blocked' };
  next.nextAction = retry ? 'Resume approved pending workers' : 'Reconcile interrupted worker before integration';
  return saveProgress(root, next, { expectedRevision });
}

/** Execute only approved saved tasks. No native process/model launcher exists
 * here: the host supplies launchWorker/executeInline and verifyCombined (normally
 * runVerification). Callbacks receive copies and a bound isolated-record writer,
 * never a saveProgress callback. Host permissions still govern actual edits.
 * Interrupted/running attempts are not redispatched; reconcile them explicitly.
 * CAS conflicts stop this invocation, retaining worker records for recovery. */
export async function runOrchestration({ root, taskId, concurrency = 2, capabilities = {}, tokenControls = {}, host,
  models = {}, modelCapabilities } = {}, deps = {}) {
  if (!path.isAbsolute(root ?? '') || !validWorkerId(taskId)) throw new TypeError('Orchestration requires absolute root and taskId');
  const limit = workerLimit({ concurrency, capabilities }), limits = resolveTokenControls(tokenControls);
  const mode = capabilities.delegation === true ? 'delegated' : 'inline';
  const execute = mode === 'delegated' ? deps.launchWorker : deps.executeInline;
  let record;
  const checkpoint = async next => {
    record = await saveProgress(root, next, { expectedRevision: record.revision });
  };
  const snapshot = async () => {
    const current = await currentRepositories(root, record);
    if (!current.length || current.length !== record.repos.length || current.some(repo => repo.error || repo.dirtySubmodules?.length))
      throw new Error('Repository state unavailable');
    return current;
  };
  try {
    record = await loadProgress(root, taskId);
    if (!record) return result('blocked', 'task-record-not-found', { mode });
    validateGraph(record.tasks);
    if (!record.tasks.length) return result('blocked', 'approved-tasks-required', { mode });
    if (record.phase === 'complete') return result('blocked', 'task-already-complete', { mode });
    // Even an all-done resume may change the combined check requirements. The
    // previous pass must stop being usable before any early gate/callback error.
    if (record.verification.status === 'passed') await checkpoint({ ...record,
      verification: { ...invalidateVerification(record.verification, `combined-retry:${randomUUID()}`), status: 'blocked',
        reasons: ['current-combined-verification-required'] }, nextAction: 'Run current combined checks before integration' });
    if (typeof deps.verifyCombined !== 'function' || !Array.isArray(record.context.combinedChecks) || !record.context.combinedChecks.length)
      return result('blocked', 'combined-verification-callback-and-checks-required', { mode });
    resolveConfig({ project: { repositories: [{ id: 'combined', path: '.', verify: record.context.combinedChecks }] } });
    const checkIds = record.context.combinedChecks.map(check => check.id ?? check.command);
    if (checkIds.some(id => !text(id)) || new Set(checkIds).size !== checkIds.length)
      return result('blocked', 'distinct-combined-check-ids-required', { mode });
    if (record.tasks.some(pending) && typeof execute !== 'function') return result('blocked', 'host-worker-callback-required', { mode });
    const signature = taskSignature(record.tasks);
    const previous = record.context.orchestration;
    if (previous && (previous.scopeHash !== record.approvedScopeHash || previous.taskSignature !== signature))
      return result('blocked', 'scope-or-graph-reconciliation-required', { mode });
    const handoffContext = { ...record.context, approvals: record.approvals, approvedScopeHash: record.approvedScopeHash,
      tokenControls: limits, host, models, modelCapabilities };
    for (const task of record.tasks) {
      const brief = buildHandoff(task, handoffContext);
      if (brief.status !== 'passed') return result('blocked', brief.reason, { mode });
      for (const owned of ownedPaths(task)) {
        if (reservedPath(owned)) return result('blocked', 'reserved-worker-ownership', { mode });
        const target = path.resolve(root, owned.replaceAll('\\', '/'));
        const canonical = await assertContained(root, target);
        // Reject aliases instead of parallelizing tasks through symlink names.
        if (path.relative(root, canonical).replaceAll('\\', '/').toLowerCase()
          !== path.relative(root, target).replaceAll('\\', '/').toLowerCase())
          return result('blocked', 'ownership-alias-reconciliation-required', { mode });
      }
    }
    const initial = await snapshot();
    const reconciliation = reconcile(record, initial);
    if (reconciliation.status !== 'ready') return result('blocked', 'repository-reconciliation-required', { mode, reconciliation });
    // A running reservation means another invocation/host may still be active.
    // Only durable terminal worker records can be imported automatically.
    const recovered = [];
    for (const task of record.tasks.filter(task => task.status === 'running')) {
      const worker = await loadWorkerRecord({ root, taskId, task, scopeHash: record.approvedScopeHash, tokenControls: limits });
      if (!worker) return result('blocked', 'running-worker-reconciliation-required', { mode, workerId: task.id });
      recovered.push({ task, worker });
    }
    if (recovered.length) await checkpoint({ ...record, tasks: blockDependencies(record.tasks.map(task => {
      const match = recovered.find(value => value.task.id === task.id);
      return match ? mergeWorker(task, match.worker) : task;
    })) });
    for (;;) {
      const affected = blockDependencies(record.tasks);
      if (JSON.stringify(affected) !== JSON.stringify(record.tasks)) await checkpoint({ ...record, tasks: affected });
      const batch = schedule(record.tasks, { concurrency: limit, capabilities })[0];
      if (!batch) break;
      const reservations = batch.map(task => {
        const attemptId = randomUUID();
        return { ...task, status: 'running', attemptId, workerRecordPath: recordPath(taskId, task.id, attemptId) };
      });
      const briefs = reservations.map(task => buildHandoff(task, { ...handoffContext,
        dependencyRecords: record.tasks.filter(dependency => task.dependsOn.includes(dependency.id)),
        attemptId: task.attemptId, workerRecordPath: task.workerRecordPath }));
      const blockedBrief = briefs.find(brief => brief.status !== 'passed');
      if (blockedBrief) return result('blocked', blockedBrief.reason, { mode });
      await checkpoint({ ...record, tasks: record.tasks.map(task => reservations.find(value => value.id === task.id) ?? task),
        context: { ...record.context, orchestration: { schemaVersion: 1, scopeHash: record.approvedScopeHash, taskSignature: signature, mode, concurrency: limit } },
        verification: { ...invalidateVerification(record.verification, `orchestration:${reservations[0].attemptId}`), status: 'blocked' },
        nextAction: 'Collect isolated worker results and verify combined behavior' });
      const settled = await Promise.allSettled(reservations.map(async (task, index) => {
        const binding = { root, taskId, workerId: task.id, attemptId: task.attemptId,
          scopeHash: record.approvedScopeHash, paths: ownedPaths(task), tokenControls: limits };
        const writeRecord = outcome => saveWorkerRecord({ ...binding, outcome });
        try {
          const returned = await execute(structuredClone(briefs[index]), { writeRecord, recordPath: task.workerRecordPath });
          if (returned !== undefined) await writeRecord(returned);
        } catch {
          // Callback error text is untrusted and may contain credentials.
          const existing = await loadWorkerRecord({ root, taskId, task, scopeHash: binding.scopeHash, tokenControls: limits });
          if (!existing) await writeRecord({ status: 'interrupted' });
        }
        return await loadWorkerRecord({ root, taskId, task, scopeHash: binding.scopeHash, tokenControls: limits })
          ?? await writeRecord({ status: 'interrupted' });
      }));
      const workers = settled.map(item => item.status === 'fulfilled' ? item.value : {
        status: 'blocked', reason: 'worker-record-reconciliation-required', changedPaths: [], evidence: [], openIssues: [], knowledgeCandidates: [],
      });
      const current = await snapshot();
      if (record.repos.some(saved => current.some(now => now.id === saved.id && (now.head !== saved.head || now.branch !== saved.branch))))
        return result('blocked', 'repository-reconciliation-required', { mode });
      const byId = new Map(current.map(repo => [repo.id, repo]));
      await checkpoint({ ...record, tasks: blockDependencies(record.tasks.map(task => {
        const index = reservations.findIndex(value => value.id === task.id);
        return index < 0 ? task : mergeWorker(task, workers[index]);
      })), repos: record.repos.map(repo => ({ ...repo, ...byId.get(repo.id) })) });
    }
    if (!record.tasks.every(completed)) return result('blocked', 'worker-or-dependency-reconciliation-required', { mode, tasks: record.tasks });
    await checkpoint({ ...record, verification: { ...invalidateVerification(record.verification, `combined-attempt:${randomUUID()}`),
      status: 'blocked', reasons: ['current-combined-verification-required'] }, nextAction: 'Run current combined checks before integration' });
    const before = repositoryCodeState(await snapshot());
    const getCodeState = async () => repositoryCodeState(await snapshot());
    let verification;
    try {
      verification = await deps.verifyCombined({ root, taskId, checks: structuredClone(record.context.combinedChecks),
        tasks: structuredClone(record.tasks), getCodeState });
    } catch {
      await checkpoint({ ...record, verification: { ...record.verification, reasons: ['combined-verification-callback-failed'] },
        nextAction: 'Resolve combined verifier callback failure before integration' });
      return result('blocked', 'combined-verification-callback-failed', { mode });
    }
    const after = repositoryCodeState(await snapshot());
    if (before !== after || !validCombined(verification, record.context.combinedChecks, after, root)) {
      if (verification?.status === 'failed' && before === after) {
        const proof = compactVerification(verification, limits);
        await checkpoint({ ...record, verification: proof, nextAction: 'Resolve combined verification failure' });
        return result('failed', 'combined-verification-failed', { mode, verification: proof });
      }
      await checkpoint({ ...record, verification: { status: 'blocked', reasons: ['valid-combined-verification-required'] },
        nextAction: 'Run combined checks with current code-state evidence' });
      return result('blocked', 'valid-combined-verification-required', { mode });
    }
    const proof = compactVerification(verification, limits);
    // Redaction/bounds must not remove anything required by the completion gate.
    if (!validCombined(proof, record.context.combinedChecks, after, root)) return result('blocked', 'valid-combined-verification-required', { mode });
    await checkpoint({ ...record, verification: proof,
      context: { ...record.context, orchestration: { schemaVersion: 1, scopeHash: record.approvedScopeHash, taskSignature: signature, mode, concurrency: limit } },
      nextAction: 'Obtain independent review and completion security gate' });
    return result('passed', null, { mode, revision: record.revision, verification: proof });
  } catch (error) {
    const contention = /Progress revision conflict|Progress lock exists/.test(error.message);
    return result('blocked', contention ? 'coordinator-checkpoint-conflict' : 'orchestration-reconciliation-required', { mode });
  }
}
