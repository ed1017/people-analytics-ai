'use client';
import {useId,useState} from 'react';
import artifact from '@/lib/data/synthetic-pay-demo-v1.json';
import {resolveSyntheticPayDemo,selectSyntheticPayCohort,type SyntheticPayDemo} from '@/lib/synthetic-pay-demo';
const usd=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const percent=(value:number)=>value.toFixed(1)+'%';
const selectClass='mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-sm';
export function SyntheticPayDemoPanel({evidence=artifact}:{evidence?:unknown}){
 const view=resolveSyntheticPayDemo(evidence);
 return <section aria-label="Synthetic pay demo" className="min-w-0 space-y-3 rounded-lg border bg-muted/10 p-4 sm:p-5">
  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Synthetic pay comparison</h2><span className="rounded-full border px-2 py-1 text-xs font-semibold">DEMO ONLY</span></div>
  <p className="text-xs text-muted-foreground">Separate simulated workforce · Dashboard filters excluded.</p>
  {view.status==='ready'?<PayResults data={view.data}/>:<p role="status">{view.message}</p>}
 </section>;
}
function PayResults({data}:{data:SyntheticPayDemo}){
 const [job,setJob]=useState(data.jobs[0].code),[level,setLevel]=useState(data.levels[0].code),[location,setLocation]=useState(data.locations[0].code);
 const cohort=selectSyntheticPayCohort(data,job,level,location),metrics=cohort?.status==='published'?cohort.metrics:null,coverage=cohort?.coverage;
 return <>
  <p className="text-xs">Annual base pay at 1.0 FTE · USD · 30 Sep 2026</p>
  <div className="grid min-w-0 gap-2 sm:grid-cols-3">
   <label className="min-w-0 text-xs font-medium">Demo job<select aria-label="Demo job" className={selectClass} value={job} onChange={event=>setJob(event.target.value)}>{data.jobs.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
   <label className="min-w-0 text-xs font-medium">Demo level<select aria-label="Demo level" className={selectClass} value={level} onChange={event=>setLevel(event.target.value)}>{data.levels.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
   <label className="min-w-0 text-xs font-medium">Demo location<select aria-label="Demo location" className={selectClass} value={location} onChange={event=>setLocation(event.target.value)}>{data.locations.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
  </div>
  {!metrics||!coverage?<p role="status" className="rounded border p-3 text-sm">Pay statistics and counts withheld for this cohort under small-group or complementary suppression.</p>:<div aria-live="polite" className="space-y-3">
   <p className="text-xs">{coverage.eligible} eligible synthetic records · {coverage.status==='complete'?'Complete inputs':coverage.excluded===null?'Partial inputs; excluded count withheld':`${coverage.excluded} excluded of ${coverage.total} records`}</p>
   <dl className="grid grid-cols-2 gap-2 xl:grid-cols-4">
    <Metric label="Compa-ratio" value={percent(metrics.compaRatioPct)} note="100% = matched midpoint"/>
    <Metric label="Mean base pay" value={usd(metrics.mean)} note="Full-time equivalent"/>
    <Metric label="Median base pay" value={usd(metrics.median)} note="50th percentile"/>
    <Metric label="Pay spread (SD)" value={usd(metrics.sd)} note="Population standard deviation"/>
   </dl>
   <PayQuartiles q1={metrics.q1} median={metrics.median} q3={metrics.q3} mean={metrics.mean}/>
   <p className="text-xs">Invented range midpoint: {usd(metrics.rangeMidpoint)}. These figures are not a pay-equity finding or a pay recommendation.</p>
  </div>}
  <details className="border-t pt-2 text-sm"><summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Details: definitions, coverage and limits</summary><div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
   <p>{data.definitions.population} The dataset is independent of the workforce-cost source, dashboard filters, selected goal and BLS occupation references. No internal role is matched to a BLS occupation.</p>
   <p>Eligibility requires a unique active salaried synthetic record, positive finite annual contracted base pay, FTE greater than zero and no more than one, and a matching job, level, location, USD currency, base-pay basis and 30 September 2026 range date. Missing or incompatible inputs are excluded, never treated as zero pay. No FX conversion or salary annualization is performed.</p>
   <p>Compa-ratio = 100 × sum(annual contracted base pay ÷ FTE) ÷ sum(matching annual full-time base-pay range midpoint). All records in this fixed cohort share the same qualified band. Each eligible person contributes one full-time-normalized pay and midpoint; this is not FTE-weighted payroll cost or an undefined average of percentages. A ratio of 100% means pay equals the matching midpoint. The midpoint is invented company-demo policy, never a BLS median.</p>
   <p>{data.definitions.distribution} The plot shows Q1–Q3, median and mean; no individual points or min/max are published, and no normal distribution is assumed. SD describes this eligible cohort; it is not a confidence interval or an equity test.</p>
   <p>Only fixed, disjoint job × level × location cohorts are available. Selecting a cohort does not recompute statistics. Groups below five eligible records and complementary cells have all metrics and counts withheld. Overall totals, overlapping subtotals and time comparisons are not published. Small excluded counts (1–4) and their reconstructing totals remain unavailable.</p>
   <p>{data.definitions.interpretation}</p>
   <p>Reproducible offline dataset {data.dataset} · seed {data.seed}. Only aggregate JSON is shipped; no synthetic record rows, real salaries, personal attributes or individual rankings are supplied.</p>
   <a className="inline-block min-h-11 py-2 text-primary underline" href="https://github.com/ed1017/people-analytics-ai/blob/101bfb37c4757400db221bf89b9df3ae290e2194/docs/synthetic-pay-demo-v1.md" target="_blank" rel="noreferrer">Synthetic pay methods and contract</a>
  </div></details>
 </>;
}
function Metric({label,value,note}:{label:string;value:string;note:string}){return <div className="min-w-0 rounded border p-3"><dt className="text-xs">{label}</dt><dd className="mt-1 break-words text-xl font-semibold tabular-nums">{value}</dd><dd className="mt-1 text-xs text-muted-foreground">{note}</dd></div>}
function PayQuartiles({q1,median,q3,mean}:{q1:number;median:number;q3:number;mean:number}){
 const id=useId(),max=Math.max(q3,mean)*1.2,position=(value:number)=>8+84*value/max;
 return <figure aria-label="Synthetic pay quartiles" className="space-y-1 text-xs"><figcaption>Middle 50%: {usd(q1)}–{usd(q3)} (Q1–Q3)</figcaption>
  <svg viewBox="0 0 100 13" className="h-14 w-full" preserveAspectRatio="none" role="img" aria-labelledby={id}><title id={id}>Q1 {usd(q1)}; median {usd(median)}; Q3 {usd(q3)}; mean {usd(mean)}. Descriptive quartiles, not a normal curve.</title><line x1="8" x2="92" y1="6" y2="6" stroke="currentColor" strokeWidth=".3" opacity=".4"/><rect x={position(q1)} y="2" width={Math.max(.2,position(q3)-position(q1))} height="8" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth=".4"/><line x1={position(median)} x2={position(median)} y1="2" y2="10" stroke="currentColor" strokeWidth=".7"/><path d={`M${position(mean)},3 l1.4,3 -1.4,3 -1.4,-3 Z`} fill="currentColor"/></svg>
  <p>Box: Q1–Q3 · Line: median · Diamond: mean</p>
 </figure>;
}
