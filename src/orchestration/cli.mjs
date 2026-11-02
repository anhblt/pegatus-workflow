import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertContained } from '../paths.mjs';
import { resolveConfig } from '../config.mjs';
import { loadProgress } from '../state/store.mjs';
import { schedule, completed, workerLimit } from './graph.mjs';
import { runOrchestration } from './coordinator.mjs';

async function jsonFile(root, relative, optional = false) {
  const target = path.resolve(root, relative);
  await assertContained(root, target);
  let source;
  try { source = await readFile(target); }
  catch (error) { if (optional && error.code === 'ENOENT') return {}; throw error; }
  if (source.length > 262144) throw new TypeError('Orchestration configuration exceeds limit');
  return JSON.parse(source.toString('utf8'));
}

/** CLI plan is explicitly planning-only. Execution is available to a host
 * wrapper injecting callbacks; the standalone binary never starts a worker. */
export async function runOrchestrationCommand(argv, { cwd, callbacks = {}, userConfig = {} } = {}) {
  const [, operation, ...args] = argv;
  if (!['plan', 'run'].includes(operation)) throw new TypeError('Usage: pegatus orchestrate plan|run --root <root> --task <task-id> [--concurrency <n>] [--host <host>] [--capabilities-file <relative-json>]');
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!['--root', '--task', '--concurrency', '--host', '--capabilities-file'].includes(flag)
      || !value || value.startsWith('--') || options[flag]) throw new TypeError('Invalid or duplicate orchestration option');
    options[flag] = value;
  }
  if (!options['--root'] || !options['--task']) throw new TypeError('Orchestration requires explicit root and task');
  const root = path.resolve(cwd, options['--root']), taskId = options['--task'];
  const config = resolveConfig({ user: userConfig, project: await jsonFile(root, '.pegatus/config.json', true) });
  const concurrency = options['--concurrency'] ? Number(options['--concurrency']) : config.concurrency;
  const capabilities = options['--capabilities-file'] ? await jsonFile(root, options['--capabilities-file']) : {};
  if (options['--capabilities-file'] && capabilities.schemaVersion !== 1) throw new TypeError('Unsupported capabilities schemaVersion');
  workerLimit({ concurrency, capabilities });
  const host = options['--host'];
  if (host && !['claude', 'codex', 'antigravity'].includes(host)) throw new TypeError('Unknown orchestration host');
  if (operation === 'run') return runOrchestration({ root, taskId, concurrency, capabilities, tokenControls: config.tokenControls,
    host, models: config.hostModels[host], modelCapabilities: config.hostModelCapabilities[host] }, callbacks);
  const record = await loadProgress(root, taskId);
  if (!record) return { status: 'blocked', evidence: [], reasons: ['task-record-not-found'], planningOnly: true };
  const batches = schedule(record.tasks, { concurrency, capabilities }).map(batch => batch.map(task => task.id));
  const planned = new Set(batches.flat());
  return { status: 'skipped', evidence: [], reasons: ['planning-only-no-workers-dispatched'], planningOnly: true,
    mode: capabilities.delegation === true ? 'delegated' : 'inline', concurrency: workerLimit({ concurrency, capabilities }),
    batches, unresolved: record.tasks.filter(task => !completed(task) && !planned.has(task.id)).map(task => task.id) };
}
