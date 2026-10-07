"use client";
import { useEffect, useRef, useState } from "react";
import type { AppPage } from "@/lib/types";

import { GUIDED_EXAMPLE_PROMPT } from "@/lib/home-decision-journey";
export { GUIDED_EXAMPLE_PROMPT } from "@/lib/home-decision-journey";
const steps = [
  ["Ask a question", "Use the example prompt, edit it if you like, then choose Send. You can also ask an ordinary workforce question. Opening this guide sends nothing."],
  ["Pin when you want to plan", "Read the answer and continue the conversation. Pin as goal is optional: use it when you want to save a goal and request Action Plan choices."],
  ["Choose an Action Plan", "Select an Action Plan tab and read its approach, proposed owners, budget, timeline and outcome. Open Show assumptions or Why these plans for more detail."],
  ["Attach your choice", "Choose Attach Action Plan to save the selected version to your goal in one click. If the app finds a conflict or changed context, review it first."],
  ["Adjust it in chat", "Describe a change to the selected plan, then Send. For this example, try: set target additional roles to 4. Review the change and choose Apply changes, then Attach Action Plan to save the new version. Earlier attachments stay in history."],
  ["Return to saved work", "Select a Pinned Goal to reopen its latest selected plan. Use Collapse Action Plan or Show Action Plan to manage the view. Country, Business Unit and Level filter workforce evidence; they do not change a plan’s assumed population. General exploration lets you start another question."],
] as const;
const button = "min-h-11 rounded border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export function GuidedDemo({page,onNavigate,onClose,onUsePrompt,canUsePrompt}:{page:AppPage;onNavigate:(page:AppPage)=>void;onClose:()=>void;onUsePrompt:()=>void;canUsePrompt:boolean}) {
 const [step,setStep]=useState(0),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[step]);
 return <section aria-label="Optional guided demo" className="m-4 min-w-0 rounded-lg border border-primary/50 bg-card p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Guided example</h2><button className={button} onClick={onClose}>Exit example</button></div>
  <p className="mt-2 text-xs text-muted-foreground">Fictional planning assumptions, not predicted outcomes. Your questions and saved work are kept when you exit.</p>
  <h3 ref={heading} tabIndex={-1} className="mt-3 font-semibold">Step {step+1} of {steps.length}: {steps[step][0]}</h3><p className="my-2 text-sm">{steps[step][1]}</p>
  {step===0&&<><blockquote className="my-3 break-words border-l-2 pl-3 text-sm">{GUIDED_EXAMPLE_PROMPT}</blockquote><button className={button} disabled={!canUsePrompt||page!=="home"} onClick={onUsePrompt}>Use example prompt</button>{!canUsePrompt&&<p className="mt-2 text-xs">Your current goal or draft is kept. To load this separate example, select General exploration and use an empty chat box after keeping any draft you need. Wait for any pending request to finish.</p>}</>}
  {step===steps.length-1&&<p className="text-xs text-muted-foreground">Share Action Plan (TBD) and Track results (TBD) are future features.</p>}
  <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={step===0} onClick={()=>setStep(value=>value-1)}>Previous step</button><button className={button} disabled={step===steps.length-1} onClick={()=>setStep(value=>value+1)}>Next step</button>{page!=="home"&&<button className={button} onClick={()=>{onNavigate("home");requestAnimationFrame(()=>document.getElementById("overview-question")?.focus());}}>Return to Home question</button>}</div>
 </section>;
}
