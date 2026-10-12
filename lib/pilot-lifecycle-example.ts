/** Read-only fictional walkthroughs. Never a measured-progress or company-data source. */
// @ts-expect-error Native Node tests share TypeScript source.
import {validateProgressObservation,type GoalMeasurement,type ProgressObservation,type ProgressPlanLink} from './goal-progress.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleWorkspace,type BundleAttachment} from './home-bundle-records.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {createHomeDemoDraft} from './home-demo-goals.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeDemoExamples} from './home-demo-catalog.ts';
import {LEGACY_DATASET_TOKEN} from './dataset-identity.mjs';

export type PilotLifecycleExample={
 origin:'fictional-walkthrough-v1';goalId:string;goal:string;plan:ProgressPlanLink;
 population:string;populationSize:number;owner:{label:string;assignedOn:string};reviewDate:string;
 measurement:GoalMeasurement;proposedBaseline:number;
 observations:ProgressObservation[];
 delivery:{date:string;status:'planned'|'in-progress'|'completed';completed:number;planned:number;unit:string}[];
 participation:{date:string;participants:number;invited:number;participantHours:number;coordinationHours:number}[];
};
const specifications={
 workload:{metric:'workload-pressure',definition:'fictional-workload-rating-0-10-mean-v1',unit:'points (0–10)',direction:'decrease' as const,baseline:7,target:6,latest:6.5},
 skills:{metric:'work-sample-score',definition:'fictional-fixed-rubric-0-10-mean-v1',unit:'points (0–10)',direction:'increase' as const,baseline:4,target:6,latest:5.5},
};
const day=(start:string,offset:number)=>new Date(Date.parse(start)+offset*86400000).toISOString().slice(0,10);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Same record shape for applicable domains; all figures here are invented teaching values. */
export function fictionalPilotLifecycle(attachment:Pick<BundleAttachment,'id'|'draft'>,domain:'workload'|'skills'='workload'):PilotLifecycleExample{
 const draft=attachment.draft,start=draft.inputs.timing[0]?.start.value;
 if(!start)throw Error('A dated saved example is required.');
 const populationSize=draft.inputs.groups[0]?.count.value;
 if(!populationSize||!Number.isSafeInteger(populationSize))throw Error('An explicit fictional population is required.');
 const spec=specifications[domain],scope={country:'Fictional country',org:'Fictional volunteer cohort A',level:'All fictional pilot participants'},reviewDate=day(start,42);
 const source={classification:'scenario' as const,datasetToken:LEGACY_DATASET_TOKEN,releaseId:'fictional-pilot-walkthrough-v1',releaseDigest:draft.binding.evidenceDigest,lineageId:'fictional-cohort-a-'+domain};
 const observation=(offset:number,value:number):ProgressObservation=>({metric:spec.metric,definition:spec.definition,unit:spec.unit,scope,period:{kind:'interval',start:day(start,offset),end:day(start,offset+6)},value,quality:{complete:true,suppressed:false,denominatorRequired:true,denominator:populationSize},source,capturedAt:day(start,offset+7)+'T12:00:00Z'});
 return {origin:'fictional-walkthrough-v1',goalId:draft.binding.goalId,goal:draft.binding.goal,
  plan:{planId:attachment.id,revision:draft.revision,inputKey:bundleInputKey(draft),evidenceDigest:draft.binding.evidenceDigest,datasetToken:LEGACY_DATASET_TOKEN},
  population:`The same ${populationSize} fictional volunteers in cohort A; no real people or team identified.`,populationSize,owner:{label:domain==='workload'?'Demo People Partner (fictional assigned owner)':'Demo Learning Lead (fictional assigned owner)',assignedOn:start},reviewDate,
  measurement:{metric:spec.metric,definition:spec.definition,unit:spec.unit,direction:spec.direction,scope,lineageId:source.lineageId,baselineId:null,target:{value:spec.target,date:reviewDate},maxAgeDays:30,provenance:`Invented walkthrough assumptions, not company historical evidence. Equal seven-day windows, same ${populationSize} fictional respondents and unchanged instrument.`},
  proposedBaseline:spec.baseline,observations:[observation(-7,spec.baseline),observation(35,spec.latest)],
  delivery:[{date:start,status:'planned',completed:0,planned:populationSize*3,unit:domain==='workload'?'individual check-ins':'individual practice reviews'},{date:day(start,14),status:'in-progress',completed:populationSize,planned:populationSize*3,unit:domain==='workload'?'individual check-ins':'individual practice reviews'},{date:day(start,41),status:'completed',completed:populationSize*3,planned:populationSize*3,unit:domain==='workload'?'individual check-ins':'individual practice reviews'}],
  participation:[{date:day(start,14),participants:populationSize,invited:populationSize,participantHours:populationSize,coordinationHours:2},{date:day(start,41),participants:populationSize,invited:populationSize,participantHours:populationSize*3,coordinationHours:8}],
 };
}
/** Arithmetic for this fictional illustration only, never an achieved-outcome adapter. */
export function compareFictionalPilot(record:PilotLifecycleExample){
 const unavailable={change:null,gap:null} as {change:number|null;gap:number|null};
 try{
  if(record.origin!=='fictional-walkthrough-v1'||record.observations.length!==2||!Number.isSafeInteger(record.populationSize)||record.populationSize<=0)return unavailable;
  const [baseline,latest]=record.observations,m=record.measurement,spec=Object.values(specifications).find(s=>s.metric===m.metric&&s.definition===m.definition&&s.unit===m.unit&&s.direction===m.direction);
  if(!spec||!Number.isFinite(m.target.value)||m.target.value<0||m.target.value>10)return unavailable;
  for(const o of record.observations){
   validateProgressObservation(o);
   if(o.source.classification!=='scenario'||o.source.datasetToken!==record.plan.datasetToken||o.source.lineageId!==m.lineageId||!same(o.source,baseline.source)||!same(o.scope,m.scope)||o.metric!==m.metric||o.definition!==m.definition||o.unit!==m.unit||o.period.kind!=='interval'||(Date.parse(o.period.end)-Date.parse(o.period.start))/86400000!==6||o.value===null||o.value>10||!o.quality.complete||o.quality.suppressed||!o.quality.denominatorRequired||o.quality.denominator!==record.populationSize||o.capturedAt.slice(0,10)<o.period.end||o.period.end>record.reviewDate)return unavailable;
  }
  if(latest.period.start<=baseline.period.end||m.target.date!==record.reviewDate)return unavailable;
  return {change:Math.round((latest.value!-baseline.value!)*100)/100,gap:Math.round((m.direction==='decrease'?latest.value!-m.target.value:m.target.value-latest.value!)*100)/100};
 }catch{return unavailable;}
}
/** Reconstruct only the untouched original demo receipt, never an edited/current plan. */
export function readPilotLifecycleExample(raw:unknown,goalId:string,datasetToken:string){
 if(datasetToken!==LEGACY_DATASET_TOKEN)return null;
 const example=homeDemoExamples.find(e=>e.key==='retention'&&e.id===goalId),workspace=readBundleWorkspace(raw,goalId);
 if(!example||!workspace)return null;
 const original=workspace.attachments.find(a=>a.id===example.id+'-attached'&&a.supersedes===null);
 if(!original||!same(original.draft,createHomeDemoDraft(example,original.attachedAt)))return null;
 return {record:fictionalPilotLifecycle(original),historical:workspace.attachments.some(a=>a.supersedes===original.id)||workspace.drafts.some(d=>d.bundle.id===original.draft.bundle.id&&bundleInputKey(d)!==bundleInputKey(original.draft))};
}

/** Fixed in-memory illustration, independent of browser goals, dataset selection and saved receipts. */
export function standalonePilotLifecycle(){
 const example=homeDemoExamples.find(e=>e.key==='retention')!;
 return fictionalPilotLifecycle({id:'fictional-pilot-read-only',draft:createHomeDemoDraft(example,'2026-10-12T12:00:00Z')});
}
