"use client";
import {useState} from 'react';
import artifact from '@/lib/data/synthetic-group-turnover-consumer-v1.json';
import {resolveGroupTurnoverDisplay} from '@/lib/synthetic-group-turnover-display';
const number=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(value);
const name=(value:string)=>value.replaceAll('-',' ');
const method=(value:string)=>value==='recent-mean-3'?'Recent three-month mean':'Same month in prior year';
const month=(value:string)=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
const reasons=(values:string[])=>values.map(name).join('; ');
/** One reviewed case inside the existing forecast disclosure; no action or model call. */
export function SyntheticGroupTurnoverComparison({evidence=artifact}:{evidence?:unknown}={}){
 const [family,setFamily]=useState('stationary'),[seed,setSeed]=useState(17),[group,setGroup]=useState('group-a');
 const view=resolveGroupTurnoverDisplay(evidence,artifact);
 if(view.status!=='current')return <p role="status" className="text-xs">{view.message} Operational forecasting remains unavailable.</p>;
 const data=view.data,selected=data.cases.find(c=>c.family===family&&c.seed===seed&&c.groupId===group)??data.cases[0],a=selected.assessment,y=selected.yearEnd,gate=data.validation.gates.find(g=>g.family===selected.family&&g.groupId===selected.groupId)!;
 return <section aria-label="Synthetic group turnover benchmark" className="min-w-0 space-y-3 text-xs">
  <h3 className="font-semibold text-foreground">Separate synthetic group benchmark</h3>
  <p>{data.evidenceStatus} These newly constructed histories do not replace the earlier exit example or the hiring/satisfaction outputs. Goals and workforce filters do not narrow this benchmark.</p>
  <p>{data.dataset.sourceEvidenceStatus}</p><p>{data.validation.label} {data.validation.uncertaintyStatus}</p>
  <div className="grid min-w-0 gap-2 sm:grid-cols-3">
   <label>Simulation family<select aria-label="Synthetic simulation family" value={family} onChange={e=>setFamily(e.target.value)} className="mt-1 min-h-11 w-full min-w-0 rounded border bg-background px-2 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring">{[...new Set(data.cases.map(c=>c.family))].map(f=><option key={f} value={f}>{name(f)}</option>)}</select></label>
   <label>Seed<select aria-label="Synthetic simulation seed" value={seed} onChange={e=>setSeed(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded border bg-background px-2 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring">{[...new Set(data.cases.map(c=>c.seed))].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
   <label>Group<select aria-label="Synthetic simulation group" value={group} onChange={e=>setGroup(e.target.value)} className="mt-1 min-h-11 w-full rounded border bg-background px-2 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring">{[...new Set(data.cases.map(c=>c.groupId))].map(g=><option key={g} value={g}>{name(g)}</option>)}</select></label>
  </div>
  <div aria-label="Selected synthetic group case" className="space-y-2">
   <p className="font-medium text-foreground">{name(selected.family)} · seed {selected.seed} · {name(selected.groupId)}</p>
   <p>{data.validation.methodSelection} No turnover rate, individual risk or causal effect is estimated.</p>
   <h4 className="font-semibold text-foreground">Assessment · {a.targets.map(month).join(' / ')}</h4>
   <p>Forecast cutoff: {a.cutoff} · Last released month: {a.trainingEnd?month(a.trainingEnd):'unavailable'}.</p>
   {a.status==='unavailable'?<p>Counts, comparisons and ranges unavailable. {reasons(a.reasonCodes)}. Withheld history is not zero.</p>:<>
    <p>Synthetic recorded quarter total: {a.actualTotal===null?'unavailable':number(a.actualTotal)}. Expected totals below are count estimates; error is expected minus recorded.</p>
    <table className="w-full text-xs"><caption className="sr-only">Synthetic assessment count comparison</caption><thead><tr className="border-b text-left"><th scope="col" className="py-2 pr-2">Fixed method</th><th scope="col" className="p-2 text-right">Expected total</th><th scope="col" className="py-2 pl-2 text-right">Quarter error</th></tr></thead><tbody>{a.methods.map(m=><tr key={m.method} className="border-b"><th scope="row" className="py-2 pr-2 text-left font-normal">{method(m.method)}</th><td className="p-2 text-right tabular-nums">{number(m.expectedTotal)}</td><td className="py-2 pl-2 text-right tabular-nums">{number(a.comparisons.find(c=>c.method===m.method)!.quarterError)}</td></tr>)}</tbody></table>
    <p>{gate.covered} of {gate.availableRanges} available ranges covered the assessed quarter across {gate.intendedHistories} separately seeded histories in this family/group. {gate.label}</p>
   </>}
   <p><strong>{a.uncertainty.label}</strong>{a.uncertainty.interval&&<> {number(a.uncertainty.interval.lower)}–{number(a.uncertainty.interval.upper)} exits; nominal {number(a.uncertainty.interval.nominalCoverage*100)}% simulation range, without a coverage guarantee.</>}</p>
   {a.uncertainty.reasonCodes.length>0&&<p>Unavailable reasons: {reasons(a.uncertainty.reasonCodes)}.</p>}
   <p>Retrospective qualification/scoring cutoff: {data.validation.qualificationAvailableAt}. Assessment ranges were not available at the historical forecast origin. {data.validation.unit}</p>
   <h4 className="font-semibold text-foreground">Reserved quarter · {y.targets.map(month).join(' / ')}</h4>
   <p>Forecast cutoff: {y.cutoff} · Last released month: {y.trainingEnd?month(y.trainingEnd):'unavailable'}.</p>
   {y.status==='unavailable'?<p>Count forecasts unavailable: {reasons(y.reasonCodes)}.</p>:<ul className="list-disc pl-5">{y.methods.map(m=><li key={m.method}>{method(m.method)}: {number(m.expectedTotal)} expected exits in this reserved quarter.</li>)}</ul>}
   <p><strong>{y.uncertainty.label}</strong> Actual total and assessment error are unavailable; this quarter remains reserved and unscored.</p>
  </div>
  <p>{data.dataset.privacyStatus}</p><p className="break-words">Fixed evidence verified at build; no live refresh. Evidence commit: {data.evidence.commit}. Projection: {data.identity.slice(0,12)}.</p>
 </section>;
}
