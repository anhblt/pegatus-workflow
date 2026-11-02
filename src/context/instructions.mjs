import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { assertContained } from '../paths.mjs';

/** Focused host discovery, not Markdown policy interpretation or universal precedence.
 * host may be a name or {name, home, codexHome}; explicit homes make tests portable.
 * Rules remain candidates whose activation/path conditions require agent review.
 */
export async function discoverInstructions({ root, targetPaths = [], host }) {
  root = await assertContained(root, root);
  const options = typeof host === 'string' ? { name: host } : host;
  if (!['codex', 'claude', 'antigravity'].includes(options?.name)) throw new TypeError('Unknown instruction host');
  const home = options.home ?? os.homedir();
  const context = { root, host: options.name, targetPaths: [], instructions: [], trace: [], semanticReviewRequired: true };
  const directories = new Set([root]);
  for (const target of targetPaths) {
    const file = await assertContained(root, path.resolve(root, target));
    const directory = await stat(file).then(info => info.isDirectory()).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return /[\\/]$/.test(target);
    });
    context.targetPaths.push({ path: file, directory });
    let current = directory ? file : path.dirname(file);
    while (true) {
      directories.add(current);
      if (current === root) break;
      current = path.dirname(current);
    }
  }
  const seen = new Set();
  async function probe(file, scope, boundary, kind = 'instruction') {
    file = await assertContained(boundary, file);
    if (seen.has(file)) return true;
    try {
      const content = await readFile(file, 'utf8');
      seen.add(file);
      context.trace.push({ operation: 'instruction-probe', path: file, found: true });
      context.instructions.push({
        path: file, scope, kind, content,
        // Hints aid reading only. They never grant permission or become commands.
        references: [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]),
        commandHints: [...content.matchAll(/```(?:sh|bash|powershell|pwsh|cmd|shell)\s*\r?\n([\s\S]*?)```/g)].map(match => match[1].trim()),
      });
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      context.trace.push({ operation: 'instruction-probe', path: file, found: false });
      return false;
    }
  }
  async function codex(directory, boundary, scope) {
    if (!await probe(path.join(directory, 'AGENTS.override.md'), scope, boundary)) {
      await probe(path.join(directory, 'AGENTS.md'), scope, boundary);
    }
  }
  async function rules(directory, boundary, scope) {
    directory = await assertContained(boundary, directory);
    context.trace.push({ operation: 'rule-directory', path: directory });
    const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return [];
    });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await rules(file, boundary, scope);
      else if (entry.name.endsWith('.md')) await probe(file, scope, boundary, 'rule');
    }
  }
  // A nonexistent test/user home has no global instructions to discover.
  const homeExists = await stat(home).then(info => info.isDirectory()).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return false;
  });
  if (homeExists) {
    if (options.name === 'codex') {
      const codexHome = options.codexHome ?? path.join(home, '.codex');
      // An explicitly supplied Codex home is its own trusted user boundary.
      const exists = await stat(codexHome).then(info => info.isDirectory()).catch(error => {
        if (error.code !== 'ENOENT') throw error;
        return false;
      });
      if (exists) await codex(codexHome, codexHome, 'user');
    } else await probe(path.join(home, options.name === 'claude' ? '.claude/CLAUDE.md' : '.gemini/GEMINI.md'), 'user', home);
  }
  if (options.name === 'antigravity') await rules(path.join(root, '.agents/rules'), root, root);
  else for (const directory of [...directories].sort((a, b) => a.length - b.length || a.localeCompare(b))) {
    if (options.name === 'codex') await codex(directory, root, directory);
    else {
      await probe(path.join(directory, 'CLAUDE.md'), directory, root);
      await probe(path.join(directory, '.claude/CLAUDE.md'), directory, root);
      await rules(path.join(directory, '.claude/rules'), root, directory);
    }
  }
  return context;
}
