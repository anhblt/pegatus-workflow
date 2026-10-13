import path from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { assertContained } from '../paths.mjs';
import { loadProgress, saveProgress } from '../state/store.mjs';
import { reconcile } from '../state/reconcile.mjs';
import { scanAgentConfig } from '../security/agentshield.mjs';
import { currentRepositories, invalidateVerification, repositoryCodeState } from './operations.mjs';

const MAX_EVENTS = 4096;
const types = new Set(['session-start', 'before-action', 'post-edit', 'pre-compact', 'session-end', 'complete']);
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 256
  && /^[A-Za-z0-9._:-]+$/.test(value);
const reference = value => typeof value === 'string' && value.length > 0 && value.length <= 256
  && /^[A-Za-z0-9._:/-]+$/.test(value);
const result = (status, reason, extra = {}) => ({ status, evidence: [], reasons: reason ? [reason] : [], ...extra });
const eventKey = id => createHash('sha256').update(id).digest('hex');
const boundSession = (record, sessionId) => record.context.lifecycle?.sessionIds?.includes(eventKey(sessionId)) === true;
const conflict = error => /Progress revision conflict|Progress lock exists/.test(error?.message ?? '')
  || (['EPERM', 'EACCES', 'EBUSY'].includes(error?.code) && /rename/.test(error?.message ?? ''));

function recorded(record, id) { return record.context.lifecycle?.eventIds?.includes(eventKey(id)) === true; }

function eventIdentity(event, record) {
  const identity = { type: event.type, sessionId: event.sessionId ? eventKey(event.sessionId) : null };
  if (event.type === 'before-action' || event.type === 'complete') identity.scopeHash = record.approvedScopeHash;
  if (event.type === 'before-action') identity.actionRef = event.actionRef ?? null;
  if (event.type === 'complete') identity.affectedConfigFiles = Array.isArray(event.affectedConfigFiles)
    && event.affectedConfigFiles.every(file => typeof file === 'string')
    ? [...new Set(event.affectedConfigFiles)].sort() : null;
  return eventKey(JSON.stringify(identity));
}

function recordEvent(record, event, security, actionReview) {
  const context = structuredClone(record.context);
  const lifecycle = context.lifecycle ?? { eventIds: [] };
  if (!Array.isArray(lifecycle.eventIds) || lifecycle.eventIds.some(id => !validId(id))) throw new TypeError('Corrupt lifecycle event journal');
  if (lifecycle.eventIds.length >= MAX_EVENTS) throw new Error('Lifecycle event journal full; archive this task before new lifecycle events');
  const identities = lifecycle.eventIdentities ?? {};
  if (typeof identities !== 'object' || Array.isArray(identities)
    || Object.entries(identities).some(([id, identity]) => !/^[a-f0-9]{64}$/.test(id) || !/^[a-f0-9]{64}$/.test(identity)))
    throw new TypeError('Corrupt lifecycle event identities');
  lifecycle.eventIds.push(eventKey(event.id));
  identities[eventKey(event.id)] = eventIdentity(event, record);
  lifecycle.eventIdentities = identities;
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
  if (actionReview) lifecycle.lastActionReview = { eventId: eventKey(event.id), actionRef: event.actionRef,
    reviewedBy: actionReview.reviewedBy, reviewedAt: actionReview.reviewedAt, evidenceRef: actionReview.evidenceRef };
  context.lifecycle = lifecycle;
  return { ...record, context };
}

function completedVerification(verification, codeState) {
  if (verification.status !== 'passed' || verification.invalidation || verification.codeState !== codeState) return false;
  const results = verification.results;
  return Array.isArray(results) && results.length > 0 && results.every(item =>
    reference(item.checkId) && item.status === 'passed' && item.valid === true && item.codeState === codeState
    && Array.isArray(item.evidence) && item.evidence.length > 0 && item.evidence.every(evidence =>
      evidence.schemaVersion === 1 && typeof evidence.command === 'string' && evidence.command.length > 0
      && Array.isArray(evidence.args) && typeof evidence.cwd === 'string' && evidence.cwd.length > 0
      && evidence.exitCode === 0 && evidence.status === 'passed' && evidence.valid === true
      && evidence.codeState === codeState));
}

function actionReviewValid(review, record, actionRef) {
  return review?.schemaVersion === 1 && review.kind === 'action' && review.status === 'passed'
    && review.taskId === record.taskId && review.actionRef === actionRef
    && review.scopeHash === record.approvedScopeHash && reference(review.evidenceRef)
    && typeof review.reviewedBy === 'string' && review.reviewedBy.trim().length > 0
    && review.reviewedBy.length <= 128 && !/[\r\n\0]/.test(review.reviewedBy)
    && typeof review.reviewedAt === 'string' && !Number.isNaN(Date.parse(review.reviewedAt))
    && new Date(review.reviewedAt).toISOString() === review.reviewedAt;
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
    if (!record) return result(event.sessionId ? 'skipped' : 'blocked', 'task-record-not-found');
    if (event.sessionId && event.type !== 'session-start' && !boundSession(record, event.sessionId))
      return result('skipped', 'native-session-not-bound-to-task');
    let next = record;
    let reconciliation;
    let security;
    let actionReview;
    try {
      const replay = recorded(record, event.id);
      if (replay) {
        const identity = record.context.lifecycle.eventIdentities?.[eventKey(event.id)];
        if (identity !== undefined && identity !== eventIdentity(event, record))
          return result('blocked', 'event-identity-mismatch');
        if (identity === undefined && ['before-action', 'complete'].includes(event.type))
          return result('blocked', 'recorded-event-identity-required');
        if (!['session-start', 'before-action', 'complete'].includes(event.type))
          return result('skipped', 'event-already-checkpointed');
      }
      if (event.type === 'session-start') {
        reconciliation = reconcile(record, await snapshot(root, record));
        if (reconciliation.status !== 'ready') return result('blocked', 'repository-reconciliation-required', { reconciliation });
        if (replay) return result('skipped', 'event-already-checkpointed', { reconciliation });
      }
      if (event.type === 'before-action') {
        if (!reference(event.actionRef)) return result('blocked', 'explicit-action-reference-required');
        if (typeof deps.authorizeAction !== 'function') return result('blocked', 'trusted-authorization-unavailable');
        actionReview = await deps.authorizeAction({ taskId: record.taskId, eventId: eventKey(event.id),
          actionRef: event.actionRef, scopeHash: record.approvedScopeHash });
        if (!actionReviewValid(actionReview, record, event.actionRef)) return result('blocked', 'action-not-authorized');
      }
      if (event.type === 'post-edit') {
        const blockUncertain = async reason => {
          if (!record.verification.invalidation) {
            await save(root, { ...record, verification: invalidateVerification(record.verification, eventKey(event.id)) },
              { expectedRevision: record.revision });
          }
          return result('blocked', reason);
        };
        let current;
        try { current = await snapshot(root, record); }
        catch { return blockUncertain('repository-state-unavailable'); }
        const byId = new Map(current.map(repo => [repo.id, repo]));
        if (current.length !== record.repos.length || record.repos.some(repo => {
          const now = byId.get(repo.id);
          return !now || now.error || now.branch !== repo.branch || now.head !== repo.head || now.dirtySubmodules?.length;
        })) return blockUncertain('repository-reconciliation-required');
        let currentState;
        try { currentState = repositoryCodeState(current); } catch { return blockUncertain('repository-state-unavailable'); }
        const fresh = current.length > 0 && !record.verification.invalidation
          && record.verification.codeState === currentState;
        next = { ...next, repos: record.repos.map(repo => ({ ...repo, ...byId.get(repo.id) })),
          verification: fresh ? record.verification : invalidateVerification(record.verification, eventKey(event.id)) };
      }
      if (event.type === 'complete') {
        if (!Array.isArray(event.affectedConfigFiles) || !event.affectedConfigFiles.length)
          return result('blocked', 'explicit-affected-configuration-required');
        const current = await snapshot(root, record);
        if (current.length !== record.repos.length || current.some(repo => repo.error || repo.dirtySubmodules?.length))
          return result('blocked', 'repository-state-unavailable');
        let codeState;
        try { codeState = repositoryCodeState(current); } catch { return result('blocked', 'repository-state-unavailable'); }
        if (!completedVerification(record.verification, codeState)) return result('blocked', 'valid-verification-required');
        security = await scan({ root, files: event.affectedConfigFiles });
        if (security?.status !== 'passed') return result(security?.status === 'failed' ? 'failed' : 'blocked', 'configuration-security-gate', { security });
        if (security.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(security.codeState ?? ''))
          return result('failed', 'malformed-configuration-security-result');
        next = { ...next, phase: 'complete' };
      }
      if (replay) return result('skipped', 'event-already-checkpointed', { ...(security ? { security } : {}) });
      next = recordEvent(next, event, security, actionReview);
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
