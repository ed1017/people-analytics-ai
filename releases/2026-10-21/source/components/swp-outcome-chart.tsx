import {AssumptionsDisclosure} from '@/components/assumptions-disclosure';
import {CompactChart} from './compact-chart';
import {useId} from 'react';
import {swpMonth,type SwpOption} from '@/lib/swp-demo';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
const colors=['#64748b','#087f8c','#9b4dca','#b45309','#2563eb','#be123c'];
/** Stepped dependency-gated month outputs, never smoothed or zero-filled. */
export function SwpOutcomeChart({draft,options}:{draft:BundleDraft;options:SwpOption[]}){
 return <StaffingCoverageChart target={draft.inputs.scope.demand.value} scope={draft.inputs.scope.population.value} start={draft.inputs.scope.startMonth.value} months={draft.inputs.scope.months.value} options={options.map(o=>({id:o.id,label:o.label,mix:o.candidate.mix,coverage:o.coverage}))}/>;
}
type CoverageOption={id:string;label:string;mix:{build:number;move:number;buy:number};coverage:(number|null)[]|null};
export function StaffingCoverageChart({target,scope,start,months,options,scopeAlreadyShown=false}:{scopeAlreadyShown?:boolean;target:number|null;scope:string|null;start:string|null;months:number|null;options:CoverageOption[]}){
 const id=useId(),color=(index:number)=>options.length===1?'#007d7d':colors[index%colors.length];
 if(target===null||!start||!months)return <p role="status">Outcome comparison unavailable: review a shared role target and horizon.</p>;
 const max=Math.max(1,target,...options.flatMap(o=>(o.coverage??[]).filter((v):v is number=>v!==null&&Number.isFinite(v)))),x=(n:number,width:number)=>54+n*(width-90)/Math.max(1,months-1),y=(n:number)=>185-n*140/max;
 return <figure aria-labelledby={id} className="min-w-0 space-y-2 rounded border p-3">
  <figcaption id={id} className="font-semibold">Ready roles over time</figcaption>
  <p className="text-sm">{!scopeAlreadyShown&&<>{scope} · {start}–{swpMonth(start,months-1)}. </>}Target: {target} additional roles</p>
  <ul aria-label="Scenario legend" className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><li>Dashed: target</li>{options.length===1?<><li>Teal: ready</li><li>Amber: shortfall</li></>:options.map((o,i)=><li key={o.id}><span aria-hidden style={{color:color(i)}}>━ </span>{o.label}: Build {o.mix.build}, Move {o.mix.move}, Buy {o.mix.buy}</li>)}</ul>
  <CompactChart label="Monthly conditional role coverage by plan and target" title="Monthly calculated role coverage. Exact values are in Assumptions & limits." minWidth={300}>{width=><>
    <path d={`M54 30V185H${width-36}`} stroke="currentColor" opacity=".3" fill="none"/>
    {[0,max].map(value=><text key={value} x="44" y={y(value)+4} textAnchor="end" fontSize="14" fill="currentColor">{value}</text>)}
    <path d={`M54 ${y(target)}H${width-36}`} stroke="currentColor" strokeDasharray="5 4" opacity=".6"/>
    {options.length===1&&options[0].coverage?.slice(0,-1).map((v,i)=>v===null||options[0].coverage![i+1]===null?null:<path key={'gap-'+i} d={`M${x(i,width)} ${y(target)}H${x(i+1,width)}V${y(Math.min(v,target))}H${x(i,width)}Z`} fill="#fce9b9"/>)}
    {options.map((o,i)=><g key={o.id} data-scenario={o.id}>{o.coverage?.map((value,n)=>value===null?null:<g key={n}>{n>0&&o.coverage![n-1]!==null&&<path d={`M${x(n-1,width)} ${y(o.coverage![n-1]!)}H${x(n,width)}V${y(value)}`} fill="none" stroke={color(i)} strokeWidth={options.length===1?3:2} strokeDasharray={options.length>1&&i===0?'3 2':undefined}/>}<circle cx={x(n,width)} cy={y(value)} r={i===0?4:3} fill={color(i)} tabIndex={0} aria-label={`${o.label}, ${swpMonth(start,n)}: ${value} roles`}><title>{o.label} · {swpMonth(start,n)} · {value} roles</title></circle></g>)}</g>)}
    {[0,Math.floor((months-1)/2),months-1].filter((v,i,a)=>a.indexOf(v)===i).map(n=><text key={n} x={x(n,width)} y="216" textAnchor={n===0?'start':n===months-1?'end':'middle'} fontSize="14" fill="currentColor">{swpMonth(start,n)}</text>)}
  </>}</CompactChart>
  <AssumptionsDisclosure><p>{scope} · {start}–{swpMonth(start,months-1)}.</p><p className="text-sm">Amber shading shows end-of-month role shortfall, not hours. Conditional estimates are not achieved outcomes or company headcount. Steps come from the existing staffing calculator after component prerequisites. Lines show end-of-month role readiness. Workload hours separately prorate calendar days in the first ready month. No confidence bands, attrition effect, productivity uplift or automation benefit is assumed. Skill readiness and staff release still need validation. Missing results are Unknown.</p><div className="overflow-x-auto"><table className="compact-data-table text-left"><caption className="sr-only">Conditional role coverage, roles</caption><thead><tr><th className="p-2">Month</th><th>Target</th>{options.map(o=><th key={o.id}>{o.label}</th>)}</tr></thead><tbody>{Array.from({length:months},(_,n)=><tr key={n}><th className="p-2">{swpMonth(start,n)}</th><td>{target}</td>{options.map(o=><td key={o.id}>{o.coverage?.[n]??'Unknown'}</td>)}</tr>)}</tbody></table></div></AssumptionsDisclosure>
 </figure>;
}
