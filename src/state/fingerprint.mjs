import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { lstat, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';

const scratch = file => file === '.pegatus/work' || file.startsWith('.pegatus/work/')
  || file === '.superpowers' || file.startsWith('.superpowers/');

function git(repo, args, { encoding = 'utf8' } = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Git ${args[0]} failed in ${repo}: ${result.error?.message ?? String(result.stderr).trim()}`);
  return result.stdout;
}

function names(repo, args) {
  return git(repo, [...args, '-z'], { encoding: 'buffer' }).toString('utf8').split('\0').filter(Boolean).filter(file => !scratch(file));
}

async function assertRepoRoot(repo) {
  const actual = await realpath(repo);
  const top = git(repo, ['rev-parse', '--show-toplevel']).trim();
  if (actual !== await realpath(top)) throw new Error(`Expected repository root: ${repo}`);
}

export async function fingerprintRepository(repo) {
  await assertRepoRoot(repo);
  const files = [...new Set(names(repo, ['ls-files', '--cached', '--others', '--exclude-standard']))].sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file).update('\0');
    const target = path.join(repo, ...file.split('/'));
    let entry;
    try { entry = await lstat(target); }
    catch (error) { if (error.code === 'ENOENT') { hash.update('deleted\0'); continue; } throw error; }
    if (entry.isSymbolicLink()) {
      hash.update('symlink\0').update(await readlink(target)).update('\0');
    } else if (entry.isFile()) {
      hash.update('file\0');
      for await (const chunk of createReadStream(target)) hash.update(chunk);
      hash.update('\0');
    } else if (entry.isDirectory()) {
      hash.update('directory\0');
      const submodule = spawnSync('git', ['-C', target, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true });
      hash.update(submodule.status === 0 ? submodule.stdout.trim() : 'unavailable').update('\0');
    } else {
      hash.update('other\0');
    }
  }
  return hash.digest('hex');
}

export async function repositoryDirty(repo) {
  await assertRepoRoot(repo);
  if (names(repo, ['ls-files', '--others', '--exclude-standard']).length) return true;
  const result = spawnSync('git', ['-C', repo, 'diff', 'HEAD', '--quiet', '--', '.', ':(exclude).pegatus/work/**', ':(exclude).superpowers/**'], { encoding: 'utf8', windowsHide: true });
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  throw new Error(`Git diff failed in ${repo}: ${result.error?.message ?? result.stderr.trim()}`);
}
