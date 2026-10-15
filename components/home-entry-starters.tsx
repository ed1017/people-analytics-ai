'use client';

import type {LocalGoal} from '@/lib/local-goals';
import {homeDemoExamples, homeDemoField, readHomeDemo} from '@/lib/home-demo-catalog';
import {pinnedActionPlans} from '@/lib/pinned-action-plans';

export function HomeEntryStarters({goals, workspaces, disabled, onSelect}: {
  goals: LocalGoal[];
  workspaces: Record<string, {fields: Record<string, unknown>}>;
  disabled: boolean;
  onSelect: (goal: LocalGoal, planId?: string) => void;
}) {
  const plans = pinnedActionPlans(goals, workspaces);
  return <section aria-label="Synthetic example plans" className="space-y-2">
    <p className="text-sm text-muted-foreground">Open a synthetic example plan, or ask your own question below.</p>
    <div className="flex flex-wrap gap-2">
      {homeDemoExamples.map(example => {
        const plan = plans.find(item => !item.legacy && item.goal.id === example.id && item.goal.statement === example.goal);
        const available = plan && readHomeDemo(workspaces[example.id]?.fields[homeDemoField], example.id);
        return <button key={example.id} type="button" disabled={disabled || !available}
          onClick={() => {if (!disabled && available) onSelect(plan.goal, plan.planId ?? undefined);}}
          className="min-h-11 rounded-lg border px-4 py-3 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          <span className="block font-semibold">{example.key === 'capacity' ? 'Plan headcount' : example.goal}</span>
          <span className="block text-xs text-muted-foreground">{available ? 'Open saved synthetic example' : 'Example unavailable'}</span>
        </button>;
      })}
    </div>
    <p className="text-xs text-muted-foreground">Scope, costs and outcomes are fictional assumptions. Opening a plan does not execute it or change the workforce baseline.</p>
  </section>;
}
