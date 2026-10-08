import {ProjectionBacktestDetails} from '@/components/projection-backtest-details';
import {SyntheticDomainPrediction} from '@/components/synthetic-domain-prediction';
import {SyntheticDomainChartNotes} from '@/components/synthetic-domain-chart';
import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {resolveSyntheticDomainDemo,formatDemoValue,demoDomainCopy,type SyntheticDemoDomain} from '@/lib/synthetic-domain-demo';
const month=(value:string)=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
export function SyntheticDomainDemo({domain,evidence=artifact}:{domain:SyntheticDemoDomain;evidence?:unknown}){
 const view=resolveSyntheticDomainDemo(evidence),copy=demoDomainCopy[domain];
 return <section aria-label={'Simulated '+copy.title.toLowerCase()} className="my-3 min-w-0 space-y-1 rounded-lg border bg-muted/10 p-3 text-sm">
  <h3 className="font-semibold">{copy.title}</h3>
  {view.status!=='ready'?<p role="status">{view.message}</p>:<DemoResults domain={domain} data={view.data}/>}
 </section>;
}
function DemoResults({domain,data}:{domain:SyntheticDemoDomain;data:typeof artifact}){
 const d=data.domains[domain],copy=demoDomainCopy[domain],test=d.assessment.filter(s=>s.stage==='test'),training=d.assessment.filter(s=>s.stage==='training');
 return <>
  {d.status!=='predicted'?<p role="status">No simulated projection: {d.reasonCodes.join(', ')||'insufficient support'}.</p>:<SyntheticDomainPrediction domain={domain} data={data}/>}
  <details><summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Details</summary><div className="space-y-2 break-words text-xs">
  <p className="text-xs">Cutoff 30 Sep 2026 · History through {month(d.support.lastPeriod)} · Intervals unavailable.</p>
   <p>Fixed simulated company-wide population. Dashboard filters do not apply; these are not predictions for the recorded-data cohort. Operational forecasts are unavailable. All three existing methods are shown. Historical score order is not an operational recommendation.</p>
   {domain==='hiring'&&<p>Opening months, not hire months; 90-day follow-up for Nov–Dec extends into 2027.</p>}
   {domain==='satisfaction'&&<p>One December quarterly wave; not the percentage of employees who are satisfied.</p>}
   <p>{copy.assumption}</p><SyntheticDomainChartNotes domain={domain} data={data}/>{domain!=='hiring'&&<ProjectionBacktestDetails domain={domain} data={data}/>}<table className="w-full text-xs"><caption className="text-left font-medium">Released simulated history · {copy.unit}</caption><thead><tr><th scope="col" className="text-left">Period</th><th scope="col" className="text-right">Value</th></tr></thead><tbody>{d.history.map(row=><tr key={row.month}><th scope="row" className="text-left font-normal">{month(row.month)}</th><td className="text-right">{row.value===null?'Unavailable: zero openings':formatDemoValue(domain,row.value)}</td></tr>)}</tbody></table><p>{copy.readiness}</p>
   <p>Constructed synthetic demonstration: the separate original frozen assessment contains {data.historyCases} histories, {data.monthsPerHistory} months each. Its multi-case counts are not the samples used for this historical ranking. The displayed stable-mechanism case, seed {data.seed}, was specified before the results. Methods use only releases available at the cutoff.</p>
   <p>Original frozen multi-case assessment: {test.reduce((n,s)=>n+s.predicted,0)} held-out synthetic predictions; {test.reduce((n,s)=>n+s.scored,0)} scored across five scenario families. {test.reduce((n,s)=>n+s.cases-s.scored,0)} withheld from scoring. {training.reduce((n,s)=>n+s.cases-s.predicted,0)} development predictions abstained. These are separate from the common-origin ranking scores above.</p>
   <p>Results are scenario-dependent and miss unannounced reversals. No general method superiority or real-world accuracy is established. Intervals were not calibrated; candidate differences are not confidence bands.</p>
   {domain==='satisfaction'&&<p>All 20 future instrument-break cases were predicted conditionally but not scored. Their error is unavailable, not zero. Waves use equal weight; respondents are not pooled.</p>}
   {domain==='turnover'&&<p>24 released monthly counts support the comparison; the reporting gap is retained. Expected counts may be fractional. Historical person-days do not supply future rate denominators.</p>}
   {domain==='hiring'&&<p>36 calendar cohorts retain known zero-opening months; only positive-exposure cohorts contribute outcomes. Fixed-penalty logistic trend is compared with pooled and recent-cohort fractions. A numerical optimizer failure abstains.</p>}
   <p>No person-level score, causal intervention effect, avoided-exit estimate, capacity gain, savings or ROI is supplied.</p>
   <a className="inline-block min-h-11 py-2 text-primary underline" target="_blank" rel="noreferrer" href={'https://github.com/ed1017/people-analytics-ai/blob/'+data.evidence.commit+'/docs/synthetic-domain-predictions-v1.md'}>Source methods and complete comparisons</a>
   <p>Report SHA-256: {data.evidence.reportSha256}</p>
  </div></details>
 </>;
}
