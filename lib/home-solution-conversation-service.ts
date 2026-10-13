// @ts-expect-error Native fixtures share source.
import {captureStaffingDelivery} from './home-staffing-delivery.ts';
// @ts-expect-error Native fixture tests share source.
import {canReviewConditionalHiringPlan,canReviewCostedHiringPlan} from './home-hiring-plan.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {SolutionResponseError} from './home-solution-response-failure.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {solutionPreparation,solutionClock} from './home-solution-preparation.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {planningCalculationRef,planningCalculationFeedback,type PlanningCalculationRef,type PlanningCalculationKind} from './guided-planning-adapters.ts';
// @ts-expect-error Native Node tests share application source.
import {readStaffingScenario,converseStaffingScenario} from './home-staffing-scenario.ts';
// @ts-expect-error Native Node tests share application source.
import {hiringBudgetTool,currentHiringBudget,hiringBudgetView,editHiringBudget} from './home-hiring-budget.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {answerEvidenceSeries,type ChatEvidenceSeries} from './chat-evidence-series.ts';
// @ts-expect-error Native Node tests share application source.
import {hasExplicitStaffingRequirement,retainStaffingDeliveryTarget,requiredStaffingTool,currentRequiredStaffing,requiredStaffingView,editRequiredStaffing,requiresRequiredStaffing,canCompleteRequiredStaffingAlone,requiredStaffingAnswer} from './home-required-staffing.ts';
import type {verifySolutionEvidence} from './home-solution-grounding.mjs';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeAnswerScopeViolation} from './home-answer-scope.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {businessPlanningTools,currentBusinessPlanning,businessPlanningView,runBusinessPlanningTool} from './home-business-planning.ts';
// @ts-expect-error Native fixtures share TypeScript source.
import {reviewReferencedDemandTool,reviseReferencedDemandTool,createReferencedDemandReview,reviseReferencedDemandReview,referencedDemandView,demandReferenceId} from './swp-demand-reference.ts';
// @ts-expect-error Native Node fixtures share TypeScript source.
import {goalProgressProposalTool,createProgressEntryProposal,readProgressEntryState,type ProgressEntryProposal,type ProgressEntryContext} from './goal-progress-entry.ts';
import type {SolutionRequest,SolutionState,SolutionEvaluation} from './home-solution-conversation';
// @ts-expect-error Native Node fixtures share TypeScript source.
import {requestDemandContext,createDemandReview,reviseDemandReview,serviceDemandTool,demandPatchTool,demandPeriodFeedback,type DemandReview} from './swp-demand.ts';
import type {SolutionParameterEdit,SolutionCandidate,SolutionConstraint,SolutionFinal,ProjectionSpec,SolutionMetricRef} from './home-solution-conversation-schema';
import type {ProjectionInputs,HeadcountProjection} from './home-solution-projection';
// @ts-expect-error Native fixture tests share TypeScript source.
import {retainEvaluations,readSolutionRequest,readSolutionState,evaluateSolutionParameterEdit,evaluateSolutionCandidate,mergeSolutionConstraints,solutionUserTurns,resolveSolutionMetric,currentSolutionProposals} from './home-solution-conversation.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {solutionAnswerText,assertSolutionShape,solutionTools,solutionFinalSchema} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {calculateHeadcountProjection} from './home-solution-projection.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {goalProgressReadTool,readGoalProgressConversation,runGoalProgressRead,type GoalProgressConversation} from './goal-progress-conversation.ts';

// @ts-expect-error Native fixture tests share TypeScript source.
import {solutionPlanView,solutionEvaluationView,solutionResultView} from './home-solution-model-view.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {actionEvidenceCatalog} from './home-action-proposal.ts';
// @ts-expect-error Native fixtures share TypeScript source.
import {haveDuplicateBundleActivities} from './home-bundle-distinctness.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readSwpPlaybook} from './swp-reasoning-playbook.ts';

export type SolutionModelOutput={items:unknown[];calls:{id:string;name:string;arguments:string}[];text:string;completed:boolean};
export type SolutionReply={charts?:ChatEvidenceSeries[];requestId:string;answer:string;candidateIds:string[];analysisIds:string[];state:SolutionState;usage:{modelRounds:number;toolCalls:number};progressProposal?:ProgressEntryProposal;demandReview?:DemandReview};
export type SolutionToolDiagnostic={round:number;name:string;status:'ok'|'feedback'|'aborted';elapsedMs:number};
export type SolutionRuntime={requestTime?:Date;onToolResult?:(event:SolutionToolDiagnostic)=>void;staffingScenarioOnly?:boolean;grounding?:Awaited<ReturnType<typeof verifySolutionEvidence>>;complete:(input:unknown[],finalOnly:boolean,signal:AbortSignal,capabilities:{progressEntryEnabled:boolean;requiredStaffingCalculation:boolean})=>Promise<SolutionModelOutput>;loadProjection:(filters:SolutionRequest['filters'],signal:AbortSignal)=>Promise<ProjectionInputs>;now?:()=>Date;natural?:{datasetToken:string};progress?:{enabled:boolean;datasetToken:string};demand?:{datasetToken:string;referenceContract?:boolean}};
function readFinal(text:string):SolutionFinal{
 if(!text||text.length>20000)throw new SolutionResponseError('answer_unavailable','The conversational answer is unavailable.');
 let value;
 try{value=JSON.parse(text);}catch{throw new SolutionResponseError('invalid_json','The conversational answer is not valid JSON.');}
 if(typeof value?.answer==='string')throw new SolutionResponseError('invalid_schema','Use a checked recommendation, a specific unsupported planning outcome, or explicit discussion-only response.');
 try{assertSolutionShape(value,solutionFinalSchema,'answer');}catch{throw new SolutionResponseError('invalid_schema','The conversational answer does not match the required schema.');}
 return value;
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const abort=(signal:AbortSignal)=>{if(signal.aborted)throw Error('Conversation request cancelled.');};
const latest=<T extends {id:string}>(items:T[])=>[...new Map(items.map(item=>[item.id,item])).values()];
/** References for known results use evaluation identity, never nested draft lineage. */
function checkedMetricReferences(state:SolutionState,kind:SolutionMetricRef['kind'],id:string,revision:number):SolutionMetricRef[]{
 const metrics:SolutionMetricRef['metric'][]=kind==='candidate'?['cash_usd','staff_hours','participants']:['opening_headcount','closing_headcount'];
 return metrics.flatMap(metric=>{
  const ref:SolutionMetricRef={kind,id,revision,metric};
  try{const value=resolveSolutionMetric(state,ref).value;return typeof value==='number'&&Number.isFinite(value)?[ref]:[];}
  catch{return [];}
 });
}
export function solutionModelContext(request:SolutionRequest,progress?:GoalProgressConversation){
 const saved=request.catalog?.plans.filter(plan=>!plan.deleted)??[];
 return {goal:request.goal,scope:request.scope,filters:request.filters,timeZone:request.timeZone,goalContext:request.goalContext,...(progress?{savedGoalProgress:progress}:{}),currentEvidence:request.evidence,citationCatalog:actionEvidenceCatalog(request.evidence),currentConstraints:request.state.constraints,...(request.state.staffingDeliveryTarget?{staffingDeliveryTarget:request.state.staffingDeliveryTarget}:{}),
  savedPlans:saved.map(plan=>({id:plan.id,number:plan.number,revision:plan.draft.revision,name:plan.draft.bundle.name,objective:plan.draft.bundle.objective,activities:plan.draft.bundle.components})),selectedPlan:saved.some(plan=>plan.id===request.selectedId)?solutionPlanView(saved.find(plan=>plan.id===request.selectedId)!):null,
  recentTurns:request.state.turns,modelView:{version:1,omittedInternalEqualityKeys:['draft.signature','result.signature','result.bindingKey','result.inputKey','evaluation.sourceKeys'],authoritativeState:'Retained on the server; projected views cannot be saved or used as authoritative input.',history:'All retained turns; no history truncation during projection.'},currentWorkingRevisions:currentSolutionProposals(request.state).map(({id,revision,candidate},index)=>({id,revision,name:candidate.name,label:`Proposed Action Plan ${index+1}`})),workingProposals:request.state.working.map(item=>{const view=solutionEvaluationView(request,item);return {...view,inputs:item.draft?.inputs??null,draft:undefined,result:item.result?solutionResultView(item.result):null};}),
  analyses:request.state.analyses.map(item=>({id:item.id,revision:item.revision,method:item.spec.method,months:item.spec.months,assumptions:item.assumptions,opening:item.inputs.opening,asOf:item.inputs.asOf,scope:item.inputs.scope,interpretations:item.interpretations,finalHeadcount:item.points.at(-1)?.headcount})),
  rejectedIdeas:request.state.rejected,unresolvedQuestions:request.state.questions,focusCandidateId:request.state.focusCandidateId,currentMessage:request.message,
 };
}

/** Bounded model-directed read/calculation loop. No write, model switch or automatic retry. */
export async function converseSolutions(raw:unknown,runtime:SolutionRuntime,signal:AbortSignal):Promise<SolutionReply>{
 const original=readSolutionRequest(raw),request=structuredClone(original),state=request.state;
 abort(signal);
 if(runtime.natural&&(hasExplicitStaffingRequirement(request.message.text)||requiresRequiredStaffing(request)||state.requiredStaffing||state.staffingDeliveryTarget||state.constraints.some(c=>c.field==='horizon_months'&&c.action==='set'))){
  const captured=captureStaffingDelivery(request.message,!!state.staffingDeliveryTarget?.issue);
  if(captured){
   const previous=state.staffingDeliveryTarget;
   // The dedicated record replaces only the matching legacy staffing interpretation.
   state.constraints=state.constraints.filter(c=>c.field!=='horizon_months'||!!previous&&(c.turnId!==previous.turnId||c.number!==previous.months));
   state.staffingDeliveryTarget=captured;
  }
  if(captured?.issue){
   const answer=captured.issue;state.questions=[answer];
   state.turns=[...state.turns,{...request.message,role:'user' as const},{id:'reply-'+request.requestId.slice(0,70),role:'assistant' as const,text:answer}].slice(-32);
   return {requestId:request.requestId,answer,candidateIds:[],analysisIds:[],charts:[],state:readSolutionState(state),usage:{modelRounds:0,toolCalls:0}};
  }
 }
 if(runtime.staffingScenarioOnly){
  const scenario=readStaffingScenario(request,{natural:!!runtime.natural,datasetToken:runtime.natural?.datasetToken??''});
  if(!scenario||runtime.grounding||runtime.demand)throw Error('The illustrative staffing contract is not eligible.');
  return converseStaffingScenario(request,scenario,runtime,signal);
 }
 const demand=runtime.demand?requestDemandContext(request,runtime.demand.datasetToken):null;
 const progress=runtime.progress?.enabled?readGoalProgressConversation(request.goalProgress,{goalId:request.goal.id,datasetToken:runtime.progress.datasetToken,asOf:(runtime.now?.()??new Date()).toISOString().slice(0,10)}):undefined;
 const entryContext:ProgressEntryContext|undefined=progress?.context&&request.goal.id?{input:request.goalProgress as ProgressEntryContext['input'],goal:request.goal.statement,requestId:request.requestId,turns:solutionUserTurns(request).map(({id,text})=>({id,text})),previous:readProgressEntryState(request.progressEntry),now:(runtime.now?.()??new Date()).toISOString()}:undefined;
 let progressProposal:ProgressEntryProposal|undefined;
 let demandReview:DemandReview|undefined;
 const referenced=!!demand&&runtime.demand?.referenceContract===true;let referenceStep=0;
 let currentDemandReference=referenced?demandReferenceId(request.requestId,referenceStep):'';
 let natural=runtime.natural?currentBusinessPlanning(request,runtime.natural.datasetToken):null,naturalStep=0;
 let staffingRequired=!!runtime.natural&&requiresRequiredStaffing(request),staffingCalculated=false;
 // Only the already selected, standalone comparison can finish from its first tool result.
 const staffingOnly=staffingRequired&&canCompleteRequiredStaffingAlone(request);
 const standaloneStaffing=staffingOnly&&!demand&&!entryContext&&!request.goal.id&&!request.goal.statement&&!request.goalContext&&!request.selectedId&&!request.catalog&&!state.working.length&&!state.analyses.length&&!state.constraints.length&&!state.verifiedMetrics.length&&!state.focusCandidateId;
 const modelContext={...solutionModelContext(request,progress),preparation:solutionPreparation(request,runtime.requestTime??runtime.now?.()??new Date(),runtime.requestTime?'request-start':'conversation-preparation'),...(runtime.grounding?{evidenceGrounding:runtime.grounding}:{}),...(runtime.natural?{requiredStaffing:requiredStaffingView(currentRequiredStaffing(request,runtime.natural.datasetToken)),businessPlanning:businessPlanningView(natural,request.requestId,naturalStep),hiringBudget:hiringBudgetView(currentHiringBudget(request,runtime.natural.datasetToken))}:{})};
 if(referenced&&demand){const goalContext=structuredClone(request.goalContext) as {scenarioReview:Record<string,unknown>};goalContext.scenarioReview.demandProposal=demand.demandProposal?referencedDemandView(demand.demandProposal,demand,currentDemandReference):null;modelContext.goalContext=goalContext;}
 const input:unknown[]=[{role:'user',content:'CURRENT AUTHORITATIVE CONTEXT AND CONVERSATION DATA\n'+JSON.stringify({...modelContext,...(entryContext?{progressEntryDraft:entryContext.previous}:{} )})}];
 const planningRefs=new Map<string,PlanningCalculationRef>();
 const evaluated=new Map<string,SolutionEvaluation>(),analyses=new Map<string,HeadcountProjection>();
 let coFinalEligible=true;
 const presentationTools=new Set(['read_clock','read_evidence','read_plans','evaluate_candidate','revise_parameters']);
 let toolCalls=0,operations=0,projectionInput:Promise<ProjectionInputs>|undefined,final:SolutionFinal|undefined,rounds=0;
 for(let round=0;round<4;round++){
  abort(signal);if(new TextEncoder().encode(JSON.stringify(input)).length>120000)throw Error('This conversation needs a narrower set of sources before another model round. Earlier work is kept.');
  if(staffingRequired&&!staffingCalculated&&(round===3||operations>=6))throw Error('The staffing comparison was not calculated within this turn\'s limits. Earlier work is kept.');
  const output=await runtime.complete(input,round===3||operations>=6,signal,{progressEntryEnabled:!!entryContext,requiredStaffingCalculation:standaloneStaffing&&!staffingCalculated});rounds++;abort(signal);
  if(!output.completed)throw new SolutionResponseError('incomplete_output','The conversation response was incomplete or exceeded its bounds.');
  if(output.calls.length>6||JSON.stringify(output.items).length>70000)throw new SolutionResponseError('output_bounds','The conversation response was incomplete or exceeded its bounds.');
  if(!output.calls.length){
   if(staffingRequired&&!staffingCalculated)throw Error('The staffing comparison was not calculated in this turn. Earlier work is kept.');
   final=readFinal(output.text);break;
  }
  const callCost=(call:SolutionModelOutput['calls'][number])=>{if(call.name!=='evaluate_action_plans')return 1;try{const count=JSON.parse(call.arguments)?.candidates?.length;return Number.isInteger(count)&&count>=1&&count<=3?count:3;}catch{return 3;}};
  if(round===3||operations+output.calls.reduce((total,call)=>total+callCost(call),0)>6)throw Error('The bounded calculation limit was reached. No proposal was saved.');
  input.push(...output.items);
  for(const call of output.calls){
   abort(signal);toolCalls++;operations+=callCost(call);let result:unknown;
   const toolStartedAt=Date.now();let toolStatus:SolutionToolDiagnostic['status']='ok';
   if(!presentationTools.has(call.name))coFinalEligible=false;
   if(runtime.natural&&call.name===requiredStaffingTool.name){staffingRequired=true;staffingCalculated=false;}
   try{
    const tool=runtime.natural&&call.name===requiredStaffingTool.name?requiredStaffingTool:runtime.natural&&call.name===hiringBudgetTool.name?hiringBudgetTool:runtime.natural&&businessPlanningTools.some(t=>t.name===call.name)?businessPlanningTools.find(t=>t.name===call.name):demand?[...(referenced?[reviewReferencedDemandTool,reviseReferencedDemandTool]:[serviceDemandTool,demandPatchTool]),...solutionTools.filter(t=>['read_clock','read_evidence'].includes(t.name))].find(t=>t.name===call.name):call.name==='propose_goal_progress'&&entryContext?goalProgressProposalTool:call.name==='read_goal_progress'&&progress?goalProgressReadTool:solutionTools.find(tool=>tool.name===call.name);if(!tool||call.arguments.length>32000)throw Error('Unsupported or oversized tool request.');const args=JSON.parse(call.arguments);
    const periodFeedback=demand?demandPeriodFeedback(call.name,args):null;
    if(periodFeedback){coFinalEligible=false;toolStatus='feedback';input.push({type:'function_call_output',call_id:call.id,output:JSON.stringify(periodFeedback)});continue;}
    assertSolutionShape(args,tool.parameters,'tool arguments');
    if(runtime.natural&&call.name===requiredStaffingTool.name){
     const next=editRequiredStaffing(request,runtime.natural.datasetToken,args.changes);state.requiredStaffing=next;result={requiredStaffing:requiredStaffingView(next),accepted:false,saved:false};staffingCalculated=true;
    }else if(runtime.natural&&call.name===hiringBudgetTool.name){
     const next=editHiringBudget(request,runtime.natural.datasetToken,args.changes);
     state.hiringBudget=next;result={hiringBudget:hiringBudgetView(next),accepted:false,saved:false};
    }else if(runtime.natural&&businessPlanningTools.some(t=>t.name===call.name)){
     const next=await runBusinessPlanningTool(request,runtime.natural.datasetToken,natural,call.name,args,naturalStep);
     result={businessPlanning:businessPlanningView(next,request.requestId,naturalStep+1),accepted:false,saved:false};
     if(JSON.stringify(result).length>65000)throw Error('The provisional comparison exceeds the tool budget. Narrow the scope or inputs. Earlier state is retained.');
     natural=next;naturalStep++;state.businessPlanning=natural;
    }else if(['review_service_demand','revise_service_demand','review_scoped_service_demand','revise_scoped_service_demand'].includes(call.name)&&demand){
     const prior=demandReview??demand.demandProposal,turns=solutionUserTurns(request).map(({id,text})=>({id,text}));
     if(call.name==='review_service_demand'||call.name==='review_scoped_service_demand'){if(prior)throw Error('Use a source-bound parameter edit to preserve existing assumptions.');demandReview=referenced?createReferencedDemandReview(args.spec,demand,request.requestId,turns):createDemandReview(args.spec,demand,request.requestId,turns);}
     else {if(!prior)throw Error('No current demand review exists.');demandReview=referenced?reviseReferencedDemandReview(prior,args.edit,demand,request.requestId,turns,request.message.id,currentDemandReference):reviseDemandReview(prior,args.edit,demand,request.requestId,turns,request.message.id);}if(referenced){currentDemandReference=demandReferenceId(request.requestId,++referenceStep);result=referencedDemandView(demandReview,demand,currentDemandReference);}else result=demandReview;
    }else if(call.name==='propose_goal_progress'&&entryContext){
     progressProposal=await createProgressEntryProposal(args.spec,entryContext);result=progressProposal;
    }else if(call.name==='read_goal_progress'){
     result=runGoalProgressRead(args,progress);
    }else if(call.name==='read_workforce_planning_playbook'){
     result=readSwpPlaybook(args.sections);
    }else if(call.name==='read_clock'){
     result=solutionClock(request,runtime.now?.()??new Date(),'tool-execution');
    }else if(call.name==='read_evidence'){
     const sources=(request.evidence as {sources:Record<string,unknown>[]}).sources;
     const ids=args.sourceIds as string[];if(ids.some(id=>!sources.some(source=>source.id===id)))throw Error('A requested current evidence source is unavailable.');
     const catalog=actionEvidenceCatalog(request.evidence);
     result=(ids.length?sources.filter(source=>ids.includes(source.id as string)):sources.map(({id,label,scope,date,status,limitation})=>({id,label,scope,date,status,limitation}))).map(source=>({...source,...(runtime.grounding?{grounding:runtime.grounding.sources.find(item=>item.id===source.id),datasetToken:runtime.grounding.datasetToken,retrievedAt:runtime.grounding.retrievedAt}:{}),citationCatalog:catalog.filter(item=>item.sourceId===source.id)}));
    }else if(call.name==='read_plans'){
     const ids=args.planIds as string[];result=ids.map(id=>{const plan=request.catalog?.plans.find(plan=>plan.id===id&&!plan.deleted);if(!plan)throw Error('A requested saved plan is unavailable.');return solutionPlanView(plan);});
    }else if(call.name==='evaluate_candidate'||call.name==='evaluate_action_plans'||call.name==='revise_parameters'){
     // Validate citation identifiers before merging constraints or recording an evaluation.
     // Feedback is data for the existing bounded model loop, never a repair or retry.
     const candidates=call.name==='evaluate_action_plans'?args.candidates as SolutionCandidate[]:call.name==='evaluate_candidate'?[args.candidate as SolutionCandidate]:[];
     if(candidates.length){
      if(new Set(candidates.map(candidate=>candidate.id)).size!==candidates.length)throw Error('Each proposed Action Plan needs a distinct candidate ID.');
      if(candidates.some(candidate=>!same(candidate.goal,candidates[0].goal)))throw Error('Compare Action Plans for the same user objective.');
      const allowedEvidenceIds=actionEvidenceCatalog(request.evidence).map(item=>item.id);
      const invalidReferences=candidates.flatMap(candidate=>candidate.activities.filter(activity=>activity.mode!=='retain').flatMap(activity=>activity.evidenceIds.filter(id=>!allowedEvidenceIds.includes(id)).map(id=>({activityId:activity.id,id}))));
      if(invalidReferences.length){
       coFinalEligible=false;toolStatus='feedback';
       result={ok:false,code:'invalid_evidence_identifiers',error:'Activity citations must use exact current citationCatalog item IDs, not packet source IDs.',invalidReferences,allowedEvidenceIds,instruction:'Choose justified current citationCatalog entries or leave unsupported citations empty. Do not infer aliases, claim success or change the proposal silently. A corrected tool call uses the remaining existing round/tool budget.'};
       input.push({type:'function_call_output',call_id:call.id,output:JSON.stringify(result)});continue;
      }
     }
     const constraints=mergeSolutionConstraints(request,state.constraints,args.constraintUpdates as SolutionConstraint[]);
     const staged=structuredClone(request),items:SolutionEvaluation[]=[];
     for(const candidate of candidates.length?candidates:[null]){
      const item=candidate?await evaluateSolutionCandidate(staged,candidate,constraints):await evaluateSolutionParameterEdit(staged,args.edit as SolutionParameterEdit,constraints);abort(signal);
      items.push(item);
      staged.state.working=retainEvaluations(staged.state,[item]);
     }
     if(candidates.length>1&&haveDuplicateBundleActivities(items.flatMap(item=>item.draft?[item.draft.bundle]:[])))throw Error('These plans repeat the same activities. Propose distinct actions, owners or dependency sequences; changed titles alone are not alternatives.');
     // Commit the set together only after citations, identities and retained history validate.
     const nextState={...state,constraints,working:retainEvaluations(state,items)};
     const views=items.map(item=>({...solutionEvaluationView({...request,state:nextState},item),verifiedMetricReferences:checkedMetricReferences(nextState,'candidate',item.id,item.revision)}));
     result=call.name==='evaluate_action_plans'?{proposals:views,accepted:false,saved:false}:views[0];
     if(JSON.stringify(result).length>65000)throw Error('The proposed set exceeds the result budget. Use fewer, more concise activities; no proposals or constraints were recorded.');
     state.constraints=constraints;state.working=nextState.working;
     for(const item of items){evaluated.set(item.id,item);if(item.blocking.length){coFinalEligible=false;toolStatus='feedback';}}
    }else{
     projectionInput??=runtime.loadProjection(request.filters,signal);
     const item=await calculateHeadcountProjection(args.spec as ProjectionSpec,await projectionInput,state.analyses,solutionUserTurns(request).map(turn=>turn.id));abort(signal);
     state.analyses=[...state.analyses,item].slice(-6);analyses.set(item.id,item);result={...item,verifiedMetricReferences:checkedMetricReferences(state,'projection',item.id,item.revision)};
    }
    const planningKind:PlanningCalculationKind|null=call.name==='review_hiring_budget'?'hiring':call.name==='compare_required_staffing'?'fixed-staffing':call.name==='project_headcount'?'projection':['review_service_demand','revise_service_demand','review_scoped_service_demand','revise_scoped_service_demand','compare_service_staffing'].includes(call.name)?'workload':null;
    const planningBinding=planningKind?await planningCalculationRef(planningKind,request,state,demandReview,planningKind==='projection'?(args.spec as ProjectionSpec).id:undefined):null;
    if(planningBinding&&result&&typeof result==='object')result={...result,planningGuidance:planningCalculationFeedback(planningBinding)};

    if(JSON.stringify(result).length>65000){coFinalEligible=false;toolStatus='feedback';if(call.name===requiredStaffingTool.name)staffingCalculated=false;result={ok:false,error:'The read result exceeds the tool budget. Request fewer source IDs.'};}else if(planningBinding)planningRefs.set(planningBinding.reference,planningBinding);
   }catch(error){coFinalEligible=false;toolStatus=signal.aborted?'aborted':'feedback';abort(signal);result={ok:false,error:error instanceof Error?error.message:'The read or calculation was unavailable.',instruction:'Explain the boundary, ask a focused question, or revise typed inputs. Do not claim this calculation succeeded.'};}
   finally{try{runtime.onToolResult?.({round:round+1,name:call.name,status:toolStatus,elapsedMs:Math.max(0,Date.now()-toolStartedAt)});}catch{/* Diagnostics cannot change execution. */}}
   input.push({type:'function_call_output',call_id:call.id,output:JSON.stringify(result)});
  }
  abort(signal);
  // An explicit co-produced final is intent to finish, not an intermediate
  // candidate. Every tool must succeed; the normal final validation below still runs.
  if(coFinalEligible&&!demand&&!staffingRequired&&!progressProposal&&output.text){
   try{
    const value=readFinal(output.text);
    if(!value.constraintUpdates.length&&!value.rejected.length&&!value.analysisIds.length&&value.candidateIds.every(id=>{const item=evaluated.get(id);return !!item?.draft&&!!item.result&&!item.blocking.length&&same(item.constraints,state.constraints);}))final=value;
   }catch{/* Intermediate tool-call prose is not a typed completion; continue the existing loop. */}
   if(final)break;
  }
  if(standaloneStaffing&&round===0&&output.calls.length===1&&output.calls[0].name===requiredStaffingTool.name&&staffingCalculated&&state.requiredStaffing){
   final={answer:{discussionOnly:requiredStaffingAnswer(state.requiredStaffing)},candidateIds:[],analysisIds:[],verifiedMetrics:[],constraintUpdates:[],rejected:[],questions:[],focusCandidateId:null};
   assertSolutionShape(final,solutionFinalSchema,'answer');
   break;
  }
 }
 if(!final)throw new SolutionResponseError('incomplete_output','No complete conversational answer was returned.');
 let answer=solutionAnswerText(final,staffingCalculated);
 if(staffingCalculated&&state.requiredStaffing){
  if(staffingOnly){
   if(final.candidateIds.length||final.analysisIds.length||final.verifiedMetrics.length||final.constraintUpdates.length||final.rejected.length||final.focusCandidateId!==null)throw Error('Keep the fixed-role comparison separate from Action Plan and projection changes.');
   answer=requiredStaffingAnswer(state.requiredStaffing);final.questions=[];
  }else answer+='\n\nChecked fixed-role comparison:\n'+requiredStaffingAnswer(state.requiredStaffing);
  assertSolutionShape(final,solutionFinalSchema,'answer');
 }
 if(answer.length>10000)throw new SolutionResponseError('output_bounds','The combined answer exceeds the response budget. Narrow the request; earlier state is retained.');
 if(homeAnswerScopeViolation(answer,request.evidence))throw new SolutionResponseError('scope_rejected','The answer attributes source evidence to an unsupported population.');
 state.constraints=mergeSolutionConstraints(request,state.constraints,final.constraintUpdates);
 if(typeof final.answer!=='string'&&('recommendedPlan' in final.answer||'unsupportedPlan' in final.answer||'conditionalHiringPlan' in final.answer)){
  const refs=('recommendedPlan' in final.answer?final.answer.recommendedPlan:'conditionalHiringPlan' in final.answer?final.answer.conditionalHiringPlan:final.answer.unsupportedPlan).calculationRefs;
  if('conditionalHiringPlan' in final.answer&&(!state.hiringBudget||!canReviewConditionalHiringPlan(state.hiringBudget)||canReviewCostedHiringPlan(state.hiringBudget)||refs.length!==1||planningRefs.get(refs[0])?.kind!=='hiring'))throw new SolutionResponseError('calculation_reference','A conditional hiring plan needs the current count-and-budget calculation.');
  if(planningRefs.size&&!refs.length)throw new SolutionResponseError('calculation_reference','Use the current checked planning references for this outcome.');
  if(new Set(refs).size!==refs.length)throw new SolutionResponseError('calculation_reference','Use distinct checked planning references.');
  for(const ref of refs){
   const known=planningRefs.get(ref),current=known?await planningCalculationRef(known.kind,request,state,demandReview,known.analysisId):null;
   if(!known||!current||current.reference!==ref)throw new SolutionResponseError('calculation_reference','The recommended plan must reference the current checked inputs and results from this turn.');
  }
 }

 if(new Set(final.candidateIds).size!==final.candidateIds.length||final.candidateIds.some(id=>!evaluated.has(id))||new Set(final.analysisIds).size!==final.analysisIds.length||final.analysisIds.some(id=>!analyses.has(id)))throw new SolutionResponseError('calculation_reference','The answer references a proposal or analysis that was not checked in this turn.');
 for(const id of final.candidateIds){const item=evaluated.get(id)!;if(!same(item.constraints,state.constraints)){item.blocking.push('Constraints changed after this calculation. Refine the proposal against the current constraints before saving.');}}
 for(const rejected of final.rejected){const item=latest(state.working).find(item=>item.id===rejected.candidateId);if(!item||!solutionUserTurns(request).some(turn=>turn.id===rejected.turnId))throw Error('The rejected idea has no current candidate or user-turn reference.');// Model rejection is interpretation only; the existing explicit review control owns rejection state.
  item.interpretations.push(`Proposed rejection (unconfirmed), turn ${rejected.turnId}: ${rejected.reason}`);}
 for(const ref of final.verifiedMetrics){
  const checked=ref.kind==='candidate'?evaluated.get(ref.id):analyses.get(ref.id);
  if(!checked||checked.revision!==ref.revision)throw new SolutionResponseError('calculation_reference','A claimed quantitative result was not checked in this turn.');
  try{resolveSolutionMetric(state,ref);}catch{throw new SolutionResponseError('calculation_reference','A claimed quantitative result has an invalid metric reference.');}
 }
 if([...planningRefs.values()].some(ref=>ref.kind==='hiring'))state.conditionalHiringPlan=typeof final.answer!=='string'&&'conditionalHiringPlan' in final.answer;
 state.currentCalculationKinds=[...([...planningRefs.values()].some(ref=>ref.kind==='hiring')?['hiring' as const]:[]),...(staffingCalculated?['required-staffing' as const]:[])];
 state.verifiedMetrics=final.verifiedMetrics;
 state.rejected=state.rejected.slice(-24);state.questions=final.questions;
 if(final.candidateIds.length){state.recommendationRequestId=request.requestId;state.focusCandidateId=final.focusCandidateId;}
 else if(staffingCalculated||typeof final.answer!=='string'&&('recommendedPlan' in final.answer||'unsupportedPlan' in final.answer||'conditionalHiringPlan' in final.answer)){state.recommendationRequestId=null;state.focusCandidateId=null;}
 else if(final.focusCandidateId!==null){state.focusCandidateId=final.focusCandidateId;state.recommendationRequestId=state.working.findLast(item=>item.id===final.focusCandidateId)?.requestId??state.recommendationRequestId;}
 if(state.focusCandidateId&&!state.working.some(item=>item.id===state.focusCandidateId))throw Error('The conversational focus is unavailable.');
 retainStaffingDeliveryTarget({...state,turns:[...state.turns,{...request.message,role:'user' as const}]},request.catalog);
 state.turns=[...state.turns,{id:request.message.id,role:'user' as const,text:request.message.text},{id:'reply-'+request.requestId.slice(0,70),role:'assistant' as const,text:answer}].slice(-32);
 abort(signal);
 return {...(progressProposal?{progressProposal}:{}),...(demandReview?{demandReview}:{}),charts:final.candidateIds.length||final.analysisIds.length?[]:answerEvidenceSeries(request.evidence,runtime.grounding,request.requestId,request.message.text,answer),requestId:request.requestId,answer,candidateIds:final.candidateIds,analysisIds:final.analysisIds,state:readSolutionState(state),usage:{modelRounds:rounds,toolCalls}};
}
