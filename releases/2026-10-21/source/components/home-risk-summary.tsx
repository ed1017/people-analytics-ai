"use client";
import {useEffect,useRef,useState} from 'react';
import {datasetFetch,datasetSession} from '@/lib/dataset-client.mjs';
import {PUBLIC_9037} from '@/lib/public-9037-contract.mjs';
import {readCapacityRiskGroups} from '@/lib/group-capacity-risk-source';
import {dashboardRiskSummary} from '@/lib/dashboard-risk-summary';
import type {RiskGroup} from '@/lib/group-capacity-risk';
import type {DashboardFilters} from '@/lib/dashboard-scope';
import {GroupWorkforceTrend} from './group-workforce-trend';
const n=(value:number)=>Math.abs(value)>0&&Math.abs(value)<.1?'<0.1':Math.abs(value).toLocaleString('en-US',{maximumFractionDigits:1});
export function HomeRiskSummary({filters,asOf}:{filters:DashboardFilters;asOf:string}){
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
 const close=()=>{setSelected(null);requestAnimationFrame(()=>heading.current?.focus());};
 return <section aria-label="Workforce risks" className="mt-4 border-t pt-3">
  <h3 ref={heading} tabIndex={-1} className="font-semibold focus-visible:ring-2 focus-visible:ring-ring">Workforce risks</h3>
  {unsupported?<p className="mt-2 text-sm">Group trend risks are not available for this country or level filter. Clear those filters to review business-unit exposure.</p>:problem?<div className="mt-2 text-sm"><p role="status">{problem}</p><button className="min-h-11 underline" onClick={()=>{setGroups(null);setError('');setRetry(v=>v+1);}}>Retry risk evidence</button></div>:!summary?<p role="status" className="mt-2 text-sm">Loading verified group trends.</p>:selected?<div ref={planner} tabIndex={-1} className="mt-3 focus-visible:ring-2 focus-visible:ring-ring"><GroupWorkforceTrend groups={summary.rows.map(r=>r.group)} months={3} backLabel="Back to risk summary" selected={selected} onSelect={setSelected} onClose={close} storageKey={'dashboard-risk-trend:'+token+':'+filters.org} scopeLabel={filters.org==='all'?'All business units':summary.rows[0].group.label}/></div>:<>
   <p className="mt-1 text-sm text-muted-foreground">If the latest 3-month net trend continues through {summary.end}. Snapshot: {asOf}.</p>
   {summary.declines.length?<ul className="mt-2 divide-y">{summary.declines.slice(0,3).map(({group,trend})=><li key={group.code} className="flex flex-wrap items-center justify-between gap-2 py-2"><div className="min-w-0 text-sm"><strong>{group.label}</strong><p>{n(trend.deltaFte)} fewer FTE; {trend.deltaHeadcount===0?'no net people change':n(trend.deltaHeadcount)+(trend.deltaHeadcount<0?' fewer people':' more people')}.</p></div><button aria-label={'Plan a response for '+group.label} className="min-h-11 rounded border px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring" onClick={()=>{setSelected(group.code);requestAnimationFrame(()=>planner.current?.focus());}}>Plan a response</button></li>)}</ul>:<p className="mt-2 text-sm">No projected FTE decline in the available group trends. This does not establish adequate capacity or absence of other risks.</p>}
   {summary.declines.length>3&&<p className="text-sm">Showing the 3 largest declines of {summary.declines.length}; the planner includes every group in this scope.</p>}
   <details className="mt-1 text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3 focus-visible:ring-2 focus-visible:ring-ring">Evidence and limits</summary><p>Observed stock change from {summary.from} to {summary.to}, divided by 3 complete months, then continued for 3 months. Net movement includes transfers, not turnover alone. Demand and scheduled hiring are unknown: these are conditional workforce declines, not proven capacity gaps or risk probabilities.</p></details>
  </>}
 </section>;
}
