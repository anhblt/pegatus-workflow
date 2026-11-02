import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fingerprintRepository } from '../state/fingerprint.mjs';
import { redactCredentials } from '../security/credentials.mjs';

const sensitiveFlag = /^--?(?:password|passwd|token|secret|api[-_]?key|access[-_]?key|authorization)$/i;
const shells = new Set(['bash', 'sh', 'zsh', 'pwsh', 'powershell', 'cmd']);

function validate(check) {
  if (!check || typeof check.command !== 'string' || !check.command.trim() || /[\0\r\n|&;<>`]/.test(check.command)) throw new TypeError('Check command must name one executable');
  if (!Array.isArray(check.args) || Array.from(check.args).some(arg => typeof arg !== 'string' || arg.includes('\0'))) throw new TypeError('Check args must be a string array');
  if (typeof check.cwd !== 'string' || !check.cwd || check.cwd.includes('\0')) throw new TypeError('Check cwd is required');
  if (!Array.isArray(check.requires) || Array.from(check.requires).some(name => typeof name !== 'string' || !name.trim() || /[\0\r\n|&;<>`]/.test(name))) throw new TypeError('Check requires must name executable prerequisites');
  const base = path.win32.basename(check.command).toLowerCase().replace(/\.exe$/, '');
  const declared = check.shell?.toLowerCase().replace(/\.exe$/, '');
  if ((shells.has(base) && declared !== base) || (check.shell !== undefined && (!shells.has(base) || declared !== base))) throw new TypeError('Check shell must explicitly match its executable');
}

function scrubber(check, redactions, exclusions) {
  const secrets = redactions.filter(value => typeof value === 'string' && value.length > 0);
  for (let index = 0; index < check.args.length - 1; index++) {
    if (sensitiveFlag.test(check.args[index]) && check.args[index + 1]) secrets.push(check.args[index + 1]);
  }
  return value => {
    const text = redactCredentials(value, secrets);
    return text.split(/\r?\n/).filter(line => !exclusions.some(value => line.includes(value))).join('\n');
  };
}

// Shared by aggregate records: coordinator callback output is external evidence
// too, and must not bypass the same redaction and output bounds as commands.
export function redactEvidence(value, { redactions = [], evidenceExclusions = [], maxOutput = 16_384 } = {}) {
  const scrub = scrubber({ args: [] }, redactions, evidenceExclusions);
  const visit = (item, depth = 0) => {
    if (typeof item === 'string') return scrub(item).slice(0, maxOutput);
    if (item === null || typeof item === 'number' || typeof item === 'boolean') return item;
    if (depth > 5) return '[OMITTED]';
    if (Array.isArray(item)) return item.slice(0, 100).map(child => visit(child, depth + 1));
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).slice(0, 100).map(([key, child]) => [scrub(key).slice(0, maxOutput), sensitiveFlag.test(`--${key}`) ? '[REDACTED]' : visit(child, depth + 1)]));
    return null;
  };
  return visit(value);
}

// Explicit shell commands are configured as executables with static argument arrays.
// Never construct shell code or interpolate task/user text into these arguments.
async function execute(request) {
  return new Promise(resolve => {
    let stdout = '', stderr = '', error;
    let truncated = false;
    const append = (current, data) => {
      const next = current + data.toString('utf8');
      if (next.length > request.captureLimit) truncated = true;
      return next.slice(0, request.captureLimit);
    };
    let child;
    try {
      child = spawn(request.command, request.args, { cwd: request.cwd, shell: false, windowsHide: true, signal: request.signal, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (cause) { resolve({ error: cause, exitCode: null, stdout, stderr }); return; }
    child.stdout.on('data', chunk => { stdout = append(stdout, chunk); });
    child.stderr.on('data', chunk => { stderr = append(stderr, chunk); });
    child.on('error', cause => { error = cause; });
    child.on('close', (exitCode, signal) => resolve({ exitCode, signal, error, stdout, stderr, truncated }));
  });
}

async function invoke(request, run, scrub, maxOutput) {
  const startedAt = new Date().toISOString();
  let response;
  try { response = await run(request) ?? {}; }
  catch (error) { response = { error }; }
  const stdout = scrub(response.stdout), stderr = scrub(response.stderr);
  const exitCode = Number.isInteger(response.exitCode) ? response.exitCode : null;
  const interrupted = Boolean(response.interrupted || response.signal || response.error?.name === 'AbortError');
  const hasError = response.error !== undefined && response.error !== null;
  const error = hasError ? scrub(response.error.message ?? response.error) : null;
  const signal = response.signal ? scrub(response.signal) : null;
  const passed = exitCode === 0 && !hasError && !interrupted;
  return {
    status: passed ? 'passed' : 'failed',
    reason: passed ? null : interrupted ? 'interrupted' : hasError || exitCode === null ? 'execution-error' : 'nonzero-exit',
    startedAt, finishedAt: new Date().toISOString(), exitCode,
    stdout: stdout.slice(0, maxOutput), stderr: stderr.slice(0, maxOutput), error: error?.slice(0, maxOutput) ?? null,
    signal: signal?.slice(0, maxOutput) ?? null,
    outputTruncated: Boolean(response.truncated || [stdout, stderr, error, signal].some(value => value?.length > maxOutput)),
  };
}

/** run receives {command,args,cwd,shell:false,kind,id,signal,captureLimit} and
 * returns {exitCode,stdout,stderr,error?,signal?,interrupted?}. Evidence contains
 * bounded, redacted output only. redactions are literal secrets; evidenceExclusions
 * are literal substrings identifying output lines to omit. */
export async function runCheck(check, {
  run = execute, codeState, getCodeState, evidenceRoot, repositoryRoot = process.cwd(),
  redactions = [], evidenceExclusions = [], maxOutput = 16_384, signal,
} = {}) {
  validate(check);
  if (!Number.isSafeInteger(maxOutput) || maxOutput < 1 || maxOutput > 1_048_576) throw new TypeError('maxOutput must be between 1 and 1048576');
  if (![redactions, evidenceExclusions].every(values => Array.isArray(values) && values.every(value => typeof value === 'string' && value.length))) throw new TypeError('Redactions and exclusions must be nonempty strings');
  const scrub = scrubber(check, redactions, evidenceExclusions);
  const observe = getCodeState ?? (codeState === undefined ? () => fingerprintRepository(repositoryRoot) : async () => codeState);
  let initial, stateUnavailable = false;
  try { initial = await observe(); stateUnavailable = initial === undefined || initial === null || initial === ''; }
  catch { stateUnavailable = true; }
  const verifiedState = codeState ?? initial;
  const cwd = path.resolve(repositoryRoot, check.cwd);
  const request = { command: check.command, args: [...check.args], cwd, shell: false, kind: 'check', id: check.id ?? check.command, signal, captureLimit: Math.max(maxOutput * 2, 65_536) };
  const result = {
    schemaVersion: 1,
    checkId: request.id, command: scrub(check.command), args: check.args.map(scrub), cwd: scrub(cwd),
    shell: check.shell ?? null, codeState: verifiedState ?? null, finalCodeState: initial ?? null,
    status: 'blocked', reason: null, valid: true, prerequisites: [],
    startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, stdout: '', stderr: '',
  };
  if (stateUnavailable) {
    result.reason = 'code-state-unavailable'; result.valid = false;
  } else if (JSON.stringify(initial) !== JSON.stringify(verifiedState)) {
    result.reason = 'code-state-changed'; result.valid = false;
  } else {
    for (const name of check.requires) {
      const prerequisite = await invoke({ ...request, command: name, args: name.toLowerCase() === 'docker' ? ['info'] : ['--version'], kind: 'prerequisite' }, run, scrub, maxOutput);
      result.prerequisites.push({ name: scrub(name), ...prerequisite });
      if (prerequisite.status !== 'passed') { result.reason = 'missing-prerequisite'; break; }
    }
    if (!result.reason) Object.assign(result, await invoke(request, run, scrub, maxOutput));
    try {
      result.finalCodeState = await observe();
      if (result.finalCodeState === undefined || result.finalCodeState === null || result.finalCodeState === '') throw new Error('Missing code-state fingerprint');
      if (JSON.stringify(verifiedState) !== JSON.stringify(result.finalCodeState)) {
        if (result.status === 'passed') result.status = 'blocked';
        result.reason = 'code-state-changed'; result.valid = false;
      }
    } catch (error) {
      result.status = 'blocked'; result.reason = 'code-state-unavailable'; result.valid = false;
      const message = scrub(error?.message);
      result.error = message.slice(0, maxOutput);
      result.outputTruncated ||= message.length > maxOutput;
      result.finalCodeState = null;
    }
  }
  result.finishedAt = new Date().toISOString();
  result.reasons = result.reason ? [result.reason] : [];
  result.evidence = [{
    schemaVersion: 1,
    command: result.command, args: result.args, cwd: result.cwd, exitCode: result.exitCode,
    startedAt: result.startedAt, finishedAt: result.finishedAt, codeState: result.codeState,
    status: result.status, reason: result.reason, valid: result.valid, outputPath: null,
  }];
  if (evidenceRoot) {
    await mkdir(evidenceRoot, { recursive: true, mode: 0o700 });
    result.evidencePath = path.join(path.resolve(evidenceRoot), `check-${randomUUID()}.json`);
    result.evidence[0].outputPath = result.evidencePath;
    await writeFile(result.evidencePath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  return result;
}
