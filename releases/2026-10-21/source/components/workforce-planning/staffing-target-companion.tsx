'use client';
import {catalogDisplayLabel} from "@/lib/catalog-display";

import {useEffect,useState,useSyncExternalStore} from 'react';
import {datasetFetch,datasetSession} from '@/lib/dataset-client.mjs';
import {DATASET_HEADER} from '@/lib/dataset-identity.mjs';
import {readStaffingCatalog,readStaffingSupply,staffingTargetPoint,type StaffingCatalog} from '@/lib/staffing-target';
import type {BusinessUnitScenarioResponse} from '@/lib/types';
import {usePlanningSession} from './planning-session-context';
import styles from './staffing-target-companion.module.css';

const endpoint='/api/business-unit-scenario?staffing_target=1';
const number=(value:number)=>value.toLocaleString(undefined,{maximumFractionDigits:1});
const monthLabel=(value:string)=>new Date(value+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});

export function StaffingTargetCompanion(){
 const token=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,()=> 'pending');
 const {goalKey}=usePlanningSession();
 const [started,setStarted]=useState(false),[open,setOpen]=useState(false);
 return <section className={styles.companion}>
  <button type="button" className={styles.launcher} aria-expanded={open} aria-controls="staffing-target-body" onClick={()=>{setStarted(true);setOpen(value=>!value);}}>Plan a staffing target <span>Business-unit headcount</span></button>
  <div id="staffing-target-body" hidden={!open}>{started&&<StaffingTarget key={JSON.stringify([token,goalKey])} token={token}/>}</div>
 </section>;
}

function StaffingTarget({token}:{token:string}){
 const [catalog,setCatalog]=useState<StaffingCatalog|null>(null);
 const [org,setOrg]=useState(''),[month,setMonth]=useState(''),[required,setRequired]=useState('');
 const [supply,setSupply]=useState<BusinessUnitScenarioResponse|null>(null);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let cancelled=false;
  async function load(){
   try{
    const response=await datasetFetch(endpoint,{cache:'no-store',signal:controller.signal});
    if(!response.ok||response.headers.get(DATASET_HEADER)!==token)throw Error('Supply source unavailable. Try again when verified data is available.');
    const next=readStaffingCatalog(await response.json());if(!cancelled)setCatalog(next);
   }catch{if(!cancelled)setError('Supply source unavailable. Try again when verified data is available.');}
   finally{if(!cancelled)setLoading(false);}
  }
  if(!token.startsWith('pending'))void load();
  return ()=>{cancelled=true;controller.abort();};
 },[token,refresh]);
 useEffect(()=>{
  if(!org||!catalog)return;
  const capturedCatalog=catalog;
  const controller=new AbortController();let cancelled=false;
  async function load(){
   try{
    const response=await datasetFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_unit:org}),signal:controller.signal});
    if(!response.ok||response.headers.get(DATASET_HEADER)!==token)throw Error('Unavailable');
    const next=readStaffingSupply(await response.json(),capturedCatalog,org);if(!cancelled)setSupply(next);
   }catch{if(!cancelled)setError('Comparable supply is unavailable for this business unit. Refresh the source before comparing.');}
   finally{if(!cancelled)setLoading(false);}
  }
  void load();return ()=>{cancelled=true;controller.abort();};
 },[org,catalog,token]);
 const current=supply?.scope.org_code===org&&!loading&&!error?supply:null;
 const point=staffingTargetPoint(current,month,required);
 const projected=current?.points.find(row=>row.planning_month===month)?.modeled_headcount??null;
 const invalid=required!==''&&(!/^\d+$/.test(required)||!Number.isSafeInteger(Number(required))||Number(required)>1e9);
 const scale=Math.max(projected??0,point?.required??0,1);
 function reset(){setCatalog(null);setSupply(null);setOrg('');setMonth('');setRequired('');setError('');setLoading(true);setRefresh(value=>value+1);}
 return <section className={styles.body} aria-label="Staffing target planner" aria-busy={loading}>
  <header><h3>How many people will you need?</h3><p>Set one target and see the difference.</p></header>
  <div className={styles.fields}>
   <label>Business unit<select aria-label="Business unit" value={org} disabled={!catalog} onChange={event=>{setOrg(event.target.value);setSupply(null);setMonth('');setRequired('');setError('');setLoading(Boolean(event.target.value));}}><option value="">Choose a business unit</option>{catalog?.business_units.map(unit=><option key={unit.org_code} value={unit.org_code}>{catalogDisplayLabel(unit.org_name)}</option>)}</select></label>
   <label>Target month<select aria-label="Target month" value={month} disabled={!current} onChange={event=>{setMonth(event.target.value);setRequired('');}}><option value="">Choose a month</option>{current?.points.map(row=><option key={row.planning_month} value={row.planning_month}>{monthLabel(row.planning_month)}</option>)}</select></label>
   <label>Required people<input aria-label="Required people" type="text" inputMode="numeric" value={required} disabled={!current||!month} placeholder="Not set" aria-describedby="staffing-target-assumption" aria-invalid={invalid} onChange={event=>setRequired(event.target.value)}/><small id="staffing-target-assumption">Your staffing assumption</small></label>
  </div>
  {loading&&<p role="status">Loading business-unit supply…</p>}
  {error&&<p role="alert">{error}</p>}
  {invalid&&<p role="alert">Enter a whole number of people, zero or more (up to 1 billion).</p>}
  <div className={styles.result}>
   <p className={styles.scope}>{current&&month?`${current.scope.org_name} · ${monthLabel(month)} · people`:'Choose a business unit and target month.'}</p>
   <div className={styles.bars} aria-hidden="true"><div><span>Supply</span><div>{projected!==null&&<i style={{width:`${projected/scale*100}%`}}/>}</div></div><div><span>Your target</span><div>{point&&<i className={styles.target} style={{width:`${point.required/scale*100}%`}}/>}</div></div></div>
   <dl><div><dt>Projected supply</dt><dd>{projected===null?'Not available':number(projected)}{projected!==null&&<small> people</small>}</dd></div><div><dt>Your target</dt><dd>{point?number(point.required):'Not set'}{point&&<small> people</small>}</dd></div></dl>
   <p className={styles.gap} role="status" aria-live="polite">{point?point.gap>0?`${number(point.gap)} people short of your target`:point.gap<0?`${number(-point.gap)} people above your target`:'Supply matches your target':projected!==null?'Enter your target to see the gap.':'A matching supply projection is needed.'}</p>
  </div>
  {catalog?.staffing_target_horizon&&<details className="text-sm"><summary className="min-h-11 cursor-pointer py-2 focus-visible:ring-2 focus-visible:ring-ring">Details</summary><p>Constructed 2027 draft: September 2026 stock is carried to January 2027 as an explicit assumption. October–December 2026 is unmodeled; no intervening supply projection or forecast bridge is supplied.</p></details>}
  <details className={styles.sources}><summary>Supply assumptions &amp; source</summary><p>Business unit only, across all countries and levels. Dashboard filters do not narrow this comparison. A business unit is not a job family.</p><p>Supply reruns this unit’s current headcount and stored Baseline using the existing deterministic model and Baseline assumptions. It is a projection, not guaranteed staffing. Source snapshot: {catalog?.as_of??'unavailable'}.</p>{catalog&&<p>Annual growth {catalog.defaults.annual_growth_pct}%; attrition {catalog.defaults.annual_attrition_pct}%; fill rate {catalog.defaults.fill_rate_pct}%; productivity hiring reduction {catalog.defaults.productivity_hiring_reduction_pct}%. Projected people may be fractional.</p>}<p>Your target applies only to the selected month. No monthly demand curve is inferred. This scratch comparison does not change or save existing scenarios. Changing unit, month, goal or dataset clears the target.</p></details>
  <button type="button" className={styles.refresh} onClick={reset} disabled={loading}>Refresh supply source</button>
 </section>;
}
