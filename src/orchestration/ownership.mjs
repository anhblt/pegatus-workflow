import path from 'node:path';

/** Conservative cross-platform comparison. Aliases/symlinks are checked by the
 * coordinator against the actual workspace before it dispatches. */
export function normalizeOwnedPath(value) {
  if (typeof value !== 'string' || !value.trim() || /[\0\r\n:*?"<>|]/.test(value)
    || path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[A-Za-z]:/.test(value)
    || value.split(/[\\/]/).includes('..')) throw new TypeError('Ownership requires a contained relative path');
  const parts = value.replaceAll('\\', '/').split('/').filter(part => part !== '' && part !== '.');
  if (parts.some(part => /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))
    throw new TypeError('Ownership path is not portable');
  return parts.join('/').toLowerCase() || '.';
}

export function ownsPath(owner, candidate) {
  const parent = normalizeOwnedPath(owner), child = normalizeOwnedPath(candidate);
  return parent === '.' || parent === child || child.startsWith(`${parent}/`);
}

export function overlappingOwnership(left, right) {
  return left.some(a => right.some(b => ownsPath(a, b) || ownsPath(b, a)));
}

export function ownedPaths(task) {
  const paths = task.paths ?? task.ownedPaths;
  if (!Array.isArray(paths) || !paths.length) throw new TypeError('Task ownership paths are required');
  for (const value of paths) normalizeOwnedPath(value);
  if (task.paths && task.ownedPaths && JSON.stringify(task.paths) !== JSON.stringify(task.ownedPaths))
    throw new TypeError('Conflicting task ownership paths');
  return [...paths];
}

export function reservedPath(value) {
  return ['.git', '.pegatus'].some(parent => ownsPath(parent, value));
}
