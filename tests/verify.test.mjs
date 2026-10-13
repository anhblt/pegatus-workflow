import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { redactEvidence, runCheck } from '../src/verify/runner.mjs';

const check = { id: 'unit', command: 'node', args: ['test.mjs'], cwd: '.', requires: [] };
const pass = async () => ({ exitCode: 0, stdout: 'ok', stderr: '' });

test('missing prerequisites are blocked and the check is not executed', async () => {
  const calls = [];
  const result = await runCheck({ ...check, requires: ['docker'] }, {
    codeState: 'state-a', run: async request => {
      calls.push(request);
      return { exitCode: 1, stdout: '', stderr: 'Docker unavailable' };
    },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'missing-prerequisite');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, 'prerequisite');
  assert.deepEqual(calls[0].args, ['info']);
  assert.equal(result.prerequisites[0].status, 'failed');
});

test('argument arrays and paths containing spaces are preserved without shell interpolation', async () => {
  const cwd = path.join(os.tmpdir(), 'verification space');
  const args = ['a b', '$(touch secret)', '; echo unsafe', '${task}'];
  let request;
  const result = await runCheck({ ...check, command: path.join(cwd, 'custom node'), args, cwd }, {
    codeState: 'state-a', run: async value => { request = value; return pass(); },
  });
  assert.equal(result.status, 'passed');
  assert.equal(request.cwd, cwd);
  assert.deepEqual(request.args, args);
  assert.equal(request.shell, false);
  assert.equal(result.codeState, 'state-a');
  assert.equal(result.exitCode, 0);
  assert.ok(Date.parse(result.startedAt) <= Date.parse(result.finishedAt));
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].command, path.join(cwd, 'custom node'));
  assert.equal(result.evidence[0].outputPath, null);
  assert.deepEqual(result.reasons, []);
});

test('shell executables require matching declarations and execute only configured static args', async () => {
  await assert.rejects(runCheck({ ...check, command: 'pwsh.exe', args: ['-Command', 'Write-Output ok'] }, { run: pass }), /shell/);
  let request;
  const result = await runCheck({ ...check, command: 'pwsh.exe', args: ['-Command', 'Write-Output ok'], shell: 'pwsh' }, {
    run: async value => { request = value; return pass(); }, codeState: 'a', task: 'injected',
  });
  assert.equal(result.status, 'passed');
  assert.deepEqual(request.args, ['-Command', 'Write-Output ok']);
  assert.equal(request.shell, false);
});

test('spawn errors and interruptions cannot pass even with exit zero', async () => {
  for (const response of [
    { exitCode: 0, signal: 'SIGTERM' },
    { exitCode: 0, interrupted: true },
    { exitCode: 0, error: new Error('spawn failed') },
    { stdout: 'no exit status' },
  ]) {
    const result = await runCheck(check, { codeState: 'a', run: async () => response });
    assert.equal(result.status, 'failed');
  }
  const thrown = await runCheck(check, { run: async () => { throw new Error('spawn failed'); } });
  assert.equal(thrown.status, 'failed');
  assert.equal(thrown.reason, 'execution-error');
});

test('a reported empty error cannot pass with exit zero', async () => {
  const result = await runCheck(check, { codeState: 'a', run: async () => ({ exitCode: 0, error: new Error('') }) });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'execution-error');
});

test('untrusted error messages honor output bounds after redaction', async () => {
  const result = await runCheck(check, { codeState: 'a', maxOutput: 80,
    run: async () => ({ exitCode: 0, error: new Error('token=do-not-leak\n' + 'x'.repeat(1000)) }),
  });
  assert.ok(result.error.length <= 80);
  assert.equal(result.outputTruncated, true);
  assert.equal(JSON.stringify(result).includes('do-not-leak'), false);
});

test('untrusted signal text honors output bounds', async () => {
  const result = await runCheck(check, { codeState: 'a', maxOutput: 80,
    run: async () => ({ exitCode: 0, signal: 's'.repeat(1000) }),
  });
  assert.ok(result.signal.length <= 80);
  assert.equal(result.outputTruncated, true);
});

test('callback property keys honor output bounds after redaction', () => {
  const key = 'token=key-secret\n' + 'x'.repeat(1000);
  const sanitized = redactEvidence({ [key]: 'value' }, { maxOutput: 80 });
  assert.ok(Object.keys(sanitized)[0].length <= 80);
  assert.equal(JSON.stringify(sanitized).includes('key-secret'), false);
});

test('code state observation error messages honor output bounds', async () => {
  let observations = 0;
  const unavailable = await runCheck(check, { codeState: 'a', maxOutput: 80, run: pass,
    getCodeState: async () => { if (++observations === 2) throw new Error('x'.repeat(1000)); return 'a'; },
  });
  assert.ok(unavailable.error.length <= 80);
});

test('a successful command is invalidated when code changes during execution', async () => {
  let state = 'before';
  const result = await runCheck(check, {
    codeState: state, getCodeState: async () => state,
    run: async () => { state = 'after'; return pass(); },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'code-state-changed');
  assert.equal(result.valid, false);
  assert.equal(result.codeState, 'before');
  assert.equal(result.finalCodeState, 'after');
});

test('evidence redacts secrets in command, errors and output before bounded persistence', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus evidence '));
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await runCheck({ ...check, args: ['--token', 'secret-123'] }, {
    run: async () => ({ exitCode: 1, stdout: 'token=secret-123\nAuthorization: Bearer bearer-456\ncustom-hidden\n' + 'x'.repeat(1000), stderr: 'password=secret-789' }),
    codeState: 'a', evidenceRoot: root, redactions: ['custom-hidden'], maxOutput: 200,
  });
  const saved = await readFile(result.evidencePath, 'utf8');
  const persisted = JSON.parse(saved);
  assert.equal(persisted.schemaVersion, 1);
  assert.equal(persisted.evidence[0].schemaVersion, 1);
  for (const secret of ['secret-123', 'bearer-456', 'secret-789', 'custom-hidden']) {
    assert.equal(saved.includes(secret), false, secret);
    assert.equal(JSON.stringify(result).includes(secret), false, secret);
  }
  assert.equal(result.outputTruncated, true);
  assert.ok(result.stdout.length <= 200);
  assert.match(saved, /REDACTED/);
  assert.equal(result.evidence[0].outputPath, result.evidencePath);
  assert.deepEqual(result.reasons, ['nonzero-exit']);
});

test('code state observation errors or absent fingerprints block execution', async () => {
  for (const getCodeState of [async () => { throw new Error('unavailable token=do-not-leak'); }, async () => undefined]) {
    const result = await runCheck(check, { getCodeState, run: async () => { assert.fail('cannot execute without code provenance'); } });
    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'code-state-unavailable');
    assert.equal(result.valid, false);
    assert.equal(JSON.stringify(result).includes('do-not-leak'), false);
    assert.equal(result.evidence.length, 1);
  }
});

test('default executor records an aborted real command as interrupted', async t => {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 100);
  t.after(() => clearTimeout(timer));
  const result = await runCheck({ ...check, command: process.execPath, args: ['-e', 'setTimeout(()=>{},10000)'] }, { codeState: 'a', signal: abort.signal });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'interrupted');
});

test('configured evidence exclusions remove matching output lines', async () => {
  const result = await runCheck(check, { codeState: 'a', evidenceExclusions: ['private-config.json'],
    run: async () => ({ exitCode: 0, stdout: 'safe output\nprivate-config.json contains arbitrary credentials\n', stderr: '' }),
  });
  assert.match(result.stdout, /safe output/);
  assert.doesNotMatch(result.stdout, /arbitrary credentials/);
});

test('default executor runs Node in a space path and preserves literal arguments', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus smoke '));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'working directory'));
  const cwd = path.join(root, 'working directory');
  const result = await runCheck({ ...check, command: process.execPath, args: ['-e', 'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(1)}))', 'a b', '$(unsafe)'], cwd }, { codeState: 'smoke' });
  assert.equal(result.status, 'passed');
  assert.deepEqual(JSON.parse(result.stdout), { cwd, args: ['a b', '$(unsafe)'] });
  const missing = await runCheck({ ...check, command: path.join(root, 'missing-executable') }, { codeState: 'smoke' });
  assert.equal(missing.status, 'failed');
  assert.equal(missing.reason, 'execution-error');
});
