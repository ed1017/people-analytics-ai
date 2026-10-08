// @ts-expect-error Native tests share TypeScript source.
import {workloadPlanReference,readWorkloadPlanReference,workloadPlanIndex,workloadEqual} from './workload-plan-records.ts';
import type {BundleDraft,BundleResult} from './home-bundle-reconciliation';
import type {PlanAlternative} from './home-plan-alternatives';
import type {SolutionEvaluation,SolutionRequest} from './home-solution-conversation';
// @ts-expect-error Native fixture tests share TypeScript source.
import {assertSourcesCurrent} from './home-solution-conversation.ts';
/** Only omit typed internal equality keys, never arbitrary evidence or user fields. */
function omit<T extends object,K extends keyof T>(value:T,keys:K[]):Omit<T,K>{
 return Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key as K))) as Omit<T,K>;
}
export function solutionDraftView(draft:BundleDraft){return omit(draft,['signature']);}
export function solutionResultView(result:BundleResult){return omit(result,['signature','bindingKey','inputKey']);}
export function solutionPlanView(plan:PlanAlternative){if(plan.workload){const {workload:_,...metadata}=plan;void _;return projectWorkloadContext({...metadata,workloadReference:workloadPlanReference(plan),draft:solutionDraftView(plan.draft),result:solutionResultView(plan.result)},{plans:[plan]});}return projectWorkloadContext({...plan,draft:solutionDraftView(plan.draft),result:solutionResultView(plan.result)},{plans:[plan]});}
/** Source IDs/revisions and bindings remain visible; exact equality keys remain server-owned. */
export function solutionEvaluationView(request:SolutionRequest,item:SolutionEvaluation){
 let sourcesCurrent=true;try{assertSourcesCurrent(request.catalog,item.sourceKeys);}catch{sourcesCurrent=false;}
 return projectWorkloadContext({...omit(item,['sourceKeys','draft','result']),sourcesCurrent,draft:item.draft?solutionDraftView(item.draft):null,result:item.result?solutionResultView(item.result):null},request.catalog);
}

/** Audit nested goal/evaluation/context spreads without truncating unrelated data. */
export function projectWorkloadContext<T>(value:T,catalog:{plans:PlanAlternative[]}|null):T{return projectWorkloadValue(value,catalog) as T;}
function projectWorkloadValue(value:unknown,catalog:{plans:PlanAlternative[]}|null):unknown{
 if(typeof value==='string'&&catalog?.plans.some(p=>p.workload&&(value===p.workload.report.sourceKey||value.includes(JSON.stringify(p.workload.report.sourceKey)))))throw Error('Raw workload equality keys cannot enter model context.');
 if(Array.isArray(value))return value.map(v=>projectWorkloadContext(v,catalog));if(!value||typeof value!=='object')return value;const v=value as Record<string,unknown>;
 if(typeof v.method==='string'&&v.method.startsWith('workload-capacity-')&&'sourceKey' in v&&'options' in v||'currentBinding' in v&&'identity' in v&&'workload' in v&&'managers' in v&&'options' in v)throw Error('Raw workload input/report fragments cannot enter model context. Resolve the validated local plan reference.');
 if(Object.values(v).some(x=>typeof x==='string'&&catalog?.plans.some(p=>p.workload?.report.sourceKey===x)))throw Error('Raw workload equality keys cannot enter model context.');
 if('input' in v&&'report' in v&&'selectedOptionId' in v&&'assumptionsAcceptedAt' in v)throw Error('Raw workload snapshots cannot enter model context. Resolve the validated local plan reference.');
 if(Object.hasOwn(v,'workload')&&v.workload&&typeof v.workload==='object'&&'input' in v.workload&&'report' in v.workload){const id=v.id,plan=catalog?.plans.find(p=>p.id===id);if(!plan||!workloadEqual(plan.workload,v.workload))throw Error('Embedded workload artifact has no current validated catalog reference.');const {workload:_,...metadata}=v;void _;return {...Object.fromEntries(Object.entries(metadata).map(([k,x])=>[k,projectWorkloadContext(x,catalog)])),workloadReference:workloadPlanReference(plan)};}
 for(const field of ['workloadReference','workloadIndex'])if(Object.hasOwn(v,field)){const ref=v[field] as {planId?:unknown},plan=catalog?.plans.find(p=>p.id===ref?.planId);if(!plan||(field==='workloadReference'?!readWorkloadPlanReference(ref,plan):!workloadEqual(ref,workloadPlanIndex(plan))))throw Error('Stale or fabricated workload model reference. Reopen its exact artifact.');}
 return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,projectWorkloadContext(x,catalog)]));
}
