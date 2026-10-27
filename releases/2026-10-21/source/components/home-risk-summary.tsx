"use client";
import {useEffect,useRef,useState} from 'react';
import {datasetFetch,datasetSession} from '@/lib/dataset-client.mjs';
import {PUBLIC_9037} from '@/lib/public-9037-contract.mjs';
import {readCapacityRiskGroups} from '@/lib/group-capacity-risk-source';
import {dashboardRiskSummary,workforceTrendMessage} from '@/lib/dashboard-risk-summary';
import type {RiskGroup} from '@/lib/group-capacity-risk';
import type {DashboardFilters} from '@/lib/dashboard-scope';
import {visibleSyntheticCapacityRisk} from '@/lib/synthetic-capacity-risk';
import {GroupWorkforceTrend} from './group-workforce-trend';
export function HomeRiskSummary({filters,asOf,onReviewSyntheticCapacity}:{filters:DashboardFilters;asOf:string;onReviewSyntheticCapacity?:()=>void}){
 const [groups,setGroups]=useState<RiskGroup[]|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState<string|null>(null),[retry,setRetry]=useState(0);
 const heading=useRef<HTMLHeadingElement>(null),planner=useRef<HTMLDivElement>(null),token=datasetSession.snapshot();
 const unsupported=filters.country!=='all'||filters.level!=='all';
 useEffect(()=>{if(unsupported)return;const controller=new AbortController();let current=true;const start=datasetSession.snapshot();
  const unsubscribe=datasetSession.subscribe(()=>{controller.abort();setGroups(null);setSelected(null);setError('Dataset changed. Reload the current snapshot to review risks.');});
  async function load(){try{
   if(start!==PUBLIC_9037.token||asOf!==PUBLIC_9037.cutoff)throw Error();
   const get=async(url:string)=>{const response=await datasetFetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error();return response.json();};
   const a=await get('/api/attrition');if(!Array.isArray(a.business_units)||a.business_units.length!==8)throw Error();
   const dashboards=await Promise.all([...a.business_units.map((g:{org_code:string})=>g.org_code),'all'].map(org=>get('/api/dashboard?'+new URLSearchParams({country:'all',org,level:'all'}))));
   const checked=readCapacityRiskGroups(a,dashboards);if(current&&datasetSession.snapshot()===start)setGroups(checked);
  }catch{if(current&&!controller.signal.aborted)setError('Verified group histories could not be loaded. Risk is not assessed.');}}
  void load();return()=>{current=false;controller.abort();unsubscribe();};
 },[asOf,token,unsupported,retry]);
 let summary:ReturnType<typeof dashboardRiskSummary>|null=null,problem=error;
 if(groups)try{summary=dashboardRiskSummary(groups,filters,asOf);}catch{problem='A complete matching history is unavailable for this scope. Risk is not assessed.';}
 const shown=summary?.declines.slice(0,3)??[];
 const synthetic=visibleSyntheticCapacityRisk(filters,asOf,token),riskCount=shown.length+(synthetic?1:0);
 const RiskList=riskCount>1?'ol':'ul';
 const close=()=>{setSelected(null);requestAnimationFrame(()=>heading.current?.focus());};
 return <section aria-label="Workforce risks" className={"my-3 rounded-xl border p-3 "+(riskCount&&!selected?"border-red-900 bg-red-800 text-white":"border-border")}>
  <h3 ref={heading} tabIndex={-1} className={"font-semibold focus-visible:ring-2 focus-visible:ring-ring "+(riskCount&&!selected?"text-white focus-visible:ring-white":"")}>Workforce risks</h3>
  {unsupported?<p className="mt-2 text-sm">Group trend risks are not available for this country or level filter. Clear those filters to review business-unit exposure.</p>:problem?<div className="mt-2 text-sm"><p role="status">{problem}</p><button className="min-h-11 underline" onClick={()=>{setGroups(null);setError('');setRetry(v=>v+1);}}>Retry risk evidence</button></div>:!summary?<p role="status" className="mt-2 text-sm">Loading verified group trends.</p>:selected?<div ref={planner} tabIndex={-1} className="mt-3 focus-visible:ring-2 focus-visible:ring-ring"><GroupWorkforceTrend groups={summary.rows.map(r=>r.group)} months={3} backLabel="Back to risk summary" selected={selected} onSelect={setSelected} onClose={close} storageKey={'dashboard-risk-trend:'+token+':'+filters.org} scopeLabel={filters.org==='all'?'All business units':summary.rows[0].group.label}/></div>:<>
   {riskCount?<><RiskList className={"mt-1 divide-y "+(riskCount>1?"list-decimal pl-5":"list-none")}>{shown.map(({group,trend})=>{const copy=workforceTrendMessage(group,trend);return <li key={group.code} className="py-0.5"><div className="min-w-0 text-sm"><strong className="text-base font-bold leading-relaxed text-white">{copy.statement}</strong><p className="text-sm">{copy.condition}</p></div></li>;})}{synthetic&&<li className="py-0.5"><div className="min-w-0 text-sm"><strong className="text-base font-bold leading-relaxed text-white">Client Operations workload: {synthetic.point.gapFte} FTE shortfall by December 2026</strong></div></li>}</RiskList></>:<p className="mt-2 text-sm">No FTE decline projected from recent trends.</p>}
   {summary.declines.length>3&&<p className="text-sm">Showing the 3 largest declines of {summary.declines.length}; the planner includes every group in this scope.</p>}
   <details className={"mt-0 text-sm "+(riskCount?"text-white":"text-muted-foreground")}><summary className={"min-h-8 cursor-pointer py-1 text-[12px] font-normal leading-4 focus-visible:ring-2 "+(riskCount?"focus-visible:ring-white":"focus-visible:ring-ring")}>Details</summary><p>Projection: {asOf} to {summary.end} (3 months).</p><ul>{shown.map(({group,trend})=><li key={group.code}>{group.label}: {workforceTrendMessage(group,trend).detail}</li>)}</ul><p>Observed net staffing change from {summary.from} to {summary.to}, divided by 3 complete months, then continued for 3 months. FTE describes staffing, not qualified or productive capacity. Net movement includes transfers, not turnover alone. For the trend-based rows: Demand and scheduled hiring are unknown: these are conditional workforce declines, not proven capacity gaps or risk probabilities.</p>{synthetic&&<><p className="mt-2">Workload scenario v{synthetic.version}: Client Operations / Client Operations Specialist (BU-CLIENTOPS / OPS-CLIENT), a synthetic role slice. {synthetic.point.requiredFte} FTE needed; {synthetic.point.allocatedFte} FTE assigned. Reference date {synthetic.asOf}; October-December 2026. 1,280 service units/month x 1 hour / 160 productive hours = 8 FTE needed. 10 fictional people and 10 contracted FTE x 30% assigned time = 3 FTE available. Zero hires, departures, transfers and productivity uplift are scenario assumptions. The calculator gives a {synthetic.point.gapFte} FTE shortfall each month. These are not observed BU staffing, proficiency facts, company demand or an addition to company headcount. Costs remain unknown.</p>{onReviewSyntheticCapacity&&<button type="button" className="min-h-11 underline" onClick={onReviewSyntheticCapacity}>Review this demo workload</button>}</>}</details>
  </>}
 </section>;
}
