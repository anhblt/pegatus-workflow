#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { assertContained } from '../src/paths.mjs';
import { loadProgress, saveProgress } from '../src/state/store.mjs';
import { reconcile } from '../src/state/reconcile.mjs';
import { dirtySubmodules, fingerprintRepository, repositoryDirty } from '../src/state/fingerprint.mjs';
import { loadCatalog } from '../src/catalog/manifest.mjs';
import { lintCatalog } from '../src/catalog/lint.mjs';
import { fileURLToPath } from 'node:url';
import { runAdministration } from '../src/install/admin.mjs';
import { scanAgentConfig } from '../src/security/agentshield.mjs';
import { dispatchEvent } from '../src/hooks/dispatch.mjs';
import { activationFor, mapNativeEvent, nativeResponse } from '../src/hooks/operations.mjs';
import { runLearningCommand, learningCollector } from '../src/memory/cli.mjs';
import { runOrchestrationCommand } from '../src/orchestration/cli.mjs';
import { runSetup } from '../src/install/setup.mjs';
import { runUninstall } from '../src/install/uninstall.mjs';

const operations = new Set([
  'checkpoint', 'resume', 'learn', 'memory', 'security', 'status',
  'install', 'update', 'doctor', 'uninstall', 'role', 'catalog',
  'lifecycle', 'hook-native', 'hook-activation',
  'orchestrate', 'setup',
]);
const hostWorkflows = new Set(['start','design','plan','execute','investigate','review','verify']);

function flags(args, allowed) {
  const options = { files: [] };
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!allowed.includes(flag) || !value || value.startsWith('--')) throw new TypeError('Invalid lifecycle options');
    if (flag === '--config-file') options.files.push(value);
    else {
      const key = flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (options[key]) throw new TypeError('Duplicate lifecycle option');
      options[key] = value;
    }
  }
  return options;
}

async function nativeInput() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 262144) throw new TypeError('Native hook input exceeds limit');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function runLifecycleCommand(argv, cwd) {
  const [operation, ...args] = argv;
  if (operation === 'hook-activation') {
    const options = flags(args, ['--host', '--root']);
    if (!options.host || !options.root) throw new TypeError('Usage: pegatus hook-activation --host claude|codex --root <installed-root>');
    process.stdout.write(JSON.stringify(activationFor(options.host, path.resolve(cwd, options.root))) + '\n');
    return 0;
  }
  if (operation === 'hook-native') {
    const options = flags(args, ['--host']);
    if (!['claude', 'codex'].includes(options.host)) throw new TypeError('Usage: pegatus hook-native --host claude|codex');
    let payload;
    try { payload = await nativeInput(); }
    catch { return 0; }
    const binding = { root: process.env.PEGATUS_ROOT, taskId: process.env.PEGATUS_TASK_ID, eventId: process.env.PEGATUS_EVENT_ID };
    if (!binding.root || !binding.taskId || (process.env.PEGATUS_SESSION_ID
      && payload.session_id !== process.env.PEGATUS_SESSION_ID)) return 0;
    const mapped = mapNativeEvent(options.host, payload, binding);
    if (mapped.status === 'skipped') return 0;
    const lifecycle = await dispatchEvent(mapped.event);
    const response = nativeResponse(options.host, payload.hook_event_name, lifecycle);
    if (response.stdout) process.stdout.write(response.stdout);
    if (response.stderr) process.stderr.write(response.stderr);
    return response.exitCode;
  }
  const options = flags(args, ['--root', '--task', '--event-id', '--type', '--config-file', '--action-ref', '--review-file', '--learning-file', '--limitations-file']);
  if (!options.root || !options.task || !options.eventId || !options.type)
    throw new TypeError('Usage: pegatus lifecycle --root <root> --task <task-id> --event-id <unique-id> --type <event> [--config-file <relative-file> ...] [--action-ref <ref> --review-file <review.json>]');
  if (options.type !== 'before-action' && (options.actionRef || options.reviewFile))
    throw new TypeError('Action review options apply only to before-action');
  const request = { root: path.resolve(cwd, options.root), taskId: options.task, id: options.eventId, type: options.type };
  if (options.files.length) request.affectedConfigFiles = options.files;
  const deps = {};
  if (options.limitationsFile) {
    if (options.type !== 'complete') throw new TypeError('Limitation review applies only to completion');
    try {
      const target = path.resolve(request.root, options.limitationsFile);
      await assertContained(request.root, target);
      const source = await readFile(target);
      if (source.length > 32768) throw new TypeError('Limitation review exceeds limit');
      const review = JSON.parse(source.toString('utf8'));
      deps.authorizeLimitations = async () => review;
    } catch {
      process.stdout.write(JSON.stringify({ status: 'blocked', evidence: [], reasons: ['limitation-review-unavailable'] }) + '\n');
      return 3;
    }
  }
  if (options.learningFile) {
    if (!['pre-compact', 'session-end'].includes(options.type)) throw new TypeError('Learning observations apply only to pre-compact or session-end');
    deps.collectLearning = await learningCollector(request.root, options.learningFile);
  }
  if (options.type === 'before-action') {
    request.actionRef = options.actionRef;
    if (options.reviewFile) {
      try {
        const target = path.resolve(request.root, options.reviewFile);
        await assertContained(request.root, target);
        const source = await readFile(target);
        if (source.length > 16384) throw new TypeError('Action review exceeds limit');
        const review = JSON.parse(source.toString('utf8'));
        deps.authorizeAction = async () => review;
      } catch {
        const blocked = { status: 'blocked', evidence: [], reasons: ['action-review-unavailable'] };
        process.stdout.write(JSON.stringify(blocked) + '\n');
        return 3;
      }
    }
  }
  const outcome = await dispatchEvent(request, deps);
  process.stdout.write(JSON.stringify(outcome) + '\n');
  return outcome.status === 'blocked' ? 3 : outcome.status === 'failed' ? 1 : 0;
}

function checkpointArgs(args) {
  if (args.length !== 5 || args[1] !== '--file' || args[3] !== '--expected-revision' || !/^\d+$/.test(args[4])) {
    throw new TypeError('Usage: pegatus checkpoint <task-id> --file <record.json> --expected-revision <number>');
  }
  return { taskId: args[0], file: args[2], expectedRevision: Number(args[4]) };
}

function git(repo, ...args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

async function currentRepositories(root, saved) {
  const result = [];
  for (const repo of saved.repos) {
    const target = path.resolve(root, repo.path);
    await assertContained(root, target);
    const head = git(target, 'rev-parse', 'HEAD');
    if (head === null) continue;
    const branch = git(target, 'symbolic-ref', '--short', 'HEAD') ?? 'HEAD';
    try {
      const dirty = await repositoryDirty(target);
      const fingerprint = await fingerprintRepository(target);
      const unverifiedSubmodules = await dirtySubmodules(target);
      result.push({ id: repo.id, branch, head, dirty, fingerprint, dirtySubmodules: unverifiedSubmodules });
    } catch (error) {
      result.push({ id: repo.id, error: error.message });
    }
  }
  return result;
}

async function runStateOperation(argv, cwd) {
  const [operation, ...args] = argv;
  if (operation === 'checkpoint') {
    const { taskId, file, expectedRevision } = checkpointArgs(args);
    let record;
    try { record = JSON.parse(await readFile(path.resolve(cwd, file), 'utf8')); }
    catch (error) { throw new Error(`Cannot read checkpoint JSON: ${error.message}`, { cause: error }); }
    if (record.taskId !== taskId) throw new TypeError('Checkpoint taskId does not match input record');
    const current = await currentRepositories(cwd, record);
    if (current.length !== record.repos.length || current.some(repo => repo.error)) {
      throw new Error('Cannot checkpoint: inspect missing or unreadable repositories');
    }
    const byId = new Map(current.map(repo => [repo.id, repo]));
    const snapshot = { ...record, repos: record.repos.map(repo => ({ ...repo, ...byId.get(repo.id) })) };
    const saved = await saveProgress(cwd, snapshot, { expectedRevision });
    process.stdout.write(JSON.stringify(saved) + '\n');
    return 0;
  }
  if (args.length !== 1) throw new TypeError(`Usage: pegatus ${operation} <task-id>`);
  const record = await loadProgress(cwd, args[0]);
  if (!record) throw new Error(`No progress record for ${args[0]}`);
  const reconciliation = reconcile(record, await currentRepositories(cwd, record));
  process.stdout.write(JSON.stringify({ operation, record, reconciliation }) + '\n');
  return operation === 'resume' && reconciliation.status === 'blocked' ? 3 : 0;
}

export async function main(argv, { cwd, home, securityPreflight, orchestrationCallbacks, userConfig } = {}) {
  if (!Array.isArray(argv) || typeof cwd !== 'string' || typeof home !== 'string') {
    throw new TypeError('main requires argv and cwd/home paths');
  }
  if (argv.length === 0 || argv.length === 1 && ['install','setup'].includes(argv[0])) return runSetup({cwd,home});
  if (argv.length === 1 && argv[0] === 'uninstall') return runUninstall({cwd,home});
  if (['--help', '-h', 'help'].includes(argv[0])) {
    process.stdout.write('Run pegatus (no arguments), setup, or install (no flags) in an interactive terminal for guided host detection and installation.\n');
    process.stdout.write('Run pegatus uninstall (no flags) for guided scope/root selection, installed host choices, removal preview and confirmation.\n');
    process.stdout.write('Usage: pegatus <operation> [options]\nOperations: ' + [...operations].join(', ') + '\nHost workflows: invoke installed pegatus-start, pegatus-design, pegatus-plan, pegatus-execute, pegatus-investigate, pegatus-review, pegatus-verify skills in your host. These are not CLI subcommands.\nPortable roles: role --host <host> --scope project --root <project> --user-root <defaults> --role <role-id>; consume the returned procedure and fixed selection in the coordinator.\n');
    return 0;
  }
  if (!operations.has(argv[0])) {
    process.stderr.write(hostWorkflows.has(argv[0]) ? `Host workflow: invoke installed pegatus-${argv[0]} in your host; this is not a CLI subcommand.\n` : `Unknown operation: ${argv[0]}\n`);
    return 2;
  }
  if (['lifecycle', 'hook-native', 'hook-activation'].includes(argv[0])) {
    try { return await runLifecycleCommand(argv, cwd); }
    catch (error) { process.stderr.write(`${error.message}\n`); return 2; }
  }
  if (argv[0] === 'orchestrate') {
    try {
      const result = await runOrchestrationCommand(argv, { cwd, callbacks: orchestrationCallbacks, userConfig });
      process.stdout.write(JSON.stringify(result) + '\n');
      return result.status === 'blocked' ? 3 : result.status === 'failed' ? 1 : 0;
    } catch (error) { process.stderr.write(`${error.message}\n`); return 2; }
  }
  if (['learn', 'memory'].includes(argv[0])) {
    try {
      const result = await runLearningCommand(argv, cwd);
      process.stdout.write(JSON.stringify(result) + '\n');
      return result.status === 'blocked' ? 3 : result.status === 'failed' ? 1 : 0;
    } catch (error) { process.stderr.write(`${error.message}\n`); return 2; }
  }
  if (['install','update','doctor','uninstall','role'].includes(argv[0])) {
    try {
      const result = await runAdministration(argv,{cwd,securityPreflight});
      process.stdout.write(JSON.stringify(result)+'\n');
      return result.status==='blocked'?3:result.status==='failed'?1:0;
    } catch(error) { process.stderr.write(`${error.message}\n`);return 2; }
  }
  if (argv[0] === 'security') {
    try {
      const options={files:[]};
      for(let index=1;index<argv.length;index+=2) {
        const flag=argv[index],value=argv[index+1];
        if(!value || value.startsWith('--')) throw new TypeError('Usage: pegatus security --root <explicit-root> --file <relative-config> [--file <relative-config> ...] [--exceptions <review.json>]');
        if(flag==='--file') options.files.push(value);
        else if(flag==='--root' && !options.root) options.root=path.resolve(cwd,value);
        else if(flag==='--exceptions' && !options.exceptionsPath) options.exceptionsPath=value;
        else throw new TypeError('Unsupported or duplicate security option');
      }
      if(!options.root || !options.files.length) throw new TypeError('Security requires explicit --root and --file scope');
      if(options.exceptionsPath) {
        const target=path.resolve(options.root,options.exceptionsPath);await assertContained(options.root,target);
        const record=JSON.parse(await readFile(target,'utf8'));
        if(record.schemaVersion!==1 || !Array.isArray(record.exceptions)) throw new TypeError('Invalid security exception review record');
        options.exceptions=record.exceptions;
      }
      const result=await scanAgentConfig(options);
      process.stdout.write(JSON.stringify(result)+'\n');
      return result.status==='blocked'?3:result.status==='failed'?1:0;
    } catch(error) {process.stderr.write(`${error.message}\n`);return 2;}
  }
  if (argv[0] === 'catalog') {
    if (argv[1] !== 'lint' || !(argv.length === 2 || argv.length === 4 && argv[2] === '--root')) {
      process.stderr.write('Usage: pegatus catalog lint [--root <package-root>]\n');
      return 2;
    }
    try {
      const root = argv[3] ? path.resolve(cwd,argv[3]) : fileURLToPath(new URL('../',import.meta.url));
      const findings = lintCatalog(await loadCatalog(root));
      for (const finding of findings) process.stderr.write(`${finding.severity}: ${finding.code}: ${finding.location}: ${finding.message}\n`);
      if (findings.some(finding=>finding.severity==='error')) return 1;
      process.stdout.write('catalog lint: ok\n');
      return 0;
    } catch (error) { process.stderr.write(`Cannot load catalog: ${error.message}\n`); return 1; }
  }
  if (['checkpoint', 'resume', 'status'].includes(argv[0])) {
    try { return await runStateOperation(argv, cwd); }
    catch (error) { process.stderr.write(`${error.message}\n`); return 1; }
  }
  process.stderr.write(`Operation not implemented: ${argv.join(' ')}\n`);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2), { cwd: process.cwd(), home: homedir() });
}
