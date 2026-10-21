import assert from 'node:assert/strict';
import {digest,canonical,monthsFor,dayAdd} from './common.mjs';
import {generateHiring} from './hiring.mjs';
import {generateTurnover} from './turnover.mjs';
import {generateSatisfaction} from './satisfaction.mjs';
const statuses=new Set(['complete','partial','missing','suppressed']);
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const close=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
const outcomeFields={turnover:['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'],
 hiring:['openingCount','dispositions','actualStartEvents','plannedStartEvents','rightCensoredCount'],
 satisfaction:['eligible','submitted','nonrespondents','invalidRespondents','respondents','validAnswerCount','invalidAnswerCount','missingAnswerCount','scoredAnswerCount','favorableAnswerCount','shareSum','scorePct','participationPct']};

export function validateReleases(domain,rows){
 assert(domain in outcomeFields,'Known aggregate domain required');assert(Array.isArray(rows)&&rows.length,'Release history required');
 const groups=new Map();
 for(const row of rows){
  assert(typeof row.recordKey==='string'&&row.recordKey.startsWith(domain+':'));
  assert(Number.isSafeInteger(row.revision)&&row.revision>0);assert.equal(row.supersedes,row.revision===1?null:row.revision-1);
  assert(timestamp(row.effectiveAt)&&timestamp(row.simulatedAvailableAt));assert.equal(row.sourceObservedAt,null);assert(row.simulatedAvailableAt>=row.effectiveAt);assert(statuses.has(row.status));
  assert(row.value&&typeof row.value==='object');
  const group=groups.get(row.recordKey)??[];group.push(row);groups.set(row.recordKey,group);
  const value=row.value;
  if(row.status!=='complete'){
   for(const field of outcomeFields[domain])assert.equal(value[field],null,`${domain} ${field} must remain null when withheld`);
   if(domain==='turnover')assert.equal(value.exposure.personDays,null);
   if(domain==='hiring'){assert.equal(value.horizonLabelsComplete,false);assert.equal(value.knownOutcomeThrough,null);}
   continue;
  }
  if(domain==='turnover'){
   for(const field of outcomeFields.turnover)assert(count(value[field]));
   assert.equal(value.endHeadcount,value.startHeadcount+value.starts-value.voluntaryExits-value.otherExits);
   assert(count(value.exposure.personDays)&&count(value.exposure.days)&&value.exposure.days>0);
   assert(close(value.exposure.meanHeadcount,value.exposure.personDays/value.exposure.days));assert.equal(value.exposure.status,'complete');
  }else if(domain==='hiring'){
   assert(count(value.openingCount)&&Object.keys(value.dispositions).sort().join(',')==='accepted,cancelled,noShow,open,started');
   assert(Object.values(value.dispositions).every(count));assert.equal(Object.values(value.dispositions).reduce((a,b)=>a+b,0),value.openingCount);
   assert.equal(value.actualStartEvents.reduce((sum,e)=>sum+e.count,0),value.dispositions.started);
   for(const event of value.actualStartEvents){assert(count(event.count)&&timestamp(event.at));assert(event.at<=row.simulatedAvailableAt);}
   for(const event of value.plannedStartEvents){assert(count(event.count)&&timestamp(event.at)&&timestamp(event.acceptedAt));assert(event.acceptedAt<=row.simulatedAvailableAt);}
   assert.equal(value.rightCensoredCount,value.dispositions.open+value.dispositions.accepted);
   assert(timestamp(value.knownOutcomeThrough)&&value.knownOutcomeThrough<=row.simulatedAvailableAt);
   if(value.horizonLabelsComplete){assert(value.horizonMature);assert(value.knownOutcomeThrough>=dayAdd(row.effectiveAt,value.horizonDays));}
  }else{
   for(const field of outcomeFields.satisfaction.filter(f=>!['shareSum','scorePct','participationPct'].includes(f)))assert(count(value[field]),field);
   assert.equal(value.respondents+value.invalidRespondents,value.submitted);assert.equal(value.submitted+value.nonrespondents,value.eligible);
   assert.equal(value.validAnswerCount+value.invalidAnswerCount+value.missingAnswerCount,value.submitted*5);
   assert(value.scoredAnswerCount<=value.validAnswerCount&&value.favorableAnswerCount<=value.scoredAnswerCount);
   assert(value.shareSum===null?value.respondents===0:value.shareSum>=0&&value.shareSum<=value.respondents);
   assert(value.scorePct===null?value.respondents===0:close(value.scorePct,100*value.shareSum/value.respondents));
   assert(value.participationPct===null?value.eligible===0:close(value.participationPct,100*value.respondents/value.eligible));
  }
 }
 for(const group of groups.values()){
  group.sort((a,b)=>a.revision-b.revision);
  group.forEach((row,index)=>{assert.equal(row.revision,index+1,'Revision history must be contiguous and unique');assert.equal(row.effectiveAt,group[0].effectiveAt);if(index)assert(row.simulatedAvailableAt>=group[index-1].simulatedAvailableAt,'Revision cannot precede its predecessor');});
 }
 return true;
}

/** Only simulated as-of aggregate releases cross this boundary; never truth or future metadata. */
export function replaySynthetic(domain,rows,cutoff){
 assert(timestamp(cutoff),'Canonical UTC cutoff required');validateReleases(domain,rows);
 const selected=new Map();
 for(const row of rows){
  if(row.effectiveAt>cutoff||row.simulatedAvailableAt>cutoff)continue;
  const prior=selected.get(row.recordKey);if(!prior||row.revision>prior.revision)selected.set(row.recordKey,row);
 }
 return {domain,cutoff,dataClass:'constructed-synthetic',observationBasis:'simulated',operationallyQualified:false,
  records:[...selected.values()].sort((a,b)=>a.effectiveAt.localeCompare(b.effectiveAt)||a.recordKey.localeCompare(b.recordKey)).map(row=>structuredClone(row))};
}

export function validateGeneratedCase(config,result){
 assert.equal(result.dataClass,'constructed-synthetic');assert.equal(result.operationallyQualified,false);
 for(const domain of ['turnover','hiring','satisfaction'])validateReleases(domain,result.domains[domain].releases);
 const {turnover,hiring,satisfaction}=result.domains;
 assert.deepEqual(turnover.truth.map(row=>row.month),monthsFor(config));
 let stock=config.initialHeadcount;
 for(const row of turnover.truth){
  assert.equal(row.startHeadcount,stock);let dayStock=stock;
  for(const day of row.daily){assert.equal(day.startHeadcount,dayStock);assert.equal(day.endHeadcount,dayStock+day.starts-day.voluntaryExits-day.otherExits);assert(day.endHeadcount>=0);dayStock=day.endHeadcount;}
  assert.equal(dayStock,row.endHeadcount);assert.equal(row.exposure.personDays,row.daily.reduce((sum,day)=>sum+day.endHeadcount,0));
  assert.equal(row.starts,hiring.startEvents.filter(event=>event.at.startsWith(row.month)).reduce((sum,event)=>sum+event.count,0));stock=row.endHeadcount;
 }
 const boundary=result.boundaryReconciliation;
 assert.equal(boundary.allActualStarts,boundary.workforceWindowStarts+boundary.postWindowStarts+boundary.beforeWindowStarts);
 assert.equal(boundary.workforceWindowStarts,turnover.truth.reduce((sum,row)=>sum+row.starts,0));
 assert.equal(boundary.beforeWindowStarts,0);
 for(const row of satisfaction.truth)assert.equal(row.value.eligible,turnover.truth.find(t=>t.month===row.month).endHeadcount);
 return true;
}

export function generateWorkforceCase(config,{seed,family}){
 assert(config.seeds.includes(seed)&&config.families.includes(family),'Only frozen cases permitted');
 const hiring=generateHiring(config,{seed,family});
 const turnover=generateTurnover(config,{seed,family,startEvents:hiring.startEvents});
 const satisfaction=generateSatisfaction(config,{seed,family,workforce:turnover.truth});
 const first=turnover.truth[0].month,last=turnover.truth.at(-1).month;
 const sum=predicate=>hiring.startEvents.filter(predicate).reduce((total,event)=>total+event.count,0);
 const boundaryReconciliation={allActualStarts:sum(()=>true),workforceWindowStarts:sum(e=>e.at.slice(0,7)>=first&&e.at.slice(0,7)<=last),
  postWindowStarts:sum(e=>e.at.slice(0,7)>last),beforeWindowStarts:sum(e=>e.at.slice(0,7)<first),workforceWindowStart:first,workforceWindowEnd:last};
 const result={schemaVersion:1,generatorVersion:config.generatorVersion,seed,family,dataClass:'constructed-synthetic',observationBasis:'simulated',operationallyQualified:false,boundaryReconciliation,domains:{turnover,hiring,satisfaction}};
 validateGeneratedCase(config,result);return result;
}

export function splitArtifacts(result){
 const envelope={schemaVersion:1,generatorVersion:result.generatorVersion,seed:result.seed,family:result.family,dataClass:result.dataClass,observationBasis:result.observationBasis,operationallyQualified:false};
 return {
  releases:{...envelope,kind:'synthetic-aggregate-releases',domains:Object.fromEntries(Object.entries(result.domains).map(([domain,data])=>[domain,{definitions:data.definitions,releases:data.releases}]))},
  truth:{...envelope,kind:'synthetic-ground-truth-do-not-train-from-future',boundaryReconciliation:result.boundaryReconciliation,domains:Object.fromEntries(Object.entries(result.domains).map(([domain,data])=>[domain,data.truth]))},
 };
}

export function replayCheckpoint(config,result){
 return [...config.windows.developmentOrigins,config.windows.assessmentOrigin,config.finalScoringCutoff].map(cutoff=>({cutoff,
  domains:Object.fromEntries(Object.entries(result.domains).map(([domain,data])=>{
   const snapshot=replaySynthetic(domain,data.releases,cutoff),records=snapshot.records;
   return [domain,{snapshotSha256:digest(canonical(snapshot)),records:records.length,complete:records.filter(r=>r.status==='complete').length,
    withheld:records.filter(r=>r.status!=='complete').length,
    latestEffectiveAt:records.at(-1)?.effectiveAt??null,
    completeHiringHorizons:domain==='hiring'?records.filter(r=>r.status==='complete'&&r.value.horizonLabelsComplete).length:null,
    instrumentVersions:domain==='satisfaction'?[...new Set(records.map(r=>r.value.instrumentVersion))].sort():null}];
  }))}));
}
