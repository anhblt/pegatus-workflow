import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runAdministration} from '../src/install/admin.mjs';
const passed={status:'passed',evidence:[],reasons:[]};
async function roots(t) {
  const parent=await mkdtemp(path.join(os.tmpdir(),'pegatus-admin-'));
  t.after(()=>rm(parent,{recursive:true,force:true}));
  const cwd=path.join(parent,'project'),home=path.join(parent,'home'); await mkdir(cwd);await mkdir(home);
  return {cwd,home,securityPreflight:passed};
}
test('administration requires explicit root and host',async t=>{
  const options=await roots(t);
  await assert.rejects(runAdministration(['install','--host','codex'],options),/root/);
});
test('CLI default security scans installs and doctor reports explicit-call',async t=>{
  const options=await roots(t);delete options.securityPreflight;
  const args=['--host','codex','--scope','project','--root',options.cwd];
  const installed=await runAdministration(['install',...args],options);
  assert.equal(installed.status,'passed');assert.ok(installed.security.coverage.agentShield.length);
  const doctor=await runAdministration(['doctor',...args],options);
  assert.equal(doctor.capabilities.security,'explicit-call');assert.equal(doctor.installedVersion,'0.1.0-rc.1');
});
test('project configuration wins while user/project installations deduplicate',async t=>{
  const options=await roots(t),user=['--host','codex','--scope','user','--root',options.home];
  assert.equal((await runAdministration(['install',...user],options)).status,'passed');
  const project=['--host','codex','--scope','project','--root',options.cwd,'--user-root',options.home];
  const duplicate=await runAdministration(['install',...project],options);
  assert.equal(duplicate.status,'skipped');assert.equal(duplicate.inheritedRoot,options.home);
  const inherited=await runAdministration(['doctor',...project],options);
  assert.equal(inherited.inherited,true);assert.equal(inherited.inheritedRoot,options.home);
  assert.equal(inherited.installedVersion,'0.1.0-rc.1');assert.ok(inherited.commandLocations.length);
  for(const file of inherited.commandLocations) {
    assert.ok(file.startsWith(options.home+path.sep));await readFile(file);
  }
  assert.ok(inherited.locations.every(location=>location.inherited));
  await mkdir(path.join(options.cwd,'.pegatus'));
  await writeFile(path.join(options.cwd,'.pegatus/config.json'),JSON.stringify({hostModels:{codex:{fast:'project-model'}},
    hostModelCapabilities:{codex:{source:'team declaration fixture',models:[{model:'project-model',efforts:[]}]}},custom:'keep'}));
  const differing=await runAdministration(['install',...project],{cwd:options.cwd});
  assert.equal(differing.status,'passed');assert.equal(differing.activation.mode,'explicit-portable');
  assert.deepEqual(differing.security.coverage.pegatusStatic,['.pegatus/overrides/codex.json']);
  const doctor=await runAdministration(['doctor',...project],options);
  assert.equal(doctor.configuration.hostModels.codex.fast,'project-model');assert.equal(doctor.configuration.custom,'keep');
  assert.equal(doctor.roleModels.find(r=>r.role==='context-explorer').model,'project-model');
  assert.equal(doctor.nativeRoleModels.find(r=>r.role==='context-explorer').model,null);
  assert.equal(doctor.locations.filter(f=>!f.inherited).length,1);
  const selected=await runAdministration(['role',...project,'--role','context-explorer'],options);
  assert.equal(selected.status,'passed');assert.equal(selected.selection.model,'project-model');assert.ok(selected.procedure.startsWith(options.home));await readFile(selected.procedure);
  const automatic=await runAdministration(['role',...project,'--role','planner-architect'],options);
  assert.equal(automatic.status,'passed');assert.equal(automatic.selection.mode,'coordinator-selection');
  assert.equal(automatic.selection.selectionPolicy.tier,'deep');
  assert.match(automatic.instructions,/records both model and effort/);
  assert.deepEqual((await runAdministration(['doctor',...user],options)).locations,inherited.locations.map(f=>({...f,inherited:false})));
  const second=path.join(path.dirname(options.cwd),'second');await mkdir(second);
  const secondDoctor=await runAdministration(['doctor','--host','codex','--scope','project','--root',second,'--user-root',options.home],options);
  assert.equal(secondDoctor.roleModels.find(r=>r.role==='context-explorer').model,null);
  assert.equal((await runAdministration(['update',...project],options)).status,'passed');
  const override=doctor.locations.find(f=>!f.inherited).path,original=await readFile(override);await writeFile(override,'foreign edit');
  assert.equal((await runAdministration(['uninstall',...project],options)).status,'blocked');await writeFile(override,original);
  assert.equal((await runAdministration(['uninstall',...project],options)).status,'passed');
  assert.ok((await runAdministration(['doctor',...user],options)).locations.every(f=>f.state==='unchanged'));
  assert.equal((await runAdministration(['doctor',...project],options)).roleModels.find(r=>r.role==='context-explorer').model,null);
});
