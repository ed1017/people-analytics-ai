"use client";
import { useEffect, useRef, useState } from "react";
import type { AppPage } from "@/lib/types";

export const GUIDED_EXAMPLE_PROMPT = "Plan how to add 3 data analyst roles over 6 months using hiring, internal moves or development. Treat this as a fictional additional-capacity goal, not replacement hiring. Propose practical Action Plan alternatives, distinguish assumptions from evidence, and leave missing costs and availability unknown.";
const steps = [
  ["Send the example", "On Home, use the example prompt below, review or edit it, then choose Send. Ordinary workforce questions still work. Nothing is sent by opening this guide."],
  ["Pin your goal", "Review the response and answer any clarification in chat. Choose Pin as goal only when the goal is right. Pin explicitly requests Action Plan drafts; it does not calculate or attach anything."],
  ["Review Action Plans", "Read the Action Plans for your goal panel. Choose a Plan tab and inspect Details and Why these plans. Proposals can be fewer than expected or unavailable; they are not a count of scenarios searched."],
  ["Compare and describe a change", "Choose Compare Action Plans when multiple plans are available. Select the plan you want to change, then describe a supported change in chat and choose Send. For example: set target additional roles to 4. Review the proposed difference; no change is applied yet."],
  ["Apply the reviewed change", "Choose Apply changes on the Action Plan panel to accept the exact reviewed change into its working draft. If the text, goal or plan changed, Send again and review the new difference. Existing attached versions remain unchanged."],
  ["Review and attach explicitly", "Expand the Action Plan panel if collapsed, then choose Attach Action Plan. Check Review plan fields and choose Review calculation. Resolve missing inputs or acknowledge listed unknowns, then review and confirm attachment, including any linked planning fields. Opening the review never attaches automatically; Cancel attachment review keeps you in control."],
] as const;
const button = "min-h-11 rounded border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export function GuidedDemo({page,onNavigate,onClose,onUsePrompt,canUsePrompt}:{page:AppPage;onNavigate:(page:AppPage)=>void;onClose:()=>void;onUsePrompt:()=>void;canUsePrompt:boolean}) {
 const [step,setStep]=useState(0),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[step]);
 return <section aria-label="Optional guided demo" className="m-4 min-w-0 rounded-lg border border-primary/50 bg-card p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Guided example · additional role capacity</h2><button className={button} onClick={onClose}>Exit example</button></div>
  <p className="mt-2 text-xs text-muted-foreground">Fictional planning assumptions, not workforce findings or predicted outcomes. This guide does not track completion or run actions. Your questions, goals and drafts are kept when you exit or restart.</p>
  <h3 ref={heading} tabIndex={-1} className="mt-3 font-semibold">Step {step+1} of {steps.length}: {steps[step][0]}</h3><p className="my-2 text-sm">{steps[step][1]}</p>
  {step===0&&<><blockquote className="my-3 break-words border-l-2 pl-3 text-sm">{GUIDED_EXAMPLE_PROMPT}</blockquote><button className={button} disabled={!canUsePrompt||page!=="home"} onClick={onUsePrompt}>Use example prompt</button>{!canUsePrompt&&<p className="mt-2 text-xs">Your current goal or draft is kept. To load this separate example, select General exploration and use an empty chat box after keeping any draft you need. Wait for any pending request to finish.</p>}</>}
  <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={step===0} onClick={()=>setStep(value=>value-1)}>Previous step</button><button className={button} disabled={step===steps.length-1} onClick={()=>setStep(value=>value+1)}>Next step</button><button className={button} onClick={()=>{setStep(0);heading.current?.focus();}}>Restart walkthrough</button><button className={button} onClick={()=>{onNavigate("home");requestAnimationFrame(()=>document.getElementById("overview-question")?.focus());}}>Return to Home question</button></div>
 </section>;
}
