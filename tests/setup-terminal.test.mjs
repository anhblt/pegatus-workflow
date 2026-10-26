import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {createSetupTerminal} from '../src/install/terminal.mjs';

function fixture() {
  const input=new PassThrough(),output=new PassThrough();
  input.isTTY=true;input.isRaw=false;
  input.setRawMode=value=>{input.isRaw=value;};
  output.columns=80;
  let text='';output.on('data',chunk=>text+=chunk);
  return {input,output,terminal:createSetupTerminal({input,output,color:false}),text:()=>text};
}
test('multi-select navigates and toggles while preserving defaults',async()=>{
  const f=fixture();
  const answer=f.terminal.select('Agents',[{label:'Claude',value:'claude'},{label:'Codex',value:'codex'}],{multiple:true,initial:['claude']});
  f.input.emit('keypress','',{name:'down'});f.input.emit('keypress',' ',{name:'space'});f.input.emit('keypress','',{name:'return'});
  assert.deepEqual(await answer,['claude','codex']);
  assert.equal(f.input.isRaw,false);assert.equal(f.input.listenerCount('keypress'),0);
  assert.match(f.text(),/Space toggle/);assert.match(f.text(),/◼/);
});
test('empty selection stays open and confirmation defaults to no',async()=>{
  const f=fixture();let settled=false;
  const answer=f.terminal.select('Agents',[{label:'Codex',value:'codex'}],{multiple:true}).then(value=>{settled=true;return value;});
  f.input.emit('keypress','',{name:'return'});await Promise.resolve();assert.equal(settled,false);
  f.input.emit('keypress',' ',{name:'space'});f.input.emit('keypress','',{name:'return'});await answer;
  const confirm=f.terminal.select('Apply?',[{label:'Yes',value:true},{label:'No',value:false}],{initial:[false]});
  f.input.emit('keypress','',{name:'return'});assert.deepEqual(await confirm,[false]);
});
test('Ctrl-C and external abort restore raw mode and cursor',async()=>{
  for(const external of [false,true]) {
    const f=fixture(),controller=new AbortController();
    const answer=f.terminal.select('Agents',[{label:'Codex',value:'codex'}],{signal:controller.signal});
    if(external)controller.abort();else f.input.emit('keypress','c',{name:'c',ctrl:true});
    await assert.rejects(answer,{code:'ABORT_ERR'});
    assert.equal(f.input.isRaw,false);assert.match(f.text(),/\x1b\[\?25h/);
    assert.equal(f.input.isPaused(),true,'cancellation must release initially idle stdin');
  }
});

test('real key sequences navigate the menu and closed input cancels',async()=>{
  const f=fixture();
  const answer=f.terminal.select('Scope',[{label:'Project',value:'project'},{label:'User',value:'user'}]);
  f.input.write('\x1b[B');f.input.write('\r');
  assert.deepEqual(await answer,['user']);
  const next=f.terminal.select('Scope',[{label:'Project',value:'project'}]);
  f.input.emit('end');await assert.rejects(next,{code:'ABORT_ERR'});
  assert.equal(f.input.isRaw,false);
});

test('text entry returns editable input and removes abort listeners',async()=>{
  const f=fixture(),controller=new AbortController();
  const answer=f.terminal.ask('Root: ',{signal:controller.signal});
  f.input.write('project\r');assert.equal(await answer,'project');
  const next=f.terminal.ask('Root: ',{signal:controller.signal});
  controller.abort();await assert.rejects(next,{code:'ABORT_ERR'});
});
