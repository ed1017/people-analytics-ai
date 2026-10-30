'use client';

import {PositionResultSetup} from './position-result-setup';
import {PlanResultReview} from './plan-result-review';
import {ManualPlanResults} from './manual-plan-results';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {FoWLabReferenceHandoff} from './fow-lab-reference';
import type { AppPage } from '@/lib/types';
import { decisionStore, useDecisionStorage } from './decision-store';
import { AttachedActionPlansBrief } from './attached-action-plans-brief';
import { SelectedGoalProgress } from './goal-progress-summary';
import { planningEvidence } from '@/lib/planning-journey';
import { goalProgressEnabled } from '@/lib/goal-progress';
import styles from './home-chat-shell.module.css';

type Navigate = {onNavigate: (page: AppPage) => void};
const FowLabWorkspace=dynamic(()=>import('./fow-lab-workspace').then(module=>module.FowLabWorkspace),{loading:()=> <p role="status" className="p-6">Loading Future of Work Lab…</p>});
export function FutureOfWorkPage({onNavigate}: Navigate) {
  const [handoff,setHandoff]=useState<{jobKey?:string;functionName?:string}|null>(null);
  const review=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(handoff)review.current?.focus();},[handoff]);
  return <section className="mx-auto max-w-7xl space-y-3 p-3 md:p-4" aria-label="Future of Work">
    <FowLabWorkspace onNavigate={onNavigate} onReference={(jobKey,functionName)=>setHandoff({jobKey,functionName})}/>
    {handoff&&<div ref={review} tabIndex={-1} className="rounded-xl border p-4 focus-visible:ring-2 focus-visible:ring-ring" aria-label="Review Lab planning reference">
      <FoWLabReferenceHandoff jobKey={handoff.jobKey} functionName={handoff.functionName} onNavigate={onNavigate}/>
      <button type="button" className="mt-2 min-h-11 rounded border px-4 text-sm" onClick={()=>setHandoff(null)}>Cancel handoff</button>
    </div>}
    <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>onNavigate('occupational-references')} className="min-h-11 rounded-md border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Explore role references</button><button type="button" onClick={()=>onNavigate('planning-overview')} className="min-h-11 rounded-md border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Open Scenarios</button></div>
  </section>;
}

export function PlanningSupportPage({page, onNavigate}: Navigate & {page: 'action-plans' | 'plan-track' | 'assess-evaluate'}) {
  const storage = useDecisionStorage();
  const goal = storage.data.goals.goals.find(item => item.id === storage.data.goals.activeId);
  const fields = goal ? storage.data.workspaces[goal.id]?.fields ?? {} : {};
  const [selection,setSelection]=useState<{scope:string;id:string}|null>(null);
  const scope=`${decisionStore.getDatasetToken()}/${goal?.id??''}`;
  const selected=selection?.scope===scope?selection.id:'';
  const select=(id:string)=>setSelection({scope,id});
  const title=page==='assess-evaluate'?'Review plan results':page==='action-plans'?'Action plans':'Track your plan';
  return <section aria-label={title} className="mx-auto max-w-5xl space-y-3 p-3 md:p-4">
    <h2 className="text-2xl font-semibold">{title}</h2>
    {page==='action-plans'&&storage.ready&&storage.saved&&goal&&<nav aria-label="Continue saved plan" className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>onNavigate('plan-track')} className="min-h-11 rounded border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Track this plan</button>
      <button type="button" onClick={()=>onNavigate('assess-evaluate')} className="min-h-11 rounded border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Review plan results</button>
    </nav>}
    {!storage.ready ? <p role="status">Loading saved work…</p> : !storage.saved ? <p role="status">Saved work needs review. Existing records are retained.</p> : !goal ? <p className="text-sm text-muted-foreground">Select a saved goal on Overview to review its {page === 'action-plans' ? 'plans' : 'dated measurements'}. No goal is selected.</p> : page === 'action-plans' ? <>
      <p className="text-sm">{goal.statement}</p>
      {fields.homeSolutionBundlesV1 === undefined && fields.homePlanAlternativesV1 === undefined ? <p className="text-sm text-muted-foreground">{fields['planning.positionAllocationScenariosV1']?'Choose a saved position revision below to track its result.':'No attached Action Plan is recorded for this goal. Review proposals in chat on Overview.'}</p> : <AttachedActionPlansBrief goalId={goal.id} goal={goal.statement} raw={fields.homeSolutionBundlesV1} alternatives={fields.homePlanAlternativesV1} onReview={() => onNavigate('home')}/>}
    </> : null}
    {storage.ready&&storage.saved&&goal&&page==='action-plans'&&<PositionResultSetup key={scope} goalId={goal.id} datasetToken={decisionStore.getDatasetToken()} fields={fields} onLinked={id=>{select(id);onNavigate('plan-track');}}/>}
    {storage.ready&&storage.saved&&goal&&page==='assess-evaluate'&&<PlanResultReview goalId={goal.id} goal={goal.statement} fields={fields} datasetToken={decisionStore.getDatasetToken()} selected={selected} onSelect={select} onTrack={id=>{select(id);onNavigate('plan-track');}}/>}
    {storage.ready&&storage.saved&&goal&&page!=='assess-evaluate'&&<ManualPlanResults selectedPlanId={selected} onSelectPlan={select} key={`${decisionStore.getDatasetToken()}/${goal.id}/${goal.statement}`} goalId={goal.id} goal={goal.statement} fields={fields} datasetToken={decisionStore.getDatasetToken()}/>}
    {page==='plan-track'&&storage.ready&&storage.saved&&goal&&goalProgressEnabled&&<details><summary className="min-h-11 cursor-pointer text-sm">Other goal measurements</summary><p className="mb-3 text-sm text-muted-foreground">These goal measurements do not include the manually reported plan results above. They are recorded separately.</p><SelectedGoalProgress/></details>}
    {page==='assess-evaluate'&&<button type="button" onClick={()=>onNavigate('action-plans')} className="mr-2 min-h-11 rounded border px-4 py-2 text-sm">Open Action plans</button>}
    {page==='plan-track'&&<button type="button" onClick={()=>onNavigate('assess-evaluate')} className="min-h-11 rounded border px-4 py-2 text-sm">Review plan results</button>}
    <button type="button" onClick={() => onNavigate('home')} className="min-h-11 rounded border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Return to Overview</button>
  </section>;
}

export function HomePlanPane({onNavigate, children}: Navigate & {onExample?: () => void; children?: React.ReactNode}) {
  const storage = useDecisionStorage();
  const goal = storage.data.goals.goals.find(item => item.id === storage.data.goals.activeId);
  return <aside aria-label="Your plan" className={styles.planPane}>
    <h2>Your plan</h2>
    <section aria-label="Current plan"><h3>{!storage.ready ? 'Loading saved work…' : goal ? 'Selected goal' : 'No goal selected yet'}</h3>{goal && <p className="mt-2 break-words text-sm">{goal.statement}</p>}<button type="button" onClick={() => onNavigate('action-plans')}>Review saved Action Plans →</button><button type="button" onClick={() => onNavigate('plan-track')}>Review dated progress →</button></section>
    {children}
    <details><summary>Explore supporting data</summary><nav aria-label="Explore data">{planningEvidence.map(item => <button key={item.page} type="button" onClick={() => onNavigate(item.page)}>{item.label}</button>)}</nav></details>
  </aside>;
}
