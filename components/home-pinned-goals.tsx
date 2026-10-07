"use client";

import {useDecisionStorage} from '@/components/decision-store';
import {pinnedGoalPlanStatus} from '@/lib/home-pinned-goals';
import type {LocalGoal} from '@/lib/local-goals';
import {homeDemoField,readHomeDemo} from '@/lib/home-demo-catalog';

export function HomePinnedGoals({goals,activeGoalId,ready,disabled,packet,onSelect}:{
  goals:LocalGoal[];activeGoalId:string;ready:boolean;disabled:boolean;packet:unknown;onSelect:(goal:LocalGoal)=>void;
}) {
  const storage=useDecisionStorage();
  return <aside aria-labelledby="home-pinned-goals-title" className="min-w-0 space-y-3 rounded-lg border bg-card p-4">
    <h2 id="home-pinned-goals-title" className="text-base font-semibold">Pinned Goals</h2>
    {!ready?<p role="status" className="text-sm text-muted-foreground">Loading saved goals…</p>:!goals.length?<p className="text-sm text-muted-foreground">Choose Pin as goal in a response, or use New goal above.</p>:<>
      <p className="text-xs text-muted-foreground">Select a goal to reopen its plan. Saved plans may need review when evidence changes.</p>
      <ul className="max-h-[65dvh] space-y-2 overflow-y-auto">
        {goals.map(goal=>{const fields=storage.data.workspaces[goal.id]?.fields,demo=readHomeDemo(fields?.[homeDemoField],goal.id),status=pinnedGoalPlanStatus(goal.id,fields,packet);return <li key={goal.id}>
          <button type="button" disabled={disabled} aria-pressed={activeGoalId===goal.id} aria-label={`Open goal: ${goal.statement}`} aria-describedby={`pinned-goal-status-${goal.id}`} title={goal.statement} onClick={()=>onSelect(goal)} className="min-h-11 w-full rounded-md border p-3 text-left text-sm hover:bg-accent aria-pressed:border-primary aria-pressed:bg-accent disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring">
            <span className="line-clamp-2 break-words font-medium">{goal.statement}</span>
            {demo&&<span className="mt-1 block text-xs font-medium">Demo example</span>}
            <span id={`pinned-goal-status-${goal.id}`} className="mt-1 block text-xs text-muted-foreground">{status==='saved'?(demo?'Example plan attached':'Draft prepared'):status==='review'?'Saved plan needs review':'No plan yet'}</span>
          </button>
        </li>})}
      </ul>
    </>}
  </aside>;
}
