'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {HomeBundlePlans,type BundleSession,type BundleDiscussion,type PlanChatChange} from '@/components/home-bundle-plans';
import {demoBinding,demoBundle,homeDemoField,readHomeDemo} from '@/lib/home-demo-catalog';
import {bundleWorkspaceField,readBundleWorkspace} from '@/lib/home-bundle-records';
import {revealJourneyTarget} from '@/components/workforce-journey-continue';

export function HomeDemoPlans({goalId,goal,active,busy,openRequest,chatChange,onDiscuss}:{goalId:string;goal:string;active:boolean;busy:boolean;openRequest?:{goalId:string;goal:string;sequence:number}|null;chatChange?:PlanChatChange|null;onDiscuss:(request:BundleDiscussion)=>void}) {
 const storage=useDecisionStorage(),saved=readHomeDemo(storage.data.workspaces[goalId]?.fields[homeDemoField],goalId),[cache]=useState(()=>new Map<string,BundleSession>()),heading=useRef<HTMLHeadingElement>(null);
 useLayoutEffect(()=>{if(active&&openRequest?.goalId===goalId&&openRequest.goal===goal)revealJourneyTarget(heading.current);},[active,goalId,goal,openRequest]);
 if(!saved)return null;
 const {example,preparedAt}=saved,workspace=readBundleWorkspace(storage.data.workspaces[goalId]?.fields[bundleWorkspaceField],goalId),current=goal===example.goal;
 const isCurrent=()=>active&&!busy&&decisionStore.getSnapshot().saved&&decisionStore.getSnapshot().data.goals.activeId===goalId&&decisionStore.getSnapshot().data.goals.goals.find(item=>item.id===goalId)?.statement===example.goal;
 return <section aria-label="Action Plans for your goal" className="space-y-2 break-words rounded-xl border border-primary/40 px-3 py-2 text-sm leading-relaxed">
  <div data-plan-header className="flex flex-wrap items-baseline gap-x-2"><h2 ref={heading} tabIndex={-1} className="text-base font-semibold">Action plans</h2><span className="text-xs text-muted-foreground">Review and edit as needed</span></div>
  <p>{goal} <span className="ml-1 rounded bg-muted px-2 py-1 text-xs">Demo example</span></p>
  <p className="text-xs text-muted-foreground">An attached example to explore and edit. Scope, owners, budget and dates are fictional assumptions; no work or outcomes have been achieved.</p>
  {!current&&<p role="status">The goal changed. The original example is kept for reference; its assumptions still describe “{example.goal}”.</p>}
  {!workspace||!workspace.attachments.length?<p role="status">The saved example plan is unavailable. Its records are kept; it will not be recreated automatically.</p>:<HomeBundlePlans key={goalId} chatChange={chatChange} binding={demoBinding(example)} proposal={{version:1,goal:example.goal,bundles:[demoBundle(example)],question:null,unavailableReason:null}} preparedAt={preparedAt} contextCurrent={current} disabled={!active||busy||!storage.saved||!current} isCurrent={isCurrent} cache={cache} onDiscuss={onDiscuss} measurePack={{sources:[]}}/>}
 </section>;
}
