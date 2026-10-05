"use client";

import { useState } from "react";
import type { AppPage } from "@/lib/types";

export function HomeGettingStarted({ busy, onNavigate, onStartDemo }: {
  busy: boolean;
  onNavigate: (page: AppPage) => void;
  onStartDemo: () => void;
}) {
  const [open, setOpen] = useState(false);
  return <section aria-labelledby="home-getting-started-title" className="space-y-2 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <h3 id="home-getting-started-title" className="text-base font-semibold">Getting started</h3>
      <button type="button" aria-expanded={open} aria-controls="home-starting-instructions" onClick={() => setOpen(value => !value)} className="min-h-11 rounded px-1 text-xs font-medium text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">{open ? "Hide instructions" : "Show instructions"}</button>
    </div>
    <p>The purpose of this product is to showcase the evolution of dashboards and strategic workforce planning from insight → action → outcomes. By incorporating AI into People Analytics and strategic workforce planning, it aims to help organizations turn workforce challenges into practical Action Plans, with clear ownership and accountability for results.</p>
    <p className="text-xs text-muted-foreground">Demo only. Review plans with your team before acting.</p>
    <div id="home-starting-instructions" hidden={!open} className="space-y-3 pt-1 leading-relaxed">
      <h4 className="font-semibold">From question to action</h4>
      <ol className="list-decimal space-y-2 pl-5">
        <li><strong>Find a problem</strong> — Ask AI or <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("workforce")}>explore your data</button>.</li>
        <li><strong>Pin a goal</strong> — Get proposed Action Plans.</li>
        <li><strong>Choose a plan</strong> — Tailor it to your needs, adjust assumptions, calculate and attach it to your goal.</li>
        <li><strong>Track results</strong> — Coming soon.</li>
      </ol>
      <p className="text-xs text-muted-foreground">Costs, staffing and timing stay unknown until assumptions are reviewed and calculated. Calculate combined plan runs local math; Save bundle draft keeps edits; Attach solution to goal saves a reviewed version. Applying values to planning tools requires a separate review. These actions do not approve or carry out real-world changes.</p>
      <p className="text-xs text-muted-foreground">Goals and drafts are saved in this browser within the limits in Browser storage details. Explore <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("workforce")}>Workforce</button>, <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("occupational-references")}>Intelligence</button> or <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("planning-overview")}>Planning</button>. Opening a page does not carry evidence or run a model. Source coverage and limitations are in Data details.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onStartDemo} className="min-h-11 rounded border px-3 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Try a guided example</button>
        <button type="button" onClick={() => onNavigate("decision-brief")} className="min-h-11 rounded border px-3 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Build AI capability without net headcount</button>
      </div>
    </div>
  </section>;
}
