import {generateWorkforceCase,replaySynthetic} from './synthetic-workforce/pipeline.mjs';
import {monthAdd,dayAdd} from './synthetic-workforce/common.mjs';
import {forecastTurnover} from './synthetic-domain-predictions/turnover.mjs';
import {forecastHiring} from './synthetic-domain-predictions/hiring.mjs';
import {forecastSatisfaction} from './synthetic-domain-predictions/satisfaction.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const domainDemoPath='lib/data/synthetic-domain-demo-v1.json';
export const domainEvidenceCommit='978b3bb0b9b8db2ae3291af9df564f4886bae6c1';
const reportPath='docs/evidence/synthetic-domain-predictions-v1/report.json';
const reportHash='5e4a2f441b9577d51deb7a6605b96503e8a5e5706f1c025d888ae7f58c0bc6e5';
/** Fixed local evidence only; read is an offline test seam, never request input. */
export async function buildSyntheticDomainDemo({read=path=>readFile(new URL(path,root))}={}){
 try{
  const bytes=await read(reportPath);assert.equal(hash(bytes),reportHash);const r=JSON.parse(bytes);
  for(const [path,expected] of Object.entries(r.implementationFiles)){assert(/^(lib\/ml|tests\/manual)\/[\w./-]+$/.test(path)&&!path.includes('..'));assert.equal(hash(await read(path)),expected);}
  for(const [path,expected] of Object.entries(r.artifacts)){assert(/^[\w.-]+$/.test(path));const data=await read('docs/evidence/synthetic-domain-predictions-v1/'+path);assert.equal(data.length,expected.bytes);assert.equal(hash(data),expected.sha256);}
  assert.equal(r.dataClass,'constructed-synthetic');assert.equal(r.operationallyQualified,false);assert.equal(r.realWorldPerformanceValidated,false);assert.equal(r.interval,null);assert.equal(r.causalEffect,null);assert.equal(r.reserveQuarterScore,null);
  const demo=r.demo;assert.equal(demo.seed,r.protocol.demoSeed);assert.equal(demo.family,r.protocol.demoFamily);assert.equal(demo.origin,r.protocol.demoOrigin);assert.equal(demo.operationallyQualified,false);
  const base=JSON.parse(await read('lib/ml/synthetic-workforce/protocol.json'));
  const generated=generateWorkforceCase({...base,seeds:r.protocol.testSeeds},{seed:demo.seed,family:demo.family});
  const forecasts={turnover:forecastTurnover,hiring:forecastHiring,satisfaction:forecastSatisfaction};
  const domains={};
  for(const domain of ['turnover','hiring','satisfaction']){
   const d=demo.domains[domain];assert.equal(d.interval,null);assert.equal(d.operationallyQualified,false);
   const predicted=d.status==='predicted';const methods=r.protocol[domain].methods;
   const rows=predicted?d.predictions.map(row=>({month:row.month,values:methods.map(method=>{assert(Number.isFinite(row[method]));return row[method];})})):[];
   const support=domain==='turnover'?{lastPeriod:d.audit.trainingEnd,periods:d.audit.selectedMonths,reportingGapMonths:d.audit.forecastGapMonths}:domain==='hiring'?{firstPeriod:d.audit.trainingStart,lastPeriod:d.audit.trainingEnd,calendarPeriods:d.audit.trainingCalendarMonths,positiveCohorts:d.audit.positiveCohorts,openings:d.audit.trainingOpenings}:{firstPeriod:d.audit.support[0]?.month,lastPeriod:d.audit.support.at(-1)?.month,comparableWaves:d.audit.requiredConsecutiveWaves,identity:d.predictions[0]?.identity??null};
   const snapshot=replaySynthetic(domain,generated.domains[domain].releases,demo.origin);
   assert.deepEqual(forecasts[domain](snapshot,domain==='satisfaction'?[r.protocol.demoMonths.at(-1)]:r.protocol.demoMonths),d,'Demo reproduction differs');
   const first=domain==='turnover'?monthAdd(d.audit.trainingEnd,-23):support.firstPeriod;
   const historical=predicted?snapshot.records.filter(row=>row.effectiveAt.slice(0,7)>=first&&row.effectiveAt.slice(0,7)<=support.lastPeriod).map(row=>{
    assert.equal(row.status,'complete');assert(row.simulatedAvailableAt<=demo.origin);
    const value=domain==='turnover'?row.value.voluntaryExits:domain==='satisfaction'?row.value.scorePct:row.value.openingCount>0?row.value.actualStartEvents.filter(event=>event.at<=dayAdd(row.effectiveAt,90)).reduce((sum,event)=>sum+event.count,0)/row.value.openingCount:null;
    assert(value===null||Number.isFinite(value));
    return {month:row.effectiveAt.slice(0,7),value,availableAt:row.simulatedAvailableAt,revision:row.revision,...(domain==='hiring'?{openings:row.value.openingCount}:{})};
   }):[];
   const last=historical.at(-1)?.month,step=domain==='satisfaction'?3:1,gaps=[];
   if(last)for(let month=monthAdd(last,step);month<r.protocol.demoMonths[0];month=monthAdd(month,step))gaps.push(month);
   domains[domain]={history:historical,gaps,status:predicted?'predicted':'unavailable',reasonCodes:[...d.reasons],methods,rows,support,interval:null,operationallyQualified:false,
    assessment:r.summaries.filter(s=>s.domain===domain).map(s=>({stage:s.stage,family:s.family,cases:s.cases,predicted:s.predicted,scored:s.scored,blocked:s.blocked.map(b=>({reasons:b.reasons}))}))};
  }
  return {version:1,status:'verified',dataClass:'constructed-synthetic',label:'Constructed synthetic demonstration',scope:'Fixed simulated company-wide population; independent of dashboard filters and recorded-data cohorts.',cutoff:demo.origin,seed:demo.seed,family:demo.family,
   historyCases:r.historyCases,monthsPerHistory:72,domains,interval:null,operationallyQualified:false,realWorldPerformanceValidated:false,causalEffect:null,
   evidence:{commit:domainEvidenceCommit,reportSha256:reportHash,protocolCommit:r.protocolFrozenCommit,reportPath,verifiedImplementationFiles:Object.keys(r.implementationFiles).length}};
 }catch{return {version:1,status:'unavailable',reasonCodes:['evidence-missing-or-mismatched'],domains:null,operationallyQualified:false};}
}
