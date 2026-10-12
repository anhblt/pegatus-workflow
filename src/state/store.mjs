import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertContained } from '../paths.mjs';
import { transition } from './transitions.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');
const relativeRepoPath = value => nonempty(value) && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value)
  && !/^[A-Za-z]:/.test(value) && !value.split(/[\\/]/).includes('..');

export function validateProgress(record) {
  if (!object(record)) throw new TypeError('Progress must be an object');
  if (record.schemaVersion !== 1) throw new TypeError('Unsupported progress schemaVersion');
  if (!validTaskId(record.taskId)) throw new TypeError('Invalid taskId');
  if (!Number.isSafeInteger(record.revision) || record.revision < 0) throw new TypeError('Invalid revision');
  if (!['small', 'feature', 'investigation'].includes(record.classification)) throw new TypeError('Invalid classification');
  if (!nonempty(record.phase)) throw new TypeError('Invalid phase');
  if (record.approvedScopeHash !== null && !nonempty(record.approvedScopeHash)) throw new TypeError('Invalid approvedScopeHash');
  if (!Array.isArray(record.approvals) || record.approvals.some(a => !object(a) || !nonempty(a.kind) || !nonempty(a.scopeHash) || !nonempty(a.evidence))) throw new TypeError('Invalid approvals');
  if (record.approvedScopeHash !== null && !record.approvals.some(a => a.kind === 'design' && a.scopeHash === record.approvedScopeHash)) throw new TypeError('Approved scope requires design approval');
  if (!Array.isArray(record.tasks) || record.tasks.some(t => !object(t) || !nonempty(t.id) || !nonempty(t.status))) throw new TypeError('Invalid tasks');
  if (!Array.isArray(record.repos) || record.repos.some(r => !object(r) || !nonempty(r.id) || !relativeRepoPath(r.path) || !nonempty(r.branch) || !nonempty(r.head) || typeof r.dirty !== 'boolean')) throw new TypeError('Invalid repos.path or fingerprint');
  if (new Set(record.repos.map(r => r.id)).size !== record.repos.length) throw new TypeError('Duplicate repository IDs');
  if (!object(record.context) || !object(record.verification)) throw new TypeError('Invalid context or verification');
  if (record.nextAction !== null && !nonempty(record.nextAction)) throw new TypeError('Invalid nextAction');
  return record;
}

function validTaskId(taskId) {
  return typeof taskId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(taskId)
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(taskId);
}

async function paths(root, taskId) {
  if (!validTaskId(taskId)) throw new TypeError('Invalid taskId');
  const dir = path.resolve(root, '.pegatus', 'work', taskId);
  await assertContained(root, dir);
  const progress = path.join(dir, 'progress.json');
  await assertContained(root, progress);
  return { dir, progress, lock: path.join(dir, 'progress.lock') };
}

async function readProgress(progress) {
  let source;
  try { source = await readFile(progress, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  let parsed;
  try { parsed = JSON.parse(source); }
  catch (error) { throw new Error(`Corrupt progress JSON: ${progress}`, { cause: error }); }
  return validateProgress(parsed);
}

export async function loadProgress(root, taskId) {
  const location = await paths(root, taskId);
  const value = await readProgress(location.progress);
  if (value && value.taskId !== taskId) throw new Error('Progress taskId does not match path');
  return value;
}

function checkApprovals(existing, record, { approvalEvent, trustedCoordinator }) {
  const prior = existing ?? { ...record, approvedScopeHash: null, approvals: [] };
  if (approvalEvent !== undefined) {
    if (!trustedCoordinator) throw new Error('Approval event requires trusted coordinator input');
    const authorized = transition(prior, approvalEvent, { trustedCoordinator: true });
    if (JSON.stringify(authorized.approvals) !== JSON.stringify(record.approvals)
      || authorized.approvedScopeHash !== record.approvedScopeHash) {
      throw new Error('Approval fields do not match coordinator approval event');
    }
    return;
  }
  const oldApprovals = prior.approvals.map(item => JSON.stringify(item));
  if (record.approvals.some(item => !oldApprovals.includes(JSON.stringify(item)))
    || (record.approvedScopeHash !== null && record.approvedScopeHash !== prior.approvedScopeHash)) {
    throw new Error('Checkpoint cannot add approval without coordinator approval event');
  }
}

export async function saveProgress(root, record, { expectedRevision, approvalEvent, trustedCoordinator = false } = {}) {
  validateProgress(record);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError('expectedRevision must be a nonnegative integer');
  const location = await paths(root, record.taskId);
  await mkdir(location.dir, { recursive: true });
  await assertContained(root, location.dir);
  let lock;
  try { lock = await open(location.lock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') throw new Error(`Progress lock exists at ${location.lock}; inspect owner and recover explicitly`, { cause: error }); throw error; }
  let temp;
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, host: os.hostname(), createdAt: new Date().toISOString() }) + '\n');
    await lock.sync();
    const existing = await readProgress(location.progress);
    if (existing && existing.taskId !== record.taskId) throw new Error('Progress taskId does not match path');
    const revision = existing?.revision ?? 0;
    if (revision !== expectedRevision || record.revision !== expectedRevision) throw new Error(`Progress revision conflict: expected ${expectedRevision}, found ${revision}`);
    checkApprovals(existing, record, { approvalEvent, trustedCoordinator });
    const next = { ...record, revision: revision + 1 };
    temp = path.join(location.dir, `.progress-${randomUUID()}.tmp`);
    await assertContained(root, temp);
    const output = await open(temp, 'wx');
    try { await output.writeFile(JSON.stringify(next, null, 2) + '\n'); await output.sync(); }
    finally { await output.close(); }
    await rename(temp, location.progress);
    temp = undefined;
    return next;
  } finally {
    if (temp) await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await lock.close();
    await unlink(location.lock);
  }
}
