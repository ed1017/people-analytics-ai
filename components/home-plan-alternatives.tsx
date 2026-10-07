'use client';
import {useContext,useLayoutEffect,useRef,useState} from 'react';
import {LegacyHomeBundlePlans,type HomeBundlePlansProps,type BundleDiscussion} from '@/components/home-bundle-plans';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {SavedPilotCorrectionOffer} from '@/components/home-saved-pilot-correction';
import {PlanAlternativeCard} from '@/components/plan-alternative-card';
import {useHomeMixSearch} from '@/components/use-home-mix-search';
import {HomeMixHistoryView,useVerifiedHomeMixHistory} from '@/components/home-mix-history';
import {HomeMixResults} from '@/components/home-mix-results';
import {homeMixAdapter} from '@/lib/home-mix-client';
import {localWorkforceTask} from '@/lib/workforce-search-client';
import {homeMixHistoryField,type HomeMixCommit} from '@/lib/home-mix-history';
import {proposeStaffingAlternative} from '@/lib/home-plan-alternatives';
import {HomeGuidedActionsContext,useHomeGuidedActions} from '@/components/home-guided-actions';
import {alternativeDiscussion} from '@/lib/home-plan-alternative-discussion';
import {alternativeQuestionReply,alternativeView,alternativeViewField,planAlternativeSummary} from '@/lib/home-plan-alternative-chat';
import {createPlanAlternatives,packPlanAlternatives,readPlanAlternatives,planAlternativesField,combinationIntent,proposeCombinedAlternative,proposeEditedAlternative,applyPlanAlternative,attachPlanAlternative,changeAlternativeView,proposeCorrectedPilotAlternative,type PlanAlternatives,type AlternativeRequest,type AlternativeOutcome} from '@/lib/home-plan-alternatives';
import type {CombinationReview} from '@/lib/home-plan-combination';
import {actionBindingKey} from '@/lib/home-action-drafts';
import {bundleInputKey} from '@/lib/home-bundle-reconciliation';
import {bundleChatEditExamples} from '@/lib/home-bundle-chat-edit';
import {readBundleWorkspace,bundleWorkspaceField} from '@/lib/home-bundle-records';
import {planStaffEffortText} from '@/lib/home-plan-delivery-estimate';
import {planBudgetText,planRevisionsField,readPlanRevisions} from '@/lib/home-plan-revisions';
import {PlanDirections} from '@/components/plan-directions';
import type {Json} from '@/lib/local-decisions';
import {structuredPlansEnabled,createPlanConversationRequest,assertPlanConversationCurrent,readPlanConversationProposal,previewPlanConversation,savePlanConversation,type PlanConversationRequest,type PlanConversationProposal} from '@/lib/home-plan-conversation';
import {HomePlanConversationReview} from '@/components/home-plan-conversation-review';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
const json=(value:unknown)=>value as Json;

type Review={request:AlternativeRequest;catalog:PlanAlternatives;current:()=>boolean;epoch:number};
/** Keep legacy snapshots intact. The first successful edit atomically starts a separate catalog. */
export function HomeBundlePlans(props:HomeBundlePlansProps){
 const storage=useDecisionStorage(),context={goalId:props.binding.goalId,goal:props.binding.goal},fields=storage.data.workspaces[context.goalId]?.fields??{},raw=fields[planAlternativesField],catalog=readPlanAlternatives(raw,context);
 const [review,setReview]=useState<Review|null>(null),[notice,setNotice]=useState('');
 const [structured,setStructured]=useState<{request:PlanConversationRequest;proposal:PlanConversationProposal;current:()=>boolean;catalog:()=>PlanAlternatives}|null>(null);
 const [comparisonIds,setComparisonIds]=useState<string[]>([]),comparisonRef=useRef<string[]>([]);
 const lastTarget=useRef<BundleDiscussion|null>(null);
 const guided=useContext(HomeGuidedActionsContext);
 const pending=useRef<{key:string;id:string}|null>(null),epoch=useRef(0),mounted=useRef(true);
 useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 function guard(){const state=decisionStore.getSnapshot();if(!mounted.current||props.disabled||!props.contextCurrent||!props.isCurrent()||!state.saved||state.data.goals.activeId!==context.goalId||state.data.goals.goals.find(goal=>goal.id===context.goalId)?.statement!==context.goal)throw Error('The goal, evidence or saved context changed. Your request and earlier plans are kept.');return state;}
 function saveOutcome(outcome:AlternativeOutcome){
  if(outcome.status==='needs-review'){const reply='No alternative created. '+outcome.questions.join(' ');setNotice(reply);return reply;}
  if(outcome.status!=='ready')return 'No plan changes were found. Describe the assumption you want to change.';
  const snapshot=guard();
  if(!outcome.reused)decisionStore.commitGoalFields(context.goalId,context.goal,snapshot.data.revision,new Date().toISOString(),()=>({[planAlternativesField]:json(packPlanAlternatives(outcome.catalog)),[alternativeViewField]:{version:1,selectedId:outcome.plan.id,collapsed:false}}));
  const reply=`${outcome.reused?'Existing':'New'} Action Plan #${outcome.plan.number} · ${outcome.plan.sourceRefs.length===2?'combined from':'based on'} ${outcome.plan.sourceRefs.map(ref=>'#'+outcome.catalog.plans.find(plan=>plan.id===ref.id)!.number).join(' and ')}. Originals and attachments are unchanged. Review this recalculated alternative, then explicitly Apply changes or Attach Action Plan.\n\n${planAlternativeSummary(outcome.plan)}`;
  guided?.emit({type:'edited',goalId:context.goalId,planId:outcome.plan.id,number:outcome.plan.number,sourcePlanId:outcome.plan.sourceRefs.length===1?outcome.plan.sourceRefs[0].id:undefined});
  setNotice(`${outcome.reused?'Existing':'New'} Action Plan #${outcome.plan.number} saved for review. Apply or Attach explicitly; earlier plans and attachments are kept.`);return reply;
 }
 function correctSavedPilot(id:string,expectedInput:string,sources:Parameters<typeof createPlanAlternatives>[1]){
  try{
   const state=guard(),latestRaw=state.data.workspaces[context.goalId]?.fields[planAlternativesField],current=latestRaw===undefined?createPlanAlternatives(context,sources):readPlanAlternatives(latestRaw,context);
   if(!current)throw Error('Saved alternatives cannot be verified. Earlier plans are kept.');
   const source=current.plans.find(plan=>plan.id===id&&!plan.deleted);
   if(!source||bundleInputKey(source.draft)!==expectedInput||actionBindingKey(source.draft.binding)!==actionBindingKey(props.binding))throw Error('This saved plan changed. Review its current defaults before creating a correction.');
   const key=JSON.stringify(['goal-correction',context,id,expectedInput]);if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};
   const outcome=proposeCorrectedPilotAlternative(current,context,{requestId:pending.current.id,text:'Restore unchanged starting defaults from the original goal',sourceIds:[id],expectedInputs:{[id]:expectedInput}},props.planningContext);
   if(outcome.status==='ready'&&outcome.reused)decisionStore.commitGoalFields(context.goalId,context.goal,state.data.revision,new Date().toISOString(),()=>({[alternativeViewField]:{version:1,selectedId:outcome.plan.id,collapsed:false}}));
   saveOutcome(outcome);
  }catch(error){setNotice((error as Error).message);}
 }
 function register(target:BundleDiscussion){
  lastTarget.current=target;
  props.onDiscuss({...target,...(structuredPlansEnabled?{structuredPropose:async(message:string,signal:AbortSignal)=>{
   guard();if(!target.isCurrent())throw Error('Select a current saved plan before sending.');
   const readCurrent=()=>{const state=guard(),raw=state.data.workspaces[context.goalId]?.fields[planAlternativesField],current=raw===undefined?createPlanAlternatives(context,target.snapshots?.()??[]):readPlanAlternatives(raw,context);if(!current)throw Error('Saved plans cannot be verified.');return current;};
   const request=createPlanConversationRequest(readCurrent(),target.id,comparisonRef.current,message,crypto.randomUUID());
   const captured=++epoch.current;setStructured(null);setReview(null);setNotice('');
   const current=()=>{try{guard();if(signal.aborted||captured!==epoch.current||!target.isCurrent())return false;assertPlanConversationCurrent(request,readCurrent(),lastTarget.current?.id,comparisonRef.current);return true;}catch{return false;}};
   const response=await fetch('/api/home-plan-conversation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...request,catalog:packPlanAlternatives(request.catalog)}),signal});
   const data=await response.json();
   if(!current())throw Error('The goal, selection or saved plans changed. Send the request again; nothing was saved.');
   if(!response.ok)throw Error(typeof data.error==='string'?data.error:'The plan response is unavailable. Nothing was saved.');
   if(data.requestId!==request.requestId)throw Error('The response belongs to another request. Nothing was saved.');
   const proposal=readPlanConversationProposal(data.proposal,request),preview=previewPlanConversation(request,proposal);
   setStructured({request,proposal,current,catalog:readCurrent});
   return preview.kind==='clarify'?preview.question:preview.kind==='compare'?'The read-only comparison below uses your actual saved plans. Nothing was changed.':'Review the proposed changes below. Nothing is saved until you choose Save as new alternative.';
  }}:{}),discard:()=>{epoch.current++;pending.current=null;setReview(null);setStructured(null);setNotice('Conversation reset. Saved alternatives and attachments are kept.');},propose:text=>{
   epoch.current++;setStructured(null);
   guard();if(!target.isCurrent())throw Error('The selected plan changed. Send the request again for the current plans.');
   const state=decisionStore.getSnapshot(),latestRaw=state.data.workspaces[context.goalId]?.fields[planAlternativesField];
   const current=latestRaw===undefined?createPlanAlternatives(context,target.snapshots?.()??[]):readPlanAlternatives(latestRaw,context);
   if(!current)throw Error('Saved alternatives cannot be verified. Earlier plans are kept; review storage before editing.');
   const selectedId=current.order.includes(target.id)?target.id:current.order[0];
   const explanation=alternativeQuestionReply(text,current,selectedId);if(explanation!==null)return explanation;
   const key=JSON.stringify([context,actionBindingKey(props.binding),selectedId,text]);
   if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};
   const request=alternativeDiscussion(current,context,selectedId).prepareRequest(text,pending.current.id);
   if(!request)return 'No plan changes were requested.';
   if(combinationIntent(text)){setReview({request,catalog:current,current:target.isCurrent,epoch:epoch.current});setNotice('');return `Review the combination of ${request.sourceIds.map(id=>'Action Plan #'+current.plans.find(plan=>plan.id===id)!.number).join(' and ')} below. Choose only overlap assumptions you can support, then create the combined alternative. Nothing is applied or attached.`;}
   setReview(null);return saveOutcome(proposeEditedAlternative(current,context,request));
  }});
 }
 function combine(assumptions:CombinationReview){
  try{guard();if(!review||review.epoch!==epoch.current||!review.current())throw Error('The combination is no longer current. Send it again from the current plans.');
   const latestRaw=decisionStore.getSnapshot().data.workspaces[context.goalId]?.fields[planAlternativesField],latest=latestRaw===undefined?review.catalog:readPlanAlternatives(latestRaw,context);
   if(!latest)throw Error('Saved alternatives cannot be verified. Earlier plans are kept.');
   const outcome=proposeCombinedAlternative(latest,context,{...review.request,review:assumptions});saveOutcome(outcome);if(outcome.status==='ready')setReview(null);
  }catch(error){setNotice((error as Error).message);}
 }
 if(raw!==undefined&&!catalog)return <p role="alert">Saved Action Plan alternatives cannot be verified. Their records are kept unchanged; review browser storage before editing or attaching.</p>;
 return <>{catalog?<AlternativePlans {...props} contextCurrent={props.contextCurrent&&catalog.plans.every(plan=>actionBindingKey(plan.draft.binding)===actionBindingKey(props.binding))} catalog={catalog} onDiscuss={register} onCorrectSavedPilot={correctSavedPilot}/>:<LegacyHomeBundlePlans {...props} onDiscuss={register} onCorrectSavedPilot={correctSavedPilot}/>}
  {structuredPlansEnabled&&<details><summary className="min-h-11 cursor-pointer py-2 text-sm">Choose plans to discuss together</summary><p className="text-sm">Select two plans to refer to “these two”, or name their displayed numbers in chat.</p><button className={button} disabled={!comparisonIds.length} onClick={()=>{comparisonRef.current=[];setComparisonIds([]);epoch.current++;}}>Clear discussion selection</button>{(catalog?catalog.order.map(id=>({id,number:catalog.plans.find(plan=>plan.id===id)!.number})):props.proposal.bundles.map((bundle,index)=>({id:bundle.id,number:index+1}))).map(plan=><label key={plan.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" aria-label={'Discuss Action Plan #'+plan.number} checked={comparisonIds.includes(plan.id)} disabled={!comparisonIds.includes(plan.id)&&comparisonIds.length>=6} onChange={event=>{const next=event.target.checked?[...comparisonRef.current,plan.id]:comparisonRef.current.filter(id=>id!==plan.id);comparisonRef.current=next;setComparisonIds(next);epoch.current++;}}/>Action Plan #{plan.number}</label>)}</details>}
  {structured&&<HomePlanConversationReview key={structured.request.requestId} request={structured.request} proposal={structured.proposal} current={structured.current()} onClose={()=>{epoch.current++;setStructured(null);}} onSave={assumptions=>{try{if(!structured.current())throw Error('The goal, selection or saved plans changed. Send the request again.');const outcome=savePlanConversation(structured.catalog(),structured.request,structured.proposal,assumptions);saveOutcome(outcome);setStructured(null);epoch.current++;}catch(error){setNotice((error as Error).message);}}}/>}
  {review&&<CombinationReviewForm key={review.request.requestId} disabled={props.disabled||!props.contextCurrent} onCreate={combine} onCancel={()=>{epoch.current++;setReview(null);}}/>}
  {notice&&<p role="status" className="whitespace-pre-line text-sm">{notice}</p>}
 </>;
}

function CombinationReviewForm({disabled,onCreate,onCancel}:{disabled:boolean;onCreate:(review:CombinationReview)=>void;onCancel:()=>void}){
 const [participants,setParticipants]=useState(''),[fees,setFees]=useState(''),[count,setCount]=useState('');
 return <section aria-label="Review plan combination" className="space-y-3 rounded border p-3 text-sm"><h3 className="font-semibold">Review plan combination</h3><p>Keep overlap unknown unless you have reviewed it. Matching activity wording alone does not establish shared participants or fees.</p>
 <label className="block">Participant overlap<select aria-label="Combination participant overlap" className="ml-2 max-w-full rounded border bg-background p-2" value={participants} onChange={e=>setParticipants(e.target.value)}><option value="">Unknown</option><option value="same">Same participants</option><option value="disjoint">Separate participant groups</option></select></label>
 {participants==='same'&&<label className="block">Shared participant count (optional)<input aria-label="Shared participant count" className="ml-2 w-28 rounded border bg-background p-2" type="number" min="0" max="1000000" value={count} onChange={e=>setCount(e.target.value)}/></label>}
 <label className="block">Cash allowance overlap<select aria-label="Combination cash overlap" className="ml-2 max-w-full rounded border bg-background p-2" value={fees} onChange={e=>setFees(e.target.value)}><option value="">Unknown</option><option value="distinct">Separate allowances</option><option value="shared-matches">Share exactly matching allowances</option></select></label>
 <p>Source budget ceilings and outcome targets are never added. Staff effort remains in hours.</p><div className="flex flex-wrap gap-2"><button className={button} disabled={disabled} onClick={()=>onCreate({...(participants?{participants:participants as CombinationReview['participants']} :{}),...(participants==='same'&&count!==''?{participantCount:Number(count)}:{}),...(fees?{fees:fees as CombinationReview['fees']}:{})})}>Create combined alternative</button><button className={button} onClick={onCancel}>Cancel combination</button></div></section>;
}

function AlternativePlans(props:HomeBundlePlansProps&{catalog:PlanAlternatives}){
 const {catalog,binding}=props,storage=useDecisionStorage(),context={goalId:binding.goalId,goal:binding.goal},fields=storage.data.workspaces[binding.goalId]?.fields??{},view=alternativeView(fields[alternativeViewField],catalog);
 const selected=catalog.plans.find(plan=>plan.id===view.selectedId&&!plan.deleted),[comparing,setComparing]=useState(false),[notice,setNotice]=useState(''),[acknowledged,setAcknowledged]=useState<string|null>(null);
 const live=useRef({id:view.selectedId,key:selected?bundleInputKey(selected.draft):'',available:!props.disabled&&props.contextCurrent}),generation=useRef(0),mounted=useRef(true),listeners=useRef(new Set<()=>void>());
 const mixHistory=useVerifiedHomeMixHistory(fields[homeMixHistoryField],binding.goalId),[mixChoice,setMixChoice]=useState<{key:string;id:string|null}|null>(null),[busy,setBusy]=useState(false);
 const mixAbort=useRef<AbortController|null>(null);
 const attachmentToken=useRef<{planId:string;id:string;at:string}|null>(null);
 useLayoutEffect(()=>{const next={id:view.selectedId,key:selected?bundleInputKey(selected.draft):'',available:!props.disabled&&props.contextCurrent};if(JSON.stringify(live.current)!==JSON.stringify(next))generation.current++;live.current=next;for(const listener of listeners.current)listener();});
 useLayoutEffect(()=>{mounted.current=true;const callbacks=listeners.current;return()=>{mounted.current=false;for(const callback of callbacks)callback();};},[]);
 function current(){const state=decisionStore.getSnapshot();return mounted.current&&!props.disabled&&props.contextCurrent&&props.isCurrent()&&state.saved&&state.data.goals.activeId===binding.goalId&&state.data.goals.goals.find(goal=>goal.id===binding.goalId)?.statement===binding.goal;}
 function latest(){if(!current())throw Error('The goal, evidence or saved context changed. Earlier alternatives are kept.');const state=decisionStore.getSnapshot(),value=readPlanAlternatives(state.data.workspaces[binding.goalId]?.fields[planAlternativesField],context);if(!value)throw Error('Saved alternatives cannot be verified.');return {state,value};}
 function commit(value:PlanAlternatives,nextView=alternativeView(fields[alternativeViewField],value)){const {state}=latest();decisionStore.commitGoalFields(binding.goalId,binding.goal,state.data.revision,new Date().toISOString(),()=>({[planAlternativesField]:json(packPlanAlternatives(value)),[alternativeViewField]:json(nextView)}));}
 function select(id:string){try{const {value,state}=latest();if(!value.order.includes(id))throw Error('This plan is no longer available.');decisionStore.commitGoalFields(binding.goalId,binding.goal,state.data.revision,new Date().toISOString(),()=>({[alternativeViewField]:{version:1,selectedId:id,collapsed:false}}));setNotice('');guided?.emit({type:'selected',goalId:binding.goalId,planId:id,number:value.plans.find(plan=>plan.id===id)!.number});}catch(error){setNotice((error as Error).message);}}
 const mixState=useHomeMixSearch({adapter:homeMixAdapter,request:selected?{identity:{goalId:binding.goalId,bindingKey:actionBindingKey(binding),inputKey:bundleInputKey(selected.draft),bundleId:selected.draft.bundle.id,revision:selected.draft.revision,preparationId:props.preparedAt},source:selected.draft}:null,trigger:'constraint-change',enabled:!!selected&&(!!selected.draft.inputs.capacity||selected.draft.inputs.whatIf?.kind==='capacity'||selected.draft.inputs.scope.capacityRequired.value===true)&&!props.disabled&&props.contextCurrent,isCurrent:current});
 const evaluation=mixState.status==='ready'?mixState.report:null,preferred=evaluation?.report?.results.find(item=>item.id===evaluation.report!.preferredOptionId),candidateId=mixState.key&&mixChoice?.key===mixState.key?mixChoice.id:preferred&&!preferred.isReferenceMix?preferred.id:null;
 const pendingMix=mixState.status==='queued'||mixState.status==='running'||mixHistory.status==='loading'||mixHistory.status==='invalid';
 useLayoutEffect(()=>()=>mixAbort.current?.abort(),[view.selectedId,props.disabled,props.contextCurrent]);
 async function saveAction(action:'apply'|'attach'){
  if(busy)return;setBusy(true);
  try{
   const {value,state}=latest();if(!selected)throw Error('Select an available plan.');if(pendingMix)throw Error('Review the verified staffing search before saving.');
   const at=new Date().toISOString(),beforeKey=bundleInputKey(selected.draft),captured=generation.current,abort=new AbortController();mixAbort.current=abort;
   const mix=evaluation?.report?await localWorkforceTask<HomeMixCommit>('home-mix-commit',{draft:selected.draft,evaluation,candidateId,at,previous:state.data.workspaces[binding.goalId]?.fields[homeMixHistoryField]??null},abort.signal):null;
   const latestState=latest().state;if(abort.signal.aborted||generation.current!==captured||latestState.data.revision!==state.data.revision)throw Error('The selected plan or saved context changed while checking the staffing proposal.');
   let next=value,plan=selected;
   if(mix&&bundleInputKey(mix.draft)!==beforeKey){const outcome=proposeStaffingAlternative(value,context,{requestId:crypto.randomUUID(),text:'Apply reviewed staffing combination',sourceIds:[selected.id],expectedInputs:{[selected.id]:beforeKey}},mix.draft);if(outcome.status!=='ready')throw Error('The staffing alternative needs review.');next=outcome.catalog;plan=outcome.plan;}
   if(action==='apply')next=applyPlanAlternative(next,context,plan.id,bundleInputKey(plan.draft));
   else{
    if(next.attachments.some(item=>item.planId===plan.id)){setNotice(`Action Plan #${plan.number} is already attached.`);guided?.emit({type:'attached',goalId:binding.goalId,planId:plan.id,number:plan.number,sourcePlanId:selected.id});return;}
    if(attachmentToken.current?.planId!==plan.id)attachmentToken.current={planId:plan.id,id:crypto.randomUUID(),at};
    next=attachPlanAlternative(next,context,plan.id,{inputKey:bundleInputKey(plan.draft),attachmentId:attachmentToken.current.id,at:attachmentToken.current.at,acknowledgeUnknowns:acknowledged===selected.id});
   }
   decisionStore.commitGoalFields(binding.goalId,binding.goal,latestState.data.revision,at,()=>({[planAlternativesField]:json(packPlanAlternatives(next)),[alternativeViewField]:{version:1,selectedId:plan.id,collapsed:false},...(mix?{[homeMixHistoryField]:json(mix.history)}:{})}));
   if(action==='attach')guided?.emit({type:'attached',goalId:binding.goalId,planId:plan.id,number:plan.number,sourcePlanId:selected.id});
   setNotice(`Action Plan #${plan.number} ${action==='apply'?'applied as a separate alternative':'attached'}. Earlier plans and attachments are unchanged.`);
  }catch(error){setNotice((error as Error).message);}finally{setBusy(false);}
 }
 const attach=()=>saveAction('attach');
 function remove(){try{const {value}=latest();if(!selected||value.order.length<2)return;const next=changeAlternativeView(value,context,{deleteId:selected.id});commit(next,{version:1,selectedId:next.order.at(-1)!,collapsed:false});setNotice(`Action Plan #${selected.number} removed from the list. Its lineage and attachments remain saved; its number will not be reused.`);}catch(error){setNotice((error as Error).message);}}
 useLayoutEffect(()=>{if(!selected||props.disabled||!props.contextCurrent)return;const captured=generation.current,id=selected.id,key=bundleInputKey(selected.draft),isCurrent=()=>current()&&generation.current===captured&&live.current.id===id&&live.current.key===key;
  props.onDiscuss({snapshots:()=>catalog.order.map(id=>({id,draft:catalog.plans.find(plan=>plan.id===id)!.draft})),examples:bundleChatEditExamples(selected.draft),option:selected.number,id,revision:selected.draft.revision,name:selected.draft.bundle.name,goalId:binding.goalId,goal:binding.goal,isCurrent,subscribe:listener=>{listeners.current.add(listener);return()=>{listeners.current.delete(listener);};},discard:()=>{},propose:()=>{throw Error('Use the current numbered plan discussion.');},preview:()=>{throw Error('Send the edit to create a separate numbered alternative.');},accept:()=>{throw Error('Review and apply the numbered alternative explicitly.');}});
 });
 const guided=useHomeGuidedActions('plan',{goalId:binding.goalId,select:()=>select(catalog.order[0]),attach,attachReady:()=>current()&&!busy&&!pendingMix&&!!selected&&(!selected.result.issues.length||acknowledged===selected.id),selected:()=>live.current.id===catalog.order[0],attached:()=>{const raw=decisionStore.getSnapshot().data.workspaces[binding.goalId]?.fields[planAlternativesField];return !!readPlanAlternatives(raw,context)?.attachments.some(item=>item.planId===live.current.id);}});
 const legacy=readBundleWorkspace(fields[bundleWorkspaceField],binding.goalId),revisions=readPlanRevisions(fields[planRevisionsField],binding.goalId);
 if(!selected)return <p role="status">No current alternatives are available. Saved history is retained.</p>;
 const blocked=props.disabled||!props.contextCurrent||busy;
 return <div data-guide-goal={binding.goalId} className="space-y-3" data-plan-current={blocked?'false':'true'}>
 <div role="tablist" aria-label="Suggested plans" className="flex flex-wrap gap-2">{catalog.order.map((id,index)=>{const plan=catalog.plans.find(item=>item.id===id)!;return <button data-guide-plan={plan.number} key={id} id={'alternative-tab-'+id} role="tab" aria-selected={id===selected.id} aria-controls="selected-home-alternative" tabIndex={id===selected.id?0:-1} className={button+' aria-selected:bg-accent'} disabled={blocked} onClick={()=>select(id)} onKeyDown={e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?catalog.order.length-1:(index+(e.key==='ArrowRight'?1:-1)+catalog.order.length)%catalog.order.length;select(catalog.order[next]);(e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();}}>Action Plan #{plan.number}</button>})}</div>
 <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">Selected: Action Plan #{selected.number} · {selected.draft.bundle.name}</p><button className={button} aria-expanded={!view.collapsed} onClick={()=>{try{commit(catalog,{...view,collapsed:!view.collapsed});}catch(error){setNotice((error as Error).message);}}}>{view.collapsed?'Show Action Plan':'Collapse Action Plan'}</button></div>
 {props.onCorrectSavedPilot&&<SavedPilotCorrectionOffer draft={selected.draft} planningContext={props.planningContext} disabled={blocked} onCreate={()=>props.onCorrectSavedPilot?.(selected.id,bundleInputKey(selected.draft),catalog.order.map(id=>({id,draft:catalog.plans.find(plan=>plan.id===id)!.draft})))}/>}
 <div id="selected-home-alternative" role="tabpanel" aria-labelledby={'alternative-tab-'+selected.id} hidden={view.collapsed}><PlanAlternativeCard plan={selected} catalog={catalog} contextDiagnostic={props.contextDiagnostic} contextCurrent={props.contextCurrent} measurePack={props.measurePack}/><HomeMixResults state={mixState} candidateId={candidateId} disabled={blocked} onSelect={id=>{if(mixState.key)setMixChoice({key:mixState.key,id});}}/></div>
 <div className="flex flex-wrap items-center gap-2">{selected.result.issues.length>0&&<label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" aria-label="Confirm unresolved-assumption review" checked={acknowledged===selected.id} onChange={e=>setAcknowledged(e.target.checked?selected.id:null)}/>Unresolved assumptions reviewed</label>}{!view.collapsed&&<button data-guide-target="attach" className={button+' bg-primary text-primary-foreground'} disabled={blocked||pendingMix||selected.result.issues.length>0&&acknowledged!==selected.id} onClick={()=>void attach()}>Attach Action Plan</button>}<button className={button} disabled={blocked||pendingMix||selected.applied&&!candidateId} onClick={()=>void saveAction('apply')}>Apply changes</button><button className={button} disabled={catalog.order.length<2} onClick={()=>setComparing(!comparing)}>{comparing?'Hide comparison':'Compare Action Plans'}</button></div>
 {notice&&<p role="status">{notice}</p>}
 {comparing&&<section aria-label="Action Plan comparison" className="space-y-3"><h3 className="font-semibold">Compare Action Plans</h3><p className="text-xs">Proposals · effectiveness unproven.</p><div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">{catalog.order.map(id=>{const plan=catalog.plans.find(item=>item.id===id)!;return <PlanAlternativeCard key={id} plan={plan} catalog={catalog} compact contextCurrent={props.contextCurrent} measurePack={props.measurePack}/>})}</div></section>}
 <details><summary className="min-h-11 cursor-pointer py-2">Manage alternative list</summary><button className={button} disabled={blocked||catalog.order.length<2} onClick={remove}>Remove Action Plan #{selected.number} from list</button><button className={button} disabled={blocked||catalog.order[0]===selected.id} onClick={()=>{try{const {value}=latest();commit(changeAlternativeView(value,context,{order:[selected.id,...value.order.filter(id=>id!==selected.id)]}));}catch(error){setNotice((error as Error).message);}}}>Move selected plan first</button></details>
 <details><summary className="min-h-11 cursor-pointer py-2">Attached Action Plans and version history ({(legacy?.attachments.length??0)+catalog.attachments.length})</summary><div className="space-y-3">{catalog.attachments.map(item=>{const plan=catalog.plans.find(plan=>plan.id===item.planId)!;return <section key={item.id} aria-label={`Attached Action Plan ${plan.number}`}><p>Action Plan #{plan.number} · attached {item.attachedAt.slice(0,10)}{plan.deleted?' · removed from active list':''}</p><PlanAlternativeCard plan={plan} catalog={catalog} snapshot/></section>})}{legacy?.attachments.map(item=><section key={item.id}><p>Earlier attachment: {item.draft.bundle.name} · revision {item.draft.revision} · {item.attachedAt.slice(0,10)}</p><PlanDirections draft={item.draft} snapshot/><p>{planBudgetText(item.result)} Staff hours: {planStaffEffortText(item.draft)} Timeline: {item.result.deliveryEstimate?.finish??item.result.planFinish??'Unknown'}.</p></section>)}</div></details>
 <HomeMixHistoryView value={mixHistory}/>
 {!!revisions?.revisions.length&&<details><summary className="min-h-11 cursor-pointer py-2">Earlier proposed revision history ({revisions.revisions.length})</summary>{revisions.revisions.map((item,index)=><section key={index}><p>{item.request} · revision {item.draft.revision}</p><PlanDirections draft={item.draft} snapshot/></section>)}</details>}
 </div>;
}
