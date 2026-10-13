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
  assert.equal(doctor.capabilities.security,'explicit-call');assert.equal(doctor.installedVersion,'0.0.0');
});
test('project configuration wins while user/project installations deduplicate',async t=>{
  const options=await roots(t),user=['--host','codex','--scope','user','--root',options.home];
  assert.equal((await runAdministration(['install',...user],options)).status,'passed');
  const project=['--host','codex','--scope','project','--root',options.cwd,'--user-root',options.home];
  const duplicate=await runAdministration(['install',...project],options);
  assert.equal(duplicate.status,'skipped');assert.equal(duplicate.inheritedRoot,options.home);
  const inherited=await runAdministration(['doctor',...project],options);
  assert.equal(inherited.inherited,true);assert.equal(inherited.inheritedRoot,options.home);
  assert.equal(inherited.installedVersion,'0.0.0');assert.ok(inherited.commandLocations.length);
  for(const file of inherited.commandLocations) {
    assert.ok(file.startsWith(options.home+path.sep));await readFile(file);
  }
  assert.ok(inherited.locations.every(location=>location.inherited));
  await mkdir(path.join(options.cwd,'.pegatus'));
  await writeFile(path.join(options.cwd,'.pegatus/config.json'),JSON.stringify({hostModels:{codex:{fast:'project-model'}},custom:'keep'}));
  const differing=await runAdministration(['install',...project],options);
  assert.equal(differing.status,'blocked');assert.match(differing.reasons.join(),/duplicate/i);
  const doctor=await runAdministration(['doctor',...project],options);
  assert.equal(doctor.configuration.hostModels.codex.fast,'project-model');assert.equal(doctor.configuration.custom,'keep');
  assert.equal((await runAdministration(['uninstall',...user],options)).status,'passed');
  assert.equal((await runAdministration(['doctor',...user],options)).installedVersion,null);
  assert.equal((await runAdministration(['install',...project],options)).status,'passed');
  const installed=await runAdministration(['doctor',...project],options);
  assert.equal(installed.installedVersion,'0.0.0');assert.ok(installed.commandLocations.length);
  assert.match(await readFile(path.join(options.cwd,'.codex/agents/pegatus-context-explorer.toml'),'utf8'),/project-model/);
});
