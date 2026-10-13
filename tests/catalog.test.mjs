import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const api = async () => import('../src/catalog/manifest.mjs');
const lint = async () => (await import('../src/catalog/lint.mjs')).lintCatalog;

test('packaged catalog resolves commands, capabilities and complete source resources', async () => {
  const { loadCatalog } = await api();
  const catalog = await loadCatalog(root);
  assert.equal((await lint())(catalog).filter(f => f.severity === 'error').length, 0);
  for (const command of catalog.commands) assert.ok(catalog.skills.some(s => s.id === command.skill));
  for (const category of ['agents','skills','commands','hooks','rules','memory','learning','verification','tokens','orchestration','security']) assert.ok(catalog.capabilities[category]?.owner);
  assert.equal(catalog.agents.length, 8);
  const plugins = new Set(catalog.skills.filter(s => s.source.id === 'dotnet-skills').map(s => s.source.path.split('/')[1]));
  assert.deepEqual([...plugins].sort(), ['dotnet','dotnet-advanced','dotnet-aspnetcore','dotnet-data','dotnet-test']);
  const sourceSkills = catalog.sourceLock.sources.find(s => s.id === 'dotnet-skills').paths.filter(p => p.endsWith('/SKILL.md'));
  assert.equal(catalog.skills.filter(s => s.source.id === 'dotnet-skills').length, sourceSkills.length);
  assert.ok(catalog.notices.some(n => n.code === 'distribution-notice-gap' && n.sourceId === 'vercel-agent-skills'));
});

test('lint reports duplicate IDs, unknown commands/dependencies, missing capabilities and model names', async () => {
  const catalog = await (await api()).loadCatalog(root);
  catalog.skills.push({...catalog.skills[0]});
  catalog.commands[0].skill = 'missing';
  catalog.skills[0].dependencies.push('unknown');
  catalog.agents[0].model = 'invented-model';
  delete catalog.capabilities.security;
  const codes = (await lint())(catalog).map(f => f.code);
  for (const code of ['duplicate-id','unresolved-command','unresolved-dependency','hardcoded-model','missing-capability']) assert.ok(codes.includes(code), code);
});

test('lint rejects resource escape, missing local links, invalid frontmatter and changed vendor bytes', async () => {
  const catalog = await (await api()).loadCatalog(root);
  const owned = catalog.skills.find(s => s.id === 'pegatus-design');
  owned.resources.push('../escape');
  catalog.documents[owned.path] = '---\nname: broken\n---\n[missing](not-found.md)';
  const vendored = catalog.skills.find(s => s.source.id === 'dotnet-skills');
  catalog.documents[vendored.path] += '\nchanged';
  const codes = (await lint())(catalog).map(f => f.code);
  for (const code of ['resource-escape','broken-link','invalid-frontmatter','source-hash-mismatch']) assert.ok(codes.includes(code), code);
});

test('catalog lint CLI succeeds for package and fails for an invalid catalog root', async () => {
  const cli = path.join(root, 'bin/pegatus.mjs');
  const good = spawnSync(process.execPath, [cli, 'catalog','lint'], {cwd: os.tmpdir(), encoding:'utf8'});
  assert.equal(good.status, 0, good.stderr);
  const temp = await mkdtemp(path.join(os.tmpdir(),'pegatus-catalog-'));
  await mkdir(path.join(temp,'catalog'));
  await writeFile(path.join(temp,'catalog/manifest.json'), JSON.stringify({schemaVersion:1,agents:[],skills:[],commands:[],rules:[]}));
  const bad = spawnSync(process.execPath,[cli,'catalog','lint','--root',temp],{encoding:'utf8'});
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /missing-capability|Cannot load catalog/);
});

test('compatibility bridges are usable local resources pointing to retained rule bytes', async () => {
  const catalog = await (await api()).loadCatalog(root);
  assert.equal(catalog.bridges.length,3);
  for (const bridge of catalog.bridges) {
    assert.ok(catalog.documents[bridge.path]);
    assert.ok(catalog.files[bridge.target]);
    assert.ok(catalog.vendoredFiles.some(file=>file.path===bridge.target));
    assert.ok(!catalog.vendoredFiles.some(file=>file.path===bridge.path));
  }
});

test('lint rejects malformed required frontmatter scalars and duplicate root keys', async () => {
  const catalog = await (await api()).loadCatalog(root);
  const file = catalog.skills.find(s=>s.id==='pegatus-design').path;
  for(const fm of ['name: [unterminated\ndescription: fine','name: fine\nname: duplicate\ndescription: fine','name: fine\ndescription: >-']) {
    catalog.documents[file] = `---\n${fm}\n---\nBody`;
    assert.ok((await lint())(catalog).some(f=>f.code==='invalid-frontmatter' && f.location===file),fm);
  }
});

test('lint catches a skill manifest that drops an upstream supporting reference', async () => {
  const catalog = await (await api()).loadCatalog(root);
  const skill = catalog.skills.find(skill=>skill.id==='dotnet-msbuild');
  const resource = skill.resources.find(resource=>resource.includes('/references/'));
  assert.ok(resource);
  skill.resources=skill.resources.filter(item=>item!==resource);
  assert.ok((await lint())(catalog).some(f=>f.code==='incomplete-resource-closure' && f.message===resource));
});
