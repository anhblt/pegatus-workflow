import { ownedPaths, overlappingOwnership } from './ownership.mjs';

export const completed = task => ['done', 'completed'].includes(task.status);
export const pending = task => task.status === undefined || task.status === 'pending';
export const validWorkerId = value => typeof value === 'string' && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value);

export function validateGraph(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError('Tasks must be an array');
  const byId = new Map();
  for (const task of tasks) {
    if (!validWorkerId(task?.id)) throw new TypeError('Invalid worker task id');
    if (byId.has(task.id)) throw new TypeError(`Duplicate task id: ${task.id}`);
    if (task.status !== undefined && !['pending', 'running', 'done', 'completed', 'failed', 'interrupted', 'blocked'].includes(task.status))
      throw new TypeError('Unsupported orchestration task status');
    ownedPaths(task);
    if (!Array.isArray(task.dependsOn) || task.dependsOn.some(id => !validWorkerId(id))
      || new Set(task.dependsOn).size !== task.dependsOn.length) throw new TypeError('Invalid task dependencies');
    byId.set(task.id, task);
  }
  const visiting = new Set(), visited = new Set();
  const visit = task => {
    if (visiting.has(task.id)) throw new TypeError(`Dependency cycle at ${task.id}`);
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    for (const id of task.dependsOn) {
      if (!byId.has(id)) throw new TypeError(`Unknown dependency: ${id}`);
      visit(byId.get(id));
    }
    visiting.delete(task.id); visited.add(task.id);
  };
  tasks.forEach(visit);
  return byId;
}

/** Capability is an explicit host/coordinator declaration, never guessed from a
 * host name or the existence of model credentials. Unknown means inline. */
export function workerLimit({ concurrency = 2, capabilities = {} } = {}) {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) throw new TypeError('concurrency must be a positive integer');
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)
    || capabilities.delegation !== undefined && typeof capabilities.delegation !== 'boolean') throw new TypeError('Invalid delegation capabilities');
  if (capabilities.maxWorkers !== undefined && (!Number.isSafeInteger(capabilities.maxWorkers) || capabilities.maxWorkers < 1))
    throw new TypeError('Host maxWorkers must be a positive integer');
  return capabilities.delegation === true ? Math.min(concurrency, capabilities.maxWorkers ?? concurrency) : 1;
}

/** Planning-only waves: prior waves are assumed successful. Execution must
 * recalculate readiness from real worker outcomes after each wave. */
export function schedule(tasks, options = {}) {
  validateGraph(tasks);
  const limit = workerLimit(options), done = new Set(tasks.filter(completed).map(task => task.id));
  const active = tasks.filter(task => task.status === 'running');
  const available = Math.max(0, limit - active.length);
  if (!available) return [];
  const remaining = tasks.filter(pending).filter(task => !active.some(worker => overlappingOwnership(ownedPaths(task), ownedPaths(worker))));
  const batches = [];
  for (;;) {
    const batch = [];
    for (const task of remaining) {
      if (done.has(task.id) || !task.dependsOn.every(id => done.has(id))) continue;
      if (batch.some(other => overlappingOwnership(ownedPaths(task), ownedPaths(other)))) continue;
      batch.push(task);
      if (batch.length === available) break;
    }
    if (!batch.length) break;
    batches.push(batch);
    batch.forEach(task => done.add(task.id));
  }
  return batches;
}
