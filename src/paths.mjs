import { realpath, stat, lstat } from 'node:fs/promises';
import path from 'node:path';

async function canonicalize(target) {
  const missing = [];
  let current = target;
  while (true) {
    try {
      const resolved = await realpath(current);
      return path.join(resolved, ...missing.reverse());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // A dangling link is not a safe nonexistent path: it may later resolve elsewhere.
      try {
        const entry = await lstat(current);
        if (entry.isSymbolicLink()) throw new Error(`Cannot contain dangling link: ${current}`);
      } catch (entryError) {
        if (entryError.code !== 'ENOENT') throw entryError;
      }
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

export async function assertContained(root, target) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || typeof target !== 'string' || !path.isAbsolute(target)) {
    throw new TypeError('root and target must be absolute paths');
  }
  const canonicalRoot = await realpath(root);
  if (!(await stat(canonicalRoot)).isDirectory()) throw new TypeError('root must be a directory');
  const canonicalTarget = await canonicalize(target);
  // realpath gives existing components their filesystem casing. A text prefix
  // check then also handles Windows directories with case sensitivity enabled.
  const prefix = canonicalRoot.endsWith(path.sep) ? canonicalRoot : `${canonicalRoot}${path.sep}`;
  if (canonicalTarget !== canonicalRoot && !canonicalTarget.startsWith(prefix)) {
    throw new Error(`Path is outside root: ${target}`);
  }
  return canonicalTarget;
}
