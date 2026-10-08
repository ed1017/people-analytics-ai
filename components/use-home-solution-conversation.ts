'use client';
import {useEffectEvent,useLayoutEffect,useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from './decision-store';
import type {ProblemConversation} from './problem-conversation';
import type {BundleDiscussion} from './home-bundle-plans';
import {emptySolutionState,readSolutionState,readSolutionRequest,saveSolutionCandidate,solutionConversationField,type SolutionEvaluation,type SolutionRequest,type SolutionState} from '@/lib/home-solution-conversation';
import {createPlanAlternatives,packPlanAlternatives,planAlternativesField,readPlanAlternatives,type PlanAlternatives} from '@/lib/home-plan-alternatives';
import type {SolutionReply} from '@/lib/home-solution-conversation-service';
import {alternativeViewField} from '@/lib/home-plan-alternative-chat';
import {reviewBundleProposal as reconcileBundle} from '@/lib/home-bundle-reconciliation';
import type {Json} from '@/lib/local-decisions';

type Props={enabled:boolean;conversation:ProblemConversation;active:boolean;settled:boolean;evidence:unknown;scope:string;query:string;target:()=>BundleDiscussion|null};
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function useHomeSolutionConversation(props:Props){
 const storage=useDecisionStorage(),[memory,setMemory]=useState<SolutionState>(emptySolutionState),[pending,setPending]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const controller=useRef<AbortController|null>(null),epoch=useRef(0),mounted=useRef(false),memoryRef=useRef(memory),currentProps=useRef(props);
 useLayoutEffect(()=>{currentProps.current=props;});
 useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 const goal={id:props.conversation.activeGoalId,statement:props.conversation.focusedIssue};
 const identity=JSON.stringify([goal,props.conversation.resetEpoch]);
 const loaded=useRef(''),reset=useRef(props.conversation.resetEpoch);
 const synchronize=useEffectEvent(()=>{
  if(loaded.current===identity)return;loaded.current=identity;epoch.current++;controller.current?.abort();setPending(false);setNotice('');
  try{const state=reset.current!==props.conversation.resetEpoch?emptySolutionState():readSolutionState(storage.data.workspaces[goal.id]?.fields[solutionConversationField]);reset.current=props.conversation.resetEpoch;memoryRef.current=state;setMemory(state);}catch(error){memoryRef.current=emptySolutionState();setMemory(emptySolutionState());setNotice((error as Error).message);}
 });
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Goal/reset events select an isolated local conversation.
 useLayoutEffect(()=>{synchronize();},[identity]);
 const contextKey=JSON.stringify([goal,props.active,props.settled,props.scope,props.query,props.evidence,props.conversation.resetEpoch,props.conversation.issueEditor?.id]);
 const liveKey=useRef(contextKey);
 useLayoutEffect(()=>{if(liveKey.current!==contextKey){liveKey.current=contextKey;epoch.current++;controller.current?.abort();setPending(false);}},[contextKey]);
 function catalog():PlanAlternatives|null{
  const p=currentProps.current,g={goalId:p.conversation.activeGoalId,goal:p.conversation.focusedIssue},snapshot=decisionStore.getSnapshot(),raw=snapshot.data.workspaces[g.goalId]?.fields[planAlternativesField];
  if(raw!==undefined){const value=readPlanAlternatives(raw,g);if(!value)throw Error('Saved plans could not be verified. They have been preserved.');return value;}
  const target=p.target(),sources=target?.goalId===g.goalId?target.snapshots?.():null;
  return sources?.length?createPlanAlternatives(g,sources):null;
 }
 function requireCurrent(){const p=currentProps.current,snapshot=decisionStore.getSnapshot();if(!mounted.current||!p.enabled||!p.active||!p.settled||!snapshot.saved||!p.conversation.storageReady||p.conversation.issueEditor||snapshot.data.goals.activeId!==p.conversation.activeGoalId||(snapshot.data.goals.goals.find(g=>g.id===snapshot.data.goals.activeId)?.statement??'')!==p.conversation.focusedIssue)throw Error('The goal, sources or browser storage changed. Your earlier work is kept.');return snapshot;}
 function persist(state:SolutionState){const p=currentProps.current;memoryRef.current=state;setMemory(state);if(p.conversation.activeGoalId){const snapshot=requireCurrent();decisionStore.commitGoalFields(p.conversation.activeGoalId,p.conversation.focusedIssue,snapshot.data.revision,new Date().toISOString(),()=>({[solutionConversationField]:state as unknown as Json}));}}
 function makeRequest(text:string):SolutionRequest{
  const p=currentProps.current,current=catalog(),params=new URLSearchParams(p.query),selected=p.target()?.id;
  return readSolutionRequest({version:1,requestId:crypto.randomUUID(),goal:{id:p.conversation.activeGoalId,statement:p.conversation.focusedIssue},scope:p.scope,filters:{country:params.get('country')||'all',org:params.get('org')||'all',level:params.get('level')||'all'},timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,evidence:p.evidence,goalContext:p.conversation.goalContext,selectedId:current?.order.includes(selected??'')?selected:null,catalog:current,state:memoryRef.current,message:{id:crypto.randomUUID(),text}});
 }
 async function send(text:string){
  if(controller.current||saving)return;requireCurrent();const request=makeRequest(text),captured=++epoch.current,key=liveKey.current,abort=new AbortController();controller.current=abort;setPending(true);setNotice('');
  const current=()=>!abort.signal.aborted&&mounted.current&&captured===epoch.current&&key===liveKey.current&&equal(request.catalog,catalog())&&(currentProps.current.target()?.id??null)===(request.selectedId??null);
  try{
   const response=await fetch('/api/home-solution-conversation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:abort.signal});const data=await response.json();
   if(!current())return null;if(!response.ok)throw Error(typeof data.error==='string'?data.error:'The conversation response is unavailable.');
   const reply=data as SolutionReply;if(reply.requestId!==request.requestId||typeof reply.answer!=='string'||!reply.answer.trim()||reply.answer.length>10000||!Array.isArray(reply.candidateIds)||!Array.isArray(reply.analysisIds))throw Error('The conversation response does not match this request.');
   const state=readSolutionState(reply.state);if(state.turns.at(-2)?.id!==request.message.id||state.turns.at(-1)?.text!==reply.answer||reply.candidateIds.some(id=>!state.working.some(item=>item.id===id&&item.requestId===request.requestId))||reply.analysisIds.some(id=>!state.analyses.some(item=>item.id===id)))throw Error('The returned conversation could not be verified.');
   requireCurrent();persist(state);return reply.answer;
  }catch(error){if(current())throw error;return null;}finally{if(controller.current===abort){controller.current=null;setPending(false);}}
 }
 function cancel(){epoch.current++;controller.current?.abort();controller.current=null;setPending(false);setNotice('Request cancelled. Your draft and saved work are kept.');}
 async function save(item:SolutionEvaluation,acknowledge:boolean,goalStatement:string){
  if(saving||pending)return;setSaving(true);setNotice('');
  try{
   requireCurrent();const request=makeRequest(item.message.text);request.requestId=item.requestId;request.message=item.message;
   const p=currentProps.current,key=liveKey.current,initialEpoch=epoch.current,desired={id:p.conversation.activeGoalId||'reviewed-goal',statement:p.conversation.focusedIssue||goalStatement.trim()};
   // Reconcile and validate everything before the explicit Pin action can write a new goal.
   const outcome=await saveSolutionCandidate(request,request.catalog,item,desired,p.evidence,acknowledge);
   requireCurrent();if(key!==liveKey.current||initialEpoch!==epoch.current||!equal(request.catalog,catalog()))throw Error('The conversation changed while reviewing Save. Try again against the current context.');
   if(outcome.status!=='ready')throw Error('The proposal needs further review.');
   let result=outcome;
   if(!p.conversation.activeGoalId){const newId=p.conversation.confirmWorkforceGoal(desired.statement);const updated=structuredClone(outcome.catalog);updated.goalId=newId;updated.plans.forEach(plan=>{plan.draft.binding.goalId=newId;});
    // Binding-derived totals are rebuilt for the final immutable identity.
    updated.plans.forEach(plan=>{plan.result=reconcileBundle(plan.draft);});result={...outcome,catalog:updated,plan:updated.plans.at(-1)!};
   }
   const snapshot=decisionStore.getSnapshot(),id=result.catalog.goalId;
   decisionStore.commitGoalFields(id,result.catalog.goal,snapshot.data.revision,new Date().toISOString(),()=>({[planAlternativesField]:packPlanAlternatives(result.catalog) as unknown as Json,[solutionConversationField]:memoryRef.current as unknown as Json,[alternativeViewField]:{version:1,selectedId:result.plan.id,collapsed:false}}));
   setNotice(`${result.reused?'Already saved':'Saved'} as Action Plan #${result.plan.number}.`);
  }catch(error){setNotice(error instanceof Error?error.message:'The proposal could not be saved.');}finally{setSaving(false);}
 }
 function reject(item:SolutionEvaluation){try{requireCurrent();const state=structuredClone(memoryRef.current),turnId=crypto.randomUUID();state.turns=[...state.turns,{id:turnId,role:'user' as const,text:`Discard proposal ${item.candidate.name}, revision ${item.revision}.`}].slice(-32);state.rejected=[...state.rejected,{candidateId:item.id,revision:item.revision,reason:'Discarded using the proposal review control.',turnId}].slice(-24);if(state.focusCandidateId===item.id)state.focusCandidateId=null;persist(state);}catch(error){setNotice((error as Error).message);}}
 const raw=storage.data.workspaces[goal.id]?.fields[planAlternativesField],saved=raw?readPlanAlternatives(raw,{goalId:goal.id,goal:goal.statement}):null;
 return {state:memory,pending,saving,notice,send,cancel,save,reject,saved,canSend:props.enabled&&props.active&&props.settled&&props.conversation.storageReady&&props.conversation.saved&&!props.conversation.issueEditor};
}
