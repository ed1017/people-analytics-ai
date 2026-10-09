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
import {readSolutionRequest,readSolutionState,evaluateSolutionParameterEdit,evaluateSolutionCandidate,mergeSolutionConstraints,solutionUserTurns,resolveSolutionMetric} from './home-solution-conversation.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {assertSolutionShape,solutionTools,solutionFinalSchema} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {calculateHeadcountProjection} from './home-solution-projection.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {goalProgressReadTool,readGoalProgressConversation,runGoalProgressRead,type GoalProgressConversation} from './goal-progress-conversation.ts';

// @ts-expect-error Native fixture tests share TypeScript source.
import {solutionPlanView,solutionEvaluationView,solutionResultView} from './home-solution-model-view.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {actionEvidenceCatalog} from './home-action-proposal.ts';

export type SolutionModelOutput={items:unknown[];calls:{id:string;name:string;arguments:string}[];text:string;completed:boolean};
export type SolutionReply={requestId:string;answer:string;candidateIds:string[];analysisIds:string[];state:SolutionState;usage:{modelRounds:number;toolCalls:number};progressProposal?:ProgressEntryProposal;demandReview?:DemandReview};
export type SolutionRuntime={complete:(input:unknown[],finalOnly:boolean,signal:AbortSignal)=>Promise<SolutionModelOutput>;loadProjection:(filters:SolutionRequest['filters'],signal:AbortSignal)=>Promise<ProjectionInputs>;now?:()=>Date;natural?:{datasetToken:string};progress?:{enabled:boolean;datasetToken:string};demand?:{datasetToken:string;referenceContract?:boolean}};
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
 return {goal:request.goal,scope:request.scope,filters:request.filters,timeZone:request.timeZone,goalContext:request.goalContext,...(progress?{savedGoalProgress:progress}:{}),currentEvidence:request.evidence,citationCatalog:actionEvidenceCatalog(request.evidence),currentConstraints:request.state.constraints,
  savedPlans:saved.map(plan=>({id:plan.id,number:plan.number,revision:plan.draft.revision,name:plan.draft.bundle.name,objective:plan.draft.bundle.objective,activities:plan.draft.bundle.components})),selectedPlan:saved.some(plan=>plan.id===request.selectedId)?solutionPlanView(saved.find(plan=>plan.id===request.selectedId)!):null,
  recentTurns:request.state.turns,modelView:{version:1,omittedInternalEqualityKeys:['draft.signature','result.signature','result.bindingKey','result.inputKey','evaluation.sourceKeys'],authoritativeState:'Retained on the server; projected views cannot be saved or used as authoritative input.',history:'All retained turns; no history truncation during projection.'},currentWorkingRevisions:latest(request.state.working).map(({id,revision})=>({id,revision})),workingProposals:request.state.working.map(item=>{const view=solutionEvaluationView(request,item);return {...view,inputs:item.draft?.inputs??null,draft:undefined,result:item.result?solutionResultView(item.result):null};}),
  analyses:request.state.analyses.map(item=>({id:item.id,revision:item.revision,method:item.spec.method,months:item.spec.months,assumptions:item.assumptions,opening:item.inputs.opening,asOf:item.inputs.asOf,scope:item.inputs.scope,interpretations:item.interpretations,finalHeadcount:item.points.at(-1)?.headcount})),
  rejectedIdeas:request.state.rejected,unresolvedQuestions:request.state.questions,focusCandidateId:request.state.focusCandidateId,currentMessage:request.message,
 };
}
/** Bounded model-directed read/calculation loop. No write, model switch or automatic retry. */
export async function converseSolutions(raw:unknown,runtime:SolutionRuntime,signal:AbortSignal):Promise<SolutionReply>{
 const original=readSolutionRequest(raw),request=structuredClone(original),state=request.state;
 const demand=runtime.demand?requestDemandContext(request,runtime.demand.datasetToken):null;
 const progress=runtime.progress?.enabled?readGoalProgressConversation(request.goalProgress,{goalId:request.goal.id,datasetToken:runtime.progress.datasetToken,asOf:(runtime.now?.()??new Date()).toISOString().slice(0,10)}):undefined;
 const entryContext:ProgressEntryContext|undefined=progress?.context&&request.goal.id?{input:request.goalProgress as ProgressEntryContext['input'],goal:request.goal.statement,requestId:request.requestId,turns:solutionUserTurns(request).map(({id,text})=>({id,text})),previous:readProgressEntryState(request.progressEntry),now:(runtime.now?.()??new Date()).toISOString()}:undefined;
 let progressProposal:ProgressEntryProposal|undefined;
 let demandReview:DemandReview|undefined;
 const referenced=!!demand&&runtime.demand?.referenceContract===true;let referenceStep=0;
 let currentDemandReference=referenced?demandReferenceId(request.requestId,referenceStep):'';
 let natural=runtime.natural?currentBusinessPlanning(request,runtime.natural.datasetToken):null,naturalStep=0;
 const modelContext={...solutionModelContext(request,progress),...(runtime.natural?{businessPlanning:businessPlanningView(natural,request.requestId,naturalStep)}:{})};
 if(referenced&&demand){const goalContext=structuredClone(request.goalContext) as {scenarioReview:Record<string,unknown>};goalContext.scenarioReview.demandProposal=demand.demandProposal?referencedDemandView(demand.demandProposal,demand,currentDemandReference):null;modelContext.goalContext=goalContext;}
 const input:unknown[]=[{role:'user',content:'CURRENT AUTHORITATIVE CONTEXT AND CONVERSATION DATA\n'+JSON.stringify({...modelContext,...(entryContext?{progressEntryDraft:entryContext.previous}:{} )})}];
 const evaluated=new Map<string,SolutionEvaluation>(),analyses=new Map<string,HeadcountProjection>();
 let toolCalls=0,projectionInput:Promise<ProjectionInputs>|undefined,final:SolutionFinal|undefined,rounds=0;
 for(let round=0;round<4;round++){
  abort(signal);if(new TextEncoder().encode(JSON.stringify(input)).length>120000)throw Error('This conversation needs a narrower set of sources before another model round. Earlier work is kept.');
  const output=await runtime.complete(input,round===3||toolCalls>=6,signal);rounds++;abort(signal);
  if(!output.completed||output.calls.length>6||JSON.stringify(output.items).length>70000)throw Error('The conversation response was incomplete or exceeded its bounds.');
  if(!output.calls.length){if(!output.text||output.text.length>20000)throw Error('The conversational answer is unavailable.');const value=JSON.parse(output.text);assertSolutionShape(value,solutionFinalSchema,'answer');final=value;break;}
  if(round===3||toolCalls+output.calls.length>6)throw Error('The bounded calculation limit was reached. No proposal was saved.');
  input.push(...output.items);
  for(const call of output.calls){
   abort(signal);toolCalls++;let result:unknown;
   try{
    const tool=runtime.natural&&businessPlanningTools.some(t=>t.name===call.name)?businessPlanningTools.find(t=>t.name===call.name):demand?[...(referenced?[reviewReferencedDemandTool,reviseReferencedDemandTool]:[serviceDemandTool,demandPatchTool]),...solutionTools.filter(t=>['read_clock','read_evidence'].includes(t.name))].find(t=>t.name===call.name):call.name==='propose_goal_progress'&&entryContext?goalProgressProposalTool:call.name==='read_goal_progress'&&progress?goalProgressReadTool:solutionTools.find(tool=>tool.name===call.name);if(!tool||call.arguments.length>32000)throw Error('Unsupported or oversized tool request.');const args=JSON.parse(call.arguments);
    const periodFeedback=demand?demandPeriodFeedback(call.name,args):null;
    if(periodFeedback){input.push({type:'function_call_output',call_id:call.id,output:JSON.stringify(periodFeedback)});continue;}
    assertSolutionShape(args,tool.parameters,'tool arguments');
    if(runtime.natural&&businessPlanningTools.some(t=>t.name===call.name)){
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
    }else if(call.name==='read_clock'){
     const now=runtime.now?.()??new Date();result={utc:now.toISOString(),timeZone:request.timeZone,local:new Intl.DateTimeFormat('en-US',{timeZone:request.timeZone,dateStyle:'full',timeStyle:'long'}).format(now),basis:'Server clock at tool execution, rendered in the supplied browser time zone.'};
    }else if(call.name==='read_evidence'){
     const sources=(request.evidence as {sources:Record<string,unknown>[]}).sources;
     const ids=args.sourceIds as string[];if(ids.some(id=>!sources.some(source=>source.id===id)))throw Error('A requested current evidence source is unavailable.');
     const catalog=actionEvidenceCatalog(request.evidence);
     result=(ids.length?sources.filter(source=>ids.includes(source.id as string)):sources.map(({id,label,scope,date,status,limitation})=>({id,label,scope,date,status,limitation}))).map(source=>({...source,citationCatalog:catalog.filter(item=>item.sourceId===source.id)}));
    }else if(call.name==='read_plans'){
     const ids=args.planIds as string[];result=ids.map(id=>{const plan=request.catalog?.plans.find(plan=>plan.id===id&&!plan.deleted);if(!plan)throw Error('A requested saved plan is unavailable.');return solutionPlanView(plan);});
    }else if(call.name==='evaluate_candidate'||call.name==='revise_parameters'){
     // Validate citation identifiers before merging constraints or recording an evaluation.
     // Feedback is data for the existing bounded model loop, never a repair or retry.
     if(call.name==='evaluate_candidate'){
      const candidate=args.candidate as SolutionCandidate,allowedEvidenceIds=actionEvidenceCatalog(request.evidence).map(item=>item.id);
      const invalidReferences=candidate.activities.filter(activity=>activity.mode!=='retain').flatMap(activity=>activity.evidenceIds.filter(id=>!allowedEvidenceIds.includes(id)).map(id=>({activityId:activity.id,id})));
      if(invalidReferences.length){
       result={ok:false,code:'invalid_evidence_identifiers',error:'Activity citations must use exact current citationCatalog item IDs, not packet source IDs.',invalidReferences,allowedEvidenceIds,instruction:'Choose justified current citationCatalog entries or leave unsupported citations empty. Do not infer aliases, claim success or change the proposal silently. A corrected tool call uses the remaining existing round/tool budget.'};
       input.push({type:'function_call_output',call_id:call.id,output:JSON.stringify(result)});continue;
      }
     }
     const constraints=mergeSolutionConstraints(request,state.constraints,args.constraintUpdates as SolutionConstraint[]);
     const item=call.name==='revise_parameters'?await evaluateSolutionParameterEdit(request,args.edit as SolutionParameterEdit,constraints):await evaluateSolutionCandidate(request,args.candidate as SolutionCandidate,constraints);abort(signal);
     const proposed=[...state.working,item],retained=proposed.slice(-12);
     // Keep every proof needed by a current proposal. Refuse this edit before
     // trimming, so the existing checked revision remains reviewable and savable.
     const key=(row:{id:string;revision:number})=>JSON.stringify([row.id,row.revision]);
     const removed=new Set(proposed.slice(0,-12).map(key)),byKey=new Map(retained.map(row=>[key(row),row])),visited=new Set<string>();
     const checkAncestry=(row:SolutionEvaluation)=>{
      if(visited.has(key(row)))return;visited.add(key(row));
      for(const ref of [row.candidate.base,...row.candidate.activities.map(a=>a.source),...row.candidate.quantities.map(q=>q.source)])if(ref?.kind==='working'){
       if(removed.has(key(ref)))throw Error('The working history limit would remove source provenance. Choose the current proposal to save it, then continue from that saved plan; this edit and its constraints were not recorded.');
       const prior=byKey.get(key(ref));if(prior)checkAncestry(prior);
      }
     };
     if(removed.size)latest(retained).forEach(checkAncestry);
     state.constraints=constraints;state.working=retained;evaluated.set(item.id,item);result={...solutionEvaluationView(request,item),verifiedMetricReferences:checkedMetricReferences(state,'candidate',item.id,item.revision)};
    }else{
     projectionInput??=runtime.loadProjection(request.filters,signal);
     const item=await calculateHeadcountProjection(args.spec as ProjectionSpec,await projectionInput,state.analyses,solutionUserTurns(request).map(turn=>turn.id));abort(signal);
     state.analyses=[...state.analyses,item].slice(-6);analyses.set(item.id,item);result={...item,verifiedMetricReferences:checkedMetricReferences(state,'projection',item.id,item.revision)};
    }
    if(JSON.stringify(result).length>65000)result={ok:false,error:'The read result exceeds the tool budget. Request fewer source IDs.'};
   }catch(error){abort(signal);result={ok:false,error:error instanceof Error?error.message:'The read or calculation was unavailable.',instruction:'Explain the boundary, ask a focused question, or revise typed inputs. Do not claim this calculation succeeded.'};}
   input.push({type:'function_call_output',call_id:call.id,output:JSON.stringify(result)});
  }
 }
 if(!final)throw Error('No complete conversational answer was returned.');
 state.constraints=mergeSolutionConstraints(request,state.constraints,final.constraintUpdates);
 if(new Set(final.candidateIds).size!==final.candidateIds.length||final.candidateIds.some(id=>!evaluated.has(id))||new Set(final.analysisIds).size!==final.analysisIds.length||final.analysisIds.some(id=>!analyses.has(id)))throw Error('The answer references a proposal or analysis that was not checked in this turn.');
 for(const id of final.candidateIds){const item=evaluated.get(id)!;if(!same(item.constraints,state.constraints)){item.blocking.push('Constraints changed after this calculation. Refine the proposal against the current constraints before saving.');}}
 for(const rejected of final.rejected){const item=latest(state.working).find(item=>item.id===rejected.candidateId);if(!item||!solutionUserTurns(request).some(turn=>turn.id===rejected.turnId))throw Error('The rejected idea has no current candidate or user-turn reference.');// Model rejection is interpretation only; the existing explicit review control owns rejection state.
  item.interpretations.push(`Proposed rejection (unconfirmed), turn ${rejected.turnId}: ${rejected.reason}`);}
 for(const ref of final.verifiedMetrics){
  const checked=ref.kind==='candidate'?evaluated.get(ref.id):analyses.get(ref.id);
  if(!checked||checked.revision!==ref.revision)throw Error('A claimed quantitative result was not checked in this turn.');
  resolveSolutionMetric(state,ref);
 }
 state.verifiedMetrics=final.verifiedMetrics;
 state.rejected=state.rejected.slice(-24);state.questions=final.questions;state.focusCandidateId=final.focusCandidateId;
 if(state.focusCandidateId&&!state.working.some(item=>item.id===state.focusCandidateId))throw Error('The conversational focus is unavailable.');
 state.turns=[...state.turns,{id:request.message.id,role:'user' as const,text:request.message.text},{id:'reply-'+request.requestId.slice(0,70),role:'assistant' as const,text:final.answer}].slice(-32);
 abort(signal);
 return {...(progressProposal?{progressProposal}:{}),...(demandReview?{demandReview}:{}),requestId:request.requestId,answer:final.answer,candidateIds:final.candidateIds,analysisIds:final.analysisIds,state:readSolutionState(state),usage:{modelRounds:rounds,toolCalls}};
}
