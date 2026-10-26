const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0 && !/[\r\n\0]/.test(value);
const hosts = ['claude', 'codex', 'antigravity'];
const tiers = ['fast', 'standard', 'deep'];
const tierObjectives = Object.freeze({
  fast: 'Use a cheap, fast model for mechanical tasks with clear specifications.',
  standard: 'Use a balanced model for integration, debugging and multi-file coordination.',
  deep: 'Use the strongest suitable model for architecture, complex reasoning and difficult review.',
});
export const modelSelectionInstructions = 'Keep each catalog role in its assigned fast, standard or deep tier. Honor explicit project-over-user model/effort mappings; do not replace unsupported configured mappings automatically. When a tier is unconfigured, the trusted coordinator selects from the actual host spawn allowlist: fast: cheap, fast model for mechanical tasks; standard: balanced model for integration and debugging; deep: strongest suitable model for architecture and complex reasoning. Select and specify both model and effort using current host capability evidence, never guessed model names or unsupported effort values. Record the selected pair, tier and reason in task evidence before spawning. Follow the actual spawn tool contract, including fork restrictions. If explicit selection or capability evidence is unavailable, disclose the limitation and retain host defaults. Workers cannot change their own model/effort or assigned tier.';
export const tokenDefaults = Object.freeze({ maxContextChars: 32768, maxContextRefs: 128, maxOutputChars: 16384, maxSummaryChars: 4096 });

export function resolveTokenControls(input = {}) {
  if (!object(input) || Object.keys(input).some(key => !Object.hasOwn(tokenDefaults, key))) throw new TypeError('Invalid tokenControls fields');
  const limits = { ...tokenDefaults, ...input };
  for (const [key, value] of Object.entries(limits)) {
    const min = key === 'maxContextRefs' ? 1 : key === 'maxContextChars' ? 512 : 128;
    const max = key === 'maxContextRefs' ? 4096 : 1048576;
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`tokenControls.${key} limit must be ${min}..${max}`);
  }
  return limits;
}

export function validateModelMapping(value) {
  if (typeof value === 'string' && text(value)) return { model: value, effort: null };
  if (!object(value) || Object.keys(value).some(key => !['model', 'effort'].includes(key))
    || !text(value.model) || (value.effort !== undefined && !text(value.effort))) throw new TypeError('Invalid model/effort mapping');
  return { model: value.model, effort: value.effort ?? null };
}

/** This is a team's explicit declaration, never automatic host discovery or qualification. */
export function validateModelCapabilities(value) {
  if (!object(value) || !text(value.source) || !Array.isArray(value.models)
    || Object.keys(value).some(key => !['source', 'models'].includes(key))) throw new TypeError('Model capabilities require source and models');
  const seen = new Set();
  for (const item of Array.from(value.models)) {
    if (!object(item) || !text(item.model) || seen.has(item.model) || !Array.isArray(item.efforts)
      || Array.from(item.efforts).some(effort => !text(effort)) || new Set(item.efforts).size !== item.efforts.length
      || Object.keys(item).some(key => !['model', 'efforts'].includes(key))) throw new TypeError('Invalid model capabilities or efforts');
    seen.add(item.model);
  }
  return value;
}

/** Preserve only actual numeric measurements and nulls supplied by the host/caller.
 * No provider request, estimates, inferred totals, or fabricated zero values. */
export function recordUsage({ source, values = null } = {}) {
  if (!text(source)) throw new TypeError('Usage source is required');
  if (values !== null && (!object(values) || Object.entries(values).some(([key, value]) => !text(key)
    || (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0))))) throw new TypeError('Invalid usage metric');
  const available = values !== null && Object.values(values).some(value => value !== null);
  return { schemaVersion: 1, source, available, values: available ? { ...values } : null };
}

/** Resolve the catalog role's fixed tier. Missing mappings request host-coordinator selection.
 * configured means declared by the team, not observed native enforcement. */
export function resolveRoleTier(role, { host, models = {}, modelCapabilities } = {}) {
  if (!hosts.includes(host) || !object(models)) throw new TypeError('Host and fixed models are required');
  if (modelCapabilities !== undefined) validateModelCapabilities(modelCapabilities);
  const tier = role?.modelTier;
  const value = tiers.includes(tier) ? models[tier] : undefined;
  const requested = value === undefined ? null : validateModelMapping(value);
  const resolved = { host, tier: tier ?? null, requested, model: null, effort: null, mode: 'host-default',
    support: 'unknown', qualified: false, evidenceSource: modelCapabilities?.source ?? null, warnings: [] };
  let reason;
  if (!tiers.includes(tier)) reason = `Unsupported role tier ${tier}`;
  else if (!requested) {
    resolved.mode = host === 'antigravity' ? 'instruction-only' : 'coordinator-selection';
    resolved.selectionPolicy = { owner: 'coordinator', tier, objective: tierObjectives[tier],
      requireExplicitPair: true, instructions: modelSelectionInstructions };
    resolved.warnings.push(`No configured ${host} ${tier} model; coordinator selection required before spawning. Host defaults remain until a supported pair is selected; native enforcement is unverified.`);
  }
  else if (host === 'antigravity') { resolved.mode = 'instruction-only'; reason = 'Native model/effort role mapping is unverified'; }
  else if (!modelCapabilities) reason = `Exact ${host} model/effort support is unknown for ${tier}`;
  else {
    const declared = modelCapabilities.models.find(item => item.model === requested.model);
    if (!declared) reason = `Configured ${host} ${tier} model is unsupported by the team declaration`;
    else if (requested.effort !== null && !declared.efforts.includes(requested.effort)) reason = `Configured ${host} ${tier} effort is unsupported by the team declaration`;
    else if (host === 'claude' && requested.effort !== null && !['low', 'medium', 'high', 'xhigh', 'max'].includes(requested.effort)) reason = `Configured Claude effort has no documented native field value`;
    else {
      resolved.model = requested.model; resolved.effort = requested.effort;
      resolved.mode = 'configured'; resolved.support = 'team-declared';
    }
  }
  if (reason) resolved.warnings.push(`${reason}; host default retained. Fixed mapping requires team configuration; agents must not choose replacements.`);
  return resolved;
}

/** Reference-only packet. Instructions and relevant context are mandatory, never silently
 * cut to fit: overflow is blocked and the coordinator must narrow retrieval or raise limits.
 * Bodies stay in their authoritative source, not duplicated into the manifest. */
export function buildContextManifest({ instructionPaths = [], knowledgeRefs = [], resources = [], evidenceRefs = [] } = {}, controls = {}) {
  const limits = resolveTokenControls(controls);
  const instructions = [], dynamic = [], seen = new Set();
  const add = (value, kind) => {
    const ref = typeof value === 'string' ? value : value?.path ?? value?.outputPath;
    if (!text(ref)) throw new TypeError('Context reference path is required');
    const key = `${kind}\0${ref}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (kind === 'instruction') instructions.push(ref); else dynamic.push({ kind, ref });
  };
  for (const [values, kind] of [[instructionPaths, 'instruction'], [knowledgeRefs, 'knowledge'], [resources, 'resource'], [evidenceRefs, 'evidence']]) {
    if (!Array.isArray(values)) throw new TypeError('Context references must be arrays');
    for (const value of values) add(value, kind);
  }
  const manifest = { schemaVersion: 1, status: 'passed', reason: null, limits, requiredCount: seen.size, instructions, dynamic };
  if (seen.size > limits.maxContextRefs || JSON.stringify(manifest).length > limits.maxContextChars)
    return { ...manifest, status: 'blocked', reason: 'required-context-exceeds-budget', instructions: [], dynamic: [] };
  return manifest;
}

/** Caller retains the complete output at fullOutputRef before presenting this preview.
 * This pure function never writes a log or claims the supplied reference was verified. */
export function limitOutput(value, { maxChars = tokenDefaults.maxOutputChars, fullOutputRef } = {}) {
  if (typeof value !== 'string' || !Number.isSafeInteger(maxChars) || maxChars < 1 || maxChars > 1048576) throw new TypeError('Output text and positive maxChars limit are required');
  if (fullOutputRef !== undefined && !text(fullOutputRef)) throw new TypeError('Invalid fullOutputRef');
  if (value.length <= maxChars) return { text: value, truncated: false, originalChars: value.length, fullOutputRef: fullOutputRef ?? null };
  if (!text(fullOutputRef)) throw new TypeError('Truncated output requires a retained fullOutputRef');
  const marker = `\n[TRUNCATED; full output: ${fullOutputRef}]`;
  if (marker.length > maxChars) throw new TypeError('Output limit cannot fit the fullOutputRef truncation marker');
  let head = value.slice(0, maxChars - marker.length);
  if (/[\uD800-\uDBFF]$/.test(head)) head = head.slice(0, -1);
  return { text: head + marker, truncated: true, originalChars: value.length, fullOutputRef };
}

/** Checkpoint text is written by the coordinator; log bodies cannot enter the result. */
export function checkpointSummary({ summary, logs = [] } = {}, controls = {}) {
  const limits = resolveTokenControls(controls);
  if (!Array.isArray(logs)) throw new TypeError('Checkpoint logs must be an array');
  const refs = [...new Set(logs.map(log => {
    const ref = typeof log === 'string' ? log : log?.outputPath;
    if (!text(ref)) throw new TypeError('Checkpoint log outputPath is required');
    return ref;
  }))];
  const preview = limitOutput(summary, { maxChars: limits.maxSummaryChars, ...(refs.length ? { fullOutputRef: refs.join(', ') } : {}) });
  if (preview.truncated) {
    const marker = `\n[TRUNCATED; supporting logs: ${refs.join(', ')}]`;
    if (marker.length > limits.maxSummaryChars) throw new TypeError('Summary limit cannot fit supporting log references');
    let head = summary.slice(0, limits.maxSummaryChars - marker.length);
    if (/[\uD800-\uDBFF]$/.test(head)) head = head.slice(0, -1);
    preview.text = head + marker;
  }
  const result = { schemaVersion: 1, summary: preview.text, truncated: preview.truncated, logs: refs };
  if (refs.length > limits.maxContextRefs || JSON.stringify(result).length > limits.maxContextChars) throw new TypeError('Checkpoint log references exceed context limit');
  return result;
}
