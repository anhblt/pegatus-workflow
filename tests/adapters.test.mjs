import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';
import { planInstall } from '../src/install/plan.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=await loadCatalog(root);

test('Claude workflows have one slash entry point per alias',()=>{
  for(const scope of ['project','user']) {
    const generated=generateHost(catalog,{host:'claude',scope,root});
    for(const command of catalog.commands) {
      const name=command.skill;
      const entries=generated.operations.filter(op=>op.path===`.claude/skills/${name}/SKILL.md` || op.path===`.claude/commands/${name}.md`);
      assert.equal(entries.length,1,`${scope}: ${name}`);
      assert.equal(entries[0].path,`.claude/skills/${name}/SKILL.md`);
    }
  }
});

test('Claude update removes owned legacy aliases but preserves edited aliases',()=>{
  const generated=generateHost(catalog,{host:'claude',scope:'project',root});
  const current=generated.operations.map(op=>({path:op.path,installedHash:op.hash,actualHash:op.hash}));
  const legacy=catalog.commands.map(command=>({path:`.claude/commands/${command.skill}.md`,installedHash:'original',actualHash:'original'}));
  const plan=planInstall([...current,...legacy],generated.operations);
  assert.deepEqual(plan.conflicts,[]);
  assert.deepEqual(plan.writes,[]);
  assert.deepEqual(plan.removes.map(op=>op.path),legacy.map(op=>op.path));
  legacy[0].actualHash='user edit';
  const blocked=planInstall([...current,...legacy],generated.operations);
  assert.ok(blocked.conflicts.some(conflict=>conflict.path===legacy[0].path));
  assert.deepEqual(blocked.removes,[]);
  assert.deepEqual(blocked.writes,[]);
});
test('adapters preserve runtime trees and instruction generators',()=>{
  for(const host of ['claude','codex','antigravity']) {
    const g=generateHost(catalog,{host,scope:'project',root,models:{}});
    assert.equal(g.operations.some(o=>['AGENTS.md','CLAUDE.md','GEMINI.md','sync.mjs'].includes(o.relativePath)),false);
    for(const [file,bytes] of Object.entries(catalog.files)) assert.ok(g.operations.some(o=>o.relativePath===`.pegatus/runtime/${host}/${file}` && Buffer.from(o.content).equals(bytes)));
    assert.ok(g.snippets.length); assert.ok(g.warnings.some(w=>w.includes('model')));
    assert.equal(g.capabilities.hooks,'explicit-call');
  }
});
test('Claude and Codex emit prefixed native roles with user configured models only',()=>{
  const modelCapabilities={source:'team declaration fixture',models:[{model:'user-chosen-fast',efforts:[]}]};
  const codex=generateHost(catalog,{host:'codex',scope:'user',root,models:{fast:'user-chosen-fast'},modelCapabilities});
  const role=codex.operations.find(o=>o.relativePath==='.codex/agents/pegatus-context-explorer.toml');
  assert.match(role.content,/model = "user-chosen-fast"/); assert.doesNotMatch(role.content,/tools\s*=/);
  assert.ok(codex.operations.some(o=>o.relativePath==='.agents/skills/pegatus-start/SKILL.md'));
  const claude=generateHost(catalog,{host:'claude',scope:'project',root,models:{fast:'user-chosen-fast'},modelCapabilities});
  assert.ok(claude.operations.some(o=>o.relativePath==='.claude/agents/pegatus-context-explorer.md' && o.content.includes('user-chosen-fast')));
});
test('Antigravity only claims documented workflow and rules locations',()=>{
  const g=generateHost(catalog,{host:'antigravity',scope:'user',root,models:{}});
  assert.equal(g.capabilities.agents,'instruction-only'); assert.equal(g.capabilities.skills,'instruction-only');
  assert.equal(g.operations.some(o=>o.relativePath.startsWith('.agents/')),false);
  assert.ok(g.operations.some(o=>o.relativePath.startsWith('.gemini/config/global_workflows/')));
  assert.equal(g.operations.some(o=>o.relativePath==='.gemini/GEMINI.md'),false);
});
test('wrapper references resolve within generated resource closure',()=>{
  const g=generateHost(catalog,{host:'codex',scope:'project',root,models:{}});
  const files=new Set(g.operations.map(o=>o.relativePath));
  for(const op of g.operations.filter(o=>!o.relativePath.startsWith('.pegatus/runtime/'))) {
    for(const match of op.content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(op.relativePath),match[1]));
      assert.ok(files.has(target),`${op.relativePath}: ${target}`);
    }
  }
});
