import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, selectSkills } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';
import { runLearningCommand } from '../src/memory/cli.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const id = 'a'.repeat(64);
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-parity-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  await mkdir(path.join(root, '.pegatus/memory'), {recursive:true});
  await writeEntry(root, 'note.md');
  return root;
}
async function writeEntry(root, name, extra = {}, body = 'Verified transaction guidance') {
  await writeFile(path.join(root, '.pegatus/memory', name), body);
  await writeFile(path.join(root, '.pegatus/memory', `${name}.json`), JSON.stringify({
    id, projectId:'here', paths:['src/'], keywords:['transaction'], approvalState:'approved',
    sourceTask:'TASK-1', evidence:['evidence/test.json'], freshness:{status:'current', branch:'main'},
    documentHash:createHash('sha256').update(body).digest('hex'), ...extra,
  }));
}
const read = (root, more = []) => runLearningCommand(['memory','read',id,'--root',root,'--project','here','--path','src/a.mjs','--branch','main',...more], root);

test('ECC guidance is task-selected and exposed through every host adapter', async () => {
  const catalog = await loadCatalog(packageRoot);
  for (const [task, skill] of [['context-budget','pegatus-context-budget'],['file-processing-cache','pegatus-file-cache'],['prompt-cache','pegatus-prompt-cache']]) {
    assert.ok(selectSkills(catalog, {task}).some(entry => entry.id === skill), task);
    for (const host of ['claude','codex','antigravity']) {
      const generated = generateHost(catalog, {host, scope:'project', root:packageRoot});
      const wrapper = generated.operations.find(item => !item.relativePath.includes('/runtime/') && item.relativePath.includes(skill));
      assert.ok(wrapper, `${host}: ${skill}`);
      assert.match(wrapper.content, new RegExp(task));
      if (task === 'context-budget') assert.match(wrapper.content, /live.context[\s\S]*do not use tools/i);
    }
  }
  assert.ok(!selectSkills(catalog, {task:'small-fix'}).some(entry => entry.id === 'pegatus-file-cache'));
});

test('stable ID retrieval returns a body without keyword matching and preserves query syntax', async t => {
  const root = await fixture(t);
  const result = await read(root);
  assert.equal(result.status, 'passed');
  assert.equal(result.entries[0].id, id);
  assert.equal(result.entries[0].content, 'Verified transaction guidance');
  const query = await runLearningCommand(['memory','--root',root,'--project','here','--path','src/a.mjs','--query','transaction'], root);
  assert.equal(query.entries.length, 1);
  const cli = spawnSync(process.execPath, [path.join(packageRoot,'bin/pegatus.mjs'),'memory','read',id,'--root',root,'--project','here','--path','src/a.mjs'], {encoding:'utf8'});
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).entries[0].id, id);
});

test('ID lookup cannot cross path/project scope or return duplicate IDs', async t => {
  const root = await fixture(t);
  await writeEntry(root, 'note.md', {paths:['other/']});
  assert.equal((await read(root)).status, 'blocked');
  await writeEntry(root, 'note.md', {projectId:'other'});
  assert.equal((await read(root)).status, 'blocked');
  await writeEntry(root, 'note.md');
  await writeEntry(root, 'duplicate.md');
  const duplicate = await read(root);
  assert.equal(duplicate.status, 'blocked');
  assert.deepEqual(duplicate.entries, []);
  assert.ok(duplicate.reasons.includes('memory-id-ambiguous'));
});

test('ID lookup preserves digest checks and output limits', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, '.pegatus/memory/note.md'), 'Changed without approval');
  const changed = await read(root);
  assert.equal(changed.entries[0].approvalState, 'unverified');
  assert.equal(changed.entries[0].requiresSourceConfirmation, true);
  await writeEntry(root, 'note.md', {}, 'x'.repeat(40000));
  const large = await read(root);
  assert.equal(large.status, 'blocked');
  assert.ok(large.reasons.includes('context-budget-exceeded'));
});

test('ID lookup blocks unresolved instructions, external owners and incomplete indexes', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'AGENTS.md'), 'Follow the maintained vault.');
  assert.ok((await read(root)).reasons.includes('instruction-resolution-required'));
  await rm(path.join(root, 'AGENTS.md'));
  await writeFile(path.join(root, '.pegatus/config.json'), JSON.stringify({knowledge:{paths:['vault'], discovery:[]}}));
  assert.ok((await read(root)).reasons.includes('authoritative-knowledge-requires-instructed-retrieval'));
  await rm(path.join(root, '.pegatus/config.json'));
  await writeFile(path.join(root, '.pegatus/memory/broken.md'), 'bad');
  await writeFile(path.join(root, '.pegatus/memory/broken.md.json'), '{');
  const incomplete = await read(root);
  assert.equal(incomplete.status, 'blocked');
  assert.deepEqual(incomplete.entries, []);
  assert.ok(incomplete.reasons.includes('memory-read-incomplete'));
});

test('ID lookup rejects malformed IDs, mixed query mode and bounds failure diagnostics', async t => {
  const root = await fixture(t);
  await assert.rejects(runLearningCommand(['memory','read','../note','--root',root], root), /stable SHA-256/);
  await assert.rejects(read(root, ['--query','transaction']), /Usage/);
  for (let i=0; i<40; i++) {
    await writeFile(path.join(root, '.pegatus/memory', `broken-${i}.md`), 'bad');
    await writeFile(path.join(root, '.pegatus/memory', `broken-${i}.md.json`), '{');
  }
  await writeFile(path.join(root, '.pegatus/config.json'), JSON.stringify({tokenControls:{maxOutputChars:512}}));
  const result = await read(root);
  assert.equal(result.status, 'blocked');
  assert.ok(JSON.stringify(result).length <= 512);
});

test('ID lookup does not declare completeness when approved metadata has lost its body', async t => {
  const root = await fixture(t);
  await writeEntry(root, 'orphan.md');
  await rm(path.join(root, '.pegatus/memory/orphan.md'));
  const result = await read(root);
  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.entries, []);
  assert.ok(result.reasons.includes('memory-read-incomplete'));
});
