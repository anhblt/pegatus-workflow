import path from 'node:path';
import { tokenDefaults, resolveTokenControls, validateModelMapping, validateModelCapabilities } from './telemetry/usage.mjs';

const defaults = Object.freeze({
  schemaVersion: 1,
  repositories: [],
  knowledge: null,
  hostModels: {},
  hostModelCapabilities: {},
  tokenControls: tokenDefaults,
  concurrency: 2,
  repairLimit: 3,
  evidenceExclusions: [],
});

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');
const clone = value => Array.isArray(value) ? value.map(clone) : isObject(value)
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;

function merge(base, override, keys = []) {
  const result = clone(base);
  for (const [key, value] of Object.entries(override)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new TypeError(`Unsafe config key: ${key}`);
    // A tier is an atomic model/effort pair: changing the model cannot inherit old effort.
    const tier = keys[0] === 'hostModels' && keys.length === 2;
    const declaration = keys[0] === 'hostModelCapabilities' && keys.length === 1;
    result[key] = !tier && !declaration && isObject(value) && isObject(base[key]) ? merge(base[key], value, [...keys, key]) : clone(value);
  }
  return result;
}

function relativeRoot(value, label) {
  if (!nonempty(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw new TypeError(`${label} must be a nonempty relative path`);
  }
  const parts = value.split(/[\\/]/);
  if (parts.includes('..') || parts.some(part => part === '')) throw new TypeError(`${label} must stay within its root`);
}

function commandSpec(value, label) {
  if (!isObject(value) || !nonempty(value.command)) throw new TypeError(`${label}.command must name an executable`);
  const executable = value.command.trim();
  if (/[\r\n|&;<>`]/.test(executable) || (executable.includes(' ') && !/[\\/]/.test(executable))) {
    throw new TypeError(`${label}.command must be one executable, with shell syntax in args`);
  }
  if (!Array.isArray(value.args) || Array.from(value.args).some(arg => typeof arg !== 'string' || arg.includes('\0'))) {
    throw new TypeError(`${label}.args must be a string array`);
  }
  relativeRoot(value.cwd, `${label}.cwd`);
  if (!Array.isArray(value.requires) || Array.from(value.requires).some(item => !nonempty(item))) {
    throw new TypeError(`${label}.requires must be a string array`);
  }
  const base = path.win32.basename(executable).toLowerCase().replace(/\.exe$/, '');
  const isShell = ['bash', 'sh', 'zsh', 'pwsh', 'powershell', 'cmd'].includes(base);
  const declaredShell = nonempty(value.shell) && !/[\\/]/.test(value.shell)
    ? value.shell.trim().toLowerCase().replace(/\.exe$/, '') : null;
  if (isShell && declaredShell !== base) throw new TypeError(`${label}.shell must explicitly declare ${base}`);
  if (value.shell !== undefined && (!isShell || declaredShell !== base)) {
    throw new TypeError(`${label}.shell must match a supported shell executable`);
  }
}

function validate(config) {
  if (config.schemaVersion !== 1) throw new TypeError('Unsupported schemaVersion');
  if (!Number.isSafeInteger(config.concurrency) || config.concurrency < 1) throw new TypeError('concurrency must be a positive integer');
  if (!Number.isSafeInteger(config.repairLimit) || config.repairLimit < 0) throw new TypeError('repairLimit must be a nonnegative integer');
  if (!Array.isArray(config.repositories)) throw new TypeError('repositories must be an array');
  const ids = new Set();
  for (const [index, repository] of config.repositories.entries()) {
    const label = `repositories[${index}]`;
    if (!isObject(repository) || !nonempty(repository.id)) throw new TypeError(`${label}.id is required`);
    if (ids.has(repository.id)) throw new TypeError(`Duplicate repository ID: ${repository.id}`);
    ids.add(repository.id);
    relativeRoot(repository.path, `${label}.path`);
    if (!Array.isArray(repository.verify)) throw new TypeError(`${label}.verify must be an array`);
    Array.from(repository.verify).forEach((command, commandIndex) => commandSpec(command, `${label}.verify[${commandIndex}]`));
  }
  if (config.knowledge !== null) {
    if (!isObject(config.knowledge)) throw new TypeError('knowledge must be an object or null');
    if (config.knowledge.paths !== undefined) {
      if (!Array.isArray(config.knowledge.paths)) throw new TypeError('knowledge.paths must be an array');
      config.knowledge.paths.forEach((value, index) => relativeRoot(value, `knowledge.paths[${index}]`));
    }
    if (config.knowledge.discovery !== undefined) {
      if (!Array.isArray(config.knowledge.discovery)) throw new TypeError('knowledge.discovery must be an array');
      Array.from(config.knowledge.discovery).forEach((value, index) => commandSpec(value, `knowledge.discovery[${index}]`));
    }
  }
  if (!isObject(config.hostModels)) throw new TypeError('hostModels must be an object');
  for (const [host, tiers] of Object.entries(config.hostModels)) {
    if (!['claude', 'codex', 'antigravity'].includes(host) || !isObject(tiers)) throw new TypeError(`Invalid hostModels entry: ${host}`);
    for (const [tier, model] of Object.entries(tiers)) {
      if (!['fast', 'standard', 'deep'].includes(tier)) throw new TypeError(`Invalid hostModels.${host}.${tier}`);
      validateModelMapping(model);
    }
  }
  if (!isObject(config.hostModelCapabilities)) throw new TypeError('hostModelCapabilities must be an object');
  for (const [host, capabilities] of Object.entries(config.hostModelCapabilities)) {
    if (!['claude', 'codex', 'antigravity'].includes(host)) throw new TypeError(`Invalid model capabilities host: ${host}`);
    validateModelCapabilities(capabilities);
  }
  config.tokenControls = resolveTokenControls(config.tokenControls);
  if (!Array.isArray(config.evidenceExclusions) || config.evidenceExclusions.some(value => !nonempty(value))) {
    throw new TypeError('evidenceExclusions must be a string array');
  }
  return config;
}

export function resolveConfig({ user = {}, project = {} } = {}) {
  if (!isObject(user) || !isObject(project)) throw new TypeError('user and project config must be objects');
  return validate(merge(merge(defaults, user), project));
}
