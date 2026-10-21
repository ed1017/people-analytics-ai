import {AssumptionsDisclosure} from '@/components/assumptions-disclosure';
import {CompactChart} from './compact-chart';
import {useId} from 'react';
import {swpMonth,swpMetric,type SwpOption} from '@/lib/swp-demo';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
const colors=['#64748b','#087f8c','#9b4dca'];
/** Stepped dependency-gated month outputs, never smoothed or zero-filled. */
export function SwpOutcomeChart({draft,options}:{draft:BundleDraft;options:SwpOption[]}){
 const id=useId(),target=draft.inputs.scope.demand.value,start=draft.inputs.scope.startMonth.value,months=draft.inputs.scope.months.value;
 if(target===null||!start||!months)return <p role="status">Outcome comparison unavailable: review a shared role target and horizon.</p>;
 const max=Math.max(1,target,...options.flatMap(o=>(o.coverage??[]).filter((v):v is number=>v!==null&&Number.isFinite(v)))),x=(n:number,width:number)=>54+n*(width-90)/Math.max(1,months-1),y=(n:number)=>185-n*140/max;
 return <figure aria-labelledby={id} className="min-w-0 space-y-2 rounded border p-3">
  <figcaption id={id} className="font-semibold">Expected scenario outcome · {swpMetric.toLowerCase()}</figcaption>
  <p className="text-sm">{draft.inputs.scope.population.value} · {start}–{swpMonth(start,months-1)}. Target {target} roles. Conditional estimates, not achieved outcomes or company headcount.</p>
  <ul aria-label="Scenario legend" className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><li>Dashed line: target</li>{options.map((o,i)=><li key={o.id}><span aria-hidden style={{color:colors[i]}}>━ </span>{o.label}: Build {o.candidate.mix.build}, Move {o.candidate.mix.move}, Buy {o.candidate.mix.buy}</li>)}</ul>
  <CompactChart label="Monthly conditional role coverage by plan and target" title="Monthly calculated role coverage. Exact values are in Assumptions & limits." minWidth={420}>{width=><>
    <path d={`M54 30V185H${width-36}`} stroke="currentColor" opacity=".3" fill="none"/>
    {[0,max].map(value=><text key={value} x="44" y={y(value)+4} textAnchor="end" fontSize="14" fill="currentColor">{value}</text>)}
    <path d={`M54 ${y(target)}H${width-36}`} stroke="currentColor" strokeDasharray="5 4" opacity=".6"/>
    {options.map((o,i)=><g key={o.id} data-scenario={o.id}>{o.coverage?.map((value,n)=>value===null?null:<g key={n}>{n>0&&o.coverage![n-1]!==null&&<path d={`M${x(n-1,width)} ${y(o.coverage![n-1]!)}H${x(n,width)}V${y(value)}`} fill="none" stroke={colors[i]} strokeWidth="2" strokeDasharray={i===0?'3 2':undefined}/>}<circle cx={x(n,width)} cy={y(value)} r={i===0?4:3} fill={colors[i]} tabIndex={0} aria-label={`${o.label}, ${swpMonth(start,n)}: ${value} roles`}><title>{o.label} · {swpMonth(start,n)} · {value} roles</title></circle></g>)}</g>)}
    {[0,Math.floor((months-1)/2),months-1].filter((v,i,a)=>a.indexOf(v)===i).map(n=><text key={n} x={x(n,width)} y="216" textAnchor={n===0?'start':n===months-1?'end':'middle'} fontSize="14" fill="currentColor">{swpMonth(start,n)}</text>)}
  </>}</CompactChart>
  <AssumptionsDisclosure><p className="text-sm">Steps come from the existing staffing calculator after component prerequisites. No interpolation, confidence bands, attrition effect, productivity uplift or automation benefit is assumed. Skill readiness and staff release still need validation. Missing results are Unknown.</p><div className="overflow-x-auto"><table className="compact-data-table text-left"><caption className="sr-only">Conditional role coverage, roles</caption><thead><tr><th className="p-2">Month</th><th>Target</th>{options.map(o=><th key={o.id}>{o.label}</th>)}</tr></thead><tbody>{Array.from({length:months},(_,n)=><tr key={n}><th className="p-2">{swpMonth(start,n)}</th><td>{target}</td>{options.map(o=><td key={o.id}>{o.coverage?.[n]??'Unknown'}</td>)}</tr>)}</tbody></table></div></AssumptionsDisclosure>
 </figure>;
}
