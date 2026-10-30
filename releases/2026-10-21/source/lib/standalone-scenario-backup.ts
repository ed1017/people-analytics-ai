// @ts-expect-error Native tests share the calculation source.
import { calculateGroupCapacityRisk } from './group-capacity-risk.ts';
// @ts-expect-error Native tests share the calculation source.
import { groupWorkforceTrend } from './group-workforce-trend.ts';
import type { RiskGroup, RiskAssumptions } from './group-capacity-risk';
export type StandaloneScenarioContext = {kind:'risk'|'trend';datasetToken:string;groups:RiskGroup[];months:number;storageKey:string};
export type RiskScenario = {version:1;asOf:string;values:Record<string,RiskAssumptions>};
export type TrendScenario = {version:1;source:string;lookback:string;horizon:string;edits:Record<string,{headcount:string;fte:string}>};
export type StandaloneStorage = {getItem(key:string):string|null;setItem(key:string,value:string):void};
export const MAX_STANDALONE_BACKUP_BYTES=262144;
const fail=():never=>{throw Error('This saved scenario is incompatible with the current source and scope.');};
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))return fail();return v as Record<string,unknown>;}
function keys(v:unknown,wanted:string[]){const a=Object.keys(object(v)).sort();if(JSON.stringify(a)!==JSON.stringify([...wanted].sort()))fail();}
function json(raw:string):unknown{if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_STANDALONE_BACKUP_BYTES)fail();try{return JSON.parse(raw);}catch{return fail();}}
function source(c:StandaloneScenarioContext):string{
 if(!['risk','trend'].includes(c.kind)||!/^[-a-z0-9]+:[0-9]{1,12}$/.test(c.datasetToken)||c.datasetToken.length>110||!Number.isInteger(c.months)||c.months<1||c.months>12||!Array.isArray(c.groups)||!c.groups.length||c.groups.length>8)fail();
 const codes=new Set<string>();for(const g of c.groups){if(!g||typeof g.code!=='string'||!g.code||g.code.length>100||['__proto__','constructor','prototype'].includes(g.code)||codes.has(g.code)||typeof g.label!=='string'||g.label.length>200||!/^\d{4}-\d{2}-\d{2}$/.test(g.asOf)||![g.headcount,g.fte,g.exits,g.historyMonths].every(n=>Number.isFinite(n)&&n>=0)||g.fte>g.headcount||g.historyMonths<1)fail();codes.add(g.code);if(g.history!==undefined&&(!Array.isArray(g.history)||g.history.length>240||g.history.some(p=>!p||typeof p.snapshot_date!=='string'||![p.headcount,p.fte].every(n=>Number.isFinite(n)&&n>=0)||p.fte>p.headcount)))fail();}
 if(c.groups.some(g=>g.asOf!==c.groups[0].asOf))fail();
 const base='workforce-capacity-risk-v1:'+c.datasetToken;
 const validKey=c.kind==='risk'?c.storageKey===base:c.storageKey===base+':trend'||c.storageKey==='dashboard-risk-trend:'+c.datasetToken+':'+(c.groups.length===1?c.groups[0].code:'all')+':trend';
 if(!validKey)fail();
 return JSON.stringify(c.groups.map(g=>[g.code,g.label,g.asOf,g.headcount,g.fte,g.exits,g.historyMonths,g.history??null]));
}
export function readRiskScenario(raw:string,c:StandaloneScenarioContext):RiskScenario{
 source(c);if(c.kind!=='risk')fail();const v=object(json(raw));keys(v,['version','asOf','values']);if(v.version!==1||v.asOf!==c.groups[0].asOf)fail();keys(v.values,c.groups.map(g=>g.code));
 const values=object(v.values);for(const g of c.groups){const a=object(values[g.code]);keys(a,['months','demandFte','monthlyExits','monthlyHires','hireLagDays','ftePerHire','existingAvailabilityPct','rampPct','annualHireCost','basis']);if(a.months!==c.months)fail();if(calculateGroupCapacityRisk(g,a as unknown as RiskAssumptions).status!=='ready')fail();}return v as unknown as RiskScenario;
}
export function readTrendScenario(raw:string,c:StandaloneScenarioContext):TrendScenario{
 source(c);if(c.kind!=='trend')fail();const v=object(json(raw));keys(v,['version','source','lookback','horizon','edits']);if(v.version!==1||v.source!==JSON.stringify(c.groups.map(g=>[g.code,g.asOf,g.history]))||typeof v.lookback!=='string'||typeof v.horizon!=='string'||! /^(?:[1-9]|1[0-2])$/.test(v.lookback)||! /^(?:[1-9]|1[0-2])$/.test(v.horizon))fail();
 const edits=object(v.edits);for(const [code,e] of Object.entries(edits)){if(!c.groups.some(g=>g.code===code))fail();keys(e,['headcount','fte']);for(const n of Object.values(object(e)))if(typeof n!=='string'||!n.trim()||n.length>40||!Number.isFinite(Number(n))||Math.abs(Number(n))>1e7)fail();}
 for(const g of c.groups){const e=edits[g.code] as {headcount:string;fte:string}|undefined;groupWorkforceTrend(g,Number(v.lookback),Number(v.horizon),e?{headcount:Number(e.headcount),fte:Number(e.fte)}:undefined);}return v as unknown as TrendScenario;
}
function read(raw:string,c:StandaloneScenarioContext){return c.kind==='risk'?readRiskScenario(raw,c):readTrendScenario(raw,c);}
export function encodeStandaloneScenarioBackup(raw:string,c:StandaloneScenarioContext,createdAt:string):string{
 const payload=read(raw,c);if(!Number.isFinite(Date.parse(createdAt))||new Date(createdAt).toISOString()!==createdAt)fail();const encoded=JSON.stringify({format:'workforce-standalone-scenario-backup',version:1,kind:c.kind,datasetToken:c.datasetToken,sourceContext:{source:source(c),months:c.months},payload,createdAt});json(encoded);return encoded;
}
export function parseStandaloneScenarioBackup(file:string,c:StandaloneScenarioContext){
 const v=object(json(file));keys(v,['format','version','kind','datasetToken','sourceContext','payload','createdAt']);keys(v.sourceContext,['source','months']);const sc=object(v.sourceContext);
 if(v.format!=='workforce-standalone-scenario-backup'||v.version!==1||v.kind!==c.kind||v.datasetToken!==c.datasetToken||sc.source!==source(c)||sc.months!==c.months||typeof v.createdAt!=='string'||!Number.isFinite(Date.parse(v.createdAt))||new Date(v.createdAt).toISOString()!==v.createdAt)fail();
 const payloadRaw=JSON.stringify(v.payload),payload=read(payloadRaw,c);return {envelope:v,payloadRaw,payload,summary:{groupCount:c.groups.length,horizon:c.kind==='risk'?c.months:Number((payload as TrendScenario).horizon),asOf:c.groups[0].asOf}};
}
const tickets=new WeakMap<object,{file:string;signature:string;key:string;prior:string|null;storage:StandaloneStorage}>();
export type StandaloneRestoreTicket={readonly summary:{groupCount:number;horizon:number;asOf:string}};
function signature(c:StandaloneScenarioContext){return JSON.stringify([c.kind,c.datasetToken,c.months,c.storageKey,source(c)]);}
export function prepareStandaloneRestore(file:string,c:StandaloneScenarioContext,storage:StandaloneStorage):StandaloneRestoreTicket{
 const parsed=parseStandaloneScenarioBackup(file,c),ticket=Object.freeze({summary:Object.freeze(parsed.summary)});tickets.set(ticket,{file,signature:signature(c),key:c.storageKey,prior:storage.getItem(c.storageKey),storage});return ticket;
}
export function commitStandaloneRestore(ticket:StandaloneRestoreTicket,c:StandaloneScenarioContext,storage:StandaloneStorage):void{
 const t=tickets.get(ticket);if(!t||t.storage!==storage||t.signature!==signature(c)||t.key!==c.storageKey)throw Error('The workspace changed. Preview the backup again.');
 const parsed=parseStandaloneScenarioBackup(t.file,c);if(storage.getItem(t.key)!==t.prior)throw Error('The saved scenario changed. Preview the backup again.');storage.setItem(t.key,parsed.payloadRaw);tickets.delete(ticket);
}
