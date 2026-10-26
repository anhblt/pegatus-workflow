import {emitKeypressEvents,createInterface} from 'node:readline';

const safe=value=>String(value).replace(/[\x00-\x1f\x7f-\x9f]/g,'?');
const aborted=()=>Object.assign(new Error('Cancelled'),{code:'ABORT_ERR'});

/** Terminal presentation only; installation authority stays in administration. */
export function createSetupTerminal({input=process.stdin,output=process.stdout,color=!process.env.NO_COLOR&&process.env.TERM!=='dumb'}={}) {
  const paint=(code,text)=>color?`\x1b[${code}m${text}\x1b[0m`:text;
  const line=message=>output.write(`${paint('90','│')}  ${message}\n`);
  function select(title,options,{multiple=false,initial=[],signal}={}) {
    if(signal?.aborted)return Promise.reject(aborted());
    let cursor=Math.max(0,options.findIndex(option=>initial.includes(option.value))),rows=0;
    const chosen=new Set(initial),wasRaw=Boolean(input.isRaw),wasFlowing=input.readableFlowing===true;
    emitKeypressEvents(input);
    const draw=()=>{
      if(rows)output.write(`\x1b[${rows}A\r\x1b[J`);
      // Bound the list to terminal height; truncate to avoid wrapped cursor bookkeeping.
      const height=Math.max(1,Math.min(options.length,(output.rows||24)-6));
      const start=Math.max(0,Math.min(cursor-Math.floor(height/2),options.length-height));
      const width=Math.max(10,(output.columns||80)-1);
      const lines=[`◆  ${safe(title)}`,...options.slice(start,start+height).map((option,offset)=>{
        const index=start+offset,checked=multiple?chosen.has(option.value):index===cursor;
        return `│ ${index===cursor?'›':' '} ${multiple?(checked?'◼':'◻'):(checked?'●':'○')} ${safe(option.label)}`;
      }),`│  ↑/↓ navigate${multiple?' · Space toggle':''} · Enter confirm · Ctrl-C cancel`];
      output.write(lines.map((text,index)=>paint(index===0||index===cursor-start+1?'36':'90',[...text].slice(0,width).join(''))).join('\n')+'\n');rows=lines.length;
    };
    return new Promise((resolve,reject)=>{
      const cleanup=()=>{
        input.removeListener('keypress',key);input.removeListener('end',cancel);input.removeListener('error',fail);
        output.removeListener('resize',draw);signal?.removeEventListener('abort',cancel);
        input.setRawMode?.(wasRaw);if(!wasFlowing)input.pause();output.write('\x1b[?25h');
      };
      const fail=error=>{cleanup();reject(error);};
      const cancel=()=>fail(aborted());
      const key=(text,event={})=>{
        if(event.ctrl&&event.name==='c'||event.name==='escape'){cancel();return;}
        if(event.name==='up')cursor=(cursor+options.length-1)%options.length;
        else if(event.name==='down')cursor=(cursor+1)%options.length;
        else if(multiple&&event.name==='space'){
          const value=options[cursor].value;if(chosen.has(value))chosen.delete(value);else chosen.add(value);
        } else if(event.name==='return'){
          if(multiple&&!chosen.size)return;
          const values=multiple?options.filter(option=>chosen.has(option.value)).map(option=>option.value):[options[cursor].value];
          cleanup();resolve(values);return;
        } else return;
        draw();
      };
      input.on('keypress',key);input.once('end',cancel);input.once('error',fail);
      output.on('resize',draw);signal?.addEventListener('abort',cancel,{once:true});
      input.setRawMode?.(true);input.resume();output.write('\x1b[?25l');draw();
    });
  }
  async function ask(prompt,{signal}={}) {
    const terminal=createInterface({input,output,terminal:true});
    let cancel;
    try {
      return await new Promise((resolve,reject)=>{
        cancel=()=>reject(aborted());
        terminal.once('SIGINT',cancel);terminal.once('close',cancel);
        signal?.addEventListener('abort',cancel,{once:true});
        if(signal?.aborted){signal.removeEventListener('abort',cancel);reject(aborted());return;}
        terminal.question(`${paint('36','◆')}  ${prompt}`,answer=>{
          signal?.removeEventListener('abort',cancel);resolve(answer);
        });
      });
    } finally {signal?.removeEventListener('abort',cancel);terminal.close();}
  }
  return {select,ask,line};
}
