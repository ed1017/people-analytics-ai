"use client";
import { useEffect, useRef } from "react";
import type { AppPage } from "@/lib/types";

import { DEVELOPMENT_DEMO_GOAL } from "@/lib/home-decision-journey";
export { DEVELOPMENT_DEMO_GOAL } from "@/lib/home-decision-journey";
const button = "rounded border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

export function GuidedDemo({ page, onNavigate, onClose, onUseGoal, hasOptions }: { page: AppPage; onNavigate: (page: AppPage) => void; onClose: () => void; onUseGoal: () => void; hasOptions: boolean }) {
  const guide = useRef<HTMLElement>(null);
  useEffect(() => { guide.current?.focus(); }, [page]);
  const stage = page === "skills" ? 1 : page === "learning-development" ? 2 : page === "development-planning" ? 3 : 0;
  return <section ref={guide} tabIndex={-1} aria-label="Optional guided demo" className="m-4 min-w-0 rounded-lg border border-primary/50 bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Question to action · Step {stage + 1} of 4</h2><button className={button} onClick={onClose}>Exit demo</button></div>
    <p className="mt-2 font-medium">“{DEVELOPMENT_DEMO_GOAL}.”</p>
    <p className="mt-1 text-xs text-muted-foreground">Fictional scenario, not a customer case study or a finding about your workforce. You choose every step. Exiting keeps your questions, quotes and entered assumptions.</p>
    <p className="my-3 text-sm">{stage === 0 ? "Start on Home: send the example question placed in the input, or bring your own issue. Discuss the evidence and your goal, then choose Develop a full action plan beside the input. It continues that conversation and labels missing costs and assumptions. Only then explore relevant evidence or comparisons; this example does not promise AI proficiency or staffing outcomes." : stage === 1 ? "Use your question and draft action plan to decide what evidence to check. Could development help? Inspect recorded skill requirements, gaps and learning coverage below. Look for relevant evidence; do not assume an AI skill gap exists. Need help? Ask a question in the AI panel. Then explore training or coaching options in Learning & Development." : stage === 2 ? "What could we try, and what would it cost? Review the clearly simulated training/coaching quotes below, or add your own unverified quote. None proves AI capability. Select one, enter your goal (or use the example goal), then click Carry selected quote and goal to Development Planning. No quote is selected for you." : "Can we compare the cost assumptions? Enter participants, sessions, fees and hours for your chosen quote. Add your loaded hourly cost only if known. For a second option, choose another quote in Learning & Development. Compare costs against the same goal; unknowns remain unknown. There is no modeled ROI, skill gain or automatic headcount change."}</p>
    <div className="flex flex-wrap gap-2">
      {stage > 0 && <button className={button} onClick={() => onNavigate(stage === 1 ? "home" : stage === 2 ? "skills" : "learning-development")}>Back</button>}
      {stage === 0 && <button className={button} onClick={() => { onNavigate("home"); window.requestAnimationFrame(() => document.getElementById("overview-question")?.focus()); }}>Ask the question on Home</button>}
      {stage === 1 && <button className={button} onClick={() => onNavigate("learning-development")}>Explore Learning &amp; Development</button>}
      {stage === 2 && <button className={button} onClick={onUseGoal}>Use example development goal</button>}
      {stage === 3 && <button className={button} onClick={() => onNavigate("learning-development")}>{hasOptions ? "Choose another quote" : "Choose a quote first"}</button>}
      {stage === 3 && <button className={button} onClick={onClose}>Finish demo</button>}
    </div>
  </section>;
}
