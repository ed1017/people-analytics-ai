'use client';
import {useState} from 'react';
import artifact from '@/lib/data/synthetic-career-demo-v1.json';
import {resolveSyntheticCareerDemo,selectSyntheticCareerCohort,type SyntheticCareerDemo} from '@/lib/synthetic-career-demo';
const percent=(value:number|null)=>value===null?'Unavailable':value.toFixed(1)+'%';
const control='mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-sm';
export function SyntheticCareerDemoPanel({evidence=artifact}:{evidence?:unknown}){
 const view=resolveSyntheticCareerDemo(evidence);
 return <section aria-label="Synthetic career demo" className="@container mb-6 min-w-0 space-y-3 rounded-lg border bg-muted/10 p-4 sm:p-5">
  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Performance & promotion</h2><span className="rounded-full border px-2 py-1 text-xs font-semibold">SYNTHETIC DEMO</span></div>
  <p className="text-xs text-muted-foreground">Separate invented annual cohorts · Dashboard filters excluded. Not included in the page AI briefing.</p>
  {view.status==='ready'?<CareerResults data={view.data}/>:<p role="status">{view.message}</p>}
 </section>;
}
function CareerResults({data}:{data:SyntheticCareerDemo}){
 const [department,setDepartment]=useState(data.departments[0].code),[level,setLevel]=useState(data.levels[0].code),[year,setYear]=useState(data.years.at(-1)!);
 const cohort=selectSyntheticCareerCohort(data,department,level),period=cohort?.periods.find(period=>period.year===year),metrics=period?.status==='published'?period.metrics:null;
 return <>
  <div className="grid min-w-0 grid-cols-2 gap-2 @min-[30rem]:grid-cols-3">
   <label className="col-span-2 min-w-0 text-xs font-medium @min-[30rem]:col-span-1">Demo department<select className={control} aria-label="Demo department" value={department} onChange={event=>setDepartment(event.target.value)}>{data.departments.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
   <label className="min-w-0 text-xs font-medium">Starting job level<select className={control} aria-label="Demo starting level" value={level} onChange={event=>setLevel(event.target.value)}>{data.levels.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
   <label className="min-w-0 text-xs font-medium">Calendar year<select className={control} aria-label="Demo career year" value={year} onChange={event=>setYear(Number(event.target.value))}>{data.years.map(year=><option key={year}>{year}</option>)}</select></label>
  </div>
  <p className="text-xs">Eligible at 1 January: active salaried, at least 12 months in level, complete event follow-up. This is an invented rule, not company policy.</p>
  {metrics?<div aria-live="polite" className="space-y-3">
   <dl className="grid gap-2 @min-[30rem]:grid-cols-3">
    <Metric label="Rated meets or above" value={percent(metrics.meetsPct)} note={`${metrics.meets??'Unknown'} of ${metrics.rated} valid ratings (3–5 of 5)`}/>
    <Metric label="Promotion rate" value={percent(metrics.promotionRatePct)} note={`${metrics.promoted} promoted / ${metrics.eligible} eligible at year start`}/>
    <Metric label="Median time in prior level" value={metrics.timeToPromotion?`${metrics.timeToPromotion.median} months`:'No observed promotion'} note={metrics.timeToPromotion?`${metrics.timeToPromotion.n} observed promotees · Q1–Q3: ${metrics.timeToPromotion.q1}–${metrics.timeToPromotion.q3} months`:'No time-to-promotion statistic'}/>
   </dl>
   <p className="text-xs">Rating coverage: {metrics.rated} of {metrics.eligible} eligible people; {metrics.missingRatings} missing or incompatible ratings. Time describes observed promotees only, not a future wait or prediction.</p>
  </div>:<p role="status" className="rounded border p-3 text-sm">All metrics and counts withheld for this department-level cohort in every year under small-group or complementary suppression.</p>}
  <section aria-label="Annual career trends" className="space-y-2">
   <h3 className="text-sm font-semibold">Annual trends for this cohort</h3>
   <p className="text-xs text-muted-foreground">Repeated annual cohorts; changes are not individual improvement or evidence that ratings cause promotion.</p>
   <table className="w-full table-fixed text-left text-xs"><caption className="sr-only">Annual synthetic rating and promotion denominators</caption><thead><tr className="border-b"><th className="w-14 py-2">Year</th><th className="px-2 py-2">Rated 3–5</th><th className="px-2 py-2">Promotion rate</th></tr></thead><tbody>{cohort?.periods.map(period=><tr key={period.year} className="border-b align-top"><th scope="row" className="py-2">{period.year}</th>{period.metrics?<><td className="px-2 py-2">{percent(period.metrics.meetsPct)}<span className="block text-muted-foreground">{period.metrics.meets??'Unknown'} / {period.metrics.rated} rated</span></td><td className="px-2 py-2">{percent(period.metrics.promotionRatePct)}<span className="block text-muted-foreground">{period.metrics.promoted} / {period.metrics.eligible} eligible</span></td></>:<td colSpan={2} className="px-2 py-2">Withheld</td>}</tr>)}</tbody></table>
  </section>
  {metrics?.ratingCounts&&<details className="border-t pt-2 text-xs"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Rating distribution · {year}</summary><ul aria-label="Synthetic rating distribution" className="space-y-2">{data.ratingLabels.map((label,i)=><li key={label} className="flex justify-between gap-3"><span>{i+1}. {label}</span><span className="shrink-0 tabular-nums">{metrics.ratingCounts![i]} / {metrics.rated}</span></li>)}</ul><p className="mt-2 text-muted-foreground">Ordinal categories on a consistent invented rubric; no average rating or normality assumption.</p></details>}
  <details className="border-t pt-2 text-xs"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Compare departments and levels · {year}</summary><p className="mb-3 text-muted-foreground">Fixed start-of-year groups. Different populations and coverage limit comparisons; these are not fairness findings or rankings.</p><div aria-label="Career cohort comparison" className="grid gap-2 @min-[36rem]:grid-cols-2">{data.cohorts.map(cell=>{const m=cell.periods.find(period=>period.year===year)?.metrics;return <article key={cell.id} aria-label={`${data.departments.find(item=>item.code===cell.department)?.label} ${cell.level} comparison`} className="min-w-0 space-y-1 rounded border p-3"><h4 className="font-semibold">{data.departments.find(item=>item.code===cell.department)?.label} · {cell.level}</h4>{m?<><p>Rated 3–5: {percent(m.meetsPct)} ({m.meets??'Unknown'} / {m.rated} rated).</p><p>Promoted: {percent(m.promotionRatePct)} ({m.promoted} / {m.eligible} eligible).</p><p>Median prior-level time: {m.timeToPromotion?`${m.timeToPromotion.median} months among ${m.timeToPromotion.n} promotees`:'No observed promotion'}.</p></>:<p>All metrics and counts withheld.</p>}</article>})}</div></details>
  <details className="border-t pt-2 text-xs leading-relaxed"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Details: definitions, eligibility and limits</summary><div className="space-y-2 text-muted-foreground">{Object.entries(data.definitions).map(([name,text])=><p key={name}>{text}</p>)}<p>Offline release {data.dataset} · seed {data.seed}. No individual promotion recommendation is supplied.</p></div></details>
 </>;
}
function Metric({label,value,note}:{label:string;value:string;note:string}){return <div className="min-w-0 rounded border p-3"><dt className="text-xs">{label}</dt><dd className="mt-1 break-words text-xl font-semibold tabular-nums">{value}</dd><dd className="mt-1 text-xs text-muted-foreground">{note}</dd></div>}
