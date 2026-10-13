import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { assertContained } from '../paths.mjs';

/** Package-root snapshot: the linter is pure and callers may inspect findings. */
export async function loadCatalog(root) {
  root = path.resolve(root);
  const manifest = JSON.parse(await readFile(path.join(root, 'catalog/manifest.json'), 'utf8'));
  const sourceLock = JSON.parse(await readFile(path.join(root, 'sources.lock.json'), 'utf8'));
  const files = {}, documents = {};
  async function visit(directory) {
    for (const entry of await readdir(directory, {withFileTypes:true})) {
      const file = await assertContained(root, path.join(directory,entry.name));
      if (entry.isDirectory()) await visit(file);
      else {
        const relative = path.relative(root,file).split(path.sep).join('/');
        files[relative] = await readFile(file);
        if (relative.endsWith('.md')) documents[relative] = files[relative].toString('utf8');
      }
    }
  }
  for (const directory of ['catalog','vendor']) await visit(path.join(root,directory));
  for (const entry of [...(manifest.skills??[]),...(manifest.agents??[]),...(manifest.rules??[]),...(manifest.commands??[])]) {
    for (const resource of entry.resources??[]) {
      if (files[resource]) continue;
      try {
        const file = await assertContained(root,path.resolve(root,resource));
        files[resource] = await readFile(file);
      } catch { /* lint reports absent or escaping declared resources */ }
    }
  }
  return {...manifest, root, sourceLock, files, documents};
}

/** Activation is conservative discovery assistance, never semantic instruction authority.
 * tasks are normalized by a trusted caller after reading the task and project stack.
 */
export function selectSkills(catalog, task) {
  return catalog.skills.filter(skill => {
    const scope = skill.activation;
    if (scope.stack && scope.stack !== task.stack) return false;
    if (!scope.tasks?.includes(task.task)) return false;
    if (scope.frameworks && !scope.frameworks.includes(task.framework)) return false;
    if (scope.testFramework && scope.testFramework !== task.testFramework) return false;
    if (scope.minVersion && !(task.version >= scope.minVersion)) return false;
    return true;
  });
}

/** Read the overlay first; raw upstream summaries may combine multiple frameworks. */
export function selectResources(skill, task) {
  return skill.resources.filter(resource => {
    const gate = skill.resourceScopes?.[resource];
    return !gate || ((!gate.frameworks || gate.frameworks.includes(task.framework)) && (!gate.minVersion || task.version >= gate.minVersion) && (!gate.tasks || gate.tasks.includes(task.task)));
  });
}

export function validateHandoff(role, brief) {
  return role.handoff.required.filter(key => brief[key] === undefined || !Array.isArray(brief[key]) && typeof brief[key] !== 'string' ||
    ['instructionPaths','scope','ownedPaths','checks'].includes(key) && (brief[key].length === 0)).map(key => ({code:'missing-handoff-input',field:key}));
}

export function workflowRoute(catalog, {classification,approved=[]}) {
  const route = catalog.workflow.routes[classification];
  if (!route) throw new TypeError(`Unknown classification: ${classification}`);
  return {...route,canImplement:route.implementation && route.approvals.every(gate=>approved.includes(gate))};
}
