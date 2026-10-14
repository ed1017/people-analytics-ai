'use client';

import {ArrowRight, Users, CalendarDays, ChartNoAxesCombined} from 'lucide-react';
import type {AppPage, OverviewData} from '@/lib/types';
import {isVerifiedDashboardScope,type DashboardFilters,type DashboardScopeReceipt} from '@/lib/dashboard-scope';
import {usePlanningSession,type CapacitySession} from '@/components/workforce-planning/planning-session-context';
import {CapacityProjection} from '@/components/workforce-planning/capacity-projection';
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
 scopeLabel:string; loading:boolean; error:string|null; compact:boolean;
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

/** Read the existing goal/dataset-bound session and saved bucket; never select or create a scenario. */
export function HomePlanningOverview(props:HomeOverviewSummaryProps){
 const {goalKey,capacitySession:session}=usePlanningSession(),storage=useDecisionStorage();
 const goalId=goalKey.slice(goalKey.indexOf(':')+1);
 let scenario=currentCapacityOverview(session),savedNames:string[]=[],savedUnavailable=false;
 if(goalId){
  try{
   const context=capacityContext(decisionStore,datasetSession.snapshot(),goalId);
   if(!storage.saved)throw Error('Saved work needs review.');
   savedNames=readCapacityBucket(storage.data.workspaces[goalId]?.fields[monthlyCapacityField],context).entries.map(entry=>entry.record.name);
   if(!session.scope||inputKey(session.capture?.binding??null)!==inputKey(capacityBinding(context,session.scope)))scenario=null;
  }catch{scenario=null;savedUnavailable=true;}
 }else if(session.capture?.binding){scenario=null;}
 return <HomeOverviewSummary {...props} scenario={scenario} savedNames={savedNames} savedUnavailable={savedUnavailable} hasGoal={Boolean(goalId)}/>;
}

export function HomeOverviewSummary({overview,receipt,requested,scopeLabel,loading,error,compact,onNavigate,scenario=null,savedNames=[],savedUnavailable=false,hasGoal=false}:HomeOverviewSummaryProps&{scenario?:Scenario|null;savedNames?:string[];savedUnavailable?:boolean;hasGoal?:boolean}){
 const verified=isVerifiedDashboardScope(receipt)&&(['country','org','level'] as const).every(key=>receipt?.effective?.[key]===requested[key]);
 const current=!loading&&!error&&verified&&overview&&validDate(overview.snapshot_date)?overview:null;
 const result=scenario?.result,first=result?.points[0],last=result?.points.at(-1);
 return <details key={compact?'working':'starting'} open={!compact} className={styles.summary}>
  <summary className={styles.disclosure}>Planning overview <span>Workforce, horizon &amp; scenarios</span></summary>
  <section aria-label="Workforce planning overview" className={styles.surface}>
   <header className={styles.header}><div><h2>Plan the workforce you’ll need.</h2><p>What will the work require, what could change, and what would it cost?</p></div><span className={styles.demo}>Workforce snapshot · demo data</span><button type="button" className={`${styles.primary} ${styles.mobileAction}`} onClick={()=>onNavigate('planning-overview')}>Open planner <ArrowRight size={16} aria-hidden="true"/></button></header>
   <div className={styles.context}><span>Current workforce · {scopeLabel}</span><span>{current?`As of ${date(current.snapshot_date)}`:'Snapshot date unavailable'}</span></div>
   {!current&&<p className={styles.notice} role="status">{loading?'Updating this workforce view…':'Workforce evidence is unavailable for this scope. You can still plan with explicit assumptions.'}</p>}
   <dl className={styles.metrics}>
    <div><dt>Current workforce</dt><dd><span className={!current||!known(current.headcount)?styles.pending:undefined}>{count(current?.headcount)}</span><p>{current&&known(current.fte)?`people · ${count(current.fte)} FTE`:'People / FTE unavailable'}</p></dd></div>
    <div><dt>Planning horizon</dt><dd><span className={!result?styles.pending:undefined}>{result?`${result.points.length} months`:'Not set'}</span><p>{first&&last?`${first.month} → ${last.month}`:'Choose 1–6 months in the capacity tool'}</p></dd></div>
    <div><dt>Scenario supply cost</dt><dd><span className={!scenario||!scenario.cost?styles.pending:undefined}>{scenario?formatCapacityCost(scenario.cost?.points.at(-1)?.runRateCents):'Not calculated'}</span><p>{scenario?`USD/month · final month ${last?.month}`:'Needs a scenario and an explicit rate'}</p></dd></div>
   </dl>
   <div className={styles.layout}>
    <div className={styles.evidence}>
     {result?<><div className={styles.scenarioHeading}><ChartNoAxesCombined size={18} aria-hidden="true"/><h3>Current workload scenario</h3></div><p className={styles.scenarioScope}>{result.assumptions.scope.label} · user assumptions, not a company forecast. Dashboard filters do not change this scenario.</p><CapacityProjection result={result}/></>:<div className={styles.start}>
      <span className={styles.startIcon}><ChartNoAxesCombined size={26} aria-hidden="true"/></span><h3>Start with one workforce question.</h3><p>No calculated workload scenario is open. Set a scope and horizon in the planner to compare available capacity with the work required.</p>
      <ol><li><strong>Define the work</strong><span>Choose one team, work unit and time horizon.</span></li><li><strong>Test your assumptions</strong><span>Review staffing, workload and productivity together.</span></li><li><strong>Compare the result</strong><span>See the capacity gap and add a cost rate if known.</span></li></ol>
     </div>}
     <p className={styles.limit}>Skills gaps are not assessed by this capacity tool. Company-level demand is not inferred from the workforce snapshot.</p>
    </div>
    <aside className={styles.next} aria-label="Planning next steps"><p className={styles.eyebrow}>YOUR NEXT STEP</p><h3>{result?'Continue your scenario.':'Build a scenario.'}</h3><p>Use the existing planner to explore choices and review the assumptions.</p>
     <button type="button" className={styles.primary} onClick={()=>onNavigate('planning-overview')}><CalendarDays size={18} aria-hidden="true"/><span>Open planner</span><ArrowRight size={16} aria-hidden="true"/></button>
     <p className={styles.hint}>Try the labeled demo, or open Advanced tools for your own capacity scenarios.</p>
     <div className={styles.saved}><h4>Saved capacity scenarios</h4>{savedUnavailable?<p>Saved work needs review. Check Browser storage details and the selected goal.</p>:savedNames.length?<><p>{savedNames.length} saved for the selected goal, in this browser.</p><ul>{savedNames.slice(0,3).map((name,index)=><li key={index}>{name}</li>)}</ul><p>Open or compare them in the planner’s Advanced tools.</p></>:<p>{hasGoal?'No capacity scenarios are saved for this goal yet.':'Select a goal to find its saved scenarios.'} Existing goal work remains below.</p>}</div>
     <button type="button" className={styles.secondary} onClick={()=>onNavigate('workforce')}><Users size={18} aria-hidden="true"/><span>Explore workforce</span><ArrowRight size={16} aria-hidden="true"/></button>
     <p className={styles.hint}>Supporting analytics, composition and trends.</p>
    </aside>
   </div>
   <details className={styles.source}><summary>Sources, scope and calculation detail</summary><p>Current workforce uses the existing dashboard snapshot, with a scope receipt matching Country, Business Unit and Level. It is synthetic demo evidence, not live organizational records.</p><p>{loading?'Refreshing the requested scope.':error||receipt?.basis||'An effective-scope receipt is unavailable.'}</p>
    {result?<><p>The projection uses only the current confirmed capacity calculation for its named workload. It is separate from the dashboard snapshot. Cost is user-assumed USD per contracted FTE per month × contracted supply; blank stays unknown and zero stays zero. It is not actual pay, cumulative spend or savings.</p><div className={styles.table} role="region" aria-label="Overview monthly capacity" tabIndex={0}><table><caption>Monthly detail · available, required and gap FTE</caption><thead><tr>{['Month','Available FTE','Required FTE','Gap FTE'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.points.map(point=><tr key={point.month}><th scope="row">{point.month}</th>{[point.allocatedFte,point.requiredFte,point.gapFte].map((value,index)=><td key={index}>{value===null?'Unknown':value.toLocaleString(undefined,{maximumFractionDigits:2})}</td>)}</tr>)}</tbody></table></div></>:<p>No scenario is selected automatically and no calculation or AI request is started from this overview.</p>}
   </details>
  </section>
 </details>;
}
