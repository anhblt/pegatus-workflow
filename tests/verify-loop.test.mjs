import test from 'node:test';
import assert from 'node:assert/strict';
import { runVerification } from '../src/verify/loop.mjs';

const unit = { id: 'unit', command: 'node', args: ['unit.mjs'], cwd: '.', requires: [] };
const integration = { ...unit, id: 'integration', args: ['integration.mjs'] };
const pass = { exitCode: 0, stdout: 'ok', stderr: '' };
const fail = { exitCode: 1, stdout: '', stderr: 'broken test' };
const authority = {
  trustedCoordinator: true,
  authorizeRepair: async () => ({ approved: true, scope: ['src/example.mjs'], evidence: 'User approved focused repair' }),
  diagnose: async () => ({ cause: 'controlled fixture bug' }),
  review: async () => ({ status: 'passed' }),
};

test('required integration gates run after repair and all earlier evidence is invalidated', async () => {
  let state = 'before';
  const events = [];
  const result = await runVerification({ checks: [unit], requiredChecks: [integration], ...authority,
    getCodeState: async () => state,
    run: async request => { events.push(`check:${request.id}:${state}`); return state === 'before' && request.id === 'unit' ? fail : pass; },
    diagnose: async () => { events.push('diagnose'); return { cause: 'bug' }; },
    repair: async ({ approval, diagnosis }) => { assert.deepEqual(approval.scope, ['src/example.mjs']); assert.equal(diagnosis.cause, 'bug'); events.push('repair'); state = 'after'; },
    review: async () => { events.push('review'); return { status: 'passed' }; },
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.repairs, 1);
  assert.equal(result.codeState, 'after');
  assert.deepEqual(events, ['check:unit:before', 'check:integration:before', 'diagnose', 'repair', 'review', 'check:unit:after', 'check:integration:after']);
  assert.equal(result.history[0].results.every(value => value.valid === false), true);
  assert.equal(result.results.every(value => value.codeState === 'after'), true);
  assert.equal(result.evidence.length, 4);
  assert.equal(result.evidence[0].valid, false);
  assert.deepEqual(result.reasons, []);
});

test('callback data is bounded and redacted in returned aggregate evidence', async () => {
  let state = 'a';
  const result = await runVerification({ checks: [unit], ...authority,
    getCodeState: async () => state, run: async () => state === 'a' ? fail : pass,
    diagnose: async () => ({ cause: 'token=callback-secret\ncustom-hidden', log: 'x'.repeat(1000) }),
    repair: async () => { state = 'b'; }, redactions: ['custom-hidden'], maxOutput: 200,
  });
  assert.equal(result.status, 'passed');
  assert.equal(JSON.stringify(result).includes('callback-secret'), false);
  assert.equal(JSON.stringify(result).includes('custom-hidden'), false);
  assert.ok(result.history[0].diagnosis.log.length <= 200);
});

test('interrupted or failed spawn execution stops without attempting a code repair', async () => {
  for (const response of [{ exitCode: 0, interrupted: true }, { error: new Error('ENOENT') }]) {
    const result = await runVerification({ checks: [unit], ...authority,
      getCodeState: async () => 'a', run: async () => response,
      repair: async () => { assert.fail('execution interruption is not a code defect'); },
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.repairs, 0);
    assert.match(result.reason, /interrupted|execution-error/);
    assert.equal(result.evidence.length, 1);
  }
});

test('fingerprint failures produce a blocked aggregate and preserve earlier evidence', async () => {
  const result = await runVerification({ checks: [unit], getCodeState: async () => { throw new Error('token=unrestricted'); }, run: async () => pass });
  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.reasons, ['code-state-unavailable']);
  assert.equal(JSON.stringify(result).includes('unrestricted'), false);
});

test('identical unchanging failure stops early rather than exhausting repairs', async () => {
  let repairs = 0;
  const result = await runVerification({ checks: [unit], ...authority, repairLimit: 3,
    getCodeState: async () => 'same', run: async () => fail, repair: async () => { repairs++; },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'unchanged-failure');
  assert.equal(repairs, 1);
});

test('changing failures stop at default three repair rounds', async () => {
  let state = 0;
  const result = await runVerification({ checks: [unit], ...authority,
    getCodeState: async () => `state-${state}`, run: async () => ({ ...fail, stderr: `failure-${state}` }),
    repair: async () => { state++; },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'repair-limit');
  assert.equal(result.repairs, 3);
  assert.equal(result.history.length, 4);
});

test('baseline evidence classifies existing failures without treating them as passing', async () => {
  const result = await runVerification({ checks: [unit], repairLimit: 0,
    baselineResults: [{ checkId: 'unit', status: 'failed', valid: true, codeState: 'baseline', exitCode: 1, stdout: '', stderr: 'broken test' }],
    getCodeState: async () => 'current', run: async () => fail,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.results[0].classification, 'pre-existing');
  assert.equal(result.results[0].baselineCodeState, 'baseline');
});

test('different failure or invalid baseline is never classified as pre-existing', async () => {
  for (const baseline of [
    { checkId: 'unit', status: 'failed', valid: false, stderr: 'broken test', exitCode: 1 },
    { checkId: 'unit', status: 'failed', valid: true, codeState: 'base', stderr: 'another failure', exitCode: 1 },
  ]) {
    const result = await runVerification({ checks: [unit], repairLimit: 0, baselineResults: [baseline], getCodeState: async () => 'current', run: async () => fail });
    assert.equal(result.results[0].classification, 'new-or-unclassified');
  }
});

test('missing prerequisite stops the loop without diagnosing or repairing', async () => {
  const result = await runVerification({ checks: [{ ...unit, requires: ['docker'] }], ...authority,
    getCodeState: async () => 'a', run: async () => fail,
    diagnose: async () => { assert.fail('blocked checks cannot be diagnosed as repairable code'); },
    repair: async () => { assert.fail('blocked checks cannot be repaired'); },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.repairs, 0);
});

test('scope declarations cannot authorize a repair without coordinator trust and user evidence', async () => {
  for (const options of [
    { ...authority, trustedCoordinator: false },
    { ...authority, authorizeRepair: async () => ({ approved: true, scope: ['src'] }) },
    { ...authority, authorizeRepair: async () => ({ approved: false, scope: ['src'], evidence: 'not approved' }) },
  ]) {
    const result = await runVerification({ checks: [unit], ...options,
      getCodeState: async () => 'a', run: async () => fail, repair: async () => { assert.fail('not authorized'); },
    });
    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'repair-approval-required');
  }
});

test('diagnosis is requested before any repair and material expansion stops review and rechecks', async () => {
  const noDiagnosis = await runVerification({ checks: [unit], ...authority, diagnose: undefined,
    getCodeState: async () => 'a', run: async () => fail, repair: async () => { assert.fail('diagnose first'); },
  });
  assert.equal(noDiagnosis.reason, 'diagnosis-required');
  const expanded = await runVerification({ checks: [unit], ...authority,
    getCodeState: async () => 'a', run: async () => fail,
    diagnose: async () => ({ scopeExpanded: true, cause: 'requires redesign' }),
    repair: async () => { assert.fail('scope expansion requires user reconciliation'); },
  });
  assert.equal(expanded.status, 'blocked');
  assert.equal(expanded.reason, 'scope-expansion');
});

test('failed review stops further execution and does not allow a completion claim', async () => {
  let state = 'a';
  const result = await runVerification({ checks: [unit], ...authority, getCodeState: async () => state,
    run: async () => state === 'a' ? fail : pass, repair: async () => { state = 'b'; },
    review: async () => ({ status: 'failed', reason: 'unsafe change' }),
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'review-required');
  assert.equal(result.history.length, 1);
  assert.equal(result.results[0].valid, false);
});

test('edits between checks invalidate earlier passes and block completion', async () => {
  let state = 'a';
  let reads = 0;
  const result = await runVerification({ checks: [unit, integration], getCodeState: async () => {
    if (++reads === 4) state = 'b';
    return state;
  }, run: async () => pass });
  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'code-state-changed');
  assert.equal(result.results[0].valid, false);
});

test('explicit user dispositions are recorded separately from failed and blocked evidence', async () => {
  const disposition = { checkId: 'unit', accepted: true, evidence: 'User accepts known test limitation' };
  const result = await runVerification({ checks: [unit], repairLimit: 0, trustedCoordinator: true,
    dispositions: [disposition], getCodeState: async () => 'a', run: async () => fail,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.results[0].status, 'failed');
  assert.deepEqual(result.dispositions, [disposition]);
  assert.equal(result.limitationsAccepted, true);
});
