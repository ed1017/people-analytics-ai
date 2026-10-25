"use client";
import {useState} from "react";
import {decisionStore,useDecisionStorage} from "@/components/decision-store";
import {calculateTrainingTiming,emptyTrainingTiming,timingFingerprint,type TrainingTimingInputs,type TrainingTimingResult} from "@/lib/training-timing";
import type {DevelopmentOption} from "@/lib/development-costs";
import type {DevelopmentSession} from "@/components/development-workspace";
type Saved={selected:string;input:TrainingTimingInputs;run:TrainingTimingResult|null};
const empty=():Saved=>({selected:"0",input:emptyTrainingTiming(),run:null});
const control="mt-1 w-full min-w-0 rounded border bg-background p-2 text-sm";
const button="min-h-10 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50";
const shown=(value:number|null)=>value===null?"Unknown":value.toLocaleString(undefined,{maximumFractionDigits:2});
export function TrainingTimingPanel({suggestedMonth}:{suggestedMonth:string}){
 const state=useDecisionStorage(),goalId=state.data.goals.activeId;
 return <section aria-label="Training and hiring timing" className="rounded-lg border p-4">
  <h2 className="text-xl font-semibold">Training and hiring timing</h2>
  <p className="mt-2 text-sm">Compare training dates, costs and an assumed capability effect. This separate scenario leaves headcount and Execution allocations unchanged.</p>
  {!goalId?<p className="mt-3 text-sm">Select or pin a goal, then carry a quote from Intelligence / Training &amp; Coaching to Development Planning.</p>:<TimingWorkspace key={goalId} goalId={goalId} suggestedMonth={suggestedMonth}/>}
 </section>;
}
function TimingWorkspace({goalId,suggestedMonth}:{goalId:string;suggestedMonth:string}){
 const storage=useDecisionStorage(),fields=storage.data.workspaces[goalId]?.fields??{};
 const saved=(fields.trainingTiming as unknown as Saved|undefined)??empty(),options=(fields.development as unknown as DevelopmentSession|undefined)?.options??[],option:DevelopmentOption|undefined=options[Number(saved.selected)];
 const [error,setError]=useState("");
 const persist=(patch:Partial<Saved>)=>decisionStore.setField(goalId,"trainingTiming",{...decisionStore.getField<Saved>(goalId,"trainingTiming",empty()),...patch});
 const change=(key:keyof TrainingTimingInputs,value:string)=>persist({input:{...saved.input,[key]:value}});
 const field=(key:keyof TrainingTimingInputs,label:string,kind="text")=><label key={key} className="min-w-0 text-sm">{label}<input type={kind} inputMode={kind==="month"||key==="metric"?undefined:"decimal"} value={saved.input[key]} maxLength={key==="metric"?80:16} className={control} onChange={e=>change(key,e.target.value)}/></label>;
 const current=Boolean(option&&saved.run?.fingerprint===timingFingerprint(option,saved.input)),result=saved.run;
 return <div className="mt-4 space-y-4">
  {!options.length?<p className="text-sm">No quote is carried for this goal. Select one in Intelligence / Training &amp; Coaching, then enter its attendance and costs in Development Planning.</p>:<label className="block text-sm">Carried development option<select className={control} value={saved.selected} onChange={e=>persist({selected:e.target.value})}>{options.map((o,i)=><option key={i} value={i}>{i+1}. {o.quote.provider} ({o.quote.currency})</option>)}</select></label>}
  {option&&<p className="text-sm">{option.quote.provenance==="simulated"?"Fictional quote":"User-provided, unverified quote"}: {option.quote.focus}. Planned attendance: {option.inputs.participants||"unknown"} participants × {option.inputs.sessions||"unknown"} sessions × {option.inputs.hours||"unknown"} hours. Edit attendance, fees and loaded hourly cost in Development Planning.</p>}
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {field("planningMonth","Comparison start month","month")}
   {field("startOffset","Training start offset (months; 0 = same month)")}
   {field("duration","Training duration (whole months)")}
  </div>
  {suggestedMonth&&<button type="button" className={button} onClick={()=>change("planningMonth",suggestedMonth)}>Use selected scenario start month {suggestedMonth}</button>}
  <p className="text-xs text-muted-foreground">Start offset 0 means no delay. Costs and booked attendance are spread evenly over full training months, including expected dropouts.</p>
  <details open><summary className="cursor-pointer font-semibold">Capability and working-time assumptions</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {field("impactLag","Impact lag after completion (months; blank = unknown)")}
   {field("ramp","Months to ramp to assumed effect (0 = immediate)")}
   {field("completionPct","Assumed completion rate (%)")}
   {field("successPct","Assumed success among completers (%)")}
   {field("workTimePct","Training hours taken from working time (%)")}
   {field("metric","Capability measure (your defined units)")}
   {field("gainPerSuccess","Assumed units gained per successful completer")}
  </div><p className="mt-2 text-xs text-muted-foreground">Blank rates, gains and timing stay unknown. Enter your own success and gain assumptions. Assumed impact starts the month after training ends plus your lag, then ramps over your entered months.</p></details>
  <details><summary className="cursor-pointer font-semibold">Optional hiring timing reference</summary><div className="mt-3 grid gap-3 sm:grid-cols-3">
   {field("hireOffset","Hiring process start offset (months)")}
   {field("hireLead","Assumed hiring lead time (months)")}
   {field("hireRamp","Assumed hiring ramp (months; 0 = immediate)")}
  </div><p className="mt-2 text-xs text-muted-foreground">Arrival = comparison start + hiring offset + your assumed lead time; readiness ramps from arrival. This timing reference excludes hiring counts and costs. Its readiness percentage is separate from training capability units.</p></details>
  <button type="button" className={button} disabled={!option} onClick={()=>{if(!option)return;try{const run=calculateTrainingTiming(option,saved.input);persist({run});setError("")}catch(e){setError((e as Error).message)}}}>Calculate training timeline</button>
  {error&&<p role="alert" className="text-sm text-destructive">{error} Previous completed timeline is retained.</p>}
  {result&&<section aria-label="Calculated training timeline" className="space-y-3 border-t pt-4">
   <h3 className="font-semibold">Illustrative monthly timeline</h3>
   <p className="text-sm" role="status">{current?"Uses the displayed quote and assumptions.":"Historical result: inputs or carried quote changed. Calculate again to update."} Saved locally for this goal, calculated {new Date(result.calculatedAt).toLocaleString()}.</p>
   <p className="text-sm">{result.option.quote.provider}; {result.option.quote.currency}. Training starts {result.trainingStart}, completes at the end of {result.completionMonth}. First possible assumed impact: {result.firstPossibleImpact??"Unknown"}; full assumed effect: {result.fullImpact??"Unknown"}. Hiring arrival: {result.hireArrival??"Unknown"}; full assumed hiring readiness: {result.hireFullReadiness??"Unknown"}.</p>
   <p className="text-sm">Expected completers {shown(result.expectedCompleters)}; expected successful completers {shown(result.expectedSuccessfulCompleters)}; full hypothetical capability {shown(result.fullCapabilityUnits)} {result.input.metric||"units (measure not supplied)"}. Total cash cost {result.option.quote.currency} {shown(result.cost.cashCost)}; employee time value {shown(result.cost.timeCost)}; combined {shown(result.cost.total)}. Planned attendance {shown(result.cost.employeeHours)} hours; diverted working time {shown(result.divertedHours)} hours.</p>
   <p className="text-xs text-muted-foreground">Capability uses your assumed gains and units. Employee time value is shown separately from cash spending.</p>
   <div className="max-h-[28rem] overflow-auto rounded border" tabIndex={0} aria-label="Monthly timing comparison table"><table className="min-w-[980px] w-full text-left text-xs"><caption className="p-2 text-left">36-month horizon. Costs in {result.option.quote.currency}; capability in {result.input.metric||"unspecified units"}; hiring readiness is a separate percentage assumption.</caption><thead className="bg-muted"><tr>{["Month","Training phase","Cash cost","Time value","Combined cost","Attendance hours","Diverted work hours","Expected completers","Capability units","Training ramp %","Hiring readiness %"].map(h=><th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead><tbody>{result.rows.map(row=><tr key={row.month} className="border-t"><th scope="row" className="p-2 font-normal">{row.month}</th><td className="p-2">{row.phase}</td>{[row.cashCost,row.timeCost,row.totalCost,row.employeeHours,row.divertedHours,row.expectedCompleters,row.capabilityUnits,row.trainingRampPct,row.hiringReadinessPct].map((v,i)=><td key={i} className="p-2">{shown(v)}</td>)}</tr>)}</tbody></table></div>
   <details><summary className="cursor-pointer text-sm">Retained quote and timing assumptions</summary><p className="mt-2 text-xs">Expected successful completers = participants × completion rate × success rate. Capability units multiply this expectation by your gain per person and linear ramp fraction; they represent an assumed effect, not measured improvement or a headcount equivalent. Course completion supplies no success or gain assumptions. Costs, including additional fees, and booked hours are spread evenly across full training months, with cent rounding reconciled; dropouts do not reduce them. This comparison creates no enrollments or staffing assignments.</p><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify({quote:result.option,input:result.input},null,2)}</pre></details>
  </section>}
 </div>;
}
