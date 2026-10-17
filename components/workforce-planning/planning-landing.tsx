'use client';

import {useState} from 'react';
import {ChartNoAxesCombined, SlidersHorizontal, Lightbulb, RotateCcw} from 'lucide-react';
import {type CapacityDraft} from '@/lib/swp-capacity-draft';
import {capacityPreview} from '@/lib/capacity-preview';
import {capacitySliders} from '@/lib/planning-slider';
import {PlanningAssumptionSlider} from '@/components/planning-assumption-slider';
import {CapacityProjection} from './capacity-projection';
import styles from './planning-landing.module.css';

// Illustrative inputs only. Never copied into the live planning session or saved store.
const example:CapacityDraft={scope:'Service desk — tickets',openingDate:'2026-09-30',months:'6',people:'40',fte:'40',volume:'8000',effort:'1',hours:'160',hires:'2',exits:'1',hireFte:'1',exitFte:'1',allocation:'100',productivity:'0',costRate:'',fullTimeMovements:true,confirmed:true};
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString(undefined,{maximumFractionDigits:2});

export function PlanningLanding(){
 const [draft,setDraft]=useState(example);
 const {result,error}=capacityPreview(draft);
 const last=result?.points.at(-1);
 const edit=(key:keyof CapacityDraft,value:string)=>setDraft(current=>({...current,[key]:value}));
 const field=(key:Exclude<keyof CapacityDraft,'confirmed'|'fullTimeMovements'|'costRate'|'sourceNote'>,label:string,unit?:string)=>capacitySliders[key]
  ? <PlanningAssumptionSlider key={key} label={label} value={draft[key]} spec={{...capacitySliders[key],unit:unit??capacitySliders[key].unit}} onChange={value=>edit(key,value)}/>
  : <label className={styles.field} key={key}><span>{label}</span><span className={styles.inputWrap}><input aria-label={label} type={key==='openingDate'?'date':'text'} inputMode={key==='scope'||key==='openingDate'?undefined:'decimal'} value={draft[key]} onChange={event=>edit(key,event.target.value)}/>{unit&&<span>{unit}</span>}</span></label>;
 return <section className={styles.landing} aria-label="Illustrative workforce planning">
  <header className={styles.header}>
   <div><h3>Shape your next move.</h3><p>Try fictional service-desk assumptions. These values are separate from your demand and saved scenarios.</p></div>
   <span className={styles.demo}>Illustrative demo · not live data</span>
  </header>
  <div className={styles.context}><span><strong>{draft.scope}</strong><span> · {draft.months}-month scenario</span></span><span>Opening {draft.openingDate} · {draft.people} people / {draft.fte} FTE</span></div>
  <div className={styles.columns}>
   <form className={styles.levers} noValidate onSubmit={event=>event.preventDefault()}>
    <div className={styles.cardTitle}><SlidersHorizontal size={18} aria-hidden="true"/><h4>Adjust your levers</h4></div>
    <p className={styles.muted}>Small changes. A clearer view.</p>
    {field('hires','Monthly hires','people')}
    {field('productivity','Productivity improvement','%')}
    {field('volume','Monthly workload','tickets')}
    <p className={styles.status} role="status">{error?'Check your inputs':result?.status==='needs-inputs'?'More inputs needed':'Projection updates as you edit'}</p>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <details className={styles.assumptions}><summary>All demo assumptions</summary>
     <p>Editable illustrative values, repeated each month. No transfers. Departures leave before hires; hires work the full month. Each hire and departure is 1 FTE.</p>
     {field('openingDate','Opening month-end')}{field('months','Planning months')}{field('people','Opening people')}{field('fte','Opening contracted FTE')}{field('exits','Monthly departures')}{field('effort','Hours per ticket')}{field('hours','Productive hours per FTE / month')}{field('allocation','Time assigned to this work','%')}
     <p>Productive hours exclude leave and non-work time. Productivity increases throughput once. No cost rate is assumed.</p>
    </details>
    <button className={styles.reset} type="button" onClick={()=>{setDraft(example);}}><RotateCcw size={14} aria-hidden="true"/> Reset demo</button>
   </form>
   <div className={styles.projection}>
    <div className={styles.projectionHeading}><span><ChartNoAxesCombined size={19} aria-hidden="true"/> Workforce projection</span><span className={styles.badge}>{error?'Check inputs':'Demo calculation'}</span></div>
    <CapacityProjection result={result}/>
    <p className={styles.footnote}>Calculated from the displayed demo assumptions. An FTE gap is capacity, not a hiring target.</p>
    {result&&<details className={styles.assumptions}><summary>Monthly detail</summary><div className="overflow-x-auto" role="region" aria-label="Demo monthly capacity" tabIndex={0}><table className="w-full text-left text-xs"><caption className="sr-only">Demo monthly available, required and gap FTE</caption><thead><tr>{['Month','Available FTE','Required FTE','Gap FTE'].map(label=><th className="p-2" key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.points.map(point=><tr key={point.month}><th className="p-2" scope="row">{point.month}</th>{[point.allocatedFte,point.requiredFte,point.gapFte].map((value,index)=><td className="p-2" key={index}>{number(value)}</td>)}</tr>)}</tbody></table></div></details>}
   </div>
   <aside className={styles.guidance} aria-label="Planning guidance">
    <div className={styles.cardTitle}><span className={styles.icon}><Lightbulb size={20} aria-hidden="true"/></span><h4>Planning guidance</h4></div>
    
    <div className={styles.insight}><p className={styles.eyebrow}>FINAL PLANNING MONTH</p><h4>{!last||last.gapFte===null?'More inputs needed':last.gapFte>0?`${number(last.gapFte)} FTE shortfall`:last.gapFte<0?`${number(-last.gapFte)} FTE surplus`:'Capacity meets demand'}</h4><p>{last?<>By {last.month}, this demo has {number(last.allocatedFte)} available FTE against {number(last.requiredFte)} required FTE.</>:'Complete valid inputs to see the comparison.'}</p></div>
    <ol className={styles.steps}><li><strong>Explore hiring</strong><span>Change monthly hires to see how supply builds over time.</span></li><li><strong>Test productivity</strong><span>Increase throughput to see how much capacity the work requires.</span></li><li><strong>Use your own assumptions</strong><span>Use Your demand & capacity scenarios above to calculate, save and compare your own inputs.</span></li></ol>
    <p className={styles.guidanceNote}>No AI call · demo changes are not saved.</p>
   </aside>
  </div>
 </section>;
}
