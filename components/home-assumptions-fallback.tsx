'use client';
import {useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {HomeBundlePlans,bundleButton,type BundleSession,type BundleDiscussion,type PlanChatChange} from '@/components/home-bundle-plans';
import {actionBinding,actionBindingKey,type ActionBinding} from '@/lib/home-action-drafts';
import {readAssumptionsFallback,assumptionsOnlyBundle,assumptionsFallbackField,unavailableSourceLabels} from '@/lib/home-assumptions-fallback';
export function HomeAssumptionsFallback({chatChange,goalId,goal,binding,pack,planningContext,disabled,isCurrent,onDiscuss}:{chatChange?:PlanChatChange|null;goalId:string;goal:string;binding:ActionBinding|null;pack:unknown;planningContext:unknown;disabled:boolean;isCurrent:()=>boolean;onDiscuss:(request:BundleDiscussion)=>void}){
 const storage=useDecisionStorage(),raw=storage.data.workspaces[goalId]?.fields[assumptionsFallbackField],saved=readAssumptionsFallback(raw,goalId),missing=unavailableSourceLabels(pack),bundle=assumptionsOnlyBundle(goal),[cache]=useState(()=>new Map<string,BundleSession>()),[notice,setNotice]=useState(''),heading=useRef<HTMLHeadingElement>(null);
 const current=!!saved&&!!binding&&actionBindingKey(saved.sourceBinding)===actionBindingKey(binding),eligible=!!bundle&&missing.length>0;
 if(!saved&&!eligible)return null;
 async function prepare(){try{if(disabled||!binding||!eligible||!isCurrent())throw Error('The goal or source context changed. Review the current context first.');const localBinding=await actionBinding(goalId,goal,pack,{origin:'local-assumptions-v1',sourceBinding:binding});if(!isCurrent())throw Error('The goal or source context changed. Your previous work is kept.');decisionStore.setField(goalId,assumptionsFallbackField,{version:1,binding:localBinding,sourceBinding:binding,preparedAt:new Date().toISOString(),missingSources:missing,planningContext});if(!decisionStore.getSnapshot().saved)throw Error('The local draft could not be saved. Your existing work is kept.');requestAnimationFrame(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start'});});}catch(error){setNotice((error as Error).message);}}
 const selected=saved?assumptionsOnlyBundle(saved.binding.goal):null;
 return <section aria-label="Assumptions-only planning" className="space-y-3 rounded border p-3">
  <h3 ref={heading} tabIndex={-1} className="font-semibold">Assumptions-only proposal</h3>
  <p>This local starting template does not use evidence to recommend a priority or claim an effect. Review every assumption before attaching or calculating; no model request runs here.</p>
  <p role="status">{missing.length?'Unavailable sources: '+missing.join(', '):'Sources have changed since this draft was prepared.'} Missing metrics remain unavailable unless explicitly entered or labeled illustrative.</p>
  {saved&&<p className="text-xs">Unavailable when prepared: {saved.missingSources.join(', ')}. Source recovery never upgrades these assumptions into facts.</p>}
  {saved&&!current&&<p role="status">Previous assumptions-only draft — context changed. Kept for reference; review and prepare the current context explicitly.</p>}
  {raw&&!saved&&<p role="alert">The saved local proposal cannot be verified. Its record is kept.</p>}
  {(!saved||!current)&&eligible&&<button className={bundleButton} disabled={disabled||!binding||!!raw&&!saved} onClick={prepare}>Prepare assumptions-only draft</button>}
  {notice&&<p role="alert">{notice}</p>}
  {saved&&selected&&<HomeBundlePlans chatChange={chatChange} key={actionBindingKey(saved.binding)+saved.preparedAt} proposal={{version:1,goal:saved.binding.goal,bundles:[selected],question:null,unavailableReason:null}} binding={saved.binding} preparedAt={saved.preparedAt} planningContext={saved.planningContext} measurePack={{sources:[]}} contextCurrent={current} disabled={disabled||!current} isCurrent={()=>current&&isCurrent()} cache={cache} onDiscuss={onDiscuss}/>}
 </section>;
}
