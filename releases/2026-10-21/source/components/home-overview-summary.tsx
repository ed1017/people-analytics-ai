'use client';

import {ArrowRight} from 'lucide-react';
import type {AppPage, OverviewData} from '@/lib/types';
import {isVerifiedDashboardScope,type DashboardFilters,type DashboardScopeReceipt} from '@/lib/dashboard-scope';
import {usePlanningSession,type CapacitySession} from '@/components/workforce-planning/planning-session-context';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {capacityContext,capacityBinding,readCapacityBucket,monthlyCapacityField} from '@/lib/swp-capacity-store';
import {capacitySpec} from '@/lib/swp-capacity-draft';
import {calculateMonthlyWorkload} from '@/lib/swp-monthly-workload';
import {calculateCapacityCost,capacityCostAssumptions,capacityCalculationKey,formatCapacityCost} from '@/lib/swp-capacity-cost';
import {monthlyScenarioInputKey as inputKey} from '@/lib/monthly-scenario-compatibility.mjs';
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

/** Reuse the existing deterministic engine to reject stale/incomplete session results. No writes. */
export function currentCapacityOverview(session:CapacitySession){
 try{
  if(session.error||!session.draft.confirmed||!session.capture||session.result?.status!=='calculated')return null;
  const result=calculateMonthlyWorkload(capacitySpec(session.draft));
  const cost=session.cost?calculateCapacityCost(result,capacityCostAssumptions(session.draft.costRate??'')):null;
  if(inputKey(result)!==inputKey(session.result)||inputKey(cost)!==inputKey(session.cost??null)||capacityCalculationKey(result,cost)!==session.capture.inputKey)return null;
  return {result,cost};
 }catch{return null;}
}
type Scenario=NonNullable<ReturnType<typeof currentCapacityOverview>>;

/** Read only the active goal/dataset bucket. Opening Home never selects or changes a scenario. */
export function HomePlanningOverview(props:HomeOverviewSummaryProps){
 const {goalKey,capacitySession:session}=usePlanningSession(),storage=useDecisionStorage();
 const goalId=goalKey.slice(goalKey.indexOf(':')+1);
 let scenario=currentCapacityOverview(session),savedNames:string[]=[];
 if(goalId){
  try{
   if(!storage.saved)throw Error('Saved work needs review.');
   const context=capacityContext(decisionStore,datasetSession.snapshot(),goalId);
   savedNames=readCapacityBucket(storage.data.workspaces[goalId]?.fields[monthlyCapacityField],context).entries.map(entry=>entry.record.name);
   if(!session.scope||inputKey(session.capture?.binding??null)!==inputKey(capacityBinding(context,session.scope)))scenario=null;
  }catch{scenario=null;}
 }else if(session.capture?.binding){scenario=null;}
 return <HomeOverviewSummary {...props} savedNames={savedNames} scenario={scenario}/>;
}

export function HomeOverviewSummary({overview,receipt,requested,scopeLabel,loading,error,onNavigate,savedNames=[],scenario=null}:HomeOverviewSummaryProps&{savedNames?:string[];scenario?:Scenario|null}){
 const verified=isVerifiedDashboardScope(receipt)&&(['country','org','level'] as const).every(key=>receipt?.effective?.[key]===requested[key]);
 const current=!loading&&!error&&verified&&overview&&validDate(overview.snapshot_date)?overview:null;
 const point=scenario?.result.points.at(-1);
 const supply=point?point.allocatedFte:current?.fte??null;
 const demand=point?.requiredFte??null;
 const comparable=known(supply)&&known(demand);
 const gap=comparable?demand-supply:null;
 const maximum=Math.max(known(supply)?supply:0,known(demand)?demand:0,1);
 const runRate=scenario?.cost?.points.find(row=>row.month===point?.month)?.runRateCents;
 const gapLabel=gap===null?'Demand not set':gap>0?'Capacity shortfall':gap<0?'Capacity surplus':'Capacity balanced';
 return <section aria-label="Workforce planning overview" className={styles.surface}>
  <header className={styles.heading}>
   <div><p className={styles.eyebrow}>Strategic workforce planning</p><h2>Workforce overview</h2><p className={styles.subtitle}>Review current workforce, set demand, then save and compare scenarios.</p></div>
   <span className={styles.badge}>{point?'Your scenario':'Demo workforce'}</span>
  </header>
  {point?<p className={styles.context}>{scenario?.result.assumptions.scope.label} · {point.month} · FTE assigned to this work</p>:<>
   {current?<p className={styles.context}><strong>{count(current.headcount)}</strong> people · {scopeLabel} · {date(current.snapshot_date)}</p>:<p className={styles.notice} role="status">{loading?'Updating workforce…':'Workforce snapshot unavailable'}</p>}
  </>}
  <dl className={styles.boxes}>
   <div><dt>Supply</dt><dd>{known(supply)?count(supply):'Unavailable'}{known(supply)&&<small> FTE</small>}</dd></div>
   <div><dt>Demand</dt><dd>{known(demand)?count(demand):'Not set'}{known(demand)&&<small> FTE</small>}</dd></div>
   <div><dt>{gap===null?'Gap':gap>0?'Shortfall':gap<0?'Surplus':'Balanced'}</dt><dd>{gap===null?'Not set':count(Math.abs(gap))}{gap!==null&&<small> FTE</small>}</dd></div>
  </dl>
  <div className={styles.layout}>
   <div className={styles.snapshot}>
    <h3 className={styles.label}>Supply vs demand</h3>
    <p className={styles.context}>{point?`${scenario?.result.assumptions.scope.label} · ${point.month}`:'Selected workforce snapshot'}</p>
    <div className={styles.bars} aria-hidden="true">
     <div><span>Supply</span><div className={styles.track}>{known(supply)&&<i style={{width:`${supply/maximum*100}%`}}/>}</div><strong>{known(supply)?count(supply):'Unavailable'}</strong></div>
     <div><span>Demand</span><div className={`${styles.track} ${known(demand)?styles.demand:styles.unset}`}>{known(demand)?<i style={{width:`${demand/maximum*100}%`}}/>:<span>Not set</span>}</div><strong>{known(demand)?count(demand):'—'}</strong></div>
    </div>
    <p className={styles.note}>{point?'Calculated from your scenario assumptions, not a company forecast.':'Demand has not been set for this workforce snapshot.'}</p>
    <p className={styles.note}>FTE measures capacity, not a number of people to hire.</p>
   </div>
   <aside className={styles.brief} aria-label="Planning brief">
    <p className={styles.eyebrow}>Planning brief</p>
    <h3>{gapLabel}</h3>
    <p>{point?gap===0?'Your workload and assigned capacity match for this month.':`Review your workload, hiring and productivity assumptions for ${point.month}.`:current?'Demand comes from business requirements: the work to deliver and the time it takes. Enter those assumptions to compare required and available capacity.':'A verified workforce snapshot or a complete workload scenario is needed before comparing supply and demand.'}</p>
    <div className={styles.cost} aria-label="Scenario supply cost">
     <span>Scenario supply run-rate</span><strong>{point?formatCapacityCost(runRate):'Not set'}{point&&runRate!==null&&runRate!==undefined&&<small> USD/month</small>}</strong>
     <p>{point?`${point.month} · User-assumed rate × contracted FTE; not actual pay or savings.`:'Optional cost from your scenario assumptions.'}</p>
    </div>
    <button type="button" className={styles.primary} onClick={()=>onNavigate('planning-overview')}>{point||savedNames.length?'Continue your scenarios':'Set demand & plan'} <ArrowRight size={18} aria-hidden="true"/></button>
   </aside>
  </div>
  {savedNames.length>0&&<section className={styles.saved} aria-label="Saved scenarios"><h3>Saved scenarios</h3><ul>{savedNames.slice(0,3).map((name,index)=><li key={index}>{name}</li>)}</ul></section>}
 </section>;
}
