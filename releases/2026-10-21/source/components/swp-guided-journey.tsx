'use client';
import {createPortal} from 'react-dom';
import {clearScenarioChat,scenarioChatField,scenarioChatReceipt,readScenarioChatReceipt,staffingAssumptions} from '@/lib/scenario-chat-continuity';
import type {Json} from '@/lib/local-decisions';
import {scenarioRecommendationIntent,offersCapacityExample,scenarioComparisonIntent,scenarioQuestionMismatch,scenarioAssumptionText,compareScenarioForChat} from '@/lib/scenario-planning-parity';
import {applicablePlanComponents} from '@/lib/guided-plan-summary';
import {GuidedPlanSummary} from '@/components/guided-plan-summary';
import {GuidedCapacitySteps} from './guided-capacity-steps';
import {SimpleSwpDemo} from './simple-swp-demo';
import {WorkforceDemoDialog} from './workforce-demo-dialog';
import {GuidedWorkloadSummary} from '@/components/guided-workload-summary';
import {guidedOptionEffort} from '@/lib/swp-demo';
import {guidedWorkloadResult} from '@/lib/guided-workload';

import {useEffect,useEffectEvent,useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {decisionStore,useDecisionStorage} from './decision-store';
import type {ProblemConversation} from './problem-conversation';
import {createSwpDemo,compareSwpDemo,prepareSwpSelection,readSwpSaveReview,swpDemoField,swpDemoPrompt,swpEnd,swpMetric,createServiceStaffingDemo,serviceOptionEffort,swpDemandBridgeField,validateDemandBridge,type SwpDemandBridge} from '@/lib/swp-demo';
import {bundleInputKey,type BundleDraft} from '@/lib/home-bundle-reconciliation';
import {previewBundleChatEdit,acceptBundleChatEdit,bundleChatEditIntent,type BundleEditPreview} from '@/lib/home-bundle-chat-edit';
import {SWP_CONVERSATION_MODE} from '@/lib/swp-conversation-model';
import {SwpDemandJourney,type DemandIntakeControl,type ReviewedDemand} from './swp-demand-journey';
import {serviceStaffingBundle} from '@/lib/home-demo-catalog';
import type {DemandReview} from '@/lib/swp-demand';
import {SwpOutcomeChart} from './swp-outcome-chart';
import {goalProgressField} from '@/lib/goal-progress';
import {readProgressSnapshot,readProgressLinkedPlan} from '@/lib/goal-progress-summary';
import {GoalProgressSummary} from './goal-progress-summary';
import {planAlternativesField,readPlanAlternatives} from '@/lib/home-plan-alternatives';
import type {AppPage} from '@/lib/types';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
const money=(v:number|null|undefined)=>v==null?'Unknown':`$${v.toLocaleString('en-US')} USD`;
type Comparison=Awaited<ReturnType<typeof compareSwpDemo>>;
type Selection=Awaited<ReturnType<typeof prepareSwpSelection>>;
/** A saved receipt describes a version, not every later edit to its working draft. */
export function savedStaffingDraftChanged(draft:BundleDraft|null,saved:{draft:BundleDraft;candidateId:string},selection:string|null,pendingEdit:boolean){
 return !!draft&&draft.binding.goalId===saved.draft.binding.goalId&&(pendingEdit||bundleInputKey(draft)!==bundleInputKey(saved.draft)||selection!==null&&selection!==saved.candidateId);
}
type Source={id:string;label:string;status:string;scope:string;date:string|null;limitation:string;facts?:unknown};
const effortText=(option:Comparison['options'][number],bridge:SwpDemandBridge)=>{const e=serviceOptionEffort(option,bridge),n=(v:number|null)=>v===null?'unknown':v.toLocaleString('en-US',{maximumFractionDigits:2});return `Period capacity: ${n(e.totalHours)} of ${n(bridge.review.result.workloadHours)} hours; uncovered work: ${n(e.shortfallHours)} hours.`;};
type Props={normalWorkspace?:{open:boolean;active:boolean;target:HTMLElement|null;entryRequestId:string|null;onOpen:()=>void;onClose:()=>void};wholeAppDemo?:{session:string;target:HTMLElement|null;onSaved:()=>void};onGeneralQuestion?:(text:string)=>void;scenarioTarget?:HTMLElement|null;onScenarioChatChange?:(visible:boolean)=>void;onDemoStateChange?:(visible:boolean)=>void;conversation:ProblemConversation;active:boolean;busy:boolean;commandRef:RefObject<((text:string)=>Promise<string|null>)|null>;modelContextRef:RefObject<unknown>;demandControlRef:RefObject<DemandIntakeControl|null>;demandReviewRef:RefObject<((review:DemandReview)=>void)|null>;demandContextRef:RefObject<unknown>;sources:Source[];discussionKey?:string;onNavigate:(page:AppPage)=>void};
export function SwpGuidedJourney({normalWorkspace,wholeAppDemo,onGeneralQuestion,scenarioTarget,onScenarioChatChange,onDemoStateChange,conversation,active,busy,commandRef,modelContextRef,demandControlRef,demandReviewRef,demandContextRef,sources,onNavigate,discussionKey=''}:Props){
 const storage=useDecisionStorage(),[draft,setDraft]=useState<BundleDraft|null>(null),[draftDataset,setDraftDataset]=useState<string|null>(null),[comparison,setComparison]=useState<Comparison|null>(null),[edit,setEdit]=useState<BundleEditPreview|null>(null),[selection,setSelection]=useState<string|null>(null),[review,setReview]=useState<Selection|null>(null),[pending,setPending]=useState(false),[notice,setNotice]=useState('');
 const [showOptions,setShowOptions]=useState(false),[chatScenario,setChatScenario]=useState(false);
 const [demoOpen,setDemoOpen]=useState(false),[restartRequested,setRestartRequested]=useState(false);
 const [guided,setGuided]=useState(false);
 const [savedConfirmation,setSavedConfirmation]=useState<{goalId:string;planId:string;datasetToken:string;resetEpoch:number}|null>(null);
 const [inputReview,setInputReview]=useState<{question:string;identity:string}|null>(null);
 const suspended=useRef(false);
 const [isSuspended,setIsSuspended]=useState(false);
 function setSuspended(value:boolean){suspended.current=value;setIsSuspended(value);}
 const [parkedOrigin,setParkedOrigin]=useState<{goalId:string;datasetToken:string;discussionKey:string;savedSignature:string}|null>(null);
 const [demandBridge,setDemandBridge]=useState<SwpDemandBridge|null>(null),[demandStale,setDemandStale]=useState(false);
 const ownedIsolation=useRef<string|null>(null),endIsolation=useRef(conversation.endGuidedExploration),resetSeen=useRef(conversation.resetEpoch);
 const opening=useRef(false),generation=useRef(0),abort=useRef<AbortController|null>(null),mounted=useRef(true),live=useRef({draft,active,busy,goalId:conversation.activeGoalId,resetEpoch:conversation.resetEpoch}),token=decisionStore.getDatasetToken();
 useLayoutEffect(()=>{endIsolation.current=conversation.endGuidedExploration;live.current={draft,active,busy,goalId:conversation.activeGoalId,resetEpoch:conversation.resetEpoch};});
 useEffect(()=>{const lifecycle=generation;mounted.current=true;return()=>{lifecycle.current++;if(ownedIsolation.current){endIsolation.current();ownedIsolation.current=null;}mounted.current=false;abort.current?.abort();commandRef.current=null;modelContextRef.current=null;};},[commandRef,modelContextRef]);
 const restored=useRef(''),draftOwner=useRef(''),draftDiscussion=useRef(discussionKey),draftSavedSignature=useRef('null'),chatOwner=useRef<string|null>(null),chatReceipt=useRef<unknown>(null);
 const ownerFields=conversation.activeGoalId?storage.data.workspaces[conversation.activeGoalId]?.fields:storage.data.exploration?.fields;
 const savedSignature=JSON.stringify(ownerFields?.[swpDemoField]??null);
 const receiptSignature=JSON.stringify(ownerFields?.[scenarioChatField]??null);
 const parkedOriginMatches=!!parkedOrigin&&parkedOrigin.goalId===conversation.activeGoalId&&parkedOrigin.datasetToken===token&&parkedOrigin.discussionKey===discussionKey&&parkedOrigin.savedSignature===savedSignature;
 const continuityContext={datasetToken:token,ownerGoalId:conversation.activeGoalId,discussionKey,savedSignature};
 function keepChat(next:BundleDraft,choice:string|null){
  const state=decisionStore.getSnapshot(),receipt=scenarioChatReceipt(next,continuityContext,choice),patch=()=>({[scenarioChatField]:receipt as unknown as Json});
  if(conversation.activeGoalId)decisionStore.commitGoalFields(conversation.activeGoalId,conversation.focusedIssue,state.data.revision,new Date().toISOString(),patch);else decisionStore.commitExplorationFields(state.data.revision,new Date().toISOString(),patch);
  chatOwner.current=conversation.activeGoalId;chatReceipt.current=receipt;restored.current=JSON.stringify([token,conversation.activeGoalId,conversation.focusedIssue,discussionKey,savedSignature,JSON.stringify(receipt)]);
 }
 function forgetChat(){if(chatOwner.current!==null)clearScenarioChat(decisionStore,chatOwner.current,chatReceipt.current);chatOwner.current=null;chatReceipt.current=null;modelContextRef.current=null;}
 function acceptDraft(next:BundleDraft){if(chatScenario&&!demandBridge)keepChat(next,null);setDraft(next);}
 function selectOption(id:string){try{if(chatScenario&&!demandBridge&&draft)keepChat(draft,id);setSelection(id);clearReview();}catch(e){setNotice((e as Error).message);}}
 const restore=useEffectEvent(()=>{
  if(!storage.ready)return;
  if(suspended.current&&draft&&draftDataset===token&&draftDiscussion.current===discussionKey&&parkedOriginMatches)return;
  if(opening.current&&ownedIsolation.current&&draftDiscussion.current===discussionKey)return;
  if((suspended.current||ownedIsolation.current)&&draftDataset===token&&draftOwner.current===conversation.activeGoalId&&draftDiscussion.current===discussionKey&&draftSavedSignature.current===savedSignature)return;
  const id=conversation.activeGoalId;const identity=JSON.stringify([token,id,conversation.focusedIssue,discussionKey,savedSignature,receiptSignature]);if(restored.current===identity)return;restored.current=identity;
  setGuided(false);generation.current++;abort.current?.abort();setPending(false);setReview(null);setEdit(null);setComparison(null);setSelection(null);setChatScenario(false);setDemoOpen(false);setSuspended(false);draftOwner.current=id;draftDiscussion.current=discussionKey;draftSavedSignature.current=savedSignature;chatOwner.current=null;
  if(ownedIsolation.current&&id&&id!==ownedIsolation.current){endIsolation.current();ownedIsolation.current=null;}
  const continued=readScenarioChatReceipt(ownerFields?.[scenarioChatField],continuityContext);
  if(continued&&(!id||continued.draft.binding.goal===conversation.focusedIssue)){setDraft(continued.draft);setDraftDataset(token);setSelection(continued.selectedCandidateId);setChatScenario(true);setShowOptions(true);setDemandBridge(null);setDemandStale(false);chatOwner.current=id;chatReceipt.current=continued;return;}
  const saved=readSwpSaveReview(storage.data.workspaces[id]?.fields[swpDemoField]);
  if(saved&&saved.datasetToken===token&&saved.draft.binding.goal===conversation.focusedIssue){const b=storage.data.workspaces[id]?.fields[swpDemandBridgeField] as unknown as SwpDemandBridge|undefined;try{if(!b&&saved.draft.bundle.name===serviceStaffingBundle().name)throw Error('Saved operational bridge is missing.');if(b)validateDemandBridge(saved.draft,b,token);setDemandBridge(b??null);setDemandStale(false);}catch{setDemandBridge(null);setDemandStale(true);}setDraft(saved.draft);setDraftDataset(saved.datasetToken);setNotice('Saved proposal restored. Compare its exact assumptions again to review alternatives.');}
  else{if(ownedIsolation.current){endIsolation.current();ownedIsolation.current=null;}setDraft(null);setNotice('Earlier saved plans are kept. Select their exact goal to continue.');}
 });
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Select the existing goal's local draft without committing a view change.
 useEffect(()=>{restore();},[conversation.activeGoalId,conversation.focusedIssue,token,discussionKey,savedSignature,receiptSignature,storage.ready]);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Navigation cancels the currently owned calculation and closes its review.
 useEffect(()=>{if(!active){generation.current++;abort.current?.abort();if(ownedIsolation.current&&(opening.current||normalWorkspace?.open)){setSuspended(true);endIsolation.current();ownedIsolation.current=null;}opening.current=false;setPending(false);setReview(null);}},[active,normalWorkspace?.open]);
 function exit(clearReceipt=true){setGuided(false);if(clearReceipt)forgetChat();else{chatOwner.current=null;modelContextRef.current=null;}setChatScenario(false);setSuspended(false);setDemoOpen(false);setRestartRequested(false);setShowOptions(false);demandControlRef.current?.close();setDemandBridge(null);setDemandStale(false);generation.current++;opening.current=false;abort.current?.abort();if(ownedIsolation.current){endIsolation.current();ownedIsolation.current=null;}const goals=decisionStore.getSnapshot().data.goals;restored.current=JSON.stringify([decisionStore.getDatasetToken(),goals.activeId,goals.goals.find(g=>g.id===goals.activeId)?.statement??'',discussionKey,JSON.stringify((goals.activeId?decisionStore.getSnapshot().data.workspaces[goals.activeId]?.fields:decisionStore.getSnapshot().data.exploration?.fields)?.[swpDemoField]??null),JSON.stringify((goals.activeId?decisionStore.getSnapshot().data.workspaces[goals.activeId]?.fields:decisionStore.getSnapshot().data.exploration?.fields)?.[scenarioChatField]??null)]);setDraft(null);setComparison(null);setEdit(null);setReview(null);setSelection(null);setPending(false);setNotice('Example closed. Earlier goals and plans are kept.');}
 const handleReset=useEffectEvent(()=>{if(resetSeen.current!==conversation.resetEpoch){resetSeen.current=conversation.resetEpoch;exit(false);}});
 useEffect(()=>{handleReset();},[conversation.resetEpoch]);
 const draftKey=draft?bundleInputKey(draft):'',matches=!!draft&&(ownedIsolation.current===draft.binding.goalId||isSuspended&&parkedOriginMatches||conversation.activeGoalId===draftOwner.current&&(!conversation.activeGoalId||conversation.activeGoalId===draft.binding.goalId&&conversation.focusedIssue===draft.binding.goal))&&token===draftDataset&&draftDiscussion.current===discussionKey&&(draftSavedSignature.current===savedSignature||isSuspended&&parkedOriginMatches);
 const entryIdentity=JSON.stringify([token,conversation.activeGoalId,conversation.focusedIssue,conversation.resetEpoch,active,discussionKey]);
 const previousEntryIdentity=useRef(entryIdentity);
 // Retire a pending user review permanently when its originating context changes.
 useLayoutEffect(()=>{if(previousEntryIdentity.current!==entryIdentity){previousEntryIdentity.current=entryIdentity;setInputReview(current=>current?.identity===entryIdentity?current:null);}},[entryIdentity]);
 const reviewingInputs=inputReview?.identity===entryIdentity;
 const currentComparison=comparison?.inputKey===draftKey&&!edit&&!demandStale?comparison:null;
 const saved=readSwpSaveReview(storage.data.workspaces[conversation.activeGoalId]?.fields[swpDemoField]);
 const exactSaved=!!saved&&!!draft&&bundleInputKey(saved.draft)===draftKey&&saved.candidateId===selection;
 function clearReview(){setReview(null);setNotice('');}
 async function handle(text:string,acceptedExample=false):Promise<string|null>{
  // Reopening a normal workspace never replaces a valid edited draft with defaults.
  if(normalWorkspace&&!wholeAppDemo&&!acceptedExample&&!busy&&!pending&&storage.saved&&offersCapacityExample(text)&&draft&&matches&&!demandBridge){
   const mismatch=scenarioQuestionMismatch(text,draft);if(mismatch){setComparison(null);setSelection(null);setShowOptions(false);clearReview();}
   setGuided(false);setNotice(mismatch??'Your current scenario and edited assumptions are kept. Review them before comparing again.');resumeDemo();
   return mismatch??'Your current staffing scenario is open in Scenarios. Its edited assumptions are kept.';
  }
  // An explicit supported Home request can reopen a parked Scenarios controller.
  if(!active&&normalWorkspace&&!wholeAppDemo&&!busy&&!pending&&storage.saved&&!acceptedExample&&offersCapacityExample(text)){
   setGuided(false);setInputReview({question:text,identity:JSON.stringify([token,conversation.activeGoalId,conversation.focusedIssue,conversation.resetEpoch,true,discussionKey])});normalWorkspace.onOpen();
   return 'Review the example inputs in Scenarios, or enter your own role, workload and timing.';
  }
  if(!active||busy||pending||!storage.saved)return text===swpDemoPrompt?'':null;
  if(!acceptedExample&&!(chatScenario&&matches&&draft)&&(text===swpDemoPrompt||offersCapacityExample(text))){
   setGuided(text===swpDemoPrompt);if(text!==swpDemoPrompt&&!wholeAppDemo)normalWorkspace?.onOpen();
   setInputReview({question:text===swpDemoPrompt?'How would you close a 5 FTE capacity gap with a $325,000 USD budget?':text,identity:entryIdentity});
   return text===swpDemoPrompt?'':'Review the example inputs to see a staffing recommendation, or enter your own role, workload and timing.';
  }
  if(text===swpDemoPrompt){
   if(draft&&matches&&!demandBridge&&!acceptedExample){resumeDemo();return '';}
   setDemoOpen(true);setRestartRequested(false);
   setShowOptions(false);
   demandControlRef.current?.close();setDemandBridge(null);setDemandStale(false);forgetChat();draftOwner.current='';draftDiscussion.current=discussionKey;draftSavedSignature.current='null';
   if(!ownedIsolation.current)setParkedOrigin({goalId:conversation.activeGoalId,datasetToken:token,discussionKey,savedSignature});
   const id='guided-swp-'+crypto.randomUUID(),job=++generation.current,reset=conversation.resetEpoch;conversation.beginGuidedExploration(id);ownedIsolation.current=id;opening.current=true;setPending(true);
   const current=()=>mounted.current&&live.current.active&&generation.current===job&&ownedIsolation.current===id&&live.current.resetEpoch===reset&&decisionStore.getDatasetToken()===token&&!decisionStore.getSnapshot().data.goals.activeId;
   try{const next=await createSwpDemo(id,new Date().toISOString());if(!current())return '';setDraft(next);setDraftDataset(token);setComparison(null);setEdit(null);setSelection(null);setReview(null);setNotice('');
    return '';
   }catch(error){if(!current())return '';exit();throw error;}finally{if(generation.current===job){opening.current=false;setPending(false);}}
  }
  if(chatScenario&&matches&&draft&&!demandBridge){
   if(edit)return 'Review or cancel the pending scenario edits beside the chat before requesting another result. Saved plans are unchanged.';
   if(scenarioComparisonIntent(text)||scenarioRecommendationIntent(text)){const mismatch=scenarioQuestionMismatch(text,draft);if(mismatch){setComparison(null);setSelection(null);clearReview();setShowOptions(false);return mismatch;}const result=await calculate();return result&&'answer' in result&&typeof result.answer==='string'?result.answer:'The scenario changed before calculation completed. Review the current inputs and compare again.';}
   if(!bundleChatEditIntent(text).edit)return null; // Keep ordinary discussion bound to this scenario.
  }
  if(!matches||!draft||(!demandBridge&&!demoOpen&&!chatScenario)||demandContextRef.current||!bundleChatEditIntent(text).edit)return null;
  clearReview();try{const preview=previewBundleChatEdit(draft,text);setEdit(preview);return 'Review the proposed assumption changes below. Existing results are stale until you accept the draft changes and compare again; saved plans stay unchanged.';}
  catch(error){setEdit(null);return `${(error as Error).message} The draft and saved plans are kept. Use a displayed assumption name, or discuss an unsupported choice without treating it as calculated.`;}
 }
 useLayoutEffect(()=>{commandRef.current=handle;modelContextRef.current=active&&(demandBridge||demoOpen||chatScenario)&&draft&&matches&&!demandStale?{conversationMode:SWP_CONVERSATION_MODE,goalId:draft.binding.goalId,classification:'fictional-scenario',acceptedOperationalReview:demandBridge?{spec:demandBridge.review.spec,result:demandBridge.review.result,reviewedAt:demandBridge.reviewedAt,acceptance:'Scenario use only; original provenance retained.'}:null,datasetToken:token,revision:draft.revision,...(chatScenario?{draft:structuredClone(draft),inputKey:draftKey}:{}),selectedCandidateId:currentComparison?.options.some(o=>o.id===selection)?selection:null,selectedSavedPlanId:saved?.selectedPlanId??null,goal:draft.binding.goal,objective:draft.inputs.scope.requirements,scope:draft.inputs.scope,budget:draft.inputs.budget,reviewState:edit?'pending-edits':currentComparison?'calculated-unsaved':'not-calculated',options:currentComparison?.options.map(o=>({id:o.id,label:o.label,mix:o.candidate.mix,wholePeriodEffort:demandBridge?serviceOptionEffort(o,demandBridge):null,conditionalCoverage:o.coverage,fullCoverageDate:o.candidate.metrics?.fullCoverageDate??null,incrementalCash:o.candidate.cash.complete,staffHours:o.candidate.effort?.totalHours??null,addedCompanyEmployees:o.candidate.metrics?.addedEmployees??null,status:o.candidate.status}))??[],limitations:[staffingAssumptions(draft),'End-date staffing and cash limits do not prove whole-period effort coverage; review any separately calculated shortfall.','Additional-role demand is a reviewed assumption, not inferred from growth.','Skill coverage does not establish available staff or causal uplift.','Contract and automate are discussion-only here; no calculated benefit.','Changing staffing inputs requires the displayed local assumption review and recalculation.']} : null;});
 function closeDemo(){forgetChat();setChatScenario(false);
  setSuspended(true);generation.current++;abort.current?.abort();setPending(false);setDemoOpen(false);
  if(ownedIsolation.current){conversation.endGuidedExploration();ownedIsolation.current=null;}
 }
 function resumeDemo(){setChatScenario(false);
  if(normalWorkspace&&!wholeAppDemo&&!normalWorkspace.active){setDemoOpen(true);normalWorkspace.onOpen();return;}
  if(!draft||draftDataset!==token||busy||pending||!active||!storage.saved)return;
  try{if(conversation.activeGoalId!==draft.binding.goalId){conversation.beginGuidedExploration(draft.binding.goalId);ownedIsolation.current=draft.binding.goalId;}}
  catch(error){setNotice((error as Error).message);return;}
  setSuspended(false);setDemoOpen(true);setRestartRequested(false);setReview(null);
 }
 async function restartDemo(){
  if(busy||pending||!active||!storage.saved)return;
  if(!ownedIsolation.current)setParkedOrigin({goalId:conversation.activeGoalId,datasetToken:token,discussionKey,savedSignature});
  const epoch=++generation.current,currentToken=token;abort.current?.abort();setPending(true);
  try{const id='guided-swp-'+crypto.randomUUID(),next=await createSwpDemo(id,new Date().toISOString());
   if(!mounted.current||generation.current!==epoch||decisionStore.getDatasetToken()!==currentToken)return;
   if(ownedIsolation.current)conversation.endGuidedExploration();
   forgetChat();draftOwner.current='';draftDiscussion.current=discussionKey;draftSavedSignature.current='null';ownedIsolation.current=null;conversation.beginGuidedExploration(id);ownedIsolation.current=id;setSuspended(false);
   setDraft(next);setDraftDataset(currentToken);setComparison(null);setEdit(null);setSelection(null);setReview(null);setShowOptions(false);setRestartRequested(false);setDemoOpen(true);setNotice('New fictional example. Saved plans are kept.');
  }catch(error){setNotice((error as Error).message);}finally{if(generation.current===epoch)setPending(false);}
 }
 async function calculate(){
  setShowOptions(true);
  if(!draft||!matches||busy||pending||edit||demandStale||!active)return;abort.current?.abort();const job=new AbortController();abort.current=job;const key=draftKey,goalId=conversation.activeGoalId,dataset=token;setPending(true);clearReview();setComparison(null);
  try{const result=draft.inputs.guidedWorkload?await compareScenarioForChat(draft,job.signal):await compareSwpDemo(draft,job.signal);if(job.signal.aborted||!mounted.current||!live.current.active||live.current.goalId!==goalId||!live.current.draft||bundleInputKey(live.current.draft)!==key||decisionStore.getDatasetToken()!==dataset)return;setComparison(result);setSelection(prior=>result.options.some(o=>o.id===prior)?prior:null);return result;}
  catch(error){if(!job.signal.aborted)setNotice((error as Error).message);}finally{if(abort.current===job){abort.current=null;setPending(false);}}
 }
 async function prepare(){
  if(!draft||!currentComparison||!selection||pending||busy)return;const key=draftKey,id=selection,job=new AbortController();abort.current=job;setPending(true);clearReview();
  try{const prepared=await prepareSwpSelection(decisionStore,draft,currentComparison.evaluation,id,new Date().toISOString(),()=>mounted.current&&live.current.active&&!live.current.busy&&!!live.current.draft&&bundleInputKey(live.current.draft)===key,job.signal,demandBridge??undefined);if(!job.signal.aborted)setReview(prepared);}
  catch(error){if(!job.signal.aborted)setNotice((error as Error).message);}finally{if(abort.current===job){abort.current=null;setPending(false);}}
 }
 function save(){
  if(!review||review.alreadySaved||!review.fields||!matches||pending||busy||!active)return;
  try{conversation.selectProposalGoal(review.goal,review.revision,{...review.fields,[scenarioChatField]:null});chatOwner.current=null;modelContextRef.current=null;setChatScenario(false);conversation.endGuidedExploration(true);ownedIsolation.current=null;setReview(null);setNotice('Action Plan and goal saved together.');const committed=readSwpSaveReview(decisionStore.getSnapshot().data.workspaces[review.goal.id]?.fields[swpDemoField]);if(!wholeAppDemo&&committed&&committed.datasetToken===token)setSavedConfirmation({goalId:review.goal.id,planId:committed.selectedPlanId,datasetToken:token,resetEpoch:conversation.resetEpoch});if(decisionStore.getSnapshot().data.goals.activeId===review.goal.id)wholeAppDemo?.onSaved();}
  catch(error){setNotice((error as Error).message);setReview(null);}
 }
 function invalidateDemand(){setDemandStale(true);setComparison(null);setSelection(null);setReview(null);}
 async function useDemand(value:ReviewedDemand){
  setGuided(false);
  if(busy||pending||!active||!storage.saved)throw Error('Finish the current request before reviewing this scenario.');
  const bridge:SwpDemandBridge={...value,staffingReviewedAt:new Date().toISOString()},id=draft&&demandBridge?draft.binding.goalId:'guided-swp-'+crypto.randomUUID(),job=++generation.current,expectedGoal=conversation.activeGoalId,expectedToken=token;
  const controller=new AbortController();abort.current=controller;setPending(true);try{const next=await createServiceStaffingDemo(id,bridge,bridge.staffingReviewedAt,draft&&demandBridge?{draft,bridge:demandBridge}:undefined),result=await compareSwpDemo(next,controller.signal);
   if(controller.signal.aborted||!mounted.current||!live.current.active||generation.current!==job||live.current.goalId!==expectedGoal||decisionStore.getDatasetToken()!==expectedToken)throw Error('The decision changed. Review the assumptions again.');
   if(conversation.activeGoalId&&conversation.activeGoalId!==id)throw Error('Start a new conversation before creating a separate business goal; the reviewed calculation is retained.');
   forgetChat();draftOwner.current=conversation.activeGoalId;draftDiscussion.current=discussionKey;draftSavedSignature.current=savedSignature;setDraft(next);setDraftDataset(token);setDemandBridge(bridge);setDemandStale(false);setComparison(result);setSelection(null);setReview(null);setEdit(null);setNotice('Staffing options are ready. Compare cost, readiness and uncovered work.');
  }finally{if(abort.current===controller){abort.current=null;setPending(false);}}
 }
 const hasEdit=!!edit;
 const autoCompare=useEffectEvent(()=>{if((demandBridge||demoOpen||chatScenario)&&showOptions&&draft?.inputs.guidedWorkload&&matches&&active&&!edit&&!comparison&&!pending&&!busy)void calculate();});
 useEffect(()=>{autoCompare();},[draftKey,matches,active,hasEdit]);
 useEffect(()=>{onDemoStateChange?.(false);},[onDemoStateChange]);
 useEffect(()=>{onScenarioChatChange?.(chatScenario&&active&&matches);},[chatScenario,active,matches,onScenarioChatChange]);
 function continueScenario(){
  if(!draft||!matches||busy||pending||edit||demandStale||!active)return;
  try{if(!demandBridge)keepChat(draft,selection);}catch(e){setNotice((e as Error).message);return;}
  conversation.continueGuidedConversation();ownedIsolation.current=null;draftOwner.current=conversation.activeGoalId;draftDiscussion.current=discussionKey;draftSavedSignature.current=savedSignature;
  setDemoOpen(false);setChatScenario(true);setSuspended(false);
  conversation.setMessages(current=>[...current,{role:'user',content:'Continue this scenario with its disclosed fictional assumptions.'},{role:'assistant',content:scenarioAssumptionText(draft)+' Ask “Compare staffing options”, or propose an edit such as “Set budget to 100000”. Continuing does not save new changes. Any earlier saved plans are kept.'}]);
  normalWorkspace?.onClose();onNavigate('home');requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('#overview-question')?.focus());
 }
 const tourSession=useRef<string|null>(null);
 const syncWholeAppDemo=useEffectEvent(()=>{
  if(!wholeAppDemo){if(tourSession.current){tourSession.current=null;setGuided(false);setInputReview(null);closeDemo();}return;}
  if(tourSession.current===wholeAppDemo.session||!wholeAppDemo.target||!active||busy||pending||!storage.ready||!storage.saved)return;
  tourSession.current=wholeAppDemo.session;
  void handle(swpDemoPrompt).catch(error=>setNotice((error as Error).message));
 });
 useEffect(()=>{syncWholeAppDemo();},[wholeAppDemo?.session,wholeAppDemo?.target,active,busy,pending,storage.ready,storage.saved]);
 const normalEntrySeen=useRef<string|null>(null);
 const syncNormalWorkspace=useEffectEvent(()=>{
  if(!normalWorkspace?.active||wholeAppDemo||!active||busy||pending||!storage.ready||!storage.saved)return;
  const request=normalWorkspace.entryRequestId;
  if(request&&normalEntrySeen.current!==request){normalEntrySeen.current=request;setGuided(false);if(draft&&matches&&!demandBridge&&!reviewingInputs){resumeDemo();return;}if(!reviewingInputs)void handle('How would you close a 5 FTE capacity gap with a $325,000 USD budget?').catch(error=>setNotice((error as Error).message));}
  else if(demoOpen&&draft&&matches&&!reviewingInputs&&!chatScenario&&!ownedIsolation.current&&conversation.activeGoalId!==draft.binding.goalId)resumeDemo();
 });
 // Synchronize an explicit external workspace entry with this single persistent controller; the effect event guards duplicate entries and preserves drafts.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{syncNormalWorkspace();},[normalWorkspace?.active,normalWorkspace?.entryRequestId,active,busy,pending,storage.ready,storage.saved]);
 const normalHosted=!!normalWorkspace?.active&&!wholeAppDemo;
 function leaveNormalWorkspace(){setInputReview(null);closeDemo();normalWorkspace?.onClose();}
 function normalPortal(body:React.ReactNode){return normalWorkspace?.target?createPortal(<div data-normal-staffing-plan className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Staffing planner</h2><button className={button} onClick={leaveNormalWorkspace}>Return to scenario tools</button></div>{body}</div>,normalWorkspace.target):null;}
 const selected=currentComparison?.options.find(o=>o.id===selection);
 const checkpoints=selected?applicablePlanComponents(selected.draft).map(c=>({...c,date:selected.draft.inputs.timing.find(t=>t.componentId===c.id)?.finish.value??null})).sort((a,b)=>(a.date??'9999').localeCompare(b.date??'9999')):[];
 const fields=storage.data.workspaces[conversation.activeGoalId]?.fields;
 const catalog=fields&&readPlanAlternatives(fields[planAlternativesField],{goalId:conversation.activeGoalId,goal:conversation.focusedIssue});
 let progress:ReturnType<typeof readProgressSnapshot>|null=null;
 try{if(fields?.[goalProgressField]&&saved)progress=readProgressSnapshot(fields[goalProgressField],conversation.activeGoalId,new Date().toISOString().slice(0,10));}catch{/* Retain malformed saved bytes without displaying invented progress. */}
 function submitExamplePrompt(){if(!reviewingInputs||!active||busy||pending||!storage.saved)return;setInputReview(null);void handle(swpDemoPrompt,true).catch(e=>setNotice((e as Error).message));}
 // Keep restoration and explicit legacy chat commands mounted without a second starting panel.
 if(reviewingInputs){const inputs=<section className="space-y-4 p-4" aria-label="Review planning assumptions">{(wholeAppDemo||normalHosted)&&<><p className="text-sm font-semibold" role="status">{wholeAppDemo?"Step 1 of 4: Submit the prefilled prompt":"Step 1 of 4: Review planning assumptions"}</p><progress aria-label="Guided demo progress" max={4} value={1} className="h-2 w-full accent-primary"/></>}<h3 className="text-2xl font-semibold">{inputReview.question}</h3><p className="text-sm font-medium">Service Operations / Service Analyst</p><dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-sm"><div><dt>Capacity needed</dt><dd className="font-semibold">8 FTE</dd></div><div><dt>Qualified capacity</dt><dd className="font-semibold">3 FTE</dd></div><div><dt>Incremental budget</dt><dd className="font-semibold">$325,000 USD</dd></div><div><dt>Period</dt><dd className="font-semibold">12-month example; exact dates shown in planner</dd></div></dl><p>{guided?"Follow the required actions in order: press Enter to submit the prefilled prompt, compare staffing options, select a feasible option, then review and save. These fictional inputs stay fixed during the guide. Exit at any time to plan freely.":"Use these editable assumptions to compare developing, moving and hiring people, or enter your own inputs."}</p>{guided&&<label className="block text-sm font-medium">Required demo prompt<textarea readOnly aria-readonly="true" autoFocus={!!wholeAppDemo} onKeyDown={event=>{if(wholeAppDemo&&event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();submitExamplePrompt();}}} value={inputReview.question} className="mt-2 min-h-24 w-full rounded border bg-muted p-3"/></label>}{wholeAppDemo&&<p className="text-sm font-medium">Press Enter in the prompt above to send it. On a touch screen, tap the Enter key below.</p>}<div className="flex flex-wrap gap-3"><button className={button} disabled={busy||pending||!storage.saved} onClick={submitExamplePrompt}>{wholeAppDemo?"Enter ↵":guided?"Submit demo prompt":"Use example assumptions"}</button>{!guided&&<button className={button} disabled={busy||pending} onClick={()=>{setInputReview(null);normalWorkspace?.onClose();onNavigate('home');conversation.setInput(current=>current.trim()?current:'For my staffing gap, the role is [role], period is [start–end], required readiness is [date], budget is [amount and currency], and available internal capacity is [details or unknown].');requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('#overview-question')?.focus());}}>Enter my own planning inputs</button>}</div></section>;return wholeAppDemo?.target?createPortal(<div data-whole-app-demo-plan>{inputs}</div>,wholeAppDemo.target):normalHosted?normalPortal(inputs):normalWorkspace?null:<WorkforceDemoDialog open={active} onClose={()=>setInputReview(null)} step={guided?"1 of 4. Submit the fixed demo prompt":"1 of 4. Review shared planning inputs"} gapFte={5}>{inputs}</WorkforceDemoDialog>;}

 const committedConfirmation=savedConfirmation&&savedConfirmation.datasetToken===token&&savedConfirmation.resetEpoch===conversation.resetEpoch&&savedConfirmation.goalId===conversation.activeGoalId?readSwpSaveReview(storage.data.workspaces[savedConfirmation.goalId]?.fields[swpDemoField]):null;
 const unsavedDraftChanges=!!committedConfirmation&&savedStaffingDraftChanged(draft,committedConfirmation,selection,!!edit);
 const savedContinuation=!wholeAppDemo&&(normalHosted||!demoOpen)&&!!committedConfirmation&&!!savedConfirmation&&committedConfirmation.selectedPlanId===savedConfirmation.planId&&committedConfirmation?.datasetToken===token?<section aria-label="Saved staffing plan" className="space-y-3 rounded-xl border bg-card p-4"><h3 className="font-semibold" role="status">Last saved staffing plan and goal are available in this browser</h3>{unsavedDraftChanges&&<p role="status" className="text-sm font-semibold">Your current draft has unsaved changes. They are not included in this saved version.</p>}<p className="text-sm">This saved version is a proposed plan, not completed staffing work. Open the saved Action Plan, then review its target and checkpoints in Track.</p><div className="flex flex-wrap gap-2"><button className={button} onClick={()=>onNavigate('action-plans')}>Open saved plans</button><button className={button} onClick={()=>onNavigate('plan-track')}>Review target and tracking</button></div></section>:null;
 if(!draft||!matches)return normalHosted?normalPortal(savedContinuation??<section aria-label="Staffing planner status"><p role="status">{pending?'Preparing the reviewed scenario.':notice||'Review the fictional example assumptions to begin. Your saved plans are kept.'}</p>{!pending&&<button className={button} disabled={busy||!storage.saved} onClick={()=>void handle('How would you close a 5 FTE capacity gap with a $325,000 USD budget?')}>Review example assumptions</button>}</section>):savedContinuation;
 const content=<section aria-label="Strategic workforce planning journey" className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
  {demandBridge&&<div><h2 className="text-lg font-semibold">Service growth: a guided decision</h2><p className="text-sm">About three minutes: review inputs → compare options → save and reopen → review the target.</p></div>}
  {demandBridge&&<SwpDemandJourney discussionKey={discussionKey} conversation={conversation} active={active} busy={busy||pending} beginRef={demandControlRef} reviewRef={demandReviewRef} contextRef={demandContextRef} onReview={invalidateDemand} onStaffing={useDemand} seed={demandBridge??undefined} staffingInputs={demandBridge?draft?.inputs.capacity:undefined} staffingSummary={demandBridge&&currentComparison?currentComparison.options.map(o=>({mix:o.candidate.mix,cash:o.candidate.cash.complete,endDateLimits:o.candidate.status,effort:serviceOptionEffort(o,demandBridge)})):null}/>}
  <>
   {demandBridge?<>
   <p className="text-xs font-medium">{saved?'Saved example':'Unsaved example'}</p>
   <p className="text-sm"><strong>Business objective:</strong> {draft.inputs.scope.requirements.value}</p>
   <p className="text-sm"><strong>Scope:</strong> {draft.inputs.scope.population.value}. <strong>Demand:</strong> {draft.inputs.scope.demand.value??'Unknown'} additional whole roles. <strong>Horizon:</strong> {draft.inputs.scope.startMonth.value} through {swpEnd(draft)}. <strong>Cash ceiling:</strong> {money(draft.inputs.budget?.amount.value)}.</p>
   <details><summary className="min-h-11 cursor-pointer py-2 text-sm">Current workforce and skills evidence</summary><p className="text-xs">This illustrative role slice has no matched operational allocation baseline. Its additional-role requirement is a scenario premise or a code-calculated gap from separately reviewed assumptions. The company evidence below retains its own scope and does not verify internal availability.</p>{sources.filter(s=>['W1','T1','T2','R1'].includes(s.id)).map(s=><div key={s.id} className="my-2 text-xs"><strong>{s.label}</strong>: {s.status==='loaded'?'Available':'Unavailable'} · {s.scope} · {s.date||'Date unavailable'}.<p>{s.limitation}</p></div>)}<button className={button} onClick={()=>onNavigate('skills')}>Open supporting skill evidence</button><p className="text-xs">Training completion is not demonstrated capability; a work sample and manager validation are proposed before release.</p></details>
   <details><summary className="min-h-11 cursor-pointer py-2 text-sm">All assumptions and additional edits</summary><p className="text-xs">Say “Set budget to $100,000”, “Set training hours to 100”, or “Set Develop effective month to {draft.inputs.capacity?.input.buildMonth}”. All entries remain assumptions. Demand, scope or horizon changes need coupled-input review; unsupported edits fail visibly.</p><ul className="list-disc pl-5 text-xs">{Object.entries(draft.inputs.capacity?.input??{}).filter(([,v])=>v!=='').map(([k,v])=><li key={k}>{k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}: {v}</li>)}</ul><p className="text-xs">Develop group: {draft.inputs.groups.find(g=>g.id==='scenario-build')?.count.value??'Unknown'}; Move group: {draft.inputs.groups.find(g=>g.id==='scenario-move')?.count.value??'Unknown'}, assumed distinct and releasable; {draft.inputs.capacity?.input.backfills||'Unknown'} backfills is the displayed premise. Contracting and automation are not calculated by this example. Attrition and productivity effects are not included. Staff effort covers entered training hours; unentered recruiting and management effort remains unestimated.</p></details>
   {edit&&<section aria-label="Review workforce assumption changes" className="rounded border p-3 text-sm"><p>Calculations are stale while these edits await review.</p><ul>{edit.changes.map(c=><li key={c.field}>{c.field}: {String(c.before.value??'Unknown')} → {String(c.after.value??'Unknown')}</li>)}</ul><div className="flex flex-wrap gap-2"><button className={button} disabled={busy||pending||!active} onClick={()=>{if(busy||pending||!active)return;try{acceptDraft(acceptBundleChatEdit(draft,edit));setEdit(null);setComparison(null);setSelection(null);clearReview();}catch(e){setNotice((e as Error).message);}}}>Use changes in this draft</button><button className={button} disabled={busy||pending||!active} onClick={()=>{if(busy||pending||!active)return;setEdit(null);clearReview();}}>Cancel changes</button></div></section>}
   <GuidedWorkloadSummary draft={draft}/>
   <h3 className="font-semibold">2. Compare quantified options</h3>
   <div className="flex flex-wrap gap-2"><button className={button+' bg-primary text-primary-foreground'} disabled={busy||pending||!!edit||demandStale||!active||!storage.saved} onClick={()=>void calculate()}>Compare these assumptions</button>{pending&&<button className={button} onClick={()=>{generation.current++;abort.current?.abort();setPending(false);setReview(null);setNotice('Request cancelled. Saved work is kept.');}}>Cancel comparison</button>}</div>
   {demandStale&&<p role="status">Demand assumptions changed. Accept their current review before comparing or saving.</p>}
   {pending&&<p role="status" className="text-sm">Checking the existing staffing calculation…</p>}
   {currentComparison&&<>
    {currentComparison.evaluation.context.status==='needs-inputs'?<p role="status">No comparison yet: {currentComparison.evaluation.context.missing.map(m=>m.reason).join(' ')}</p>:<>
     <p className="text-xs" aria-label="Staffing assumptions">{staffingAssumptions(selected?.draft??draft)}</p><SwpOutcomeChart draft={draft} options={currentComparison.options}/>
     <p className="text-xs">{currentComparison.evaluation.report?.summary.enumerated} combinations evaluated · {currentComparison.options.length} displayed. {currentComparison.evaluation.report?.summary.counts.met} meet your limits.</p>
     <fieldset disabled={busy||pending||!active} className="space-y-2"><legend className="font-semibold">Compare and select for review</legend>{currentComparison.options.map(o=><label key={o.id} className="block space-y-1 rounded border p-3 text-sm"><span className="flex min-h-11 items-center gap-2"><input type="radio" name="swp-option" checked={selection===o.id} disabled={o.candidate.status!=='met'} onChange={()=>selectOption(o.id)}/><strong>{o.label}: develop {o.candidate.mix.build}, move {o.candidate.mix.move}, hire {o.candidate.mix.buy}</strong></span><span className="block">{money(o.candidate.cash.complete)} incremental cash · {o.candidate.effort?.totalHours??'Unknown'} staff hours · {o.candidate.metrics?.addedEmployees??'Unknown'} added employees including backfills.</span><span className="block">Conditional coverage: {o.candidate.metrics?.fullCoverageDate??'Unknown'}. {o.candidate.status==='met'?'Meets entered end-date staffing and cash limits.':'Does not meet entered limits.'}</span>{demandBridge&&<span className="block">{effortText(o,demandBridge)}</span>}{o.draft.inputs.guidedWorkload&&<span className="block">{(()=>{const effort=guidedOptionEffort(o);return effort?`Period capacity: ${effort.totalHours.toLocaleString()} hours; uncovered work: ${effort.shortfallHours.toLocaleString()} hours.`:'Whole-period productive capacity is unknown.';})()}</span>}</label>)}</fieldset>
     <button className={button} disabled={!selected||pending||busy||exactSaved} onClick={()=>void prepare()}>{exactSaved?'This choice is already saved':'Review selected Action Plan'}</button>
    </>}
   </>}
   </>:guided?<GuidedCapacitySteps forcedChoice={!!wholeAppDemo} draft={draft} comparison={currentComparison} selection={selection} reviewing={!!review} disabled={busy||pending||!active||!storage.saved} pending={pending} onCalculate={()=>void calculate()} onSelect={selectOption} onPrepare={()=>void prepare()}/>:<SimpleSwpDemo key={draft.binding.goalId} reviewing={!!review} draft={draft} comparison={currentComparison} edit={edit} selection={selection} disabled={busy||pending||!active||!storage.saved} pending={pending} editingDisabled={busy||!active||!storage.saved}
    onPrimaryChange={request=>{try{acceptDraft(acceptBundleChatEdit(draft,previewBundleChatEdit(draft,request)));abort.current?.abort();setPending(false);setComparison(null);setSelection(null);clearReview();}catch(e){setNotice((e as Error).message);}}} onSelect={selectOption} onEdit={value=>{setEdit(value);setComparison(null);setSelection(null);clearReview();}}
    onAccept={()=>{try{acceptDraft(acceptBundleChatEdit(draft,edit!));setEdit(null);setComparison(null);setSelection(null);clearReview();}catch(e){setNotice((e as Error).message);}}} onCancel={()=>{setEdit(null);clearReview();}} onCalculate={()=>void calculate()} onPrepare={()=>void prepare()} alreadySaved={exactSaved}/>}
   {review&&selected&&<section aria-label="Review and save workforce plan" className="space-y-2 rounded border p-3 text-sm"><h3 className="font-semibold">{demandBridge?"3. Save and review":"4. Review and save"}</h3>{checkpoints[0]&&<p className="rounded bg-accent p-3"><strong>Next proposed checkpoint: {checkpoints[0].date??'Unknown'}</strong><br/>{checkpoints[0].name} · {checkpoints[0].ownerRole} (proposed owner role)</p>}<GuidedPlanSummary draft={selected.draft} compact/>{demandBridge&&<><p>{effortText(selected,demandBridge)}</p><p>Review the remaining workload and staffing assumptions before saving.</p><details><summary>Accepted operational assumptions and history</summary><pre className="overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({spec:demandBridge.review.spec,reviewedAt:demandBridge.reviewedAt,priorAccepted:demandBridge.priorAccepted},null,2)}</pre></details></>}<p><strong>Goal:</strong> {draft.binding.goal}</p>{demandBridge&&<p>{draft.inputs.scope.population.value} · target {draft.inputs.scope.demand.value} roles by {swpEnd(draft)}.</p>}<details><summary className="min-h-11 cursor-pointer py-2 font-medium">All proposed checkpoints and owners</summary><p>Proposed owners are roles, not assigned people.</p><ul className="list-disc pl-5">{checkpoints.map(c=><li key={c.id}>{c.name} - proposed owner: {c.ownerRole}; checkpoint: {c.date??'Unknown'}.</li>)}</ul><p><strong>Success measure:</strong> {swpMetric} in this unit and role. Assess readiness before deployment; training completion alone does not meet the target.</p></details><p className="text-xs">Review the cost breakdown, then save this plan.</p><div className="flex flex-wrap gap-2"><button className={button} disabled={busy||pending||review.alreadySaved} onClick={save}>Save reviewed plan and goal</button><button className={button} onClick={()=>setReview(null)}>Cancel review</button></div></section>}
   {catalog&&saved&&<details><summary className="min-h-11 cursor-pointer py-2 text-sm">Saved plan versions and proposed owners ({catalog.attachments.length})</summary>{catalog.attachments.map(a=>{const p=catalog.plans.find(p=>p.id===a.planId)!;return <div key={a.id} className="my-2 text-xs"><strong>Action Plan #{p.number} · revision {p.draft.revision} · attached proposal</strong><p>{a.attachedAt}. {applicablePlanComponents(p.draft).map(c=>`${c.name}: ${c.ownerRole} (proposed)`).join('; ')}.</p><GuidedPlanSummary draft={p.draft}/><p>Saved cash estimate: {money(p.result.cashEstimate?.cash)}. Prior source inputs and search results are retained.</p></div>;})}</details>}
   {saved&&<section className="space-y-2 rounded border p-3"><h3 className="font-semibold">Reopen and track</h3>{catalog?.plans.find(p=>p.id===saved.selectedPlanId)&&<GuidedPlanSummary draft={catalog.plans.find(p=>p.id===saved.selectedPlanId)!.draft}/>}<p className="text-sm">Saved in this browser. Reopen this goal from Saved plans on Overview to restore its assumptions and compare again.</p><div className="flex flex-wrap gap-2"><button className={button} onClick={()=>onNavigate('action-plans')}>Open saved plans</button><button className={button} onClick={()=>onNavigate('plan-track')}>Review target and tracking</button></div><p className="swp-demo-warning">Track results against this saved target.</p></section>}
   {progress&&fields&&<details><summary className="min-h-11 cursor-pointer py-2 text-sm">Saved goal progress and plan link</summary><GoalProgressSummary context={progress.context} snapshot={progress} plan={readProgressLinkedPlan(fields[goalProgressField],fields,progress.context,conversation.focusedIssue,token)} goal={conversation.focusedIssue}/></details>}
  </>
  {draft&&demandBridge&&<button className={button} onClick={()=>exit()}>Exit workforce example</button>}
  {!demandBridge&&!guided&&<div><button className={button} onClick={()=>setRestartRequested(true)}>Start over</button>{restartRequested&&<div role="group" aria-label="Confirm restart"><p>Discard unsaved scenario edits and start a fresh example? Saved plans are kept.</p><button className={button} disabled={busy||pending} onClick={()=>void restartDemo()}>Restart scenario</button><button className={button} onClick={()=>setRestartRequested(false)}>Keep editing</button></div>}</div>}
  {notice&&<p role="status" className="text-sm">{notice}</p>}
 </section>;

 if(wholeAppDemo?.target)return createPortal(<div data-whole-app-demo-plan>{content}</div>,wholeAppDemo.target);
 if(normalHosted)return normalPortal(<>{savedContinuation}{demoOpen?content:<button type="button" data-demo-resume className={button} onClick={resumeDemo}>Resume planning scenario</button>}{demoOpen&&!guided&&<div className="p-4 pt-0"><button className={button} disabled={busy||pending||!!edit||demandStale} onClick={continueScenario}>Continue this scenario in chat</button><p className="mt-2 text-xs">{currentComparison?.evaluation.context.status==='ready'?'Continue with these inputs and calculated options.':'Continue with these inputs; compare them in chat when ready.'}</p></div>}</>);
 return demandBridge?content:<>{savedContinuation}<button type="button" data-demo-resume className={button} onClick={resumeDemo}>Resume planning scenario</button>{!normalWorkspace&&!chatScenario&&<WorkforceDemoDialog gapFte={guidedWorkloadResult(draft.inputs)?.additionalFte??null} open={demoOpen&&active} onClose={closeDemo} step={guided?(review?'4 of 4. Review and save':currentComparison?.evaluation.context.status==='ready'?'3 of 4. Select a feasible option':'2 of 4. Compare staffing options'):(review?'4 of 4. Review and save':currentComparison?.evaluation.context.status==='ready'?'3 of 4. Choose a staffing option':'2 of 4. Review inputs and compare')}>{content}{!guided&&<div className="p-4 pt-0"><button className={button} disabled={busy||pending||!!edit||demandStale} onClick={continueScenario}>Continue this scenario in chat</button><p className="mt-2 text-xs">{currentComparison?.evaluation.context.status==='ready'?'Continue with these inputs and calculated options.':'Continue with these inputs; compare them in chat when ready.'}</p></div>}</WorkforceDemoDialog>}{chatScenario&&active&&matches&&scenarioTarget&&createPortal(<><div className="mb-3 rounded border p-3 text-sm"><strong>Staffing scenario</strong><p>Adjust the inputs or compare staffing options.</p><button className={button} onClick={closeDemo}>Leave scenario context</button></div>{content}</>,scenarioTarget)}</>;
}
