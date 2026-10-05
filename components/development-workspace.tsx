"use client";
import { PlanningGuide } from "@/components/planning-guide";

import { useState } from "react";
import { blankDevelopmentQuote, developmentCatalog, developmentCost, quoteInputs, validateQuote, type DevelopmentQuote, type DevelopmentOption, type DevelopmentInputs } from "@/lib/development-costs";

const control = "development-control mt-1 w-full min-w-0 rounded border bg-background p-2 text-sm";
const button = "development-button rounded border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50";
function Field({ label, value, onChange, numeric = false }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean }) {
  return <label className="block min-w-0 text-sm">{label}<input className={control} value={value} maxLength={numeric ? 16 : 300} inputMode={numeric ? "decimal" : undefined} onChange={e => onChange(e.target.value)} /></label>;
}
export type DevelopmentSession = { custom: DevelopmentQuote[]; draft: DevelopmentQuote; goal: string; selected: string; options: DevelopmentOption[] };
export const emptyDevelopmentSession = (): DevelopmentSession => ({ custom: [], draft: blankDevelopmentQuote(), goal: "", selected: "", options: [] });

export function DevelopmentCatalog({ session, onChange, onOpen }: { session: DevelopmentSession; onChange: (session: DevelopmentSession) => void; onOpen: () => void }) {
  const [errors, setErrors] = useState<string[]>([]);
  const quotes = [...developmentCatalog, ...session.custom];
  const chosen = quotes.find(q => q.id === session.selected);
  const updateDraft = (key: keyof DevelopmentQuote, value: string) => onChange({ ...session, draft: { ...session.draft, [key]: value } });
  const carry = () => {
    if (!chosen || !session.goal.trim() || session.options.length >= 3) return;
    onChange({ ...session, options: [...session.options, { quote: { ...chosen }, goal: session.goal.trim(), inputs: quoteInputs(chosen) }] });
    onOpen();
  };
  return <section aria-label="Development quote catalog" className="development-catalog mb-6 min-w-0 rounded-lg border p-4">
    <h2 className="text-xl font-semibold">Explore training and coaching</h2>
    <p className="mt-2 text-sm text-muted-foreground">All named providers below are fictional; their quotes are simulated examples, not vendor offers or evidence of results. Custom quotes are unverified user input. With a selected goal, quotes and inputs are saved in this browser; without a goal they last only in this tab. Workforce filters do not select participants.</p>
    <div className="development-quotes my-4 grid min-w-0 gap-3 xl:grid-cols-3">{quotes.map(q => <label key={q.id} className="development-quote min-w-0 rounded border p-3 text-sm">
      <span className="flex items-start gap-2"><input type="radio" name="development-quote" checked={session.selected === q.id} onChange={() => onChange({ ...session, selected: q.id })} /><strong className="break-words">{q.provider}</strong></span>
      <span className="mt-2 block">{q.provenance === "simulated" ? "Simulated quote · Fictional provider" : "User-provided · Unverified"}</span>
      <span className="mt-2 block">{q.kind}: {q.focus}</span><span className="block">{q.format}</span>
      <span className="block">{q.sessions || "Unknown"} sessions × {q.hours || "unknown"} hours per participant; cohort capacity {q.capacity || "unknown"}.</span>
      <span className="mt-2 block font-medium">{q.fee ? `${q.currency} ${q.fee}` : "Cost unknown"} per {q.basis === "person" ? "person" : "cohort package"} per session</span>
    </label>)}</div>
    <Field label="Development goal" value={session.goal} onChange={goal => onChange({ ...session, goal })} />
    <div className="mt-3 flex flex-wrap gap-2"><button className={`${button} development-primary`} disabled={!chosen || !session.goal.trim() || session.options.length >= 3} onClick={carry}>Carry selected quote and goal to Development Planning</button><button className={button} onClick={onOpen}>Open Development Planning</button></div>
    <p className="mt-2 text-xs text-muted-foreground">Up to three comparison options. Carry copies only your selected quote and goal; it does not enroll or allocate anyone. Remove a comparison option to make room.</p>
    <details className="mt-5"><summary className="cursor-pointer font-medium">Add a custom vendor or coach</summary>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <Field label="Provider or coach" value={session.draft.provider} onChange={v => updateDraft("provider",v)} />
        <label className="text-sm">Service type<select className={control} value={session.draft.kind} onChange={e => updateDraft("kind",e.target.value)}><option>Training</option><option>Leadership coaching</option></select></label>
        <Field label="Focus / skills" value={session.draft.focus} onChange={v => updateDraft("focus",v)} />
        <Field label="Delivery format" value={session.draft.format} onChange={v => updateDraft("format",v)} />
        {([["hours","Hours per participant per session"],["sessions","Quoted sessions"],["capacity","Cohort capacity"],["fee","Fee per unit per session (blank = unknown)"]] as const).map(([key,label]) => <Field key={key} label={label} numeric value={session.draft[key]} onChange={v => updateDraft(key,v)} />)}
        <label className="text-sm">Currency<select className={control} value={session.draft.currency} onChange={e => updateDraft("currency",e.target.value)}>{["USD","EUR","GBP"].map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm">Fee basis<select className={control} value={session.draft.basis} onChange={e => updateDraft("basis",e.target.value)}><option value="person">Per person per session</option><option value="cohort">Per cohort package per session</option></select></label>
      </div>
      <p className="mt-2 text-xs">Numeric blanks stay unknown. Quote fees exclude additional costs until you enter them in Planning.</p>
      {errors.length > 0 && <p role="alert" className="mt-2 text-sm text-destructive">{errors.join(" ")}</p>}
      <button className={`${button} mt-3`} disabled={session.custom.length >= 5} onClick={() => { const issues = validateQuote(session.draft); setErrors(issues); if (!issues.length) { const quote = { ...session.draft, id: `custom-${session.custom.length + 1}` }; onChange({ ...session, custom: [...session.custom, quote], selected: quote.id, draft: blankDevelopmentQuote() }); } }}>Add custom quote</button><span className="ml-2 text-xs">Maximum five custom quotes.</span>
    </details>
  </section>;
}

export function DevelopmentPlanning({ session, onChange, onCatalog }: { session: DevelopmentSession; onChange: (session: DevelopmentSession) => void; onCatalog: () => void }) {
  return <section className="development-planning min-w-0 p-6"><div className="flex flex-wrap items-center gap-3"><PlanningGuide page="development-planning" /></div>
    <p className="my-3 text-sm text-muted-foreground">Compare selected quotes against your stated goals. These are editable cost assumptions, not approved budgets, training outcomes or staffing decisions. No ROI, proficiency gains or headcount conversion is estimated. Saved with a selected goal in this browser; without a goal, quotes and inputs remain in this tab.</p>
    <button className={button} onClick={onCatalog}>Choose another quote in Intelligence → Training & Coaching</button>
    {!session.options.length && <p className="mt-6">Select a quote and enter a development goal in Intelligence → Training & Coaching, then explicitly carry them here.</p>}
    <div className="development-options mt-4 grid min-w-0 gap-4 xl:grid-cols-3">{session.options.map((option,index) => {
      const q = option.quote, result = developmentCost(q, option.inputs);
      const money = (n: number | null) => n === null ? "Unknown" : new Intl.NumberFormat("en-US", { style: "currency", currency: q.currency }).format(n);
      const update = (key: keyof DevelopmentInputs, value: string) => onChange({ ...session, options: session.options.map((o,i) => i === index ? { ...o, inputs: { ...o.inputs, [key]: value } } : o) });
      return <article key={index} className="development-option min-w-0 rounded-lg border p-4" aria-label={`Development option ${index+1}`}><h2 className="break-words text-lg font-semibold">{q.provider}</h2>
        <p className="text-sm">{q.provenance === "simulated" ? "Fictional provider · Simulated quote" : "User-provided quote · Unverified"} · {q.currency}</p>
        <p className="my-3 break-words text-sm"><strong>Carried goal:</strong> {option.goal}</p>
        <p className="mb-3 text-sm">{q.focus} · {q.format}. Quoted: {q.sessions || "unknown"} sessions, {q.hours || "unknown"} hours/session, capacity {q.capacity || "unknown"}. Fee basis: per {q.basis === "person" ? "person" : "cohort package"} per session.</p>
        <div className="grid gap-3">{([["participants","Participants"],["sessions","Sessions per participant"],["hours","Hours per participant per session"],["fee",`Quote fee (${q.currency}) per ${q.basis === "person" ? "person" : "cohort"} per session`],["additionalFees",`Additional fees total (${q.currency}; blank = unknown)`],["hourlyCost",`Loaded hourly cost (${q.currency}; optional)`]] as const).map(([key,label]) => <Field key={key} numeric label={label} value={option.inputs[key]} onChange={v => update(key,v)} />)}</div>
        {result.errors.length ? <p role="alert" className="mt-3 text-sm text-destructive">{result.errors.join(" ")}</p> : <dl className="mt-4 space-y-2 text-sm">
          {[["Cohorts",result.cohorts ?? "Unknown"],["Quote fees",money(result.quoteTotal)],["Cash cost incl. additional fees",money(result.cashCost)],["Employee hours",result.employeeHours ?? "Unknown"],["Employee time cost",money(result.timeCost)],["Total incl. employee time",money(result.total)]].map(([label,value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-medium">{value}</dd></div>)}
        </dl>}
        <button className={`${button} development-remove mt-4`} onClick={() => onChange({ ...session, options: session.options.filter((_,i) => i !== index) })}>Remove option {index+1}</button>
      </article>;
    })}</div>
    <p className="mt-5 text-sm text-muted-foreground">Calculation assumptions: every participant attends every session. Cohorts = participants ÷ quoted capacity, rounded up; cohort fees charge full capacity even when partly filled. Quote fees = people or cohorts × sessions × fee. Employee hours = participants × sessions × hours. Employee time cost = employee hours × your loaded hourly rate; this is modeled time value, not necessarily added cash spending. Cash cost adds your additional fees (tax, travel, materials); enter 0 only if you intend none. Totals round to two decimals. Blank inputs remain unknown. Compare like goals, attendance and scope; different currencies are not converted or ranked. Shared workforce filters do not change these assumptions.</p>
  </section>;
}
