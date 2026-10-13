import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverInstructions } from '../src/context/instructions.mjs';
import { retrieveContext } from '../src/context/retrieve.mjs';

const api = async () => import('../src/catalog/manifest.mjs');
const packageRoot = fileURLToPath(new URL('../',import.meta.url));

test('requirements refinement retrieves prescribed flow context before decisions', async () => {
  const catalog = await (await api()).loadCatalog(packageRoot);
  const design = catalog.skills.find(s => s.id === 'pegatus-design');
  assert.equal(design.workflow.context.first, true);
  const root = await mkdtemp(path.join(os.tmpdir(),'pegatus-flow-'));
  await writeFile(path.join(root,'AGENTS.md'),'Read the order-flow index before refining requirements.');
  const context = await discoverInstructions({root,host:{name:'codex',home:path.join(root,'absent')}});
  const instructionPaths = context.instructions.map(i => i.path);
  context.resolution = {readInstructions:instructionPaths,discovery:[{command:'flow-query',args:['{query}'],cwd:'.',requires:[],instructionPaths}],externalKnowledge:true};
  const result = await retrieveContext({context,query:'orders',run:async spec => {
    assert.deepEqual(spec.args,['orders']);
    return {exitCode:0,refs:[{path:'orders-flow.md',freshness:{status:'current'}}]};
  }});
  assert.equal(result.refs[0].path,path.join(root,'orders-flow.md'));
  assert.deepEqual(result.uncertainties,[]);
});

test('review handoffs require read instruction references, scope and approved artifacts', async () => {
  const {loadCatalog,validateHandoff} = await api();
  const reviewer = (await loadCatalog(packageRoot)).agents.find(a => a.id === 'code-reviewer');
  const brief = {instructionPaths:['AGENTS.md'],scope:'checkout',knowledgeRefs:['orders-flow.md'],approvedArtifacts:['spec.md'],ownedPaths:['src/orders'],checks:['unit'],evidence:[]};
  assert.deepEqual(validateHandoff(reviewer,brief),[]);
  assert.deepEqual(validateHandoff(reviewer,{...brief,knowledgeRefs:[],approvedArtifacts:[]}),[]);
  delete brief.instructionPaths;
  assert.ok(validateHandoff(reviewer,brief).some(f => f.code === 'missing-handoff-input'));
});

test('stack selection keeps MSTest, Blazor, newer frameworks and Next.js task specific', async () => {
  const {loadCatalog,selectSkills,selectResources} = await api();
  const catalog = await loadCatalog(packageRoot);
  const dotnet = selectSkills(catalog,{stack:'dotnet',framework:'.net',version:10,testFramework:'xunit',task:'unit-tests'});
  assert.ok(!dotnet.some(s => /mstest|blazor/.test(s.id)));
  assert.ok(!selectSkills(catalog,{stack:'dotnet',task:'unrelated'}).some(s=>s.source.id==='dotnet-skills'));
  const mstest = selectSkills(catalog,{stack:'dotnet',framework:'.net',testFramework:'mstest',task:'write-mstest-tests'});
  assert.ok(mstest.some(s=>s.id==='dotnet-writing-mstest-tests'));
  const skill = catalog.skills.find(s=>s.id==='vercel-react-best-practices');
  const react = selectResources(skill,{framework:'react',version:19});
  assert.ok(!react.some(p=>/server-|async-api-routes|AGENTS\.md/.test(p)));
  assert.ok(selectResources(skill,{framework:'nextjs',version:19}).some(p=>/server-auth-actions/.test(p)));
  const composition = catalog.skills.find(s=>s.id==='vercel-composition-patterns');
  assert.ok(!selectResources(composition,{framework:'react',version:18}).some(p=>/react19/.test(p)));
});

test('small fixes omit spec gates and features require approved design and scope', async () => {
  const {loadCatalog,workflowRoute} = await api();
  const catalog = await loadCatalog(packageRoot);
  assert.deepEqual(workflowRoute(catalog,{classification:'small',approved:[]}).artifacts, ['brief','progress','report','evidence']);
  assert.equal(workflowRoute(catalog,{classification:'small',approved:[]}).canImplement,true);
  assert.equal(workflowRoute(catalog,{classification:'feature',approved:['design']}).canImplement,false);
  assert.equal(workflowRoute(catalog,{classification:'feature',approved:['design','scope']}).canImplement,true);
});

test('.NET test workflows can load their .NET extension dependencies without other languages', async () => {
  const {loadCatalog,selectResources} = await api();
  const catalog = await loadCatalog(packageRoot);
  for (const [consumerId,task,expectedNames] of [
    ['dotnet-code-testing','test-generation',['SKILL.md','dotnet.md','dotnet-examples.md']],
    ['dotnet-test-gap-analysis','test-gaps',['SKILL.md','dotnet.md']],
  ]) {
    const consumer = catalog.skills.find(skill=>skill.id===consumerId);
    const dependency = catalog.skills.find(skill=>consumer.dependencies.includes(skill.id) && skill.id.endsWith('-extensions'));
    assert.ok(dependency);
    const resources = selectResources(dependency,{stack:'dotnet',framework:'.net',testFramework:'xunit',task});
    for (const name of expectedNames) assert.ok(resources.includes(`${dependency.path.slice(0,-8)}${name==='SKILL.md'?name:`extensions/${name}`}`),`${consumerId}: ${name}`);
    assert.ok(!resources.some(resource=>/\/extensions\/(cpp|go|java|python|typescript)\b/.test(resource)));
  }
});
