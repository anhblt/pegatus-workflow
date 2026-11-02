import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { assertContained } from '../paths.mjs';
import { dirtySubmodules, fingerprintRepository, repositoryDirty } from '../state/fingerprint.mjs';

const text = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !value.includes('\0');
const digestId = (...parts) => createHash('sha256').update(parts.join('\0')).digest('hex');

/** Canonical source-content state for verifier getCodeState and completion. */
export function repositoryCodeState(repos) {
  if (!Array.isArray(repos)) throw new TypeError('Repository snapshots are required');
  const seen = new Set();
  const content = repos.map(repo => {
    if (!text(repo?.id) || !/^[a-f0-9]{64}$/.test(repo.fingerprint ?? '')
      || !Array.isArray(repo.dirtySubmodules ?? []) || repo.error || seen.has(repo.id))
      throw new TypeError('Repository content state is unavailable');
    seen.add(repo.id);
    return { id: repo.id, fingerprint: repo.fingerprint,
      unverifiableSubmodules: (repo.dirtySubmodules ?? []).length > 0 };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return `repos-v1:${createHash('sha256').update(JSON.stringify(content)).digest('hex')}`;
}

function git(repo, ...args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

/** Snapshot only repositories already declared in a trusted progress record. */
export async function currentRepositories(root, record) {
  const result = [];
  for (const repo of record.repos) {
    const target = path.resolve(root, repo.path);
    await assertContained(root, target);
    const head = git(target, 'rev-parse', 'HEAD');
    if (head === null) { result.push({ id: repo.id, error: 'repository-unavailable' }); continue; }
    const branch = git(target, 'symbolic-ref', '--short', 'HEAD') ?? 'HEAD';
    try {
      result.push({ id: repo.id, branch, head,
        dirty: await repositoryDirty(target), fingerprint: await fingerprintRepository(target),
        dirtySubmodules: await dirtySubmodules(target) });
    } catch { result.push({ id: repo.id, error: 'snapshot-failed' }); }
  }
  return result;
}

/** Retain prior verification evidence while making every result unusable after an edit. */
export function invalidateVerification(verification, eventId) {
  const next = structuredClone(verification);
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (value.valid === true) value.valid = false;
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    for (const [key, child] of Object.entries(value)) if (key !== 'invalidation') visit(child);
  };
  visit(next);
  next.invalidation = { reason: 'post-edit', eventId };
  return next;
}

/** Convert documented native payloads; task/root authority comes only from explicit binding. */
export function mapNativeEvent(host, payload, { root, taskId, eventId } = {}) {
  if (!['claude', 'codex'].includes(host) || !payload || typeof payload !== 'object')
    return { status: 'skipped', evidence: [], reasons: ['unsupported-host-or-payload'] };
  if (!text(root) || !path.isAbsolute(root) || !text(taskId))
    return { status: 'skipped', evidence: [], reasons: ['explicit-task-binding-required'] };
  const name = payload.hook_event_name;
  if (!['SessionStart', 'PostToolUse', 'PreCompact', 'SessionEnd'].includes(name))
    return { status: 'skipped', evidence: [], reasons: ['unmapped-native-event'] };
  if (!text(payload.session_id)) return { status: 'skipped', evidence: [], reasons: ['native-session-id-required'] };
  let type;
  if (name === 'SessionStart') type = 'session-start';
  if (name === 'SessionEnd') type = 'session-end';
  if (name === 'PreCompact') type = 'pre-compact';
  if (name === 'PostToolUse') {
    if (host === 'claude' && !['Edit', 'Write', 'NotebookEdit'].includes(payload.tool_name)
      || host === 'codex' && payload.tool_name !== 'apply_patch')
      return { status: 'skipped', evidence: [], reasons: ['tool-is-not-a-proven-edit'] };
    if (!text(payload.tool_use_id)) return { status: 'skipped', evidence: [], reasons: ['native-tool-id-required'] };
    type = 'post-edit';
  }
  if (name === 'PreCompact' && !text(eventId))
    return { status: 'skipped', evidence: [], reasons: ['explicit-compaction-event-id-required'] };
  const sourceId = name === 'PreCompact' ? eventId : name === 'PostToolUse' ? payload.tool_use_id : name === 'SessionStart' ? payload.source : name;
  if (!text(sourceId)) return { status: 'skipped', evidence: [], reasons: ['unique-native-event-id-required'] };
  return { status: 'passed', evidence: [], reasons: [], event: {
    root, taskId, type, id: `${host}:${digestId(payload.session_id, name, sourceId)}`,
    sessionId: payload.session_id,
  } };
}

/** Native decisions differ: post-tool and session-end hooks cannot undo work. */
export function nativeResponse(host, nativeName, lifecycle) {
  if (lifecycle.status === 'passed' || lifecycle.status === 'skipped')
    return { exitCode: 0, stdout: '', stderr: '' };
  const message = 'Pegatus lifecycle checkpoint requires an explicit workflow call before dependent work continues.';
  if (nativeName === 'PreCompact') {
    if (host === 'claude') return { exitCode: 2, stdout: '', stderr: message + '\n' };
    if (host === 'codex') return { exitCode: 0, stdout: JSON.stringify({ continue: false, systemMessage: message }) + '\n', stderr: '' };
  }
  const advisory = { systemMessage: message };
  if (['SessionStart', 'PostToolUse'].includes(nativeName))
    advisory.hookSpecificOutput = { hookEventName: nativeName, additionalContext: message };
  return { exitCode: 0, stdout: JSON.stringify(advisory) + '\n', stderr: '' };
}

/** Manual, opt-in JSON merge proposal; no existing host file is read or changed. */
export function activationFor(host, root) {
  if (!['claude', 'codex'].includes(host) || typeof root !== 'string' || !path.isAbsolute(root))
    throw new TypeError('Activation requires Claude or Codex and an absolute install root');
  if (/[`"'$%&|;<>^!()\r\n\0]/.test(root))
    throw new TypeError('Install root cannot be safely quoted in a native hook command');
  const script = path.join(root, '.pegatus', 'runtime', host, 'bin', 'pegatus.mjs');
  const command = `node "${script}" hook-native --host ${host}`;
  const handler = { type: 'command', command };
  const editMatcher = host === 'claude' ? 'Edit|Write|NotebookEdit' : 'apply_patch';
  return {
    schemaVersion: 1, host,
    target: host === 'claude' ? '.claude/settings.json' : '.codex/hooks.json',
    merge: { hooks: {
      SessionStart: [{ hooks: [handler] }],
      PostToolUse: [{ matcher: editMatcher, hooks: [handler] }],
      SessionEnd: [{ hooks: [handler] }],
    } },
    requiredEnvironment: ['PEGATUS_ROOT', 'PEGATUS_TASK_ID'],
    explicitOnly: ['PreCompact', 'complete', 'before-action', 'edits outside mapped file-edit tools'],
    notes: ['Merge only after reviewing existing host configuration and trusting the project hook.',
      'Bind one task in the host process environment. SessionStart records the native session ID for that task; later events from any other session skip.',
      'Native session start/end and post-tool hooks are advisory; use explicit lifecycle CLI gates for dependent operations.'],
  };
}
