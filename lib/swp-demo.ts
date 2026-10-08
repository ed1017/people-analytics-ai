/** A presentation/commit adapter over existing staffing, plan and progress contracts.
 * No model, network, workforce write or replacement workflow engine. */
// @ts-expect-error Native Node tests share TypeScript source.
import {createHomeDemoDraft} from './home-demo-goals.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeDemoExamples,swpDemoBundle,swpDemoGoal,serviceStaffingBundle} from './home-demo-catalog.ts';
// @ts-expect-error Native Node fixtures share TypeScript source.
import {readDemandReview,SWP_DEMAND_MODE,serviceIllustrationScope,type DemandReview} from './swp-demand.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,readBundleDraft,reviseBundleDraft,reviewBundleProposal,type BundleDraft} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {evaluateHomeMix,verifyHomeMix,type HomeMixEvaluation} from './home-mix-runtime.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {prepareHomeMixCommit,homeMixHistoryField} from './home-mix-history.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {createPlanAlternatives,readPlanAlternatives,proposeStaffingAlternative,associatePlanProposal,packPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {appendGoalProgressEvent,emptyGoalProgress,readGoalProgressLedger,goalProgressField} from './goal-progress.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleSignature} from './home-solution-bundles.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBinding} from './home-action-drafts.ts';
import type {HomeMixCandidate} from './home-mix-search';
import type {DecisionStore,Json} from './local-decisions';

export const swpDemoPrompt='Explore the fictional five-role workforce plan: support service growth with five additional roles over 12 months, within a $325,000 incremental cash budget. Review the demand assumption and compare developing, moving and hiring people.';
export const swpStarterGroup={label:'Strategic workforce decisions',purpose:'swp-business',prompts:[
 {label:'Grow within budget',prompt:'How could we support growth within a cash budget? Help me review the business objective, additional-role demand, scope and horizon before calculating.'},
 {label:'Plan critical skills',prompt:'Which critical skills could constrain our business objective over 12–24 months? Use available skill evidence and distinguish training completion, capability and internal availability.'},
 {label:'Compare workforce choices',prompt:'For my goal, compare hiring, developing and redeploying people using supported calculations. Discuss contracting and automation separately where inputs or calculators are missing; do not invent savings.'},
 {label:'Test key assumptions',prompt:'How would reviewed attrition, hiring and productivity assumptions affect this plan? Separate supported headcount scenarios from assumptions that still need validation.'},
]} as const;
export const swpDemoField='swpDemoReviewV1';
export const swpDemandBridgeField='swpDemandBridgeV1';
export type SwpDemandBridge={review:DemandReview;reviewedAt:string;staffingReviewedAt:string;priorAccepted?:{review:DemandReview;reviewedAt:string}[]};
export const swpMetric='Additional role coverage';
const premise='Fictional scenario assumption for review; no observed eligibility, release, funding or business forecast.';
const assumed=<T>(value:T)=>({value,kind:'illustrative' as const,basis:premise});
export async function createSwpDemo(goalId:string,now:string):Promise<BundleDraft>{
 if(!/^guided-[A-Za-z0-9-]{1,60}$/.test(goalId))throw Error('Use an isolated example goal identity.');
 const draft=createHomeDemoDraft(homeDemoExamples.find(e=>e.key==='capacity')!,now);
 draft.bundle=swpDemoBundle();draft.signature=bundleSignature(draft.bundle);
 draft.binding.goalId=goalId;draft.binding.goal=swpDemoGoal;
 const input=draft.inputs,capacity=input.capacity!;
 input.budget={amount:assumed(325000),basis:assumed('cash')};capacity.input.budget='325000';capacity.origins.budget={kind:'illustrative',basis:premise};
 input.scope.population=assumed('Fictional Service Operations / Service Analyst');
 input.scope.businessUnit=assumed('Fictional Service Operations');input.scope.jobProfile=assumed('Service Analyst');
 input.scope.requirements=assumed('Support service growth. Five additional roles is an explicit demo demand assumption, not a conversion from revenue. Review availability, source-team coverage and skill readiness.');
 capacity.input.businessUnit=input.scope.businessUnit.value!;capacity.input.jobProfile=input.scope.jobProfile.value!;
 for(const key of ['businessUnit','jobProfile'] as const)capacity.origins[key]={kind:'illustrative',basis:premise};
 delete input.whatIf;
 for(const row of input.timing){const domain=draft.bundle.components.find(c=>c.id===row.componentId)!.domain;row.finish=assumed((domain==='learning'?capacity.input.buildMonth:domain==='mobility'?capacity.input.moveMonth:capacity.input.planningMonth)+'-01');}
 draft.binding=await actionBinding(goalId,draft.binding.goal,{sources:[]},{origin:'fictional-swp-example-v1',preparedAt:now,inputs:input});
 return reviseBundleDraft(draft,input);
}
export function validateDemandBridge(draft:BundleDraft,bridge:SwpDemandBridge,token:string){
 const r=bridge.review,checked=readDemandReview(r,{conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:r.intakeId,datasetToken:token,boundGoal:{id:'',statement:''},revision:r.revision});
 if(checked.spec.scope!==serviceIllustrationScope||checked.result.status!=='calculated'||checked.result.additionalRoles===null||checked.result.additionalRoles<=0||checked.spec.ftePerRole.value!==1||!bridge.reviewedAt||!bridge.staffingReviewedAt||!Number.isFinite(Date.parse(bridge.reviewedAt))||!Number.isFinite(Date.parse(bridge.staffingReviewedAt)))throw Error('Review current workload assumptions before staffing.');
 const s=checked.spec,c=draft.inputs.capacity?.input;
 if(draft.binding.goal!==s.objective||draft.inputs.scope.population.value!==s.scope||draft.inputs.scope.businessUnit.value!==s.scope||draft.inputs.scope.startMonth.value!==s.startMonth||draft.inputs.scope.months.value!==s.months||draft.inputs.scope.demand.value!==checked.result.additionalRoles||Number(c?.roles)!==checked.result.additionalRoles||c?.planningMonth!==s.startMonth||Number(c?.months)!==s.months)throw Error('Staffing scope, demand or horizon no longer matches its reviewed workload bridge. Correct the demand assumptions and review a new bridge before saving.');
 if(checked.result.availableFte!>0&&(Number(c?.build)>0||Number(c?.move)>0))throw Error('Existing productive capacity cannot also be counted as internal staffing. Review distinct internal pools first.');
 return checked;
}
export async function createServiceStaffingDemo(goalId:string,bridge:SwpDemandBridge,now:string,previous?:{draft:BundleDraft;bridge:SwpDemandBridge}):Promise<BundleDraft>{
 const r=bridge.review,checked=readDemandReview(r,{conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:r.intakeId,datasetToken:r.datasetToken,boundGoal:{id:'',statement:''},revision:r.revision});
 if(checked.spec.scope!==serviceIllustrationScope)throw Error('This staffing cost/readiness illustration supports only the explicit service-analyst/client-operations slice. The calculated gap is retained; another role needs separately reviewed staffing assumptions.');
 const roles=checked.result.additionalRoles,start=checked.spec.startMonth,months=checked.spec.months;
 if(checked.result.status!=='calculated'||roles===null||roles<=0||roles>20||checked.spec.ftePerRole.value!==1||!months||!start)throw Error('This staffing illustration needs a positive gap of at most 20 whole full-time roles. Fractional schedules or a zero gap retain their useful demand calculation without an invented staffing plan.');
 if(previous)validateDemandBridge(previous.draft,previous.bridge,r.datasetToken);
 const draft=previous?structuredClone(previous.draft):await createSwpDemo(goalId,now),input=draft.inputs,capacity=input.capacity!;draft.bundle=serviceStaffingBundle();draft.signature=bundleSignature(draft.bundle);
 draft.binding.goal=checked.spec.objective;
 const scopeValues={startMonth:start,months,population:checked.spec.scope!,businessUnit:checked.spec.scope!,jobProfile:'Illustrative service-analyst role slice',demand:roles,requirements:checked.spec.objective+' Provisional managed-services effort gap for one role slice; staffing inputs are separate assumptions. Delivery outcomes are unproven.'};
 for(const [key,value] of Object.entries(scopeValues)){const k=key as keyof typeof scopeValues;if(input.scope[k]?.value!==value)Object.assign(input.scope,{[k]:assumed(value)});}
 const priorStart=capacity.input.planningMonth;
 // A start shift changes absolute delivery dates and needs its own review; do not silently move reported dates.
 if(previous&&start!==priorStart)throw Error('A different start month needs a separate review of staffing delivery dates; previous staffing assumptions are retained.');
 const coupled={planningMonth:start,months:String(months),businessUnit:checked.spec.scope!,jobProfile:input.scope.jobProfile.value!,roles:String(roles),deadlineMonth:swpMonth(start,months-1)};
 for(const [key,value] of Object.entries(coupled)){const k=key as keyof typeof capacity.input;if(capacity.input[k]!==value){capacity.input[k]=value;capacity.origins[k]={kind:'illustrative',basis:'Code-derived from the newly reviewed operational scenario; not verified workforce capacity.'};}}
 if(!previous){Object.assign(capacity.input,{build:'0',move:'0',buy:String(roles),maxAddedEmployees:String(roles),arrivalDate:start+'-01',buildMonth:swpMonth(start,Math.min(2,months-1)),moveMonth:swpMonth(start,Math.min(1,months-1))});}
 else if(roles!==previous.bridge.review.result.additionalRoles){Object.assign(capacity.input,{build:'0',move:'0',buy:String(roles)});for(const k of ['build','move','buy'] as const)capacity.origins[k]={kind:'illustrative',basis:'Hire reference reset to the newly reviewed role gap; search limits and costs remain as previously reviewed.'};}
 const internal=checked.result.availableFte===0;
 for(const path of ['build','move','buy'] as const){const prior=input.mixScenario!.bounds[path],max=path==='buy'?roles:internal?Math.min(previous?prior.value!.max:path==='build'?3:2,roles):0,min=previous?prior.value!.min:0;
  if(min>max)throw Error('The revised demand conflicts with a reviewed staffing search minimum. Review that separate constraint; it has not been relaxed.');
  if(prior.value?.max!==max||prior.value.min!==min)input.mixScenario!.bounds[path]=assumed({min,max});
  if(path!=='buy'&&(!previous||!internal)){const group=input.groups.find(g=>g.id==='scenario-'+path)!;if(group.count.value!==max)group.count=assumed(max);}
 }
 if(checked.spec.budgetUsd.value!==null&&(!previous||JSON.stringify(checked.spec.budgetUsd)!==JSON.stringify(previous.bridge.review.spec.budgetUsd))){input.budget!.amount=assumed(checked.spec.budgetUsd.value);capacity.input.budget=String(checked.spec.budgetUsd.value);capacity.origins.budget={kind:'illustrative',basis:'Budget from the reviewed demand scenario; original reported/proposed provenance is retained in its bridge.'};}
 if(!previous)for(const row of input.timing){const domain=draft.bundle.components.find(c=>c.id===row.componentId)!.domain;row.start=assumed(start+'-01');row.finish=assumed(domain==='hiring'?capacity.input.arrivalDate:(domain==='learning'?capacity.input.buildMonth:capacity.input.moveMonth)+'-01');}
 draft.binding=await actionBinding(goalId,draft.binding.goal,{sources:[]},{origin:'reviewed-service-effort-and-illustrative-staffing-v1',preparedAt:now,demandBridge:bridge,inputs:input});const next=reviseBundleDraft(draft,input);validateDemandBridge(next,bridge,r.datasetToken);return next;
}
export function swpMonth(start:string,offset:number){return new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5))-1+offset,1)).toISOString().slice(0,7);}
export function swpEnd(draft:BundleDraft){const end=swpMonth(draft.inputs.scope.startMonth.value!,draft.inputs.scope.months.value!);return new Date(Date.parse(end+'-01T00:00:00Z')-86400000).toISOString().slice(0,10);}
export type SwpOption={id:string;label:string;candidate:HomeMixCandidate;draft:BundleDraft;coverage:(number|null)[]|null};
/** Uses dependency-gated monthly outputs. Never interpolates or converts role coverage into company headcount. */
export function swpOptions(evaluation:HomeMixEvaluation):SwpOption[]{
 const {context,report}=evaluation;if(context.status!=='ready'||!report)return [];
 const reference=report.reference,selected=[reference];
 const feasible=report.results.filter(c=>c.status==='met'&&c.cash.complete!==null&&!c.isReferenceMix).sort((a,b)=>Number(b.id===report.preferredOptionId)-Number(a.id===report.preferredOptionId)||(a.metrics?.fullCoverageDate??'9999').localeCompare(b.metrics?.fullCoverageDate??'9999'));
 for(const row of feasible){if(selected.length===3)break;if(!selected.some(other=>JSON.stringify(other.mix)===JSON.stringify(row.mix)))selected.push(row);}
 return selected.map((candidate,index)=>{
  const inputs=structuredClone(context.source.draft.inputs);inputs.capacity!.input=structuredClone(candidate.input);
  inputs.capacity!.flows=inputs.capacity!.flows.filter(flow=>flow.path==='backfills'?Number(candidate.input.backfills)>0&&candidate.mix.build+candidate.mix.move>0:Number(candidate.input[flow.path])>0);
  const draft=reviseBundleDraft(context.source.draft,inputs);let coverage:null|(number|null)[]=null;
  try{coverage=reviewBundleProposal(draft).conditionalCoverage;}catch{/* Invalid calculations remain unavailable. */}
  return {id:candidate.id,label:index===0?'Current mix':`Option ${index}`,candidate,draft,coverage};
 });
}
/** Uniform within-month effort is an explicit scenario conversion, not proof of service coverage. */
export function serviceOptionEffort(option:SwpOption,bridge:SwpDemandBridge){
 const r=validateDemandBridge(option.draft,bridge,bridge.review.datasetToken),months=r.spec.months!;
 if(!option.coverage||option.coverage.length!==months||option.coverage.some(v=>v===null))return {status:'unknown' as const,additionalHours:null,totalHours:null,shortfallHours:null};
 const covered=[...option.coverage] as number[],start=r.spec.startMonth!,capacity=option.draft.inputs.capacity!,ready=reviewBundleProposal(option.draft).componentReady;
 for(const flow of capacity.flows.filter(f=>f.path!=='backfills')){
  const arrival=flow.path==='buy'?capacity.input.arrivalDate:capacity.input[flow.path==='build'?'buildMonth':'moveMonth']+'-01',prerequisites=flow.componentIds.map(id=>ready[id]);
  if(prerequisites.some(v=>v===null))return {status:'unknown' as const,additionalHours:null,totalHours:null,shortfallHours:null};
  const effective=[arrival,...prerequisites as string[]].sort().at(-1)!,index=(Number(effective.slice(0,4))-Number(start.slice(0,4)))*12+Number(effective.slice(5,7))-Number(start.slice(5,7));
  if(Number(effective.slice(8,10))>1&&index>=0&&index<months)covered[index]=Math.max(0,covered[index]-Number(capacity.input[flow.path]));
 }
 const additionalHours=covered.reduce((sum,n)=>sum+n,0)*r.result.productiveHoursInHorizon!/months;
 const totalHours=r.result.capacityHours!+additionalHours,shortfallHours=Math.max(0,r.result.workloadHours!-totalHours);
 return {status:shortfallHours>1e-7?'shortfall' as const:'conditional-coverage' as const,additionalHours,totalHours,shortfallHours,assumption:'Uniform monthly productive hours; any partial effective readiness month is conservatively excluded. No peak or service-level model.'};
}
export async function compareSwpDemo(draft:BundleDraft,signal?:AbortSignal){
 if(!readBundleDraft(draft))throw Error('Review a valid scoped draft.');
 const evaluation=await evaluateHomeMix(draft,signal);return {evaluation,options:swpOptions(evaluation),inputKey:bundleInputKey(draft)};
}
export type SwpSaveReview={version:1;datasetToken:string;draft:BundleDraft;candidateId:string;selectedPlanId:string};
export function readSwpSaveReview(raw:unknown):SwpSaveReview|null{
 const r=raw as SwpSaveReview;
 return r?.version===1&&typeof r.datasetToken==='string'&&readBundleDraft(r.draft)&&typeof r.candidateId==='string'&&typeof r.selectedPlanId==='string'?structuredClone(r):null;
}
/** Prepare, then publish via the existing one-envelope goal selection transaction.
 * Selection acknowledges scenario unknowns; it never confirms them as real facts. */
export async function prepareSwpSelection(store:DecisionStore,draft:BundleDraft,raw:HomeMixEvaluation,candidateId:string,at:string,current:()=>boolean,signal?:AbortSignal,demandBridge?:SwpDemandBridge){
 const initial=store.getSnapshot(),token=store.getDatasetToken(),revision=initial.data.revision,goal={id:draft.binding.goalId,statement:draft.binding.goal};
 if(demandBridge)validateDemandBridge(draft,demandBridge,token);
 if(draft.bundle.name===serviceStaffingBundle().name&&!demandBridge)throw Error('The reviewed workload bridge is required for this staffing illustration.');
 const guard=()=>{signal?.throwIfAborted();const s=store.getSnapshot();if(!current()||!s.ready||!s.saved||s.data.revision!==revision||store.getDatasetToken()!==token||s.data.goals.activeId&&s.data.goals.activeId!==goal.id)throw Error('The goal, draft, dataset or browser storage changed. Review again; earlier work is kept.');};guard();
 const fields=initial.data.workspaces[goal.id]?.fields??{},saved=readSwpSaveReview(fields[swpDemoField]);
 let catalog=fields[planAlternativesField]===undefined?null:readPlanAlternatives(fields[planAlternativesField],{goalId:goal.id,goal:goal.statement});
 if(fields[planAlternativesField]!==undefined&&!catalog)throw Error('Existing plan history cannot be verified.');
 if(saved&&saved.datasetToken===token&&bundleInputKey(saved.draft)===bundleInputKey(draft)&&saved.candidateId===candidateId&&catalog?.attachments.some(a=>a.planId===saved.selectedPlanId&&a.purpose==='proposal-selection'))return {alreadySaved:true as const,goal,revision,fields:null};
 const evaluation=await verifyHomeMix(raw,draft,signal);guard();
 const option=evaluation&&swpOptions(evaluation).find(o=>o.id===candidateId);
 if(!option||option.candidate.status!=='met'||option.candidate.cash.complete===null)throw Error('Choose an available option that meets the entered scenario limits.');
 // The verified reference retains the source draft; only emitted alternatives need a proposal.
 const mix=await prepareHomeMixCommit(draft,evaluation,option.candidate.isReferenceMix?null:candidateId,at,fields[homeMixHistoryField],signal);guard();if(demandBridge)validateDemandBridge(mix.draft,demandBridge,token);
 // Preserve the original input as lineage, even when the reviewed choice is another mix.
 if(!catalog)catalog=createPlanAlternatives({goalId:goal.id,goal:goal.statement},[{id:'swp-original',draft}]);
 let source=catalog.plans.find(p=>bundleInputKey(p.draft)===bundleInputKey(draft));
 if(!source){
  const original=catalog.plans.find(p=>p.id==='swp-original');
  if(!original)throw Error('The original staffing source is missing.');
  const sourceOutcome=proposeStaffingAlternative(catalog,catalog,{requestId:'swp-input-'+revision,text:'Reviewed changes to fictional staffing assumptions.',sourceIds:[original.id],expectedInputs:{[original.id]:bundleInputKey(original.draft)}},draft);
  if(sourceOutcome.status!=='ready')throw Error('The revised source cannot be preserved.');catalog=sourceOutcome.catalog;source=sourceOutcome.plan;
 }
 const request={requestId:'swp-choice-'+revision,text:'Reviewed fictional staffing choice; not operational authorization.',sourceIds:[source.id],expectedInputs:{[source.id]:bundleInputKey(source.draft)}};
 const outcome=option.candidate.isReferenceMix?{status:'ready' as const,catalog,plan:source}:proposeStaffingAlternative(catalog,catalog,request,mix.draft);if(outcome.status!=='ready')throw Error('The selected plan could not be prepared.');
 catalog=associatePlanProposal(outcome.catalog,outcome.catalog,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:request.requestId,at,acknowledgeUnknowns:true});
 const plan=outcome.plan,existing=fields[goalProgressField];let ledger=existing===undefined?emptyGoalProgress(goal.id,'demo'):readGoalProgressLedger(existing,goal.id);
 const prior=ledger.events.filter(e=>e.kind==='measurement').at(-1),measurementId='swp-measure-'+revision;
 ledger=appendGoalProgressEvent(ledger,{id:measurementId,at,supersedes:prior?.id??null,kind:'measurement',data:{metric:'additional-role-coverage',definition:'Conditional additional roles in the named unit and role; not company headcount.',unit:'roles',direction:'increase',scope:{country:'Fictional scenario',org:draft.inputs.scope.businessUnit.value!,level:draft.inputs.scope.jobProfile.value!},lineageId:'swp-demo-conditional-coverage',baselineId:null,target:{value:draft.inputs.scope.demand.value!,date:swpEnd(draft)},maxAgeDays:90,provenance:'Reviewed fictional scenario target; no baseline or realized outcome asserted.'}});
 ledger=appendGoalProgressEvent(ledger,{id:'swp-link-'+revision,at,supersedes:null,kind:'plan-linked',data:{planId:plan.id,revision:plan.draft.revision,inputKey:plan.result.inputKey,evidenceDigest:plan.draft.binding.evidenceDigest,datasetToken:token}});
 if(option.candidate.metrics?.fullCoverageDate)ledger=appendGoalProgressEvent(ledger,{id:'swp-milestone-'+revision,at,supersedes:null,kind:'milestone-proposed',data:{measurementId,value:draft.inputs.scope.demand.value!,date:option.candidate.metrics.fullCoverageDate,provenance:'Proposed conditional role-coverage checkpoint; readiness and operational release require validation.'}});
 guard();
 return {alreadySaved:false as const,goal,revision,fields:{[planAlternativesField]:packPlanAlternatives(catalog),[homeMixHistoryField]:mix.history,[swpDemoField]:{version:1,datasetToken:token,draft,candidateId,selectedPlanId:plan.id},...(demandBridge?{[swpDemandBridgeField]:{...demandBridge,selectedEffort:serviceOptionEffort(option,demandBridge)}}:{}),[goalProgressField]:ledger} as unknown as Record<string,Json>};
}
