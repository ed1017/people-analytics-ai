"use client";
import { useRef } from "react";
import type { AppPage } from "@/lib/types";

import { planningGuideSteps, getPlanningGuide } from "@/lib/planning-guide";

export function PlanningGuide({ page }: { page: AppPage }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = getPlanningGuide(page);
  if (!current) return null;
  return <>
    <button ref={trigger} type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" className="min-h-11 shrink-0 rounded-lg border border-primary bg-card px-4 py-2 text-sm font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Planning guide</button>
    <dialog ref={dialog} aria-labelledby="planning-guide-title" onClose={() => trigger.current?.focus()} className="m-auto max-h-[80dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto rounded-xl border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/60">
      <div className="flex items-start justify-between gap-3"><h2 id="planning-guide-title" className="text-xl font-semibold">Planning guide</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Close Planning guide" className="min-h-11 rounded border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Close</button></div>
      <p className="mt-3 text-sm font-semibold text-primary">Start here · {current.title}</p><p className="mt-2 text-base leading-relaxed">{current.first}</p>
      <p className="my-4 rounded-lg border border-primary/40 bg-secondary p-3 text-sm font-semibold">Work through this plan with Finance to validate costs, budgets, assumptions, and tradeoffs.</p>
      <details><summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">See the full Planning sequence</summary><ol className="mt-3 list-decimal space-y-3 pl-5 text-sm">{planningGuideSteps.map(step=><li key={step.page}><strong>{step.title}:</strong> {step.first}</li>)}</ol><p className="mt-3 text-sm">Use Labor Cost Planning for available financial context. Use Development Planning for explicitly selected learning quotes and user-entered cost assumptions.</p></details>
      <details className="mt-4"><summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">Limits to keep in mind</summary><p className="mt-3 text-sm leading-relaxed">Planning uses defined calculations, not machine-learning forecasts. Dates describe a planning period; the stored Baseline has no verified refresh date. Labor costs are in US dollars; development quotes retain their labeled currency without conversion. Costs and timing are supported only where supplied by evidence, user assumptions or a defined calculation. Course coverage is not completed learning; preferences are not available movers; historical hiring time is not a forecast. Do not use these aggregates to rank people or make individual employment decisions. Opening this guide or navigating pages does not run a scenario, carry evidence or change assumptions.</p></details>
    </dialog>
  </>;
}
