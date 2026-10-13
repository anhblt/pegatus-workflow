#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertContained } from '../src/paths.mjs';
import { loadProgress, saveProgress } from '../src/state/store.mjs';
import { reconcile } from '../src/state/reconcile.mjs';
import { dirtySubmodules, fingerprintRepository, repositoryDirty } from '../src/state/fingerprint.mjs';
import { loadCatalog } from '../src/catalog/manifest.mjs';
import { lintCatalog } from '../src/catalog/lint.mjs';
import { fileURLToPath } from 'node:url';

const operations = new Set([
  'start', 'design', 'plan', 'execute', 'investigate', 'review', 'verify',
  'checkpoint', 'resume', 'learn', 'memory', 'security', 'status',
  'install', 'update', 'doctor', 'uninstall', 'catalog',
]);

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

export async function main(argv, { cwd, home } = {}) {
  if (!Array.isArray(argv) || typeof cwd !== 'string' || typeof home !== 'string') {
    throw new TypeError('main requires argv and cwd/home paths');
  }
  if (argv.length === 0 || ['--help', '-h', 'help'].includes(argv[0])) {
    process.stdout.write('Usage: pegatus <operation> [options]\nOperations: ' + [...operations].join(', ') + '\n');
    return 0;
  }
  if (!operations.has(argv[0])) {
    process.stderr.write(`Unknown operation: ${argv[0]}\n`);
    return 2;
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
  process.exitCode = await main(process.argv.slice(2), { cwd: process.cwd(), home: process.env.HOME ?? process.env.USERPROFILE ?? '' });
}
