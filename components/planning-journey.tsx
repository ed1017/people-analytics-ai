'use client';

import { planningJourney } from '@/lib/planning-journey';
import type { AppPage } from '@/lib/types';

export function PlanningJourney({activePage, onNavigate}: {activePage: AppPage; onNavigate: (page: AppPage) => void}) {
  return <details className="planning-steps"><summary>Planning steps · {planningJourney.find(step=>step.page===activePage)?.label??"Choose a step"}</summary><nav aria-label="Planning journey" className="flex flex-wrap gap-1 border-b px-5 py-2 text-xs">
    {planningJourney.map((step, index) => <button key={step.page} type="button" onClick={() => onNavigate(step.page)} aria-current={activePage === step.page ? 'page' : undefined} className={`min-h-10 rounded-md px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-ring ${activePage === step.page ? 'bg-accent font-semibold text-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
      <span aria-hidden="true" className="mr-2 opacity-60">{index + 1}</span>{step.label}
    </button>)}
  </nav></details>;
}
