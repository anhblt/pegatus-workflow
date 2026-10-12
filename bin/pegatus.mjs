#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

const operations = new Set([
  'start', 'design', 'plan', 'execute', 'investigate', 'review', 'verify',
  'checkpoint', 'resume', 'learn', 'memory', 'security', 'status',
  'install', 'update', 'doctor', 'uninstall', 'catalog',
]);

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
  process.stderr.write(`Operation not implemented: ${argv.join(' ')}\n`);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2), { cwd: process.cwd(), home: process.env.HOME ?? process.env.USERPROFILE ?? '' });
}
