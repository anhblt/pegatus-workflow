const nonempty = value => typeof value === 'string' && value.trim().length > 0;

export function transition(record, event, { trustedCoordinator = false } = {}) {
  if (!record || typeof record !== 'object' || !event || typeof event !== 'object') throw new TypeError('record and event must be objects');
  const next = structuredClone(record);
  switch (event.type) {
    case 'scopeChanged':
      if (!nonempty(event.scopeHash)) throw new TypeError('scopeChanged requires scopeHash');
      if (event.scopeHash !== record.approvedScopeHash) {
        next.approvedScopeHash = null;
        next.approvals = next.approvals.filter(item => item.kind !== 'design');
        next.verification = {};
      }
      return next;
    case 'approvalGranted':
      if (!trustedCoordinator) throw new Error('Approval event requires trusted coordinator input');
      if (!nonempty(event.kind) || !nonempty(event.scopeHash) || !nonempty(event.evidence)) throw new TypeError('Approval event requires kind, scopeHash and user evidence');
      if (event.kind !== 'design') throw new TypeError('Only design approval is supported by this transition');
      next.approvals = next.approvals.filter(item => item.kind !== event.kind);
      next.approvals.push({ kind: event.kind, scopeHash: event.scopeHash, evidence: event.evidence });
      next.approvedScopeHash = event.scopeHash;
      return next;
    default:
      throw new TypeError(`Unknown progress event: ${event.type}`);
  }
}
