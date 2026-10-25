import {catalogDisplayLabel} from '@/lib/catalog-display';
import {AssumptionsDisclosure} from '@/components/assumptions-disclosure';
import type {ChatEvidenceSeries} from '@/lib/chat-evidence-series';
/** Discrete sampled periods; no line interpolates missing months or projects future values. */
export function ChatEvidenceChart({series}:{series:ChatEvidenceSeries}){
 const scope=series.scope.replace(/^(?:Selected workforce snapshot:\s*)+/,'');
 if(series.axis==='aggregate'&&series.aggregate){
  const a=series.aggregate,max=Math.max(1,...a.rows.map(r=>r.value)),format=(v:number)=>v.toLocaleString('en-US',{maximumFractionDigits:2});
  return <figure aria-label={series.title+' for this answer'} className="my-3 min-w-0 space-y-2 rounded-lg border p-3 text-sm">
   <figcaption className="font-semibold">{series.title}</figcaption><p>{scope} — as of {series.asOf}</p><p>{a.period}</p>
   {a.completeTie?<p className="text-lg font-semibold">All {a.completeTie.count} released groups tie at {format(a.completeTie.value)} {series.unit}. No unique highest or lowest group.</p>:<div role="region" aria-label="Recorded group comparison" tabIndex={0} className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-ring"><table className="w-full min-w-64"><thead><tr><th scope="col" className="text-left">Group</th><th scope="col" className="text-right">{series.unit}</th></tr></thead><tbody>{a.rows.map(r=><tr key={r.id}><th scope="row" className="p-2 text-left font-medium">{catalogDisplayLabel(r.label)}</th><td className="min-w-24 p-2 text-right tabular-nums">{format(r.value)}<div aria-hidden="true" className="h-2 bg-muted"><div className="h-2 bg-primary" style={{width:`${r.value/max*100}%`}}/></div></td></tr>)}</tbody></table></div>}
   <p>{a.complete?'Complete released collection':'Eligible released groups only'}: {a.eligibleGroups} eligible of {a.totalGroups}.{a.truncated?` Showing ${a.rows.length} after ranking all eligible groups, retaining cutoff ties.`:''}{a.excludedGroups?` ${a.excludedGroups} unavailable values excluded, not zero.`:''}</p>
   <AssumptionsDisclosure><p>{series.limitation}</p><p>Recorded synthetic aggregates. Bars share a zero baseline; values retain their stated units.</p></AssumptionsDisclosure>
  </figure>;
 }
 if(series.axis==='scalar')return <figure aria-label={series.title+' for this answer'} className="my-3 min-w-0 space-y-2 rounded-lg border p-4 text-base">
  <figcaption className="font-semibold">{series.title}</figcaption>
  <p className="text-3xl font-semibold tabular-nums">{series.points[0].value.toLocaleString('en-US',{maximumFractionDigits:2})} <span className="text-lg">{series.unit}</span></p>
  <p>{scope} · as of {series.asOf}</p>
  <p>Recorded median.</p>
  <AssumptionsDisclosure><p>[{series.sourceId}] {series.limitation}</p></AssumptionsDisclosure>
 </figure>;
 if(series.axis==='comparison'&&series.comparison)return <figure aria-label={series.title+' for this answer'} className="my-3 min-w-0 space-y-2 rounded-lg border p-3 text-base">
  <figcaption className="font-semibold">{series.title}</figcaption>
  <p>{scope} · as of {series.asOf}</p>
  <div role="region" aria-label="Complete business-unit comparison table" tabIndex={0} className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-ring"><table className="w-full min-w-[28rem] whitespace-nowrap text-sm"><thead><tr><th scope="col" className="text-left">Business unit</th><th scope="col">Favorable</th><th scope="col">Average score (1–5)</th><th scope="col">Respondents</th></tr></thead><tbody>{series.comparison.map(row=><tr key={row.org_code}><th scope="row" className="p-2 text-left font-medium">{catalogDisplayLabel(row.org_name)}</th><td className="min-w-28 p-2"><span>{row.favorable_pct.toFixed(1)}%</span><div aria-hidden="true" className="h-2 w-full bg-muted"><div className="h-2 bg-primary" style={{width:row.favorable_pct+'%'}}/></div></td><td className="p-2 text-center">{row.avg_score.toFixed(2)}</td><td className="p-2 text-center">{row.respondents.toLocaleString('en-US')}</td></tr>)}</tbody></table></div>
  <p>{series.comparison.length} business units · {series.respondents?.toLocaleString('en-US')} respondents · {series.synthetic?'synthetic ':''}recorded results</p>
  <AssumptionsDisclosure><p>[{series.sourceId}] {series.limitation}</p><p>Bars use a common 0–100% scale. Favorability and average score are different measures.</p></AssumptionsDisclosure>
 </figure>;
 const max=Math.max(1,...series.points.map(point=>point.value));
 const format=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:2})+(series.unit==='%'?'%':'');
 return <figure aria-label={series.title+' for this answer'} className="my-3 min-w-0 space-y-2 rounded-lg border p-3 text-base">
  <figcaption className="font-semibold">{series.title} · {series.unit}</figcaption>
  <p>{scope} · recorded aggregate</p>
  <div role="region" aria-label={series.axis==="business-unit"?"Business-unit comparison; scroll to see all groups":"Recorded period chart; scroll to see all months"} tabIndex={series.points.length>3?0:undefined} className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-ring"><div className="grid gap-3" style={{gridTemplateColumns:`repeat(${series.points.length},minmax(${series.points.length>3?'5rem':'0'},1fr))`}}>{series.points.map(point=><div key={point.date} className="min-w-0 text-center"><p className="font-semibold">{format(point.value)}</p><div aria-hidden="true" className="mt-1 flex h-20 items-end justify-center border-b"><div className="w-10 max-w-full rounded-t bg-primary" style={{height:`${point.value/max*100}%`}}/></div><p className="mt-1 break-words">{point.date}</p></div>)}</div></div>
  <p>{series.axis==="business-unit"?"All eight business units":"Selected periods only"} · as of {series.asOf}{series.omitted?` · ${series.omitted} unavailable period(s) omitted`:''}</p>
  <AssumptionsDisclosure><p>[{series.sourceId}] {series.limitation}</p><p>{series.axis==="business-unit"?"YTD rates use matching average month-end headcounts, not current headcount. Total and voluntary turnover are different measures.":"Missing periods are not filled. Monthly rates are not YTD rates."}</p></AssumptionsDisclosure>
 </figure>;
}
