import path from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { assertContained } from '../paths.mjs';
import { loadProgress, saveProgress } from '../state/store.mjs';
import { reconcile } from '../state/reconcile.mjs';
import { scanAgentConfig } from '../security/agentshield.mjs';
import { currentRepositories, invalidateVerification } from './operations.mjs';

const MAX_EVENTS = 4096;
const types = new Set(['session-start', 'before-action', 'post-edit', 'pre-compact', 'session-end', 'complete']);
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 256
  && /^[A-Za-z0-9._:-]+$/.test(value);
const result = (status, reason, extra = {}) => ({ status, evidence: [], reasons: reason ? [reason] : [], ...extra });
const eventKey = id => createHash('sha256').update(id).digest('hex');
const boundSession = (record, sessionId) => record.context.lifecycle?.sessionIds?.includes(eventKey(sessionId)) === true;
const conflict = error => /Progress revision conflict|Progress lock exists/.test(error?.message ?? '')
  || (['EPERM', 'EACCES', 'EBUSY'].includes(error?.code) && /rename/.test(error?.message ?? ''));

function recorded(record, id) { return record.context.lifecycle?.eventIds?.includes(eventKey(id)) === true; }

function recordEvent(record, event, security) {
  const context = structuredClone(record.context);
  const lifecycle = context.lifecycle ?? { eventIds: [] };
  if (!Array.isArray(lifecycle.eventIds) || lifecycle.eventIds.some(id => !validId(id))) throw new TypeError('Corrupt lifecycle event journal');
  if (lifecycle.eventIds.length >= MAX_EVENTS) throw new Error('Lifecycle event journal full; archive this task before new lifecycle events');
  lifecycle.eventIds.push(eventKey(event.id));
  if (event.type === 'session-start' && event.sessionId) {
    const sessions = lifecycle.sessionIds ?? [];
    if (!Array.isArray(sessions) || sessions.some(id => !/^[a-f0-9]{64}$/.test(id)) || sessions.length >= 256)
      throw new Error('Lifecycle session binding journal full or corrupt');
    if (!sessions.includes(eventKey(event.sessionId))) sessions.push(eventKey(event.sessionId));
    lifecycle.sessionIds = sessions;
  }
  lifecycle.lastCheckpoint = { type: event.type, eventId: eventKey(event.id), at: new Date().toISOString() };
  if (security) lifecycle.security = { status: security.status, codeState: security.codeState,
    files: [...event.affectedConfigFiles] };
  context.lifecycle = lifecycle;
  return { ...record, context };
}

function completedVerification(verification) {
  if (verification.status !== 'passed' || verification.invalidation) return false;
  const results = verification.results ?? [];
  return Array.isArray(results) && results.every(item => item.valid !== false);
}

/**
 * Idempotent task-bound lifecycle checkpoint. Only metadata and existing task state
 * are persisted. A failed required step does not consume the event ID.
 * Dependencies are injectable for the scanner and optional learning collector.
 */
export async function dispatchEvent(event, deps = {}) {
  if (!event || typeof event !== 'object' || !types.has(event.type) || !validId(event.id)
    || typeof event.root !== 'string' || !path.isAbsolute(event.root)
    || typeof event.taskId !== 'string' || (event.sessionId !== undefined && !validId(event.sessionId)))
    throw new TypeError('Lifecycle event requires type, unique id, absolute root and taskId');
  const root = path.resolve(event.root);
  await assertContained(root, root);
  const load = deps.loadProgress ?? loadProgress;
  const save = deps.saveProgress ?? saveProgress;
  const snapshot = deps.currentRepositories ?? currentRepositories;
  const scan = deps.scanAgentConfig ?? scanAgentConfig;
  for (let attempt = 0; attempt < 16; attempt++) {
    let record;
    try { record = await load(root, event.taskId); }
    catch { return result('failed', 'progress-load-failed'); }
    if (!record) return result('skipped', 'task-record-not-found');
    if (event.sessionId && event.type !== 'session-start' && !boundSession(record, event.sessionId))
      return result('skipped', 'native-session-not-bound-to-task');
    if (recorded(record, event.id) && event.type !== 'session-start') return result('skipped', 'event-already-checkpointed');
    let next = record;
    let reconciliation;
    let security;
    try {
      if (event.type === 'session-start') {
        reconciliation = reconcile(record, await snapshot(root, record));
        if (reconciliation.status !== 'ready') return result('blocked', 'repository-reconciliation-required', { reconciliation });
        if (recorded(record, event.id)) return result('skipped', 'event-already-checkpointed', { reconciliation });
      }
      if (event.type === 'before-action') {
        if (typeof deps.authorizeAction !== 'function') return result('blocked', 'trusted-authorization-unavailable');
        const decision = await deps.authorizeAction({ taskId: record.taskId, eventId: event.id, actionRef: event.actionRef });
        if (decision?.status !== 'passed') return result('blocked', 'action-not-authorized');
      }
      if (event.type === 'post-edit') {
        const current = await snapshot(root, record);
        const byId = new Map(current.map(repo => [repo.id, repo]));
        if (current.length !== record.repos.length || record.repos.some(repo => {
          const now = byId.get(repo.id);
          return !now || now.error || now.branch !== repo.branch || now.head !== repo.head || now.dirtySubmodules?.length;
        })) return result('blocked', 'repository-reconciliation-required');
        next = { ...next, repos: record.repos.map(repo => ({ ...repo, ...byId.get(repo.id) })),
          verification: invalidateVerification(record.verification, eventKey(event.id)) };
      }
      if (event.type === 'complete') {
        if (!Array.isArray(event.affectedConfigFiles) || !event.affectedConfigFiles.length)
          return result('blocked', 'explicit-affected-configuration-required');
        if (!completedVerification(record.verification)) return result('blocked', 'valid-verification-required');
        security = await scan({ root, files: event.affectedConfigFiles });
        if (security?.status !== 'passed') return result(security?.status === 'failed' ? 'failed' : 'blocked', 'configuration-security-gate', { security });
        if (security.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(security.codeState ?? ''))
          return result('failed', 'malformed-configuration-security-result');
        next = { ...next, phase: 'complete' };
      }
      next = recordEvent(next, event, security);
      const saved = await save(root, next, { expectedRevision: record.revision });
      const response = result('passed', null, { revision: saved.revision, ...(reconciliation ? { reconciliation } : {}),
        ...(security ? { security } : {}) });
      if (['pre-compact', 'session-end'].includes(event.type) && typeof deps.collectLearning === 'function') {
        try { await deps.collectLearning({ taskId: record.taskId, eventId: eventKey(event.id), revision: saved.revision }); }
        catch { response.reasons.push('optional-learning-collection-failed'); }
      }
      return response;
    } catch (error) {
      if (conflict(error)) { await delay(Math.min(5 * (attempt + 1), 50)); continue; }
      return result('failed', 'lifecycle-checkpoint-failed');
    }
  }
  return result('failed', 'lifecycle-concurrent-update-limit');
}
