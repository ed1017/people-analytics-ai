"use client";

import { useState, type ReactNode } from "react";
import type { AppPage } from "@/lib/types";

export function HomeGettingStarted({ busy, onNavigate, onStartDemo, status }: {
  busy: boolean;
  onNavigate: (page: AppPage) => void;
  onStartDemo: () => void;
  status?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <section aria-label="Intro & instructions" className="min-w-0 flex-1 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-x-3">
      <button type="button" aria-expanded={open} aria-controls="home-starting-instructions" onClick={() => setOpen(value => !value)} className="min-h-11 rounded px-1 text-xs font-medium text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Intro &amp; instructions <span aria-hidden="true">{open ? "−" : "+"}</span></button>
      {status}
    </div>
    <div id="home-starting-instructions" hidden={!open} className="space-y-3 pb-2 leading-relaxed">
      <p>The purpose of this product is to showcase the evolution of dashboards and strategic workforce planning from insight → action → outcomes.</p>
      <p>By incorporating AI into People Analytics and strategic workforce planning, it aims to help organizations turn workforce challenges into practical Action Plans, with clear ownership and accountability for results.</p>
      <p className="text-xs text-muted-foreground">Demo only. Review plans with your team before acting.</p>
      <h4 className="font-semibold">From question to action</h4>
      <ol className="list-decimal space-y-2 pl-5">
        <li><strong>Find a problem</strong> — Ask AI or <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("workforce")}>explore your data</button>.</li>
        <li><strong>Pin your goals</strong> — Save multiple goals and get proposed Action Plans for each.</li>
        <li><strong>Choose a plan</strong> — Tailor it to your needs, adjust assumptions, calculate and attach it to your goal.</li>
        <li><strong>Share (TBD)</strong> — Share your Action Plan with owners and stakeholders.</li>
        <li><strong>Track (TBD)</strong> — Monitor progress and outcomes.</li>
      </ol>
      <p className="text-xs text-muted-foreground">You can also use this as a traditional dashboard—explore workforce data through the left-hand menu.</p>
      <p className="text-xs text-muted-foreground">Goals and drafts are saved in this browser within the limits in Browser storage details. Explore <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("workforce")}>Workforce</button>, <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("occupational-references")}>Intelligence</button> or <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("planning-overview")}>Planning</button>. Opening a page does not carry evidence or run a model. Source coverage and limitations are in Data details.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => {setOpen(false);onStartDemo();}} className="min-h-11 rounded border px-3 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Try a guided example</button>
      </div>
    </div>
  </section>;
}
