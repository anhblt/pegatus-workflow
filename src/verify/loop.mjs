import { redactEvidence, runCheck } from './runner.mjs';

const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const failureKey = result => JSON.stringify([result.checkId, result.status, result.reason ?? 'nonzero-exit', result.exitCode, result.stdout ?? '', result.stderr ?? '', result.error ?? null, result.signal ?? null]);
const nonempty = value => typeof value === 'string' && Boolean(value.trim());

/** The host coordinator owns diagnosis, approval, repair and review. Scope data
 * is not authorization: authorizeRepair requires trustedCoordinator and explicit
 * user evidence. Callbacks must honor their authorized scope and report expansion
 * or security blockers. baselineResults must come from checks run before edits. */
export async function runVerification({
  checks, requiredChecks = [], repairLimit = 3, repair, review, diagnose, authorizeRepair,
  trustedCoordinator = false, getCodeState, run, baselineResults = [], dispositions = [],
  evidenceRoot, repositoryRoot, redactions, evidenceExclusions, maxOutput, signal,
} = {}) {
  if (!Array.isArray(checks) || !Array.isArray(requiredChecks) || !checks.length) throw new TypeError('Verification requires applicable checks');
  if (!Number.isSafeInteger(repairLimit) || repairLimit < 0) throw new TypeError('repairLimit must be a nonnegative integer');
  if (typeof getCodeState !== 'function') throw new TypeError('getCodeState callback is required');
  const selected = [...checks];
  const byId = new Map(checks.map(check => [check.id ?? check.command, check]));
  if (byId.size !== checks.length) throw new TypeError('Checks require distinct IDs');
  for (const check of requiredChecks) {
    const id = check.id ?? check.command;
    if (byId.has(id)) {
      if (JSON.stringify(byId.get(id)) !== JSON.stringify(check)) throw new TypeError(`Conflicting check ID: ${id}`);
    } else { selected.push(check); byId.set(id, check); }
  }
  const accepted = dispositions.filter(value => trustedCoordinator && value?.accepted === true && nonempty(value.checkId) && nonempty(value.evidence));
  const scrub = value => redactEvidence(value, { redactions, evidenceExclusions, maxOutput });
  const observe = async () => {
    try {
      const state = await getCodeState();
      if (state === null || state === undefined || state === '') throw new Error();
      return state;
    } catch { throw Object.assign(new Error('Code-state unavailable'), { code: 'CODE_STATE_UNAVAILABLE' }); }
  };
  const result = { status: 'failed', reason: null, reasons: [], evidence: [], results: [], history: [], repairs: 0, codeState: null, dispositions: scrub(accepted), limitationsAccepted: false, nextAction: null };
  const finish = (status, reason, nextAction) => {
    result.status = status; result.reason = reason; result.nextAction = nextAction;
    result.reasons = reason ? [reason] : [];
    result.evidence = result.history.flatMap(round => round.results.flatMap(check => check.evidence));
    const outstanding = result.results.filter(check => check.status !== 'passed' || !check.valid);
    result.limitationsAccepted = outstanding.length > 0 && outstanding.every(check => check.valid && accepted.some(value => value.checkId === check.checkId));
    return result;
  };
  const invalidate = () => {
    for (const round of result.history) for (const check of round.results) {
      check.valid = false;
      for (const evidence of check.evidence) evidence.valid = false;
    }
  };
  const captureState = async () => {
    try {
      const state = await observe();
      const changed = !sameState(result.codeState, state);
      if (changed) invalidate();
      result.codeState = state;
      return changed;
    } catch (error) {
      invalidate(); result.codeState = null;
      throw error;
    }
  };
  let previousFailures;
  let previousState;
  try { for (;;) {
    const state = await observe();
    result.codeState = state;
    const round = { codeState: state, results: [] };
    result.history.push(round);
    result.results = round.results;
    for (const check of selected) {
      const evidence = await runCheck(check, { run, codeState: state, getCodeState: observe, evidenceRoot, repositoryRoot, redactions, evidenceExclusions, maxOutput, signal });
      const baseline = baselineResults.find(value => value.checkId === evidence.checkId && value.status === 'failed' && value.valid === true && value.codeState && failureKey(value) === failureKey(evidence));
      if (evidence.status === 'failed') {
        evidence.classification = baseline ? 'pre-existing' : 'new-or-unclassified';
        if (baseline) evidence.baselineCodeState = baseline.codeState;
      }
      round.results.push(evidence);
      if (!evidence.valid) {
        invalidate(); result.codeState = evidence.finalCodeState;
        return finish('blocked', evidence.reason, 'Reconcile repository changes and rerun checks');
      }
    }
    const finalState = await observe();
    if (!sameState(state, finalState)) {
      invalidate(); result.codeState = finalState;
      return finish('blocked', 'code-state-changed', 'Reconcile repository changes and rerun checks');
    }
    if (round.results.some(check => check.status === 'blocked')) return finish('blocked', 'missing-prerequisite', 'Restore prerequisites and rerun checks');
    const failures = round.results.filter(check => check.status === 'failed');
    if (!failures.length) return finish('passed', null, null);
    const executionFailure = failures.find(check => ['interrupted', 'execution-error'].includes(check.reason));
    if (executionFailure) return finish('failed', executionFailure.reason, 'Restore command execution and rerun checks');
    const signature = failures.map(failureKey).sort().join('\n');
    if (previousFailures === signature && sameState(previousState, state)) return finish('failed', 'unchanged-failure', 'Escalate unchanged failure with collected evidence');
    if (result.repairs >= repairLimit) return finish('failed', 'repair-limit', 'Report outstanding failures for user disposition');
    if (typeof repair !== 'function') return finish('failed', 'repair-required', 'Request diagnosis and an approved repair');
    if (typeof diagnose !== 'function') return finish('failed', 'diagnosis-required', 'Request coordinator diagnosis before repair');
    const context = { failures, baselineResults, codeState: state, round: result.repairs + 1 };
    let diagnosis, approval, reviewResult;
    try {
      diagnosis = await diagnose(context);
      const diagnosisChangedState = await captureState();
      round.diagnosis = scrub(diagnosis);
      if (!diagnosis) return finish('failed', 'diagnosis-required', 'Request a concrete diagnosis');
      if (diagnosis.scopeExpanded || diagnosis.securityBlocked) return finish('blocked', diagnosis.securityBlocked ? 'security-blocker' : 'scope-expansion', 'Reconcile scope or security blocker with the user');
      if (diagnosisChangedState) return finish('blocked', 'code-state-changed', 'Reconcile repository changes before repair');
      if (!trustedCoordinator || typeof authorizeRepair !== 'function') return finish('blocked', 'repair-approval-required', 'Obtain coordinator approval with user evidence and repair scope');
      approval = await authorizeRepair({ ...context, diagnosis });
      const approvalChangedState = await captureState();
      if (approval?.approved !== true || !Array.isArray(approval.scope) || !approval.scope.length || !approval.scope.every(nonempty) || !nonempty(approval.evidence)) return finish('blocked', 'repair-approval-required', 'Obtain coordinator approval with user evidence and repair scope');
      if (approvalChangedState) return finish('blocked', 'code-state-changed', 'Reconcile repository changes before repair');
      if (typeof review !== 'function') return finish('blocked', 'review-required', 'Provide coordinator review before applying repairs');
      if (!sameState(state, await observe())) {
        invalidate(); result.codeState = await observe();
        return finish('blocked', 'code-state-changed', 'Reconcile repository changes before repair');
      }
      round.approval = scrub(approval);
      previousFailures = signature; previousState = state;
      invalidate(); result.repairs++;
      const repaired = await repair({ ...context, diagnosis, approval });
      await captureState();
      if (repaired?.scopeExpanded || repaired?.securityBlocked) return finish('blocked', repaired.securityBlocked ? 'security-blocker' : 'scope-expansion', 'Reconcile scope or security blocker with the user');
      reviewResult = await review({ ...context, diagnosis, approval, repairResult: repaired, codeState: result.codeState });
      const reviewChangedState = await captureState();
      round.review = scrub(reviewResult);
      if (reviewResult?.scopeExpanded || reviewResult?.securityBlocked) return finish('blocked', reviewResult.securityBlocked ? 'security-blocker' : 'scope-expansion', 'Reconcile scope or security blocker with the user');
      if (reviewResult?.status !== 'passed') return finish('blocked', 'review-required', 'Resolve review findings before rechecking');
      if (reviewChangedState) return finish('blocked', 'code-state-changed', 'Review repository changes before rechecking');
    } catch (error) {
      // Callback exceptions can contain arbitrary host output/secrets. Preserve
      // command evidence but do not copy unrestricted callback text into records.
      try { await captureState(); }
      catch { return finish('blocked', 'code-state-unavailable', 'Restore repository state observation and rerun checks'); }
      return finish('blocked', error?.code === 'CODE_STATE_UNAVAILABLE' ? 'code-state-unavailable' : 'coordinator-error', 'Resolve coordinator callback failure and reconcile code state');
    }
  } } catch (error) {
    if (error.code !== 'CODE_STATE_UNAVAILABLE') throw error;
    invalidate(); result.codeState = null;
    return finish('blocked', 'code-state-unavailable', 'Restore repository state observation and rerun checks');
  }
}
