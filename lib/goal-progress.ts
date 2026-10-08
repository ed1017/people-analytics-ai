/** Versioned browser-local goal ledger. Arithmetic only; no ingestion or model. */
import {validDatasetToken} from './dataset-identity.mjs';
export const goalProgressEnabled=process.env.NEXT_PUBLIC_GOAL_PROGRESS==='true';
export const goalProgressField='goalProgressV1';
export const HEADCOUNT_DEFINITION='active-employees-point-in-time-v1';
export type GoalScope={country:string;org:string;level:string};
export type InputClass='recorded-synthetic'|'recorded-workforce'|'user-reported'|'scenario';
export type ProgressSource={classification:InputClass;datasetToken:string;releaseId:string;releaseDigest:string;lineageId:string};
export type ProgressObservation={metric:string;definition:string;unit:string;scope:GoalScope;period:{kind:'point'|'interval';start:string;end:string};value:number|null;quality:{complete:boolean;suppressed:boolean;denominatorRequired:boolean;denominator:number|null};source:ProgressSource;capturedAt:string};
export type GoalMeasurement={metric:string;definition:string;unit:string;direction:'increase'|'decrease'|'maintain'|'ceiling';scope:GoalScope;lineageId:string;baselineId:string|null;target:{value:number;date:string};maxAgeDays:number;provenance:string};
export type ProgressCurrentSource=ProgressSource&{available:boolean;scope:GoalScope};
export type ProgressPlanLink={planId:string;revision:number;inputKey:string;evidenceDigest:string;datasetToken:string};
export type ProgressMilestone={measurementId:string;value:number;date:string;provenance:string};
export type ProgressAssessment={version:1|2;goalId:string;measurementId:string|null;assessedOn:string;baseline:{id:string;observation:ProgressObservation}|null;latestComparable:{id:string;observation:ProgressObservation}|null;latestReceivedId:string|null;change:number|null;gap:number|null;intendedChangePercent:number|null;reference:{kind:'accepted-milestone'|'linear-reference';value:number;date:string;difference:number;milestoneId:string|null}|null;requiredPace:{value:number;unit:'people/day';from:string;through:string;arithmeticOnly:true}|null;currentStatus:'undefined'|'unavailable'|'baseline_only'|'deadline_passed'|'within_limit'|'outside_limit'|'meets_point_target'|'behind_reference'|'at_or_beyond_reference';reasons:string[];completion:'not_assessed';forecast:{status:'unavailable';confidence:null;successProbability:null}};
type EventBase={id:string;at:string;supersedes:string|null};
export type ProgressEvent=EventBase&({kind:'observed';data:ProgressObservation}|{kind:'measurement';data:GoalMeasurement}|{kind:'milestone-proposed';data:ProgressMilestone}|{kind:'milestone-accepted';data:{proposalId:string;intent:'accept-milestone'}}|{kind:'plan-linked';data:ProgressPlanLink}|{kind:'assessed';data:{asOf:string;currentSource:ProgressCurrentSource|null;result:ProgressAssessment}});
export type GoalProgressLedger={version:1;goalId:string;origin:'authored'|'demo';events:ProgressEvent[]};
const MAX_EVENTS=192,MAX_BYTES=180000;
const must=(value:unknown,message:string):void=>{if(!value)throw Error(message);};
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,value])=>[k,canonical(value)])):v;
const same=(a:unknown,b:unknown)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function exact(v:unknown,keys:string[]):asserts v is Record<string,unknown>{must(obj(v)&&Object.keys(v).sort().join()===keys.sort().join(),'Unsupported progress record fields.');}
const text=(v:unknown,max=160):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const amount=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9;
export function progressDay(v:unknown):v is string{return typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;}
function instant(v:unknown):v is string{return typeof v==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v.slice(0,10);}
export function validateProgressScope(v:unknown):asserts v is GoalScope{exact(v,['country','org','level']);must(Object.values(v).every(x=>text(x,100)),'Explicit saved goal scope required.');}
export function validateProgressSource(v:unknown):asserts v is ProgressSource{exact(v,['classification','datasetToken','releaseId','releaseDigest','lineageId']);must(['recorded-synthetic','recorded-workforce','user-reported','scenario'].includes(String(v.classification))&&validDatasetToken(v.datasetToken)&&text(v.releaseId,160)&&typeof v.releaseDigest==='string'&&/^[a-f0-9]{64}$/.test(v.releaseDigest)&&text(v.lineageId,160),'A classified source release and lineage are required.');}
function currentSource(v:unknown):asserts v is ProgressCurrentSource{exact(v,['classification','datasetToken','releaseId','releaseDigest','lineageId','available','scope']);const {available,scope,...source}=v;validateProgressSource(source);validateProgressScope(scope);must(typeof available==='boolean','Source availability required.');}
export function validateProgressObservation(v:unknown):asserts v is ProgressObservation{
 exact(v,['metric','definition','unit','scope','period','value','quality','source','capturedAt']);validateProgressScope(v.scope);validateProgressSource(v.source);exact(v.period,['kind','start','end']);exact(v.quality,['complete','suppressed','denominatorRequired','denominator']);
 must(text(v.metric,80)&&text(v.definition,160)&&text(v.unit,40)&&instant(v.capturedAt)&&(v.value===null||amount(v.value))&&['point','interval'].includes(String(v.period.kind))&&progressDay(v.period.start)&&progressDay(v.period.end)&&v.period.start<=v.period.end&&(v.period.kind!=='point'||v.period.start===v.period.end),'Invalid dated observation.');
 must(['complete','suppressed','denominatorRequired'].every(k=>typeof (v.quality as Record<string,unknown>)[k]==='boolean')&&(v.quality.denominator===null||amount(v.quality.denominator)),'Explicit completeness and denominator state required.');
 must(v.source.classification==='scenario'||String(v.period.end)<=String(v.capturedAt).slice(0,10),'Recorded observation cannot be future-dated at capture.');
 if(v.metric==='headcount'&&v.value!==null)must(Number.isSafeInteger(v.value),'Headcount actuals must be integer people.');
}
function measurement(v:unknown):asserts v is GoalMeasurement{exact(v,['metric','definition','unit','direction','scope','lineageId','baselineId','target','maxAgeDays','provenance']);validateProgressScope(v.scope);exact(v.target,['value','date']);must(text(v.metric,80)&&text(v.definition)&&text(v.unit,40)&&['increase','decrease','maintain','ceiling'].includes(String(v.direction))&&text(v.lineageId)&& (v.baselineId===null||id(v.baselineId))&&amount(v.target.value)&&progressDay(v.target.date)&&Number.isInteger(v.maxAgeDays)&&Number(v.maxAgeDays)>=1&&Number(v.maxAgeDays)<=365&&text(v.provenance,500),'Invalid measurement revision.');if(v.metric==='headcount')must(Number.isSafeInteger(v.target.value),'Headcount target must be integer people.');}
const days=(a:string,b:string)=>(Date.parse(b)-Date.parse(a))/86400000;
const observed=(l:GoalProgressLedger)=>l.events.filter((e):e is ProgressEvent&{kind:'observed'}=>e.kind==='observed');
function activeObservations(l:GoalProgressLedger){const superseded=new Set(observed(l).map(e=>e.supersedes));return observed(l).filter(e=>!superseded.has(e.id));}
function baselineObservation(l:GoalProgressLedger,baselineId:string|null){let item=observed(l).find(e=>e.id===baselineId);while(item){const next=observed(l).find(e=>e.supersedes===item!.id);if(!next)break;item=next;}return item;}
const latestMeasurement=(l:GoalProgressLedger)=>l.events.filter((e):e is ProgressEvent&{kind:'measurement'}=>e.kind==='measurement').at(-1);
function observationIssues(o:ProgressObservation,m:GoalMeasurement,baseline?:ProgressObservation){const reasons:string[]=[];if(o.metric!==m.metric||o.definition!==m.definition||o.unit!==m.unit)reasons.push('Metric, definition or unit changed.');if(!same(o.scope,m.scope))reasons.push('Observation scope differs from saved goal scope.');if(o.period.kind!=='point'||o.period.start!==o.period.end)reasons.push('A comparable point-in-time observation is required.');if(o.source.lineageId!==m.lineageId)reasons.push('Source lineage changed.');if(o.value===null)reasons.push('Observed value is missing.');if(!o.quality.complete)reasons.push('Observation completeness is unverified.');if(o.quality.suppressed)reasons.push('Observation is suppressed.');if(o.quality.denominatorRequired&&(o.quality.denominator===null||o.quality.denominator===0))reasons.push('Required denominator is missing.');if(o.source.classification==='scenario')reasons.push('Scenario inputs are not observed outcomes.');if(baseline&&o.source.classification!==baseline.source.classification)reasons.push('Input classifications differ.');return reasons;}
export function emptyGoalProgress(goalId:string,origin:'authored'|'demo'='authored'):GoalProgressLedger{must(id(goalId),'Saved goal identity required.');return {version:1,goalId,origin,events:[]};}
function acceptedMilestones(l:GoalProgressLedger){
 const accepted=new Set(l.events.filter(e=>e.kind==='milestone-accepted').map(e=>e.data.proposalId));
 const proposals=new Map(l.events.filter(e=>e.kind==='milestone-proposed').map(e=>[e.id,e]));
 const active=new Set(accepted);
 for(const proposalId of accepted){
  let ancestor=proposals.get(proposalId)?.supersedes;
  while(ancestor){active.delete(ancestor);ancestor=proposals.get(ancestor)?.supersedes;}
 }
 return {accepted,active};
}
// Version 1 is replay-only: preserve historical snapshots without letting new
// assessments select the obsolete milestone and threshold semantics.
function assess(l:GoalProgressLedger,asOf:string,source:ProgressCurrentSource|null,version:1|2=2):ProgressAssessment{
 must(progressDay(asOf),'Assessment date required.');if(source!==null)currentSource(source);
 l={...l,events:l.events.filter(e=>e.at.slice(0,10)<=asOf)};
 const result:ProgressAssessment={version,goalId:l.goalId,measurementId:null,assessedOn:asOf,baseline:null,latestComparable:null,latestReceivedId:null,change:null,gap:null,intendedChangePercent:null,reference:null,requiredPace:null,currentStatus:'undefined',reasons:[],completion:'not_assessed',forecast:{status:'unavailable',confidence:null,successProbability:null}};
 const revision=latestMeasurement(l);if(!revision){result.reasons.push('No accepted numeric measurement definition. Free-text goals and plans are not measurements.');return result;}const m=revision.data;result.measurementId=revision.id;
 if(m.metric!=='headcount'||m.definition!==HEADCOUNT_DEFINITION||m.unit!=='people'){result.reasons.push('This metric, definition or unit has no supported assessment adapter.');return result;}
 result.currentStatus='unavailable';const baseline=baselineObservation(l,m.baselineId);if(!baseline){result.reasons.push('A recorded baseline is missing.');return result;}result.baseline={id:baseline.id,observation:baseline.data};
 const baseIssues=observationIssues(baseline.data,m);if(baseline.data.period.end>=m.target.date)baseIssues.push('Target date must follow the baseline.');if(baseline.data.capturedAt.slice(0,10)>asOf)baseIssues.push('Baseline was not yet captured on the assessment date.');if(baseIssues.length){result.reasons.push(...baseIssues);return result;}
 const records=activeObservations(l).filter(e=>e.data.capturedAt.slice(0,10)<=asOf&&e.data.period.end>=baseline.data.period.end).sort((a,b)=>a.data.period.end.localeCompare(b.data.period.end)||Date.parse(a.data.capturedAt)-Date.parse(b.data.capturedAt)||l.events.indexOf(a)-l.events.indexOf(b));
 const received=records.at(-1),comparable=records.filter(e=>!observationIssues(e.data,m,baseline.data).length&&e.data.period.end<=asOf).at(-1);result.latestReceivedId=received?.id??null;
 if(!comparable){result.reasons.push('No comparable dated observation is available.');return result;}const o=comparable.data;result.latestComparable={id:comparable.id,observation:o};
 if(received)result.reasons.push(...observationIssues(received.data,m,baseline.data));if(received?.data.period.end&&received.data.period.end>asOf)result.reasons.push('Latest input is future-dated.');
 const base=baseline.data.value!,value=o.value!,date=o.period.end,threshold=m.direction==='maintain'||m.direction==='ceiling',decreasing=m.direction==='decrease'||threshold;
 result.change=value-base;result.gap=Math.max(0,decreasing?value-m.target.value:m.target.value-value);
 const intended=decreasing?base-m.target.value:m.target.value-base;if(!threshold&&intended>0)result.intendedChangePercent=(decreasing?base-value:value-base)/intended*100;
 const accepted=version===1?new Set(l.events.filter(e=>e.kind==='milestone-accepted').map(e=>e.data.proposalId)):acceptedMilestones(l).active;
 if(version===1)for(const e of l.events)if(e.kind==='milestone-proposed'&&e.supersedes&&accepted.has(e.id))accepted.delete(e.supersedes);
 const milestone=l.events.filter((e):e is ProgressEvent&{kind:'milestone-proposed'}=>e.kind==='milestone-proposed'&&e.data.measurementId===revision.id&&accepted.has(e.id)&&e.data.date<=date).sort((a,b)=>a.data.date.localeCompare(b.data.date)||l.events.indexOf(a)-l.events.indexOf(b)).at(-1);
 const reference=milestone?milestone.data.value:threshold||intended<=0?m.target.value:base+(m.target.value-base)*Math.min(1,Math.max(0,days(baseline.data.period.end,date)/days(baseline.data.period.end,m.target.date)));
 result.reference={kind:milestone?'accepted-milestone':'linear-reference',value:reference,date:milestone?.data.date??date,difference:value-reference,milestoneId:milestone?.id??null};
 const remaining=days(date,m.target.date);if(asOf<=m.target.date&&(remaining>0||result.gap===0))result.requiredPace={value:result.gap===0?0:(decreasing?-1:1)*result.gap/remaining,unit:'people/day',from:date,through:m.target.date,arithmeticOnly:true};
 if(days(date,asOf)>m.maxAgeDays)result.reasons.push('Latest comparable observation has expired under the saved freshness policy.');
 if(!source?.available)result.reasons.push('Current source is unavailable; historical observations remain dated evidence.');else{if(!same(source.scope,m.scope))result.reasons.push('Current source scope differs from saved goal scope.');if(!same(o.source,{classification:source.classification,datasetToken:source.datasetToken,releaseId:source.releaseId,releaseDigest:source.releaseDigest,lineageId:source.lineageId}))result.reasons.push('Current source release, dataset identity or lineage differs; explicitly record and review new data.');}
 if(result.reasons.length)return result;
 result.currentStatus=date===baseline.data.period.end?'baseline_only':asOf>m.target.date?'deadline_passed':threshold&&result.gap===0?'within_limit':version===2&&threshold&&result.gap>0?'outside_limit':!threshold&&result.gap===0?'meets_point_target':(decreasing?value>reference:value<reference)?'behind_reference':'at_or_beyond_reference';return result;
}
function observationKey(o:ProgressObservation){const {capturedAt,...value}=o;void capturedAt;return JSON.stringify(canonical(value));}
function append(l:GoalProgressLedger,event:ProgressEvent,replaying=false):GoalProgressLedger{
 exact(event,['id','at','supersedes','kind','data']);must(id(event.id)&&instant(event.at)&&(event.supersedes===null||id(event.supersedes)),'Invalid progress event identity.');
 const duplicate=l.events.find(e=>e.id===event.id);if(duplicate){must(same(duplicate,event),'Progress event ID already has different contents.');return l;}
 must(!l.events.length||Date.parse(event.at)>=Date.parse(l.events.at(-1)!.at),'Capture events must append in recording order.');
 if(event.kind==='observed'){
  validateProgressObservation(event.data);must(Date.parse(event.data.capturedAt)<=Date.parse(event.at),'Capture time cannot follow recording time.');
  if(!event.supersedes&&observed(l).some(e=>observationKey(e.data)===observationKey(event.data)))return l;
  if(event.supersedes){const old=activeObservations(l).find(e=>e.id===event.supersedes);must(old&&old.data.metric===event.data.metric&&old.data.source.classification===event.data.source.classification,'Correction must explicitly supersede a current observation of the same class and metric.');}
  else must(!activeObservations(l).some(e=>e.data.period.end===event.data.period.end&&e.data.metric===event.data.metric&&same(e.data.scope,event.data.scope)),'A different result for this date and scope needs an explicit correction.');
 }else if(event.kind==='measurement'){
  measurement(event.data);must(event.supersedes===(latestMeasurement(l)?.id??null),'Measurement corrections must supersede the current revision.');must(event.data.baselineId===null||observed(l).some(e=>e.id===event.data.baselineId),'Baseline observation reference is missing.');
 }else if(event.kind==='milestone-proposed'){
  exact(event.data,['measurementId','value','date','provenance']);const m=latestMeasurement(l);must(m&&event.data.measurementId===m.id&&amount(event.data.value)&&progressDay(event.data.date)&&event.data.date<=m.data.target.date&&text(event.data.provenance,500),'Milestone requires the active measurement and bounded date/value.');const b=baselineObservation(l,m?.data.baselineId??null);must(!b||event.data.date>b.data.period.end,'Milestone must follow the baseline.');if(m?.data.metric==='headcount')must(Number.isSafeInteger(event.data.value),'Milestone headcount must be integer people.');if(event.supersedes)must(l.events.some(e=>e.kind==='milestone-proposed'&&e.id===event.supersedes&&e.data.measurementId===event.data.measurementId)&&!l.events.some(e=>e.kind==='milestone-proposed'&&e.supersedes===event.supersedes),'Milestone correction needs its prior proposal.');
 }else if(event.kind==='milestone-accepted'){
  exact(event.data,['proposalId','intent']);must(event.supersedes===null&&event.data.intent==='accept-milestone','Intentional milestone acceptance required.');const p=l.events.find(e=>e.id===event.data.proposalId&&e.kind==='milestone-proposed');must(p?.kind==='milestone-proposed'&&p.data.measurementId===latestMeasurement(l)?.id&&!l.events.some(e=>e.kind==='milestone-proposed'&&e.supersedes===p.id),'Milestone proposal is missing, revised or belongs to an old target.');if(l.events.some(e=>e.kind==='milestone-accepted'&&e.data.proposalId===event.data.proposalId))return l;
 }else if(event.kind==='plan-linked'){
  exact(event.data,['planId','revision','inputKey','evidenceDigest','datasetToken']);must(event.supersedes===null&&id(event.data.planId)&&Number.isSafeInteger(event.data.revision)&&event.data.revision>0&&text(event.data.inputKey,50000)&&/^[a-f0-9]{64}$/.test(event.data.evidenceDigest)&&validDatasetToken(event.data.datasetToken),'Exact saved plan revision and input binding required.');if(l.events.some(e=>e.kind==='plan-linked'&&same(e.data,event.data)))return l;
 }else if(event.kind==='assessed'){
  exact(event.data,['asOf','currentSource','result']);const version=replaying&&event.data.result?.version===1?1:2;must(event.supersedes===null&&event.data.asOf===event.at.slice(0,10)&&same(event.data.result,assess(l,event.data.asOf,event.data.currentSource,version)),'Assessment must equal the deterministic result at this ledger revision.');
 }else throw Error('Unsupported progress event.');
 const next={...l,events:[...l.events,structuredClone(event)]};must(next.events.length<=MAX_EVENTS&&new TextEncoder().encode(JSON.stringify(next)).length<=MAX_BYTES,'Goal progress storage is full. History was not pruned.');return next;
}
export function readGoalProgressLedger(raw:unknown,goalId:string):GoalProgressLedger{
 if(raw===null||raw===undefined)return emptyGoalProgress(goalId);exact(raw,['version','goalId','origin','events']);must(raw.version===1&&raw.goalId===goalId&&['authored','demo'].includes(String(raw.origin))&&Array.isArray(raw.events)&&raw.events.length<=MAX_EVENTS&&new TextEncoder().encode(JSON.stringify(raw)).length<=MAX_BYTES,'Invalid or oversized goal-progress ledger.');let ledger=emptyGoalProgress(goalId,raw.origin as GoalProgressLedger['origin']);for(const event of raw.events as ProgressEvent[]){const next=append(ledger,event,true);must(next.events.length===ledger.events.length+1,'Duplicate stored progress event.');ledger=next;}return ledger;
}
export function appendGoalProgressEvent(raw:GoalProgressLedger,event:ProgressEvent){return append(readGoalProgressLedger(raw,raw.goalId),event);}
export function assessGoalProgress(raw:GoalProgressLedger,asOf:string,source:ProgressCurrentSource|null){return assess(readGoalProgressLedger(raw,raw.goalId),asOf,source);}
export function recordGoalProgressAssessment(raw:GoalProgressLedger,id:string,at:string,source:ProgressCurrentSource|null){const l=readGoalProgressLedger(raw,raw.goalId);return append(l,{id,at,supersedes:null,kind:'assessed',data:{asOf:at.slice(0,10),currentSource:source,result:assess(l,at.slice(0,10),source)}});}
/** Bounded shared read contract for Home/FOW/SWP. Does not write, infer quantities
 * from prose, consume page filters, ingest new releases or call a model. */
export function buildGoalProgressContext(raw:unknown,{goalId,asOf,currentSource=null}:{goalId:string;asOf:string;currentSource?:ProgressCurrentSource|null}){
 const saved=readGoalProgressLedger(raw,goalId),ledger={...saved,events:saved.events.filter(e=>e.at.slice(0,10)<=asOf)},assessment=assess(ledger,asOf,currentSource),revision=ledger.events.find((e):e is ProgressEvent&{kind:'measurement'}=>e.kind==='measurement'&&e.id===assessment.measurementId),{accepted,active}=acceptedMilestones(ledger),superseded=new Set(ledger.events.filter(e=>e.kind==='milestone-proposed').map(e=>e.supersedes));
 const context={version:1 as const,storage:'browser-local' as const,sharedAcrossDevices:false,goalId,origin:ledger.origin,measurement:revision?{id:revision.id,...revision.data}:null,assessment,milestones:ledger.events.filter((e):e is ProgressEvent&{kind:'milestone-proposed'}=>e.kind==='milestone-proposed'&&e.data.measurementId===revision?.id).slice(-12).map(e=>({id:e.id,...e.data,status:accepted.has(e.id)?active.has(e.id)?'accepted':'superseded-accepted':superseded.has(e.id)?'superseded-proposal':'proposed'})),planLinks:ledger.events.filter((e):e is ProgressEvent&{kind:'plan-linked'}=>e.kind==='plan-linked').slice(-4).map(e=>({id:e.id,planId:e.data.planId,revision:e.data.revision,evidenceDigest:e.data.evidenceDigest,datasetToken:e.data.datasetToken,exactInputKeyRetainedInLedger:true})),history:ledger.events.filter((e):e is ProgressEvent&{kind:'assessed'}=>e.kind==='assessed').slice(-4).map(e=>({id:e.id,at:e.at,assessmentVersion:e.data.result.version,measurementId:e.data.result.measurementId,observationId:e.data.result.latestComparable?.id??null,gap:e.data.result.gap,status:e.data.result.currentStatus})),limits:['Browser-local only; no cross-device or team persistence.','Plan selection or attachment is not implementation or measured impact.','Required pace and linear references are arithmetic, not forecasts.','No confidence, success probability or completion is inferred.']};
 must(new TextEncoder().encode(JSON.stringify(context)).length<=24000,'Progress context exceeds its bounded read limit.');return context;
}
export type GoalProgressContext=ReturnType<typeof buildGoalProgressContext>;
