import {stat,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createSetupTerminal} from './terminal.mjs';
import {runAdministration} from './admin.mjs';

const hosts=[{id:'claude',label:'Claude Code',command:'claude',config:'.claude'},
  {id:'codex',label:'Codex',command:'codex',config:'.codex'},
  {id:'antigravity',label:'Antigravity',command:'agy',config:'.gemini/antigravity'}];
const display=value=>String(value).replace(/[\x00-\x1f\x7f-\x9f]/g,'?');
async function isFile(file,executable=false) {
  try {const info=await stat(file);if(!info.isFile() || executable && !(info.mode&0o111))return false;
    await access(file,executable?constants.X_OK:constants.F_OK);return true;
  } catch(error) {if(['ENOENT','ENOTDIR','EACCES','EPERM'].includes(error.code))return false;throw error;}
}
async function isDirectory(file) {try{return (await stat(file)).isDirectory();}catch(error){if(['ENOENT','ENOTDIR','EACCES','EPERM'].includes(error.code))return false;throw error;}}

/** Presence probes only: never execute discovered commands, read credentials or infer authentication. */
export async function detectHosts({home,platform=process.platform,env=process.env}={}) {
  const windows=platform==='win32',delimiter=windows?';':':';
  const envValue=name=>env[Object.keys(env).find(key=>key.toLowerCase()===name.toLowerCase())]??'';
  const directories=[...new Set(envValue('PATH').split(delimiter).map(value=>value.trim().replace(/^"(.*)"$/,'$1')).filter(value=>path.isAbsolute(value)))];
  const local=envValue('LOCALAPPDATA')||path.join(home,'AppData','Local');
  const result=[];
  for(const host of hosts) {
    const evidence=[];
    const names=windows?[`${host.command}.exe`,`${host.command}.cmd`,`${host.command}.bat`,`${host.command}.ps1`]:[host.command];
    if(host.id==='antigravity')names.push(...(windows?['antigravity.exe','antigravity.cmd']:['antigravity']));
    let cli=null;
    for(const directory of directories){for(const name of names){const file=path.join(directory,name);if(await isFile(file,!windows)){cli=file;break;}}if(cli)break;}
    const known=windows?host.id==='claude'?[path.join(home,'.local','bin','claude.exe')]:host.id==='codex'?
      [path.join(local,'Programs','OpenAI','Codex','bin','codex.exe')]:[]:[];
    if(!cli)for(const file of known)if(await isFile(file,!windows)){cli=file;break;}
    let application=null;
    const apps=host.id==='antigravity'?(windows?[path.join(local,'Programs','Antigravity','Antigravity.exe'),
      ...(envValue('ProgramFiles')?[path.join(envValue('ProgramFiles'),'Antigravity','Antigravity.exe')]:[])]:
      ['/opt/Antigravity/antigravity','/opt/antigravity/antigravity']):[];
    for(const file of apps)if(await isFile(file,!windows)){application=file;break;}
    const config=path.join(home,host.config),configured=await isDirectory(config);
    if(cli)evidence.push(cli);if(application)evidence.push(application);if(configured)evidence.push(config);
    result.push({id:host.id,label:host.label,status:cli?'cli':application?'application':configured?'configuration':'not-detected',evidence});
  }
  return result;
}

/** Interactive front end only. All managed writes still pass through administration/scanning/CAS. */
export async function runSetup({cwd,home,ask,signal,write=message=>process.stdout.write(message+'\n'),
  detect=detectHosts,admin=runAdministration}={}) {
  let terminal,interrupt;
  if(!ask) {
    if(!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stderr.write('Setup needs an interactive terminal. For scripts use install --host <host> --scope project|user --root <existing-root>; use --help for usage.\n');return 2;
    }
    terminal=createSetupTerminal();
    const controller=new AbortController();
    signal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
    interrupt=()=>controller.abort();
    process.on('SIGINT',interrupt);
    ask=prompt=>terminal.ask(prompt,{signal});
    write=terminal.line;
  }
  const cancelled=()=>signal?.aborted;

  try {
    write('Pegatus setup');
    write('Shared workflows for your AI coding agents.');
    write('');
    write('Local qualification candidate; native acceptance and licensing gates remain open.');
    const detected=await detect({home});
    const labels={cli:'CLI detected',application:'application detected',configuration:'configuration found only (installation unconfirmed)','not-detected':'not detected — manual selection available'};
    write(`Detected: ${detected.filter(host=>['cli','application'].includes(host.status)).map(host=>host.label).join(', ')||'no supported applications found'}`);
    if(!terminal)detected.forEach((host,index)=>{write(`${index+1}. ${host.label}: ${labels[host.status]}`);for(const item of host.evidence)write(`   ${display(item)}`);});
    write('Detection does not establish authentication, permissions or native qualification.');
    const defaults=detected.flatMap((host,index)=>['cli','application'].includes(host.status)?[index+1]:[]).join(',');
    let selected;
    if(terminal)selected=await terminal.select('Which agents should use Pegatus?',detected.map((host,index)=>({value:index,label:`${host.label} (${labels[host.status]})`})),{multiple:true,initial:detected.flatMap((host,index)=>['cli','application'].includes(host.status)?[index]:[]),signal});
    else for(;;) {
      const answer=await ask(`Hosts (comma-separated numbers${defaults?`; Enter for ${defaults}`:''}, q to cancel): `);
      if(answer===undefined || /^q$/i.test(answer.trim()))return 0;
      const input=answer.trim()||defaults;
      if(/^\d+(?:\s*,\s*\d+)*$/.test(input)) {
        selected=[...new Set(input.split(',').map(value=>Number(value)-1))];
        if(selected.every(index=>index>=0&&index<detected.length))break;
      }
      write('Select at least one listed host number.');
    }
    let scope;
    if(terminal)[scope]=await terminal.select('Where should Pegatus be installed?',[{label:'Current project',value:'project'},{label:'User-wide defaults',value:'user'}],{initial:['project'],signal});
    else for(;;){const answer=await ask('Scope: 1 current project, 2 user-wide defaults [1] (q to cancel): ');
      if(answer===undefined || /^q$/i.test(answer.trim()))return 0;
      if(['','1','2'].includes(answer.trim())){scope=answer.trim()==='2'?'user':'project';break;}write('Choose 1 or 2.');}
    const defaultRoot=scope==='user'?home:cwd;
    const chosen=await ask(`Existing ${scope} root [${display(defaultRoot)}] (q to cancel): `);
    if(chosen===undefined || /^q$/i.test(chosen.trim()))return 0;
    const root=path.resolve(cwd,chosen.trim()||defaultRoot);
    if(!await isDirectory(root)){write('Blocked: selected root must be an existing directory.');return 2;}
    let userRoot;
    if(scope==='project') {
      const answer=await ask('Existing user defaults root to inherit [none] (q to cancel): ');
      if(answer===undefined || /^q$/i.test(answer.trim()))return 0;
      if(answer.trim()){userRoot=path.resolve(cwd,answer.trim());if(!await isDirectory(userRoot)){write('Blocked: user defaults root must exist.');return 2;}}
    }
    write('');
    write(`◇ Review installation: ${scope} at ${display(root)}`);
    if(userRoot)write(`Inherit defaults: ${display(userRoot)}`);
    write('Existing solution instructions, unrelated settings and hooks are preserved. Security checks run before each apply.');
    write('Selected hosts apply sequentially, not as one cross-host transaction; earlier successful hosts remain if a later host blocks.');
    const requests=[];
    for(const index of selected) {
      if(cancelled()){write('Cancelled; no installation applied.');return 0;}
      const host=detected[index],args=['install','--host',host.id,'--scope',scope,'--root',root,...(userRoot?['--user-root',userRoot]:[])];
      const preview=await admin(args,{cwd,dryRun:true});
      write(`${host.label}: ${preview.status}; ${preview.preview?.writes.length??0} writes, ${preview.preview?.removes.length??0} removals.`);
      const groups=new Map();
      for(const file of preview.preview?.writes??[]){const parts=file.split('/');const group=parts.slice(0,parts[0]==='.pegatus'?3:2).join('/');groups.set(group,(groups.get(group)??0)+1);}
      for(const [group,count] of groups)write(`  ${display(group)}/: ${count} files to write`);
      for(const file of preview.preview?.removes??[])write(`  Remove owned file: ${display(file)}`);
      for(const reason of preview.reasons??[])write(`  ${display(reason)}`);
      if(!['passed','skipped'].includes(preview.status)){write('No installation applied. Resolve the reported conflict/recovery condition first.');return 3;}
      requests.push({host,args});
    }
    const confirmation=terminal?(await terminal.select('Apply this installation?',[{label:'Yes',value:'yes'},{label:'No',value:'no'}],{initial:['no'],signal}))[0]:await ask('Apply the preview? [y/N]: ');
    if(!/^y(?:es)?$/i.test(confirmation?.trim()??'')){write('Cancelled; no installation applied.');return 0;}
    for(const {host,args} of requests) {
      if(cancelled()){write('Cancelled. Earlier successful host installations are retained.');return 0;}
      write(`Installing ${host.label}…`);
      const result=await admin(args,{cwd});
      write(`${host.label}: ${result.status}`);
      for(const reason of result.reasons??[])write(`  ${display(reason)}`);
      if(!['passed','skipped'].includes(result.status)){write('Stopped. Earlier successful host installations are retained; inspect doctor before retrying.');return result.status==='blocked'?3:1;}
      if(cancelled()){write('Cancelled after the active host transaction settled. Completed installations are retained; inspect doctor before retrying.');return 0;}
      const doctor=await admin(['doctor',...args.slice(1)],{cwd});
      write(`◇ ${host.label} doctor: ${display(doctor.status)}${doctor.installedVersion?` · version ${display(doctor.installedVersion)}`:''}`);
      const details=(label,value,indent='')=>{
        if(value===undefined||value===null)return;
        if(typeof value==='object'){
          write(`${indent}${label}:`);
          for(const [key,item] of Object.entries(value))details(Array.isArray(value)?'•':key,item,indent+'  ');
        } else for(const line of String(value).split(/\r?\n/))write(`${indent}${label}: ${display(line)}`);
      };
      for(const field of ['warnings','snippets','capabilities','activation'])details(field,doctor[field]);
      if(doctor.inheritedRoot)write(`Inherited defaults: ${display(doctor.inheritedRoot)}`);
      if(doctor.status==='blocked'){write('Doctor blocked activation; reconcile before use.');return 3;}
      write('Open/reload the selected host in your solution and invoke pegatus-start. Review doctor snippets; hooks are not automatically enabled.');
    }
    write('◇ Setup complete.');
    return 0;
  } catch(error) {
    if(signal?.aborted || ['ABORT_ERR','ERR_USE_AFTER_CLOSE'].includes(error.code)){write('Cancelled.');return 0;}
    write(`Setup failed: ${display(error.message)}. Inspect installation state with doctor before retrying.`);return 1;
  } finally {if(interrupt)process.removeListener('SIGINT',interrupt);}
}
