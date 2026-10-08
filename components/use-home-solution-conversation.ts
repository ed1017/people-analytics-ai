'use client';
import {datasetFetch} from '@/lib/dataset-client.mjs';
import {swpConversationHeaders} from '@/lib/swp-conversation-model';
import {useEffectEvent,useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {requestDemandContext,readDemandReview,type DemandReview} from '@/lib/swp-demand';
import {decisionStore,useDecisionStorage} from './decision-store';
import type {ProblemConversation} from './problem-conversation';
import type {BundleDiscussion} from './home-bundle-plans';
import {emptySolutionState,readSolutionState,readSolutionRequest,saveSolutionCandidate,solutionConversationField,type SolutionEvaluation,type SolutionRequest,type SolutionState} from '@/lib/home-solution-conversation';
import {createPlanAlternatives,packPlanAlternatives,planAlternativesField,readPlanAlternatives,associatePlanProposal,type PlanAlternatives} from '@/lib/home-plan-alternatives';
import type {SolutionReply} from '@/lib/home-solution-conversation-service';
import {alternativeViewField} from '@/lib/home-plan-alternative-chat';
import {reviewBundleProposal as reconcileBundle} from '@/lib/home-bundle-reconciliation';
import type {Json} from '@/lib/local-decisions';
import type {GuidedActionRegistry} from './home-guided-actions';
import {progressEntryContext,retainProgressEntryProposal} from '@/lib/goal-progress-entry-store';
import {captureGoalProgressInput} from '@/lib/goal-progress-conversation';

type Props={enabled:boolean;conversation:ProblemConversation;active:boolean;settled:boolean;evidence:unknown;planningContext?:()=>unknown;demandReviewRef?:RefObject<((review:DemandReview)=>void)|null>;scope:string;query:string;target:()=>BundleDiscussion|null;guided?:GuidedActionRegistry|null};
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function useHomeSolutionConversation(props:Props){
 const storage=useDecisionStorage(),[memory,setMemory]=useState<SolutionState>(emptySolutionState),[pending,setPending]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const controller=useRef<AbortController|null>(null),epoch=useRef(0),mounted=useRef(false),memoryRef=useRef(memory),currentProps=useRef(props);
 useLayoutEffect(()=>{currentProps.current=props;});
 useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 const goal={id:props.conversation.activeGoalId,statement:props.conversation.focusedIssue};
 const guideId=props.guided?.goalId??null;
 const identity=JSON.stringify([goal,guideId,props.conversation.resetEpoch,props.conversation.storageReady]);
 const loaded=useRef(''),reset=useRef(props.conversation.resetEpoch);
 const synchronize=useEffectEvent(()=>{
  if(loaded.current===identity)return;loaded.current=identity;epoch.current++;controller.current?.abort();setPending(false);setNotice('');
  try{const wasReset=reset.current!==props.conversation.resetEpoch;const state=wasReset||guideId&&!goal.id?emptySolutionState():readSolutionState((goal.id?storage.data.workspaces[goal.id]:storage.data.exploration)?.fields[solutionConversationField]);reset.current=props.conversation.resetEpoch;if(wasReset&&props.conversation.storageReady)persist(state);memoryRef.current=state;setMemory(state);}catch(error){memoryRef.current=emptySolutionState();setMemory(emptySolutionState());setNotice((error as Error).message);}
 });
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Goal/reset events select an isolated local conversation.
 useLayoutEffect(()=>{synchronize();},[identity]);
 const progressInput=captureGoalProgressInput(decisionStore,goal.id);
 const contextKey=JSON.stringify([goal,guideId,props.active,props.settled,props.scope,props.query,props.evidence,props.conversation.resetEpoch,props.conversation.issueEditor?.id,progressInput]);
 const liveKey=useRef(contextKey);
 useLayoutEffect(()=>{if(liveKey.current!==contextKey){liveKey.current=contextKey;epoch.current++;controller.current?.abort();setPending(false);}},[contextKey]);
 function catalog():PlanAlternatives|null{
  const p=currentProps.current,g={goalId:p.conversation.activeGoalId,goal:p.conversation.focusedIssue},snapshot=decisionStore.getSnapshot(),raw=snapshot.data.workspaces[g.goalId]?.fields[planAlternativesField];
  if(raw!==undefined){const value=readPlanAlternatives(raw,g);if(!value)throw Error('Saved plans could not be verified. They have been preserved.');return value;}
  const target=p.target(),sources=target?.goalId===g.goalId?target.snapshots?.():null;
  return sources?.length?createPlanAlternatives(g,sources):null;
 }
 function requireCurrent(){const p=currentProps.current,snapshot=decisionStore.getSnapshot();if(!mounted.current||!p.enabled||!p.active||!p.settled||!snapshot.saved||!p.conversation.storageReady||p.conversation.issueEditor||snapshot.data.goals.activeId!==p.conversation.activeGoalId||(snapshot.data.goals.goals.find(g=>g.id===snapshot.data.goals.activeId)?.statement??'')!==p.conversation.focusedIssue)throw Error('The goal, sources or browser storage changed. Your earlier work is kept.');return snapshot;}
 function persist(state:SolutionState){const p=currentProps.current,snapshot=requireCurrent(),build=()=>({[solutionConversationField]:state as unknown as Json});if(p.conversation.activeGoalId)decisionStore.commitGoalFields(p.conversation.activeGoalId,p.conversation.focusedIssue,snapshot.data.revision,new Date().toISOString(),build);else if(!p.guided?.goalId)decisionStore.commitExplorationFields(snapshot.data.revision,new Date().toISOString(),build);memoryRef.current=state;setMemory(state);}
 function selectedPlanId(value:PlanAlternatives|null){const p=currentProps.current,target=p.target();return target?.goalId===p.conversation.activeGoalId&&value?.order.includes(target.id)?target.id:null;}
 function makeRequest(text:string):SolutionRequest{
  const p=currentProps.current,current=catalog(),params=new URLSearchParams(p.query),progress=captureGoalProgressInput(decisionStore,p.conversation.activeGoalId);
  return readSolutionRequest({version:1,requestId:crypto.randomUUID(),goal:{id:p.conversation.activeGoalId,statement:p.conversation.focusedIssue},scope:p.scope,filters:{country:params.get('country')||'all',org:params.get('org')||'all',level:params.get('level')||'all'},timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,evidence:p.evidence,goalContext:p.planningContext?.()?{goalContext:p.conversation.goalContext,scenarioReview:p.planningContext()}:p.conversation.goalContext,...(progress?{progressEntry:progressEntryContext(decisionStore,'context',[{id:'context',text}])?.previous??null}:{}),...(progress?{goalProgress:progress}:{}),selectedId:selectedPlanId(current),catalog:current,state:memoryRef.current,message:{id:crypto.randomUUID(),text}});
 }
 async function send(text:string){
  if(controller.current||saving)return;requireCurrent();const request=makeRequest(text),entryContext=progressEntryContext(decisionStore,request.requestId,[...request.state.turns.filter(t=>t.role==='user').map(({id,text})=>({id,text})),request.message]),captured=++epoch.current,key=liveKey.current,scenario=JSON.stringify(currentProps.current.planningContext?.()??null),abort=new AbortController();controller.current=abort;setPending(true);setNotice('');
  const current=()=>!abort.signal.aborted&&mounted.current&&captured===epoch.current&&key===liveKey.current&&scenario===JSON.stringify(currentProps.current.planningContext?.()??null)&&equal(request.goalProgress,captureGoalProgressInput(decisionStore,currentProps.current.conversation.activeGoalId))&&equal(request.catalog,catalog())&&selectedPlanId(catalog())===(request.selectedId??null);
  try{
   const response=await datasetFetch('/api/home-solution-conversation',{method:'POST',headers:{'Content-Type':'application/json',...swpConversationHeaders(request.goalContext)},body:JSON.stringify(request),signal:abort.signal});const data=await response.json();
   if(!current())return null;if(!response.ok)throw Error(typeof data.error==='string'?data.error:'The conversation response is unavailable.');
   const reply=data as SolutionReply;if(reply.requestId!==request.requestId||typeof reply.answer!=='string'||!reply.answer.trim()||reply.answer.length>10000||!Array.isArray(reply.candidateIds)||!Array.isArray(reply.analysisIds))throw Error('The conversation response does not match this request.');
   const state=readSolutionState(reply.state);if(state.turns.at(-2)?.id!==request.message.id||state.turns.at(-1)?.text!==reply.answer||reply.candidateIds.some(id=>!state.working.some(item=>item.id===id&&item.requestId===request.requestId))||reply.analysisIds.some(id=>!state.analyses.some(item=>item.id===id)))throw Error('The returned conversation could not be verified.');
   const demandContext=reply.demandReview?requestDemandContext(request,decisionStore.getDatasetToken()):null;
   const demandReview=reply.demandReview&&demandContext?readDemandReview(reply.demandReview,demandContext):null;
   if(reply.demandReview&&(!demandReview||!currentProps.current.demandReviewRef?.current||reply.demandReview.requestId!==request.requestId))throw Error('The business demand review does not match this request.');
   requireCurrent();persist(state);if(reply.progressProposal){if(!entryContext)throw Error('Progress entry is not enabled.');await retainProgressEntryProposal(decisionStore,reply.progressProposal,entryContext,{current});if(!current())return null;}const p=currentProps.current,guided=p.guided;if(guided?.goalId&&(!p.conversation.activeGoalId||p.conversation.activeGoalId===guided.goalId)&&reply.candidateIds.length)guided.emit({type:'proposal-reviewed',goalId:guided.goalId,planId:reply.candidateIds[0],candidates:state.working.filter(item=>reply.candidateIds.includes(item.id)&&item.requestId===request.requestId).map(({id,revision,requestId})=>({id,revision,requestId}))});if(demandReview)p.demandReviewRef?.current?.(demandReview);return reply.answer;
  }catch(error){if(current())throw error;return null;}finally{if(controller.current===abort){controller.current=null;setPending(false);}}
 }
 function cancel(){epoch.current++;controller.current?.abort();controller.current=null;setPending(false);setNotice('Request cancelled. Your draft and saved work are kept.');}
 async function save(item:SolutionEvaluation,acknowledge:boolean,goalStatement:string){
  if(saving||pending)return;setSaving(true);setNotice('');
  try{
   requireCurrent();const request=makeRequest(item.message.text);request.requestId=item.requestId;request.message=item.message;
   const p=currentProps.current,key=liveKey.current,initialEpoch=epoch.current,scenario=JSON.stringify(p.planningContext?.()??null),desired={id:p.conversation.activeGoalId||p.guided?.goalId||crypto.randomUUID(),statement:p.conversation.focusedIssue||goalStatement.trim()};
   const outcome=await saveSolutionCandidate(request,request.catalog,item,desired,p.evidence,acknowledge);
   const snapshot=requireCurrent();if(key!==liveKey.current||initialEpoch!==epoch.current||scenario!==JSON.stringify(currentProps.current.planningContext?.()??null)||!equal(request.catalog,catalog()))throw Error('The conversation changed while reviewing selection. Try again against the current context.');
   if(outcome.status!=='ready')throw Error('The proposal needs further review.');
   const selected=associatePlanProposal(outcome.catalog,outcome.catalog,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:outcome.plan.requestId!,at:new Date().toISOString(),acknowledgeUnknowns:acknowledge});
   const state=structuredClone(memoryRef.current);
   if(!p.conversation.activeGoalId)for(const candidate of state.working){
    if(candidate.binding.goal!==item.binding.goal)continue;
    candidate.binding={...candidate.binding,goalId:desired.id,goal:desired.statement};
    if(candidate.draft){candidate.draft.binding=structuredClone(candidate.binding);if(candidate.draft.inputs.successMeasure)candidate.draft.inputs.successMeasure.goal=desired.statement;candidate.result=reconcileBundle(candidate.draft);}
   }
   p.conversation.selectProposalGoal(desired,snapshot.data.revision,{[planAlternativesField]:packPlanAlternatives(selected) as unknown as Json,[solutionConversationField]:state as unknown as Json,[alternativeViewField]:{version:1,selectedId:outcome.plan.id,collapsed:false}});
   memoryRef.current=state;setMemory(state);
   p.guided?.emit({type:'proposal-chosen',goalId:desired.id,goal:desired.statement,planId:outcome.plan.id,number:outcome.plan.number,candidate:{id:item.id,revision:item.revision,requestId:item.requestId}});
   setNotice(`Action Plan #${outcome.plan.number} attached as a proposal to “${desired.statement}”.`);
  }catch(error){setNotice(error instanceof Error?error.message:'The proposal could not be saved.');}finally{setSaving(false);}
 }
 function reject(item:SolutionEvaluation){try{requireCurrent();const state=structuredClone(memoryRef.current),turnId=crypto.randomUUID();state.turns=[...state.turns,{id:turnId,role:'user' as const,text:`Discard proposal ${item.candidate.name}, revision ${item.revision}.`}].slice(-32);state.rejected=[...state.rejected,{candidateId:item.id,revision:item.revision,reason:'Discarded using the proposal review control.',turnId}].slice(-24);if(state.focusCandidateId===item.id)state.focusCandidateId=null;persist(state);}catch(error){setNotice((error as Error).message);}}
 const raw=storage.data.workspaces[goal.id]?.fields[planAlternativesField],saved=raw?readPlanAlternatives(raw,{goalId:goal.id,goal:goal.statement}):null;
 return {state:memory,pending,saving,notice,send,cancel,save,reject,saved,canSend:props.enabled&&props.active&&props.settled&&props.conversation.storageReady&&props.conversation.saved&&!props.conversation.issueEditor};
}
