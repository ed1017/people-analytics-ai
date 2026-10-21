'use client';

import {ManualPlanResults} from './manual-plan-results';
import {FutureWorkExample} from './future-work-example';
import type { AppPage } from '@/lib/types';
import { decisionStore, useDecisionStorage } from './decision-store';
import { AttachedActionPlansBrief } from './attached-action-plans-brief';
import { SelectedGoalProgress } from './goal-progress-summary';
import { planningEvidence } from '@/lib/planning-journey';
import { goalProgressEnabled } from '@/lib/goal-progress';
import styles from './home-chat-shell.module.css';

type Navigate = {onNavigate: (page: AppPage) => void};
export function FutureOfWorkPage({onNavigate}: Navigate) {
  return <section className="mx-auto max-w-4xl space-y-5 p-6" aria-label="Future of Work">
    <header><p className="text-xs text-muted-foreground">Future of Work · Illustrative task example</p><h2 className="mt-2 text-2xl font-semibold">How could the work change?</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Start with the fictional task example below to explore how task time and adoption affect modeled savings. Your actual workforce impact remains unconfigured.</p></header>
    <FutureWorkExample onNavigate={onNavigate}/>
    <div className="flex flex-wrap gap-3"><button type="button" onClick={() => onNavigate('occupational-references')} className="min-h-11 rounded-md border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Explore role references</button><button type="button" onClick={() => onNavigate('planning-overview')} className="min-h-11 rounded-md border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Enter manual scenario assumptions</button></div>
    <p className="text-xs text-muted-foreground">Scenario calculations use your entered assumptions. No AI adjustment is applied automatically.</p>
  </section>;
}

export function PlanningSupportPage({page, onNavigate}: Navigate & {page: 'action-plans' | 'plan-track'}) {
  const storage = useDecisionStorage();
  const goal = storage.data.goals.goals.find(item => item.id === storage.data.goals.activeId);
  const fields = goal ? storage.data.workspaces[goal.id]?.fields ?? {} : {};
  return <section aria-label={page === 'action-plans' ? 'Action plans' : 'Track'} className="mx-auto max-w-5xl space-y-4 p-6">
    <h2 className="text-2xl font-semibold">{page === 'action-plans' ? 'Action plans' : 'Track your plan'}</h2>
    {!storage.ready ? <p role="status">Loading saved work…</p> : !storage.saved ? <p role="status">Saved work needs review. Existing records are retained.</p> : !goal ? <p className="text-sm text-muted-foreground">Select a saved goal on Overview to review its {page === 'action-plans' ? 'plans' : 'dated measurements'}. No goal is selected.</p> : page === 'action-plans' ? <>
      <p className="text-sm">{goal.statement}</p>
      {fields.homeSolutionBundlesV1 === undefined && fields.homePlanAlternativesV1 === undefined ? <p className="text-sm text-muted-foreground">No attached Action Plan is recorded for this goal. Review proposals in chat on Overview.</p> : <AttachedActionPlansBrief goalId={goal.id} goal={goal.statement} raw={fields.homeSolutionBundlesV1} alternatives={fields.homePlanAlternativesV1} onReview={() => onNavigate('home')}/>}
    </> : null}
    {storage.ready&&storage.saved&&goal&&<ManualPlanResults key={`${decisionStore.getDatasetToken()}/${goal.id}/${goal.statement}`} goalId={goal.id} goal={goal.statement} fields={fields} datasetToken={decisionStore.getDatasetToken()}/>}
    {page==='plan-track'&&storage.ready&&storage.saved&&goal&&goalProgressEnabled&&<details><summary className="min-h-11 cursor-pointer text-sm">Other goal measurements</summary><p className="mb-3 text-sm text-muted-foreground">These goal measurements do not include the manually reported plan results above. They are recorded separately.</p><SelectedGoalProgress/></details>}
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
