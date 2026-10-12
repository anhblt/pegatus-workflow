export function reconcile(record, currentRepos) {
  if (!record || !Array.isArray(record.repos) || !Array.isArray(currentRepos)) throw new TypeError('record.repos and currentRepos are required');
  const current = new Map(currentRepos.map(repo => [repo.id, repo]));
  const discrepancies = [];
  const nextActions = [];
  for (const saved of record.repos) {
    const now = current.get(saved.id);
    if (!now) {
      discrepancies.push({ type: 'missingRepository', repoId: saved.id, expected: saved.path });
      nextActions.push(`Reconcile missing repository ${saved.id} before resuming dependent work`);
      continue;
    }
    if (now.error) {
      discrepancies.push({ type: 'snapshotFailed', repoId: saved.id, actual: now.error });
      nextActions.push(`Inspect repository ${saved.id} before resuming dependent work`);
      continue;
    }
    for (const [field, type] of [['branch', 'branchChanged'], ['head', 'headChanged'], ['dirty', 'dirtyChanged']]) {
      if (now[field] !== saved[field]) {
        discrepancies.push({ type, repoId: saved.id, expected: saved[field], actual: now[field] });
      }
    }
    if (saved.fingerprint === undefined && saved.dirty) {
      discrepancies.push({ type: 'fingerprintUnavailable', repoId: saved.id, expected: 'content fingerprint', actual: null });
    } else if (saved.fingerprint !== undefined && saved.fingerprint !== now.fingerprint) {
      discrepancies.push({ type: 'contentChanged', repoId: saved.id, expected: saved.fingerprint, actual: now.fingerprint ?? null });
    }
    if ((saved.dirtySubmodules?.length ?? 0) > 0 || (now.dirtySubmodules?.length ?? 0) > 0) {
      discrepancies.push({ type: 'dirtySubmoduleUnverifiable', repoId: saved.id,
        expected: saved.dirtySubmodules ?? [], actual: now.dirtySubmodules ?? [] });
    }
  }
  if (discrepancies.some(item => item.type !== 'missingRepository')) {
    nextActions.push('Reconcile repository changes before resuming dependent work');
    if (Object.keys(record.verification ?? {}).length) nextActions.push('Rerun verification affected by repository changes');
  }
  if (record.nextAction) nextActions.push(record.nextAction);
  for (const task of record.tasks ?? []) {
    if (task.status !== 'done' && !nextActions.includes(task.id)) nextActions.push(task.id);
  }
  return { status: discrepancies.length ? 'blocked' : 'ready', discrepancies, nextActions };
}
