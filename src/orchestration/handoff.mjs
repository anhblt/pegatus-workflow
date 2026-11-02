import { buildContextManifest, resolveRoleTier, resolveTokenControls } from '../telemetry/usage.mjs';
import { ownedPaths } from './ownership.mjs';

const text = value => typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');
const block = reason => ({ schemaVersion: 1, status: 'blocked', reason, evidence: [], reasons: [reason] });

/** Construct from saved coordinator context and existing user approval. The
 * context manifest carries mandatory references; bodies/extra worker claims do
 * not become instructions or approval. Required fields are never truncated. */
export function buildHandoff(task, context = {}) {
  const limits = resolveTokenControls(context.tokenControls);
  if (!Array.isArray(context.instructionPaths) || !context.instructionPaths.length || !context.instructionPaths.every(text))
    return block('instruction-references-required');
  const read = context.resolution?.readInstructions;
  if (!Array.isArray(read) || !read.every(text) || context.instructionPaths.some(ref => !read.includes(ref))
    || context.instructions?.some(instruction => !read.includes(instruction.path))) return block('instruction-review-provenance-required');
  if (!text(context.approvedScopeHash) || !Array.isArray(context.approvals)
    || !context.approvals.some(approval => approval?.kind === 'design'
      && approval.scopeHash === context.approvedScopeHash && text(approval.evidence))) return block('approved-scope-required');
  if (!text(task.scope) || !Array.isArray(task.checks) || !task.checks.length
    || !Array.isArray(task.dependsOn)) return block('scope-dependencies-checks-required');
  const dependencyRecords = (context.dependencyRecords ?? []).map(({ id, status, workerRecordPath, evidence = [] }) => ({
    workerId: id, status, ...(workerRecordPath ? { workerRecordPath } : {}), evidence,
  }));
  const dependencyRefs = dependencyRecords.flatMap(record => [...record.evidence, ...(record.workerRecordPath ? [record.workerRecordPath] : [])]);
  const contextManifest = buildContextManifest({ instructionPaths: context.instructionPaths,
    knowledgeRefs: context.knowledgeRefs, resources: context.resources, evidenceRefs: [...(context.evidenceRefs ?? []), ...dependencyRefs] }, limits);
  if (contextManifest.status !== 'passed') return block(contextManifest.reason);
  const approvals = context.approvals.filter(approval => approval.scopeHash === context.approvedScopeHash)
    .map(({ kind, scopeHash, evidence }) => ({ kind, scopeHash, evidence }));
  const brief = { schemaVersion: 1, status: 'passed', workerId: task.id,
    instructionPaths: [...context.instructionPaths], contextManifest,
    instructionReview: { readInstructions: [...context.instructionPaths] },
    scope: task.scope, approvedScopeHash: context.approvedScopeHash, approvals,
    ownedPaths: ownedPaths(task), dependencies: [...task.dependsOn], dependencyRecords: structuredClone(dependencyRecords), checks: structuredClone(task.checks),
    expectedOutput: 'changedPaths, evidence references, openIssues, knowledgeCandidates; report interruption or changedInterfaces',
    ...(task.role ? { role: structuredClone(task.role), model: resolveRoleTier(task.role, {
      host: context.host, models: context.models ?? {}, modelCapabilities: context.modelCapabilities }) } : {}),
    ...(context.workerRecordPath ? { workerRecordPath: context.workerRecordPath, attemptId: context.attemptId } : {}) };
  if (JSON.stringify(brief).length > limits.maxContextChars) return block('required-handoff-exceeds-budget');
  return brief;
}
