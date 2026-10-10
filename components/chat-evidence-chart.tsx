import type {ChatEvidenceSeries} from '@/lib/chat-evidence-series';
/** Discrete sampled periods; no line interpolates missing months or projects future values. */
export function ChatEvidenceChart({series}:{series:ChatEvidenceSeries}){
 const scope=series.scope.replace(/^(?:Selected workforce snapshot:\s*)+/,'');
 const max=Math.max(1,...series.points.map(point=>point.value));
 const format=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:2})+(series.unit==='%'?'%':'');
 return <figure aria-label={series.title+' for this answer'} className="my-3 min-w-0 space-y-2 rounded-lg border p-3 text-base">
  <figcaption className="font-semibold">{series.title} · {series.unit}</figcaption>
  <p>{scope} · recorded {series.synthetic?'synthetic ':''}aggregate, not a forecast</p>
  <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${series.points.length},minmax(0,1fr))`}}>{series.points.map(point=><div key={point.date} className="min-w-0 text-center"><p className="font-semibold">{format(point.value)}</p><div aria-hidden="true" className="mt-1 flex h-20 items-end justify-center border-b"><div className="w-10 max-w-full rounded-t bg-primary" style={{height:`${point.value/max*100}%`}}/></div><p className="mt-1 break-words">{point.date}</p></div>)}</div>
  <p>Selected periods only · as of {series.asOf}{series.omitted?` · ${series.omitted} unavailable period(s) omitted`:''}</p>
  <details><summary className="min-h-11 cursor-pointer py-2">Source and limits</summary><p>[{series.sourceId}] {series.limitation}</p><p>Missing periods are not filled. Monthly rates are not YTD rates.</p></details>
 </figure>;
}
