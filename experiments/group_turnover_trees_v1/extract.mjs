import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {generateSignalHistory} from './generator.mjs';
import protocol from './generator-protocol.json' with {type:'json'};
import {forecastGroup} from '../../lib/ml/group-turnover/evaluation.mjs';
import {selectSignal} from '../../lib/ml/observable-turnover-signals/model.mjs';
import {replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
export const featureNames=['latest-released-count','previous-released-count','third-latest-released-count','target1-calendar-lag12','target2-calendar-lag12','target3-calendar-lag12'];
const groupIds=['group-a','group-b','group-c','group-d'];
export function inputs(snapshot,signalRecords,groupId) {
 const base=forecastGroup(snapshot,{groupId}),signal=selectSignal(signalRecords,snapshot.cutoff);
 if(base.status!=='forecasted-synthetic-count')return {base,features:null,signal:signal.value};
 const history=snapshot.records.filter(r=>r.value.groupId===groupId).sort((a,b)=>a.value.month.localeCompare(b.value.month));
 const values=[...history.slice(-3).reverse().map(r=>r.value.voluntaryExits),...base.methods.find(m=>m.method==='seasonal-naive-12').points.map(p=>p.expectedExits)];
 return {base,features:Object.fromEntries(featureNames.map((name,i)=>[name,values[i]])),signal:signal.value};
}
export function maskLatest(snapshot) {
 const changed=structuredClone(snapshot);
 for(const groupId of groupIds){
  const row=changed.records.filter(r=>r.value.groupId===groupId).at(-1);
  row.status='missing';row.value.countStatus='missing';
  for(const field of ['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'])row.value[field]=null;
  Object.assign(row.value.exposure,{status:'missing',personDays:null,days:null,meanHeadcount:null});
 }
 return changed;
}
export function shortHistory(snapshot){return {...snapshot,records:snapshot.records.filter(r=>r.value.month<'2022-01')};}
export function caseRows(history,scenario) {
 const window=protocol[history.split],assignment=history.assignments[scenario==='no-signal'?'no-signal':scenario==='reversed'?'reversed':'informative'];
 const branch=history.branches[assignment];
 let snapshot=replaySynthetic('turnover',branch.groups.releases,window.origin);
 const scoring=replaySynthetic('turnover',branch.groups.releases,window.labelsAsOf);
 let signals=[history.signalRelease];
 if(scenario==='delayed-signal')signals=[{...history.signalRelease,simulatedAvailableAt:window.targets[0]+'-01T00:00:00.000Z'}];
 if(scenario==='missing-signal')signals=[];
 if(scenario==='reporting-incomplete')snapshot=maskLatest(snapshot);
 if(scenario==='short-history')snapshot=shortHistory(snapshot);
 return groupIds.map(groupId=>{
  const {base,features,signal}=inputs(snapshot,signals,groupId);
  const labels=window.targets.map(month=>scoring.records.find(r=>r.value.groupId===groupId&&r.value.month===month));
  const eligible=features!==null&&labels.every(r=>r?.status==='complete');
  const actual=eligible?labels.map(r=>r.value.voluntaryExits):null;
  const labelAvailableAt=eligible?labels.map(r=>r.simulatedAvailableAt).sort().at(-1):null;
  assert(labelAvailableAt===null||labelAvailableAt<=window.labelsAsOf);
  const baselines=Object.fromEntries(base.methods.map(m=>[m.method,[...m.points.map(p=>p.expectedExits),m.expectedTotal]]));
  return {seed:history.seed,scenario,groupId,origin:window.origin,labelsAsOf:window.labelsAsOf,labelAvailableAt,
   trainingEnd:base.trainingEnd,trainingMonths:base.trainingMonths,inputFingerprint:base.trainingFingerprint,
   signal,features,baselines,actual:actual?[...actual,actual.reduce((a,b)=>a+b,0)]:null,reasons:base.reasons};
 });
}
export function generateRows(split){
 assert(['training','test'].includes(split));
 const window=protocol[split],scenarios=split==='training'?['informative','no-signal']:['informative','no-signal','reversed','delayed-signal','missing-signal','reporting-incomplete','short-history'];
 const rows=[];
 for(let seed=window.firstSeed;seed<=window.lastSeed;seed++){
  const history=generateSignalHistory(seed,split);
  rows.push(...scenarios.flatMap(scenario=>caseRows(history,scenario)));
  if((seed-window.firstSeed)%20===0)process.stderr.write(`${split} history ${seed-window.firstSeed+1}/${window.lastSeed-window.firstSeed+1}\n`);
 }
 return rows;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const split=process.argv[2];
 if(split==='test')assert(existsSync('docs/evidence/group-turnover-trees-v1/training-fit.json'),'Freeze training audit before generating test seeds');
 process.stdout.write(JSON.stringify(generateRows(split))+'\n');
}
