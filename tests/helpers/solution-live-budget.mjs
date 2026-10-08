import {readFileSync,openSync,writeFileSync,fsyncSync,closeSync,mkdirSync,rmdirSync,existsSync} from 'node:fs';
/** Private cumulative journal: pessimistic generation reservations are never refunded.
 * Token counting has no independently established endpoint charge; retain a
 * conservative allowance at the cache-write input rate, separately from usage.
 */
export function liveBudget(path,batch,{batchLimit=4500000,totalLimit=50000000,preflightTokens=0}={}){
 const lock=path+'.lock';mkdirSync(lock,{mode:0o700});
 const events=existsSync(path)?readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
 const totals=()=>{const amounts=new Map();for(const event of events)amounts.set(event.id,event);const rows=[...amounts.values()];return {batch:rows.filter(item=>item.batch===batch).reduce((sum,item)=>sum+item.microusd,0),total:rows.reduce((sum,item)=>sum+item.microusd,0)};};
 const append=event=>{const fd=openSync(path,'a',0o600);try{writeFileSync(fd,JSON.stringify(event)+'\n');fsyncSync(fd);}finally{closeSync(fd);}events.push(event);};
 let sequence=events.length;
 function reserve(kind,microusd,detail={}){const sums=totals();if(sums.batch+microusd>batchLimit||sums.total+microusd>totalLimit)throw Error('Authorized evaluation budget exhausted.');const entry={id:batch+'-'+(++sequence),batch,kind,microusd,at:new Date().toISOString(),...detail};append(entry);return entry;}
 if(preflightTokens&&!events.some(item=>item.kind==='initial-preflight'))reserve('initial-preflight',Math.ceil(preflightTokens*.25));
 return {reserve,totals,settleCount(entry,tokens){if(!Number.isSafeInteger(tokens)||tokens<0||tokens>200000)throw Error('Token-count bound unavailable.');append({...entry,microusd:Math.ceil(tokens*.25),inputTokens:tokens,settledAt:new Date().toISOString()});},close(){rmdirSync(lock);}};
}
