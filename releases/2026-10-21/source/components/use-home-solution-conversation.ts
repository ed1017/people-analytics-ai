'use client';
import type {ProjectionDemandInputs} from '@/lib/projection-demand';
import {previewProjectionEdit,verifyProjectionEditSource,type ProjectionEdit} from '@/lib/headcount-projection-edit';
import {calculateHeadcountProjection,type HeadcountProjection} from '@/lib/home-solution-projection';
import {editPreviewAssumptions,type PreviewAssumptions} from '@/lib/planner-preview-inputs';
import {selectBusinessPlanningMix} from '@/lib/home-business-planning';
import {homeAnswerVisualField,restoreHomeAnswerVisual} from '@/lib/home-answer-visual-save';
import {annualTurnoverEvidenceQuestion} from '@/lib/home-turnover-chat';
import {publicAiFetch} from '@/lib/public-ai-readiness-client.mjs';
import {datasetSession,datasetFetch} from '@/lib/dataset-client.mjs';
import {PUBLIC_9037} from '@/lib/public-9037-contract.mjs';
import {publicAiEvidenceField,publicSolutionEnvelope,capturePublicWorkingRecipes,selectedPublicObjectiveState} from '@/lib/public-ai-evidence-client.mjs';
import {conversationPlanCatalog} from '@/lib/home-conversation-plan-catalog';
import {usePendingRequest} from './use-pending-request';
import {requiredStaffingPlanIdentity} from '@/lib/home-required-staffing-plan';
import {editRequiredStaffingLocally,currentRequiredStaffing,resolveStaffingDeliveryTarget,retainStaffingDeliveryTarget} from '@/lib/home-required-staffing';
import {prepareRequiredStaffingPlan,requiredStaffingPlanFields} from '@/lib/home-required-staffing-plan-save';
import {prepareHiringPlan,prepareConditionalHiringPlan,hiringPlanFields,type HiringPlanSelection} from '@/lib/home-hiring-plan-save';
import {currentHiringBudget,editHiringBudgetLocally,restoreHiringBudgetBaseline,type HiringBudgetReview} from '@/lib/home-hiring-budget';
import type {RequiredStaffingInput} from '@/lib/required-staffing';
import type {HiringBudgetInput} from '@/lib/hiring-budget';
import {readChatEvidenceSeries,type ChatEvidenceSeries} from '@/lib/chat-evidence-series';
import {prepareBusinessPlanningSelection,businessPlanningSelectionFields,businessPlanningReceiptField,type BusinessPlanningSelection} from '@/lib/home-business-planning-save';
import {currentBusinessPlanning} from '@/lib/home-business-planning';

import {swpConversationHeaders} from '@/lib/swp-conversation-model';
import {useEffectEvent,useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {requestDemandContext,readDemandReview,type DemandReview} from '@/lib/swp-demand';
import {decisionStore,useDecisionStorage} from './decision-store';
import type {ProblemConversation} from './problem-conversation';
import type {BundleDiscussion} from './home-bundle-plans';
import {retainEvaluations,editSolutionPlanningInputs,type PlanningInputChange,emptySolutionState,readSolutionState,readSolutionRequest,saveSolutionCandidate,solutionConversationField,type SolutionEvaluation,type SolutionRequest,type SolutionState} from '@/lib/home-solution-conversation';
import {createPlanAlternatives,packPlanAlternatives,planAlternativesField,readPlanAlternatives,associatePlanProposal,type PlanAlternatives} from '@/lib/home-plan-alternatives';
import type {SolutionReply} from '@/lib/home-solution-conversation-service';
import {alternativeViewField} from '@/lib/home-plan-alternative-chat';
import {reviewBundleProposal as reconcileBundle} from '@/lib/home-bundle-reconciliation';
import type {Json} from '@/lib/local-decisions';
import type {GuidedActionRegistry} from './home-guided-actions';
import {progressEntryContext,retainProgressEntryProposal} from '@/lib/goal-progress-entry-store';
import {captureGoalProgressInput} from '@/lib/goal-progress-conversation';
import {homeConversationErrorMessage} from '@/lib/home-evidence-recovery.mjs';

type Props={enabled:boolean;conversation:ProblemConversation;active:boolean;settled:boolean;evidence:unknown;publicSource?:unknown;evidenceContext?:unknown;evidenceForMessage?:(text:string)=>unknown;planningContext?:()=>unknown;planningCalculatorAvailable?:()=>boolean;demandReviewRef?:RefObject<((review:DemandReview)=>void)|null>;scope:string;query:string;target:()=>BundleDiscussion|null;guided?:GuidedActionRegistry|null};
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const hiringEditsMessage='Update the hiring estimate or explicitly discard its edits before reviewing or pinning.';
export function useHomeSolutionConversation(props:Props){
 const answerSeries=useRef<ChatEvidenceSeries[]>([]);
 const [hiringEdit,setHiringEdit]=useState<{key:string;dirty:boolean}|null>(null),hiringEditRef=useRef(hiringEdit);
 function hiringInputsDirty(){return hiringEditRef.current?.dirty===true&&hiringEditRef.current.key===JSON.stringify(memoryRef.current.hiringBudget);}
 function setHiringEditorDirty(key:string,dirty:boolean){if(!dirty)setNotice(current=>current===hiringEditsMessage?'':current);if(key!==JSON.stringify(memoryRef.current.hiringBudget))return;hiringEditRef.current={key,dirty};setHiringEdit({key,dirty});}
 function requireReviewedHiringInputs(){if(hiringInputsDirty())throw Error(hiringEditsMessage);}
 const storage=useDecisionStorage(),[memory,setMemory]=useState<SolutionState>(emptySolutionState),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const {pending,setPending,startedAt:pendingStartedAt}=usePendingRequest();
 const controller=useRef<AbortController|null>(null),epoch=useRef(0),mounted=useRef(false),memoryRef=useRef(memory),currentProps=useRef(props);
 useLayoutEffect(()=>{currentProps.current=props;});
 useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 // Observe every store transition, including A→B→A batched into one React render.
 useLayoutEffect(()=>{
  const identity=()=>{const snapshot=decisionStore.getSnapshot(),goals=snapshot.data.goals;return JSON.stringify([goals.activeId,goals.goals.find(goal=>goal.id===goals.activeId)?.statement,snapshot.saved]);};
  let previous=identity();return decisionStore.subscribe(()=>{const next=identity();if(next===previous)return;previous=next;epoch.current++;controller.current?.abort();controller.current=null;setPending(false);});
 },[setPending]);
 const goal={id:props.conversation.activeGoalId,statement:props.conversation.focusedIssue};
 const guideId=props.guided?.goalId??null;
 // Recovery advances workspaceKey even when the goal itself is unchanged. Reload
 // reviewed solution state and invalidate pending completions for that workspace.
 const identity=JSON.stringify([goal,guideId,props.conversation.workspaceKey,props.conversation.resetEpoch,props.conversation.storageReady]);
 const loaded=useRef(''),reset=useRef(props.conversation.resetEpoch);
 const synchronize=useEffectEvent(()=>{
  if(loaded.current===identity)return;loaded.current=identity;epoch.current++;controller.current?.abort();setPending(false);setNotice('');
  try{const wasReset=reset.current!==props.conversation.resetEpoch;const state=wasReset||guideId&&!goal.id?emptySolutionState():readSolutionState((goal.id?storage.data.workspaces[goal.id]:storage.data.exploration)?.fields[solutionConversationField]);reset.current=props.conversation.resetEpoch;if(wasReset&&props.conversation.storageReady)persist(state);memoryRef.current=state;setMemory(state);}catch(error){memoryRef.current=emptySolutionState();setMemory(emptySolutionState());setNotice((error as Error).message);}
 });
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Goal/reset events select an isolated local conversation.
 useLayoutEffect(()=>{synchronize();},[identity]);
 const progressInput=captureGoalProgressInput(decisionStore,goal.id);
 const contextKey=JSON.stringify([goal,guideId,props.active,props.settled,props.scope,props.query,props.evidence,props.evidenceContext,props.conversation.resetEpoch,props.conversation.issueEditor?.id,progressInput]);
 const liveKey=useRef(contextKey);
 useLayoutEffect(()=>{if(liveKey.current!==contextKey){liveKey.current=contextKey;epoch.current++;controller.current?.abort();setPending(false);}},[contextKey,setPending]);
 function catalog(forConversation=false):PlanAlternatives|null{
  const p=currentProps.current,g={goalId:p.conversation.activeGoalId,goal:p.conversation.focusedIssue},snapshot=decisionStore.getSnapshot(),raw=snapshot.data.workspaces[g.goalId]?.fields[planAlternativesField];
  if(forConversation){const target=p.target();return conversationPlanCatalog(g,raw,target?.goalId===g.goalId?target.snapshots?.()??null:null);}
  if(raw!==undefined){const value=readPlanAlternatives(raw,g);if(!value)throw Error('Saved plans could not be verified. They have been preserved.');return value;}
  const target=p.target(),sources=target?.goalId===g.goalId?target.snapshots?.():null;
  return sources?.length?createPlanAlternatives(g,sources):null;
 }
 function requireCurrent(){const p=currentProps.current,snapshot=decisionStore.getSnapshot();if(!mounted.current||!p.enabled||!p.active||!p.settled||!snapshot.saved||!p.conversation.storageReady||p.conversation.issueEditor||snapshot.data.goals.activeId!==p.conversation.activeGoalId||(snapshot.data.goals.goals.find(g=>g.id===snapshot.data.goals.activeId)?.statement??'')!==p.conversation.focusedIssue)throw Error('The goal, sources or browser storage changed. Your earlier work is kept.');return snapshot;}
 function storedRecipes(){const p=currentProps.current,data=decisionStore.getSnapshot().data;return (p.conversation.activeGoalId?data.workspaces[p.conversation.activeGoalId]:data.exploration)?.fields[publicAiEvidenceField];}
 function persist(state:SolutionState,recipes?:unknown,visual?:unknown){const p=currentProps.current,snapshot=requireCurrent(),build=()=>({[solutionConversationField]:state as unknown as Json,...(visual===undefined?{}:{[homeAnswerVisualField]:visual as Json}),...(recipes===undefined?{}:{[publicAiEvidenceField]:recipes as Json})});if(p.conversation.activeGoalId)decisionStore.commitGoalFields(p.conversation.activeGoalId,p.conversation.focusedIssue,snapshot.data.revision,new Date().toISOString(),build);else if(!p.guided?.goalId)decisionStore.commitExplorationFields(snapshot.data.revision,new Date().toISOString(),build);memoryRef.current=state;setMemory(state);}
 function selectedPlanId(value:PlanAlternatives|null){const p=currentProps.current,target=p.target();return target?.goalId===p.conversation.activeGoalId&&value?.order.includes(target.id)?target.id:null;}
 function makeRequest(text:string):SolutionRequest{
  const p=currentProps.current,current=catalog(true),params=new URLSearchParams(p.query),progress=captureGoalProgressInput(decisionStore,p.conversation.activeGoalId);
  const filters={country:params.get('country')||'all',org:params.get('org')||'all',level:params.get('level')||'all'};
  const evidenceQuestion=annualTurnoverEvidenceQuestion(text,memoryRef.current,p.scope,filters,datasetSession.snapshot());
  return readSolutionRequest({version:1,planningCalculatorAvailable:p.planningCalculatorAvailable?.()===true,requestId:crypto.randomUUID(),goal:{id:p.conversation.activeGoalId,statement:p.conversation.focusedIssue},scope:p.scope,filters,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,evidence:p.evidenceForMessage?.(evidenceQuestion)??p.evidence,goalContext:p.planningContext?.()?{goalContext:p.conversation.goalContext,scenarioReview:p.planningContext()}:p.conversation.goalContext,...(progress?{progressEntry:progressEntryContext(decisionStore,'context',[{id:'context',text}])?.previous??null}:{}),...(progress?{goalProgress:progress}:{}),selectedId:selectedPlanId(current),catalog:current,state:memoryRef.current,message:{id:crypto.randomUUID(),text}});
 }
 async function send(text:string){
  if(controller.current||saving)return;requireCurrent();const request=makeRequest(text),entryContext=progressEntryContext(decisionStore,request.requestId,[...request.state.turns.filter(t=>t.role==='user').map(({id,text})=>({id,text})),request.message]),captured=++epoch.current,key=liveKey.current,scenario=JSON.stringify(currentProps.current.planningContext?.()??null),abort=new AbortController();controller.current=abort;answerSeries.current=[];setPending(true);setNotice('');
  const current=()=>!abort.signal.aborted&&mounted.current&&captured===epoch.current&&key===liveKey.current&&scenario===JSON.stringify(currentProps.current.planningContext?.()??null)&&equal(request.goalProgress,captureGoalProgressInput(decisionStore,currentProps.current.conversation.activeGoalId))&&equal(request.catalog,catalog(true))&&selectedPlanId(catalog(true))===(request.selectedId??null);
  try{
   const body=datasetSession.snapshot()===PUBLIC_9037.token?await publicSolutionEnvelope(request,currentProps.current.publicSource,storedRecipes()):request;
   if(!current())return null;
   const response=await publicAiFetch('/api/home-solution-conversation',{method:'POST',headers:{'Content-Type':'application/json',...swpConversationHeaders(request.goalContext)},body:JSON.stringify(body),signal:abort.signal});const data=await response.json();
   if(!current())return null;if(!response.ok)throw Error(homeConversationErrorMessage(data));
   const reply=data as SolutionReply;if(reply.requestId!==request.requestId||typeof reply.answer!=='string'||!reply.answer.trim()||reply.answer.length>10000||!Array.isArray(reply.candidateIds)||!Array.isArray(reply.analysisIds))throw Error('The conversation response does not match this request.');
   const state=readSolutionState(reply.state);if(state.turns.at(-2)?.id!==request.message.id||state.turns.at(-1)?.text!==reply.answer||reply.candidateIds.some(id=>!state.working.some(item=>item.id===id&&item.requestId===request.requestId))||reply.analysisIds.some(id=>!state.analyses.some(item=>item.id===id)))throw Error('The returned conversation could not be verified.');
   const demandContext=reply.demandReview?requestDemandContext(request,decisionStore.getDatasetToken()):null;
   const demandReview=reply.demandReview&&demandContext?readDemandReview(reply.demandReview,demandContext):null;
   if(reply.demandReview&&(!demandReview||!currentProps.current.demandReviewRef?.current||reply.demandReview.requestId!==request.requestId))throw Error('The business demand review does not match this request.');
   const recipes=datasetSession.snapshot()===PUBLIC_9037.token?await capturePublicWorkingRecipes(request,state,currentProps.current.publicSource,storedRecipes()):undefined;if(!current())return null;requireCurrent();persist(state,recipes,{version:1,context:JSON.stringify([currentProps.current.scope,currentProps.current.query]),datasetToken:decisionStore.getDatasetToken(),requestId:request.requestId,answer:reply.answer,question:request.message.text,series:readChatEvidenceSeries(reply.charts,request.requestId,decisionStore.getDatasetToken())});if(reply.progressProposal){if(!entryContext)throw Error('Progress entry is not enabled.');await retainProgressEntryProposal(decisionStore,reply.progressProposal,entryContext,{current});if(!current())return null;}const p=currentProps.current,guided=p.guided;if(guided?.goalId&&(!p.conversation.activeGoalId||p.conversation.activeGoalId===guided.goalId)&&reply.candidateIds.length)guided.emit({type:'proposal-reviewed',goalId:guided.goalId,planId:reply.candidateIds[0],candidates:state.working.filter(item=>reply.candidateIds.includes(item.id)&&item.requestId===request.requestId).map(({id,revision,requestId})=>({id,revision,requestId}))});if(demandReview)p.demandReviewRef?.current?.(demandReview);answerSeries.current=readChatEvidenceSeries(reply.charts,request.requestId,decisionStore.getDatasetToken());return reply.answer;
  }catch(error){if(current())throw error;return null;}finally{if(controller.current===abort){controller.current=null;setPending(false);}}
 }
 function cancel(){epoch.current++;controller.current?.abort();controller.current=null;setPending(false);setNotice('Request cancelled. Your draft and saved work are kept.');}
 async function save(item:SolutionEvaluation,acknowledge:boolean,goalStatement:string){
  if(saving||pending)return;setSaving(true);setNotice('');
  try{
   requireCurrent();const request=makeRequest(item.message.text);request.requestId=item.requestId;request.message=item.message;
   const p=currentProps.current,key=liveKey.current,initialEpoch=epoch.current,scenario=JSON.stringify(p.planningContext?.()??null),desired={id:p.conversation.activeGoalId||p.guided?.goalId||crypto.randomUUID(),statement:p.conversation.focusedIssue||goalStatement.trim()};
   const outcome=await saveSolutionCandidate(request,request.catalog,item,desired,request.evidence,acknowledge);
   const snapshot=requireCurrent();if(key!==liveKey.current||initialEpoch!==epoch.current||scenario!==JSON.stringify(currentProps.current.planningContext?.()??null)||!equal(request.catalog,catalog()))throw Error('The conversation changed while reviewing selection. Try again against the current context.');
   if(outcome.status!=='ready')throw Error('The proposal needs further review.');
   const selected=associatePlanProposal(outcome.catalog,outcome.catalog,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:outcome.plan.requestId!,at:new Date().toISOString(),acknowledgeUnknowns:acknowledge});
   const preserveExploration=datasetSession.snapshot()===PUBLIC_9037.token&&!p.conversation.activeGoalId;
   const state:SolutionState=preserveExploration?selectedPublicObjectiveState(memoryRef.current,item.binding.goal):structuredClone(memoryRef.current);
   if(!p.conversation.activeGoalId)for(const candidate of state.working){
    if(candidate.binding.goal!==item.binding.goal)continue;
    candidate.binding={...candidate.binding,goalId:desired.id,goal:desired.statement};
    if(candidate.draft){candidate.draft.binding=structuredClone(candidate.binding);if(candidate.draft.inputs.successMeasure)candidate.draft.inputs.successMeasure.goal=desired.statement;candidate.result=reconcileBundle(candidate.draft);}
   }
   if(!p.conversation.activeGoalId&&state.businessPlanning){
    // Only the same checked objective follows an intentional exploration-to-goal save.
    // A different objective or stale source context must not inherit its premises.
    try{const business=currentBusinessState();state.businessPlanning=business&&business.review.spec.objective===desired.statement&&item.binding.goal===desired.statement?{...business,context:{...business.context,boundGoal:structuredClone(desired)}}:null;}
    catch{state.businessPlanning=null;}
   }
   const recipes=datasetSession.snapshot()===PUBLIC_9037.token?await capturePublicWorkingRecipes({...request,goal:desired},state,p.publicSource,storedRecipes()):undefined;
   if(requireCurrent().data.revision!==snapshot.data.revision||key!==liveKey.current||initialEpoch!==epoch.current)throw Error('The saved context changed while retaining evidence. Earlier work is kept.');
   p.conversation.selectProposalGoal(desired,snapshot.data.revision,{...(recipes===undefined?{}:{[publicAiEvidenceField]:recipes as Json}),[planAlternativesField]:packPlanAlternatives(selected) as unknown as Json,[solutionConversationField]:state as unknown as Json,[alternativeViewField]:{version:1,selectedId:outcome.plan.id,collapsed:false}},preserveExploration);
   memoryRef.current=state;setMemory(state);
   p.guided?.emit({type:'proposal-chosen',goalId:desired.id,goal:desired.statement,planId:outcome.plan.id,number:outcome.plan.number,candidate:{id:item.id,revision:item.revision,requestId:item.requestId}});
   setNotice(`Action Plan #${outcome.plan.number} pinned with the goal “${desired.statement}”.`);
  }catch(error){setNotice(error instanceof Error?error.message:'The proposal could not be saved.');}finally{setSaving(false);}
 }
 async function previewPlanningInputs(item:SolutionEvaluation,changes:PlanningInputChange[]){
  const snapshot=requireCurrent(),key=liveKey.current,captured=epoch.current;
  const request=makeRequest('Preview adjusted planning assumptions without saving.');
  const revised=await editSolutionPlanningInputs(request,item,changes);
  if(key!==liveKey.current||captured!==epoch.current||snapshot.data.revision!==requireCurrent().data.revision)throw Error('The conversation changed. Reopen the current plan.');
  if(revised.blocking.length||!revised.draft)throw Error(revised.blocking.join(' ')||'This adjustment cannot be calculated.');
  return revised.draft;
 }
 async function editPlanningInputs(item:SolutionEvaluation,changes:PlanningInputChange[]){
  if(controller.current||pending||saving)return;
  const snapshot=requireCurrent(),request=makeRequest(`Edit planning assumptions for ${item.candidate.name}: ${changes.map(change=>`${change.field}${change.target?' ('+change.target+')':''} = ${change.value??'Unknown'}`).join('; ')}.`),key=liveKey.current,captured=epoch.current;
  setSaving(true);setNotice('');
  try{
   const revised=await editSolutionPlanningInputs(request,item,changes);requireCurrent();
   if(key!==liveKey.current||captured!==epoch.current||snapshot.data.revision!==decisionStore.getSnapshot().data.revision||!equal(request.catalog,catalog()))throw Error('The conversation changed. Review the current proposal before editing.');
   if(revised.blocking.length)throw Error(revised.blocking.join(' '));
   const state=structuredClone(memoryRef.current);state.working=retainEvaluations(state,[revised]);state.verifiedMetrics=[];state.focusCandidateId=revised.id;state.recommendationRequestId=revised.requestId;state.constraints=revised.constraints;
   state.turns=[...state.turns,{id:request.message.id,role:'user' as const,text:request.message.text}].slice(-32);
   const recipes=datasetSession.snapshot()===PUBLIC_9037.token?await capturePublicWorkingRecipes(request,state,currentProps.current.publicSource,storedRecipes()):undefined;
   if(key!==liveKey.current||captured!==epoch.current||snapshot.data.revision!==requireCurrent().data.revision)throw Error('The conversation changed while retaining evidence.');
   persist(readSolutionState(state),recipes);setNotice('Planning assumptions recalculated. Review before pinning; inputs remain unverified.');
  }catch(error){setNotice((error as Error).message);}finally{setSaving(false);}
 }
 function reject(item:SolutionEvaluation){try{requireCurrent();const state=structuredClone(memoryRef.current),turnId=crypto.randomUUID();state.turns=[...state.turns,{id:turnId,role:'user' as const,text:`Discard proposal ${item.candidate.name}, revision ${item.revision}.`}].slice(-32);state.rejected=[...state.rejected,{candidateId:item.id,revision:item.revision,reason:'Discarded using the proposal review control.',turnId}].slice(-24);if(state.focusCandidateId===item.id)state.focusCandidateId=null;persist(state);}catch(error){setNotice((error as Error).message);}}
 function updateRequiredStaffing(expected:string,inputs:RequiredStaffingInput){
  if(controller.current||pending||saving)throw Error('Wait for the current request before applying staffing changes.');
  requireCurrent();const request=makeRequest('Apply locally reviewed staffing assumptions.');
  const review=editRequiredStaffingLocally(request,decisionStore.getDatasetToken(),expected,inputs);
  persist({...memoryRef.current,requiredStaffing:review});
 }
 function clearRequiredStaffing(){
  if(controller.current||pending||saving)throw Error('Wait for the current request before clearing this comparison.');
  requireCurrent();persist({...memoryRef.current,requiredStaffing:null,currentCalculationKinds:memoryRef.current.currentCalculationKinds?.filter(kind=>kind!=='required-staffing')});
 }
 function staffingDeliveryTarget(){
  try{return resolveStaffingDeliveryTarget(memoryRef.current,catalog());}
  catch{return {months:null,target:null,issue:'Saved plans could not be verified. They have been preserved. Restore a verified saved workspace before pinning this staffing comparison.'};}
 }
 function pinnedRequiredStaffing(optionId:string){
  const review=memory.requiredStaffing;if(!review)return undefined;
  try{const identity=requiredStaffingPlanIdentity({version:1,review,optionId,deliveryTarget:staffingDeliveryTarget().target});return saved?.plans.find(plan=>!plan.deleted&&plan.draft.inputs.requiredStaffingPlan&&requiredStaffingPlanIdentity(plan.draft.inputs.requiredStaffingPlan)===identity)?.number;}catch{return undefined;}
 }
 async function pinRequiredStaffing(optionId:string){
  if(saving||pending||controller.current)return;setSaving(true);setNotice('');
  try{
   const snapshot=requireCurrent(),request=makeRequest('Pin the checked staffing option.'),review=currentRequiredStaffing(request,decisionStore.getDatasetToken());if(!review)throw Error('Review the current staffing comparison.');
   const key=JSON.stringify(review),context=liveKey.current,initialEpoch=epoch.current,revision=snapshot.data.revision;
   const goal={id:request.goal.id||crypto.randomUUID(),statement:request.goal.statement||`Cover ${review.inputs.requiredRoles} ${review.inputs.role??'workforce'} roles.`};
   const delivery=staffingDeliveryTarget();if(delivery.issue)throw Error(delivery.issue);const deliveryTarget=delivery.target;
   const boundReview={...review,scopeKey:JSON.stringify([goal,request.scope,request.filters])};
   const selection=await prepareRequiredStaffingPlan({version:1,review:boundReview,optionId,deliveryTarget},goal);requireCurrent();
   if(context!==liveKey.current||initialEpoch!==epoch.current||decisionStore.getSnapshot().data.revision!==revision||JSON.stringify(currentRequiredStaffing(makeRequest('Pin the checked staffing option.'),decisionStore.getDatasetToken()))!==key)throw Error('The staffing comparison changed. Review the current option.');
   const fields=requiredStaffingPlanFields(selection,catalog(),'staffing-choice-'+crypto.randomUUID(),new Date().toISOString()),state=structuredClone(memoryRef.current);state.requiredStaffing=boundReview;retainStaffingDeliveryTarget(state,catalog());
   currentProps.current.conversation.selectProposalGoal(goal,revision,{...fields,[solutionConversationField]:state} as unknown as Record<string,Json>);memoryRef.current=state;setMemory(state);setNotice('Action Plan pinned. Staffing assumptions remain unconfirmed.');
  }catch(error){setNotice(error instanceof Error?error.message:'The staffing plan could not be saved.');}finally{setSaving(false);}
 }
 async function saveProjectionEntry(base:HeadcountProjection,turnId:string,demand:ProjectionDemandInputs|null=null){
  if(controller.current||pending||saving)throw Error('Finish the current operation before saving this projection.');
  const snapshot=requireCurrent(),state=memoryRef.current,context=liveKey.current,initialEpoch=epoch.current,token=datasetSession.snapshot();
  if(state.analyses.length>=6||state.turns.length>=32)throw Error('This conversation has reached its revision limit. Existing projections are retained; start a new conversation for further revisions.');
  const latest=state.analyses.find(p=>p.id===base.id);
  const filters=new URLSearchParams(currentProps.current.query),active={country:filters.get('country')||'all',org:filters.get('org')||'all',level:filters.get('level')||'all'};
  if(latest||base.revision!==1||base.spec.base!==null||!equal(active,base.inputs.filters))throw Error('The projection revision or active scope changed. Reopen the current scenario.');
  const abort=new AbortController();controller.current=abort;setSaving(true);setNotice('');const timer=setTimeout(()=>abort.abort(),20000);
  const current=()=>!abort.signal.aborted&&mounted.current&&context===liveKey.current&&initialEpoch===epoch.current&&token===datasetSession.snapshot()&&snapshot.data.revision===decisionStore.getSnapshot().data.revision&&state===memoryRef.current;
  try{
   const response=await datasetFetch('/api/home-solution-conversation?'+new URLSearchParams(active),{method:'GET',cache:'no-store',signal:abort.signal});
   if(!response.ok)throw Error('Current projection inputs could not be checked. Your saved revision is unchanged.');
   await verifyProjectionEditSource(base,await response.json(),token);
   const projection=await calculateHeadcountProjection(base.spec,base.inputs,[],[turnId],demand);
   if(!current())throw Error('The conversation or source changed during verification. No projection was saved.');
   requireCurrent();
   const text=`Saved local projection assumptions: ${base.spec.months} months; ${Object.entries(base.assumptions).map(([k,v])=>`${k.replaceAll('_',' ')} ${v}`).join('; ')}. ${projection.demand?' Workload assumptions saved with this revision; unknown values remain unknown.':''} These are conditional scenario inputs, not observed outcomes.`;
   persist(readSolutionState({...state,analyses:[...state.analyses,projection],turns:[...state.turns,{id:turnId,role:'user',text}],verifiedMetrics:state.verifiedMetrics.filter(ref=>ref.kind!=='projection'||ref.id!==base.id)}));
   setNotice(`Saved projection revision 1; earlier conversation remains unchanged.`);
  }finally{clearTimeout(timer);if(controller.current===abort)controller.current=null;setSaving(false);}
 }
 async function saveProjectionEdit(base:HeadcountProjection,edit:ProjectionEdit,turnId:string){
  if(controller.current||pending||saving)throw Error('Finish the current operation before saving this projection.');
  const snapshot=requireCurrent(),state=memoryRef.current,context=liveKey.current,initialEpoch=epoch.current,token=datasetSession.snapshot();
  if(state.analyses.length>=6||state.turns.length>=32)throw Error('This conversation has reached its revision limit. Existing projections are retained; start a new conversation for further revisions.');
  const latest=state.analyses.filter(p=>p.id===base.id).at(-1);
  const filters=new URLSearchParams(currentProps.current.query),active={country:filters.get('country')||'all',org:filters.get('org')||'all',level:filters.get('level')||'all'};
  if(!equal(latest,base)||!equal(active,base.inputs.filters))throw Error('The projection revision or active scope changed. Reopen the current scenario.');
  const abort=new AbortController();controller.current=abort;setSaving(true);setNotice('');const timer=setTimeout(()=>abort.abort(),20000);
  const current=()=>!abort.signal.aborted&&mounted.current&&context===liveKey.current&&initialEpoch===epoch.current&&token===datasetSession.snapshot()&&snapshot.data.revision===decisionStore.getSnapshot().data.revision&&state===memoryRef.current;
  try{
   const response=await datasetFetch('/api/home-solution-conversation?'+new URLSearchParams(active),{method:'GET',cache:'no-store',signal:abort.signal});
   if(!response.ok)throw Error('Current projection inputs could not be checked. Your saved revision is unchanged.');
   await verifyProjectionEditSource(base,await response.json(),token);
   const projection=await previewProjectionEdit(base,edit,turnId,state.analyses);
   if(!current())throw Error('The conversation or source changed during verification. No projection was saved.');
   requireCurrent();
   const text=`Saved local projection assumptions: ${edit.months} months; ${Object.entries(edit.values).map(([k,v])=>`${k.replaceAll('_',' ')} ${v}`).join('; ')}. ${projection.demand?' Workload assumptions saved with this revision; unknown values remain unknown.':''} These are conditional scenario inputs, not observed outcomes.`;
   persist(readSolutionState({...state,analyses:[...state.analyses,projection],turns:[...state.turns,{id:turnId,role:'user',text}],verifiedMetrics:state.verifiedMetrics.filter(ref=>ref.kind!=='projection'||ref.id!==base.id)}));
   setNotice(`Saved projection revision ${projection.revision}; the original revision and earlier conversation remain unchanged.`);
  }finally{clearTimeout(timer);if(controller.current===abort)controller.current=null;setSaving(false);}
 }
 function updateHiringBudget(inputs:HiringBudgetInput|null){
  if(controller.current||pending||saving)throw Error('Wait for the current request before editing this estimate.');
  requireCurrent();
  const previous=inputs===null?null:currentHiringBudget(makeRequest('Edit the hiring estimate.'),decisionStore.getDatasetToken());
  if(inputs!==null&&!previous)throw Error('The hiring estimate changed.');
  persist({...memoryRef.current,conditionalHiringPlan:inputs===null?false:memoryRef.current.conditionalHiringPlan,hiringBudget:inputs===null?null:editHiringBudgetLocally(previous!,inputs),currentCalculationKinds:inputs===null?memoryRef.current.currentCalculationKinds?.filter(kind=>kind!=='hiring'):memoryRef.current.currentCalculationKinds});
 }
 function resetHiringScenario(baseline:HiringBudgetReview){
  if(controller.current||pending||saving)throw Error('Wait for the current request before resetting.');
  requireReviewedHiringInputs();requireCurrent();const previous=currentHiringBudget(makeRequest('Reset local scenario adjustments.'),decisionStore.getDatasetToken());if(!previous)throw Error('The hiring estimate changed.');
  persist({...memoryRef.current,hiringBudget:restoreHiringBudgetBaseline(previous,baseline)});
 }
 async function reviewHiringPlan(externalHires:number|null){
  requireReviewedHiringInputs();
  const snapshot=requireCurrent(),request=makeRequest('Review the hiring route.'),review=currentHiringBudget(request,decisionStore.getDatasetToken());if(!review)throw Error('The hiring estimate changed.');
  const key=JSON.stringify(review),revision=snapshot.data.revision,context=liveKey.current,initialEpoch=epoch.current;
  const goal={id:request.goal.id||crypto.randomUUID(),statement:request.goal.statement||`Explore options for ${review.inputs.hires} additional ${review.inputs.role??'workforce'} roles${review.inputs.budget===null?'; affordability not yet assessed': ' within the entered budget ceiling'}.`};
  const selection=externalHires===null?await prepareConditionalHiringPlan(review,goal):await prepareHiringPlan(review,externalHires,goal);requireCurrent();requireReviewedHiringInputs();
  if(context!==liveKey.current||initialEpoch!==epoch.current||JSON.stringify(currentHiringBudget(makeRequest('Review the hiring route.'),decisionStore.getDatasetToken()))!==key||decisionStore.getSnapshot().data.revision!==revision)throw Error('The estimate changed. Review the current hiring route.');
  return {selection,key,revision,context,epoch:initialEpoch};
 }
 async function saveHiringPlan(review:{selection:HiringPlanSelection;key:string;revision:number;context:string;epoch:number}){
  if(saving||pending)return;setSaving(true);setNotice('');
  try{requireReviewedHiringInputs();const snapshot=requireCurrent();if(review.context!==liveKey.current||review.epoch!==epoch.current||snapshot.data.revision!==review.revision||JSON.stringify(currentHiringBudget(makeRequest('Review the hiring route.'),decisionStore.getDatasetToken()))!==review.key)throw Error('The hiring inputs changed. Review the current route.');
   const fields=hiringPlanFields(review.selection,catalog(),'hiring-choice-'+crypto.randomUUID(),new Date().toISOString()),state=structuredClone(memoryRef.current);
   currentProps.current.conversation.selectProposalGoal(review.selection.goal,snapshot.data.revision,{...fields,[solutionConversationField]:state} as unknown as Record<string,Json>);memoryRef.current=state;setMemory(state);setNotice(review.selection.receipt.version===2?'Conditional hiring plan pinned with its native assumptions. Costs, affordability and staffing remain unverified.':'Reviewed hiring plan saved with its exact cost receipt. Internal availability and full mixed-route costs remain unknown.');
  }catch(error){setNotice(error instanceof Error?error.message:'The reviewed hiring plan could not be saved.');}finally{setSaving(false);}
 }
 function clearBusinessPlanning(){try{requireCurrent();persist({...memoryRef.current,businessPlanning:null});}catch(error){setNotice((error as Error).message);}}
 function currentBusinessState(){return currentBusinessPlanning(makeRequest('Review the current provisional staffing option.'),decisionStore.getDatasetToken());}
 function adjustBusinessMix(mix:{build:number;move:number;buy:number}|null){
  if(pending||saving)throw Error('Finish the current operation before adjusting this scenario.');
  requireCurrent();const state=currentBusinessState();if(!state)throw Error('The current staffing comparison is unavailable.');
  persist({...memoryRef.current,businessPlanning:selectBusinessPlanningMix(state,mix)});
 }
 function adjustBusinessAssumptions(draft:PreviewAssumptions,key:string){
  if(pending||saving)throw Error('Finish the current operation before adjusting this scenario.');
  requireCurrent();const state=currentBusinessState();if(!state||JSON.stringify(state)!==key)throw Error('The plan changed. Close and reopen the input editor.');
  persist({...memoryRef.current,businessPlanning:editPreviewAssumptions(state,draft,'planner-edit-'+crypto.randomUUID())});
 }
 async function reviewBusinessOption(id:string){
  const snapshot=requireCurrent(),state=currentBusinessState();if(!state)throw Error('The business discussion changed.');
  const key=JSON.stringify(state),revision=snapshot.data.revision,context=liveKey.current,initialEpoch=epoch.current;
  const selection=await prepareBusinessPlanningSelection(state,id);requireCurrent();
  if(context!==liveKey.current||initialEpoch!==epoch.current||JSON.stringify(currentBusinessState())!==key||decisionStore.getSnapshot().data.revision!==revision)throw Error('The discussion changed. Review the current option.');
  return {selection,key,revision,context,epoch:initialEpoch};
 }
 async function saveBusinessOption(review:{selection:BusinessPlanningSelection;key:string;revision:number;context:string;epoch:number}){
  if(saving||pending)return;setSaving(true);setNotice('');
  try{const snapshot=requireCurrent(),p=currentProps.current;if(review.context!==liveKey.current||review.epoch!==epoch.current||JSON.stringify(currentBusinessState())!==review.key||snapshot.data.revision!==review.revision)throw Error('The reviewed comparison changed. Review the current option.');
   const requestId='business-choice-'+crypto.randomUUID(),at=new Date().toISOString(),fields=businessPlanningSelectionFields(review.selection,catalog(),requestId,at,snapshot.data.workspaces[review.selection.goal.id]?.fields[businessPlanningReceiptField]);
   const state=structuredClone(memoryRef.current);if(state.businessPlanning)state.businessPlanning.context.boundGoal=structuredClone(review.selection.goal);
   p.conversation.selectProposalGoal(review.selection.goal,snapshot.data.revision,{...fields,[solutionConversationField]:state} as unknown as Record<string,Json>);memoryRef.current=state;setMemory(state);setNotice('Reviewed provisional staffing plan saved. Assumptions remain unverified; no operational change was applied.');
  }catch(error){setNotice((error as Error).message);}finally{setSaving(false);}
 }
 const raw=storage.data.workspaces[goal.id]?.fields[planAlternativesField],saved=raw?readPlanAlternatives(raw,{goalId:goal.id,goal:goal.statement}):null;
 const storedVisual=(goal.id?storage.data.workspaces[goal.id]:storage.data.exploration)?.fields[homeAnswerVisualField];
 const restoredAnswerSeries=restoreHomeAnswerVisual(storedVisual,JSON.stringify([props.scope,props.query]),decisionStore.getDatasetToken(),memory.turns);
 return {adjustBusinessAssumptions,updateRequiredStaffing,saveProjectionEntry,saveProjectionEdit,adjustBusinessMix,resetHiringScenario,restoredAnswerSeries,staffingDeliveryTarget,pinRequiredStaffing,pinnedRequiredStaffing,hiringEditorDirty:hiringEdit?.dirty===true&&hiringEdit.key===JSON.stringify(memory.hiringBudget),setHiringEditorDirty,reviewHiringPlan,saveHiringPlan,previewPlanningInputs,editPlanningInputs,answerSeries,clearRequiredStaffing,updateHiringBudget,clearBusinessPlanning,reviewBusinessOption,saveBusinessOption,state:memory,pending,pendingStartedAt,saving,notice,send,cancel,save,reject,saved,canSend:props.enabled&&props.active&&props.settled&&props.conversation.storageReady&&props.conversation.saved&&!props.conversation.issueEditor};
}
