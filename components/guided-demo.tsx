"use client";
import { useEffect, useRef } from "react";
import type { AppPage } from "@/lib/types";

import { DEVELOPMENT_DEMO_GOAL } from "@/lib/home-decision-journey";
export { DEVELOPMENT_DEMO_GOAL } from "@/lib/home-decision-journey";
const button = "rounded border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

export function GuidedDemo({ page, onNavigate, onClose, onUseGoal, hasOptions }: { page: AppPage; onNavigate: (page: AppPage) => void; onClose: () => void; onUseGoal: () => void; hasOptions: boolean }) {
  const guide = useRef<HTMLElement>(null);
  useEffect(() => { guide.current?.focus(); }, [page]);
  const stage = page === "skills" ? 1 : page === "training-coaching" ? 2 : page === "development-planning" ? 3 : 0;
  return <section ref={guide} tabIndex={-1} aria-label="Optional guided demo" className="m-4 min-w-0 rounded-lg border border-primary/50 bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Guided example · AI capability</h2><button className={button} onClick={onClose}>Exit demo</button></div>
    <p className="mt-2 font-medium">“{DEVELOPMENT_DEMO_GOAL}.”</p>
    <p className="mt-1 text-xs text-muted-foreground">Fictional scenario, not a customer case study or a finding about your workforce. You choose every step. Exiting keeps your questions, quotes and entered assumptions.</p>
    <details className="mt-2 text-sm"><summary className="min-h-11 cursor-pointer py-2 font-medium">Example steps</summary>
    {stage===0?<ol className="my-3 list-decimal space-y-1 pl-5 text-sm"><li>Send the example question on Home. Review the answer, then pin the goal you want to pursue.</li><li>Choose a Plan tab. Describe changes in chat. Attach Action Plan opens the assumption and calculation review, including fields chat cannot change.</li><li>Calculate, save and attach only after reviewing the assumptions. AI capability gains and retention effects remain unknown.</li></ol>:<p className="my-3 text-sm">{stage===1?'Inspect recorded skill requirements and learning coverage. A recorded gap does not establish who is available or whether development will work.':stage===2?'Choose a simulated quote, review the example goal and explicitly carry both to Development Planning. No quote is selected for you.':'Enter participants, sessions, fees and hours for the carried quote. Calculate its cost assumptions; add another quote only to compare the same scope. Outcomes remain unknown.'}</p>}

    <div className="flex flex-wrap gap-2">
      {stage > 0 && <button className={button} onClick={() => onNavigate(stage === 1 ? "home" : stage === 2 ? "skills" : "training-coaching")}>Back</button>}
      {stage === 0 && <button className={button} onClick={() => { onNavigate("home"); window.requestAnimationFrame(() => document.getElementById("overview-question")?.focus()); }}>Return to Home question</button>}
      {stage === 0 && <button className={button} onClick={() => onNavigate("skills")}>Inspect Skills evidence</button>}
      {stage === 1 && <button className={button} onClick={() => onNavigate("training-coaching")}>Explore Training &amp; Coaching</button>}
      {stage === 2 && <button className={button} onClick={onUseGoal}>Use example development goal</button>}
      {stage === 3 && <button className={button} onClick={() => onNavigate("training-coaching")}>{hasOptions ? "Choose another quote" : "Choose a quote first"}</button>}
      {stage === 3 && <button className={button} onClick={() => { onClose(); onNavigate("decision-brief"); }}>Compare constraints and build the brief</button>}
    </div>
    </details>
  </section>;
}
