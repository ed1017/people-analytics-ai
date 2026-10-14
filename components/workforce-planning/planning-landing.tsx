'use client';

import {useState} from 'react';
import {ArrowRight, ChartNoAxesCombined, SlidersHorizontal, Lightbulb, RotateCcw} from 'lucide-react';
import {capacitySpec, type CapacityDraft} from '@/lib/swp-capacity-draft';
import {calculateMonthlyWorkload} from '@/lib/swp-monthly-workload';
import {CapacityProjection} from './capacity-projection';
import styles from './planning-landing.module.css';

// Illustrative inputs only. Never copied into the live planning session or saved store.
const example:CapacityDraft={scope:'Service desk — tickets',openingDate:'2026-09-30',months:'6',people:'40',fte:'40',volume:'8000',effort:'1',hours:'160',hires:'2',exits:'1',hireFte:'1',exitFte:'1',allocation:'100',productivity:'0',costRate:'',fullTimeMovements:true,confirmed:true};
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString(undefined,{maximumFractionDigits:2});

export function PlanningLanding(){
 const [draft,setDraft]=useState(example);
 const [applied,setApplied]=useState(example);
 const [result,setResult]=useState(()=>calculateMonthlyWorkload(capacitySpec(example)));
 const [error,setError]=useState('');
 const stale=JSON.stringify(draft)!==JSON.stringify(applied);
 const last=result.points.at(-1)!;
 const edit=(key:keyof CapacityDraft,value:string)=>{setDraft(current=>({...current,[key]:value}));setError('');};
 const field=(key:Exclude<keyof CapacityDraft,'confirmed'|'fullTimeMovements'|'costRate'>,label:string,unit?:string)=><label className={styles.field} key={key}><span>{label}</span><span className={styles.inputWrap}><input aria-label={label} type={key==='openingDate'?'date':'text'} inputMode={key==='scope'||key==='openingDate'?undefined:'decimal'} value={draft[key]} onChange={event=>edit(key,event.target.value)}/>{unit&&<span>{unit}</span>}</span></label>;
 function update(){try{const next=calculateMonthlyWorkload(capacitySpec(draft));setResult(next);setApplied({...draft});setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Check your assumptions.');}}
 return <section className={styles.landing} aria-label="Illustrative workforce planning">
  <header className={styles.header}>
   <div><h3>Shape your next move.</h3><p>Explore the balance between your team and the work ahead.</p></div>
   <span className={styles.demo}>Illustrative demo · not live data</span>
  </header>
  <div className={styles.context}><span><strong>{applied.scope}</strong><span> · {applied.months}-month scenario</span></span><span>Opening {applied.openingDate} · {applied.people} people / {applied.fte} FTE</span></div>
  <div className={styles.columns}>
   <form className={styles.levers} noValidate onSubmit={event=>{event.preventDefault();update();}}>
    <div className={styles.cardTitle}><SlidersHorizontal size={18} aria-hidden="true"/><h4>Adjust your levers</h4></div>
    <p className={styles.muted}>Small changes. A clearer view.</p>
    {field('hires','Monthly hires','people')}
    {field('productivity','Productivity improvement','%')}
    {field('volume','Monthly workload','tickets')}
    <button type="submit" className={styles.primary}>Update projection <ArrowRight size={17} aria-hidden="true"/></button>
    <p className={styles.status} role="status">{stale?'Needs updating · previous results shown':'Projection up to date'}</p>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <details className={styles.assumptions}><summary>All demo assumptions</summary>
     <p>Editable illustrative values, repeated each month. No transfers. Departures leave before hires; hires work the full month. Each hire and departure is 1 FTE.</p>
     {field('openingDate','Opening month-end')}{field('months','Planning months')}{field('people','Opening people')}{field('fte','Opening contracted FTE')}{field('exits','Monthly departures')}{field('effort','Hours per ticket')}{field('hours','Productive hours per FTE / month')}{field('allocation','Time assigned to this work','%')}
     <p>Productive hours exclude leave and non-work time. Productivity increases throughput once. No cost rate is assumed.</p>
    </details>
    <button className={styles.reset} type="button" onClick={()=>{setDraft(example);setApplied(example);setResult(calculateMonthlyWorkload(capacitySpec(example)));setError('');}}><RotateCcw size={14} aria-hidden="true"/> Reset demo</button>
   </form>
   <div className={styles.projection}>
    <div className={styles.projectionHeading}><span><ChartNoAxesCombined size={19} aria-hidden="true"/> Workforce projection</span><span className={styles.badge}>{stale?'Needs updating':'Demo calculation'}</span></div>
    <CapacityProjection result={result}/>
    <p className={styles.footnote}>Calculated from the displayed demo assumptions. An FTE gap is capacity, not a hiring target.</p>
    <details className={styles.assumptions}><summary>Monthly detail</summary><div className="overflow-x-auto" role="region" aria-label="Demo monthly capacity" tabIndex={0}><table className="w-full text-left text-xs"><caption className="sr-only">Demo monthly available, required and gap FTE</caption><thead><tr>{['Month','Available FTE','Required FTE','Gap FTE'].map(label=><th className="p-2" key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.points.map(point=><tr key={point.month}><th className="p-2" scope="row">{point.month}</th>{[point.allocatedFte,point.requiredFte,point.gapFte].map((value,index)=><td className="p-2" key={index}>{number(value)}</td>)}</tr>)}</tbody></table></div></details>
   </div>
   <aside className={styles.guidance} aria-label="Planning guidance">
    <div className={styles.cardTitle}><span className={styles.icon}><Lightbulb size={20} aria-hidden="true"/></span><h4>Planning guidance</h4></div>
    
    <div className={styles.insight}><p className={styles.eyebrow}>WHAT THIS SCENARIO SHOWS</p><h4>{last.gapFte===null?'More inputs needed':last.gapFte>0?`${number(last.gapFte)} FTE shortfall`:last.gapFte<0?`${number(-last.gapFte)} FTE surplus`:'Capacity meets demand'}</h4><p>By {last.month}, this demo has {number(last.allocatedFte)} available FTE against {number(last.requiredFte)} required FTE.{stale?' Update to reflect your edits.':''}</p></div>
    <ol className={styles.steps}><li><strong>Explore hiring</strong><span>Change monthly hires to see how supply builds over time.</span></li><li><strong>Test productivity</strong><span>Increase throughput to see how much capacity the work requires.</span></li><li><strong>Use your own assumptions</strong><span>Calculate, save and compare your own scenarios in Advanced tools.</span></li></ol>
    <p className={styles.guidanceNote}>No AI call · demo changes are not saved.</p>
   </aside>
  </div>
 </section>;
}
