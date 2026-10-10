"use client";

import {solutionConversationEnabled} from '@/lib/home-solution-conversation';
import {pinnedActionPlans} from '@/lib/pinned-action-plans';
import {useDecisionStorage} from '@/components/decision-store';
import {pinnedGoalPlanStatus} from '@/lib/home-pinned-goals';
import type {LocalGoal} from '@/lib/local-goals';
import {homeDemoField,readHomeDemo} from '@/lib/home-demo-catalog';
import {homeGuideOriginField,readHomeGuideOrigin} from '@/lib/home-guide-origin';

export function HomePinnedGoals({goals,activeGoalId,ready,disabled,packet,onSelect}:{
  goals:LocalGoal[];activeGoalId:string;ready:boolean;disabled:boolean;packet:unknown;onSelect:(goal:LocalGoal,planId?:string)=>void;
}) {
  const storage=useDecisionStorage();
  const entries=solutionConversationEnabled?pinnedActionPlans(goals,storage.data.workspaces):[];
  if(solutionConversationEnabled)return <aside aria-label="Pinned Action Plans" className="min-w-0 space-y-3 rounded-lg border bg-card p-4">
    <h2 className="text-base font-semibold">Pinned Action Plans</h2>
    <p className="text-sm text-muted-foreground">Each plan keeps its goal, success measures and progress together. Review a proposal, then choose Pin Action Plan to keep it here.</p>
    {!ready?<p role="status">Loading saved plans…</p>:<>
      <ul className="max-h-[65dvh] space-y-2 overflow-y-auto">{entries.filter(item=>!item.legacy).map(item=><li key={item.key}><button type="button" disabled={disabled} aria-label={`Open Action Plan: ${item.name}`} onClick={()=>onSelect(item.goal,item.planId??undefined)} className="min-h-11 w-full rounded-md border p-3 text-left text-sm hover:bg-accent disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"><span className="block break-words font-semibold">{item.name}</span><span className="mt-1 block">Goal: {item.goal.statement}</span>{(readHomeDemo(storage.data.workspaces[item.goal.id]?.fields[homeDemoField],item.goal.id)||readHomeGuideOrigin(storage.data.workspaces[item.goal.id]?.fields[homeGuideOriginField],item.goal.id))&&<span className="mt-1 block font-medium">Demo example</span>}<span className="mt-1 block text-muted-foreground">Saved proposal · review before acting</span></button></li>)}</ul>
      {entries.some(item=>item.legacy)&&<details><summary className="min-h-11 cursor-pointer py-2 font-medium">Earlier saved goals and drafts</summary><p className="text-sm">Your earlier work is kept. Open it to review linked records or request an Action Plan.</p><ul className="space-y-2">{entries.filter(item=>item.legacy).map(item=><li key={item.key}><button type="button" disabled={disabled} className="min-h-11 w-full rounded border p-3 text-left text-sm" onClick={()=>onSelect(item.goal)}>{item.goal.statement}</button></li>)}</ul></details>}
    </>}
  </aside>;
  return <aside aria-labelledby="home-pinned-goals-title" className="min-w-0 space-y-3 rounded-lg border bg-card p-4">
    <h2 id="home-pinned-goals-title" className="text-base font-semibold">Pinned Goals</h2>
    {!ready?<p role="status" className="text-sm text-muted-foreground">Loading saved goals…</p>:!goals.length?<p className="text-sm text-muted-foreground">Choose Pin as goal in a response, or use New goal above.</p>:<>
      <p className="text-xs text-muted-foreground">Select a goal to reopen its plan. Saved plans may need review when evidence changes.</p>
      <ul className="max-h-[65dvh] space-y-2 overflow-y-auto">
        {goals.map(goal=>{const fields=storage.data.workspaces[goal.id]?.fields,demo=readHomeDemo(fields?.[homeDemoField],goal.id)||readHomeGuideOrigin(fields?.[homeGuideOriginField],goal.id),status=pinnedGoalPlanStatus(goal.id,fields,packet);return <li key={goal.id}>
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
