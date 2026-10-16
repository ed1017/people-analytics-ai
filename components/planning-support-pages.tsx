'use client';

import {GuidedPlanSummary} from './guided-plan-summary';
import {readPlanAlternatives,planAlternativesField} from '@/lib/home-plan-alternatives';
import {FutureWorkExample} from './future-work-example';
import type { AppPage } from '@/lib/types';
import {readSwpSaveReview,swpDemoField} from '@/lib/swp-demo';
import {readProgressSnapshot} from '@/lib/goal-progress-summary';
import {goalProgressField} from '@/lib/goal-progress';
import { decisionStore, useDecisionStorage } from './decision-store';
import { AttachedActionPlansBrief } from './attached-action-plans-brief';
import { SelectedGoalProgress } from './goal-progress-summary';
import { planningEvidence } from '@/lib/planning-journey';
import { goalProgressEnabled } from '@/lib/goal-progress';
import styles from './home-chat-shell.module.css';

type Navigate = {onNavigate: (page: AppPage) => void};
export function FutureOfWorkPage({onNavigate}: Navigate) {
  return <section className="mx-auto max-w-4xl space-y-5 p-6" aria-label="Future of Work">
    <header><p className="text-xs text-muted-foreground">Future of Work · Not configured</p><h2 className="mt-2 text-2xl font-semibold">How could the work change?</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Explore a fictional task example before setting your own assumptions. Actual task impact is not configured.</p></header>
    <FutureWorkExample onNavigate={onNavigate}/>
    <div className="flex flex-wrap gap-3"><button type="button" onClick={() => onNavigate('occupational-references')} className="min-h-11 rounded-md border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Explore role references</button><button type="button" onClick={() => onNavigate('planning-overview')} className="min-h-11 rounded-md border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Enter manual scenario assumptions</button></div>
    <p className="text-xs text-muted-foreground">Scenario calculations use your entered assumptions. No AI adjustment is applied automatically.</p>
  </section>;
}

export function PlanningSupportPage({page, onNavigate}: Navigate & {page: 'action-plans' | 'plan-track'}) {
  const storage = useDecisionStorage();
  const goal = storage.data.goals.goals.find(item => item.id === storage.data.goals.activeId);
  const fields = goal ? storage.data.workspaces[goal.id]?.fields ?? {} : {};
  const demo=readSwpSaveReview(fields[swpDemoField]);
  let demoTarget:ReturnType<typeof readProgressSnapshot>|null=null;
  if(goal&&demo&&demo.datasetToken===decisionStore.getDatasetToken()&&demo.draft.binding.goalId===goal.id&&demo.draft.binding.goal===goal.statement){try{demoTarget=readProgressSnapshot(fields[goalProgressField],goal.id,new Date().toISOString().slice(0,10));}catch{/* Keep unverified saved records untouched. */}}

  const savedChoice=goal&&demoTarget&&demo?readPlanAlternatives(fields[planAlternativesField],{goalId:goal.id,goal:goal.statement})?.plans.find(p=>p.id===demo.selectedPlanId&&!p.deleted):null;
  return <section aria-label={page === 'action-plans' ? 'Action plans' : 'Track'} className="mx-auto max-w-5xl space-y-4 p-6">
    <h2 className="text-2xl font-semibold">{page === 'action-plans' ? 'Action plans' : 'Track your plan'}</h2>
    {!storage.ready ? <p role="status">Loading saved work…</p> : !storage.saved ? <p role="status">Saved work needs review. Existing records are retained.</p> : !goal ? <p className="text-sm text-muted-foreground">Select a saved goal on Overview to review its {page === 'action-plans' ? 'plans' : 'dated measurements'}. No goal is selected.</p> : page === 'action-plans' ? <>
      <p className="text-sm">{goal.statement}</p>
      {fields.homeSolutionBundlesV1 === undefined && fields.homePlanAlternativesV1 === undefined ? <p className="text-sm text-muted-foreground">No attached Action Plan is recorded for this goal. Review proposals in chat on Overview.</p> : <AttachedActionPlansBrief goalId={goal.id} goal={goal.statement} raw={fields.homeSolutionBundlesV1} alternatives={fields.homePlanAlternativesV1} onReview={() => onNavigate('home')}/>}
    </> : goalProgressEnabled ? <SelectedGoalProgress/> : <section className="space-y-3 rounded border bg-card p-4"><h3 className="font-semibold">Saved scenario target</h3>{demoTarget?.context.measurement?<><p>{goal.statement}</p><p><strong>{demoTarget.context.measurement.target.value} {demoTarget.context.measurement.unit}</strong> by {demoTarget.context.measurement.target.date}.</p><p className="text-sm">{demoTarget.context.measurement.scope.org} · {demoTarget.context.measurement.scope.level} · fictional scenario</p><p className="swp-demo-warning">Actual baseline and achieved coverage are not recorded by this demo. Review skill readiness, release and dated role coverage before assessing results.</p></>:<p>No verified scenario target is available for this goal.</p>}<p className="text-sm text-muted-foreground">Progress tracking is not enabled. This read-only target does not record completion or measured outcomes.</p></section>}
    {page==='plan-track'&&savedChoice&&<GuidedPlanSummary draft={savedChoice.draft}/>}
    <button type="button" onClick={() => onNavigate('home')} className="min-h-11 rounded border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Return to Overview</button>
  </section>;
}

export function HomePlanPane({onNavigate, onExample, children}: Navigate & {onExample?: () => void; children?: React.ReactNode}) {
  const storage = useDecisionStorage();
  const goal = storage.data.goals.goals.find(item => item.id === storage.data.goals.activeId);
  return <aside aria-label="Your plan" className={styles.planPane}>
    <h2>Your plan</h2>
    <section aria-label="Current plan"><h3>{!storage.ready ? 'Loading saved work…' : goal ? 'Selected goal' : 'No goal selected yet'}</h3>{goal && <p className="mt-2 break-words text-sm">{goal.statement}</p>}<button type="button" onClick={() => onNavigate('action-plans')}>Review saved Action Plans →</button><button type="button" onClick={() => onNavigate('plan-track')}>Review dated progress →</button></section>
    {children}
    <details><summary>Explore supporting data</summary><nav aria-label="Explore data">{planningEvidence.map(item => <button key={item.page} type="button" onClick={() => onNavigate(item.page)}>{item.label}</button>)}</nav></details>
    {onExample && <section><button type="button" onClick={onExample}>Try a guided example</button></section>}
  </aside>;
}
