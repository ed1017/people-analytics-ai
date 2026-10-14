'use client';

import {ArrowRight} from 'lucide-react';
import type {AppPage, OverviewData} from '@/lib/types';
import {isVerifiedDashboardScope,type DashboardFilters,type DashboardScopeReceipt} from '@/lib/dashboard-scope';
import {usePlanningSession} from '@/components/workforce-planning/planning-session-context';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {capacityContext,readCapacityBucket,monthlyCapacityField} from '@/lib/swp-capacity-store';
import styles from './home-overview-summary.module.css';

export type HomeOverviewSummaryProps={
 overview:OverviewData|null; receipt:DashboardScopeReceipt|null; requested:DashboardFilters;
 scopeLabel:string; loading:boolean; error:string|null;
 onNavigate:(page:AppPage)=>void;
};
const known=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const count=(value:unknown)=>known(value)?value.toLocaleString(undefined,{maximumFractionDigits:2}):'Unavailable';
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const date=(value:string)=>new Date(value+'T00:00:00Z').toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});

/** Read only the active goal/dataset bucket. Opening Home never selects or changes a scenario. */
export function HomePlanningOverview(props:HomeOverviewSummaryProps){
 const {goalKey}=usePlanningSession(),storage=useDecisionStorage();
 const goalId=goalKey.slice(goalKey.indexOf(':')+1);
 let savedNames:string[]=[];
 if(goalId&&storage.saved){
  try{
   const context=capacityContext(decisionStore,datasetSession.snapshot(),goalId);
   savedNames=readCapacityBucket(storage.data.workspaces[goalId]?.fields[monthlyCapacityField],context).entries.map(entry=>entry.record.name);
  }catch{/* Existing storage recovery remains available through Chat & saved goals. */}
 }
 return <HomeOverviewSummary {...props} savedNames={savedNames}/>;
}

export function HomeOverviewSummary({overview,receipt,requested,scopeLabel,loading,error,onNavigate,savedNames=[]}:HomeOverviewSummaryProps&{savedNames?:string[]}){
 const verified=isVerifiedDashboardScope(receipt)&&(['country','org','level'] as const).every(key=>receipt?.effective?.[key]===requested[key]);
 const current=!loading&&!error&&verified&&overview&&validDate(overview.snapshot_date)?overview:null;
 return <section aria-label="Workforce planning overview" className={styles.surface}>
  <h2>Plan your workforce.</h2>
  <div className={styles.snapshot}>
   <div className={styles.label}>Current workforce <span>Demo data</span></div>
   {current?<p className={styles.quantity}><strong>{count(current.headcount)}</strong> people <span>· {count(current.fte)} FTE</span></p>:<p className={styles.notice} role="status">{loading?'Updating workforce…':'Workforce snapshot unavailable'}</p>}
   <p className={styles.context}>{scopeLabel}{current&&<> · {date(current.snapshot_date)}</>}</p>
  </div>
  <button type="button" className={styles.primary} onClick={()=>onNavigate('planning-overview')}>Plan a scenario <ArrowRight size={18} aria-hidden="true"/></button>
  {savedNames.length>0&&<section className={styles.saved} aria-label="Saved scenarios"><h3>Saved scenarios</h3><ul>{savedNames.slice(0,3).map((name,index)=><li key={index}>{name}</li>)}</ul></section>}
 </section>;
}
