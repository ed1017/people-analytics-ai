'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {selectBusinessPlanningMix,type BusinessPlanning} from '@/lib/home-business-planning';
import {previewAssumptions,editPreviewAssumptions,type PreviewAssumptions} from '@/lib/planner-preview-inputs';
import {staffingChoiceLeaders} from '@/lib/staffing-choice-summary';
import {PlanningAssumptionSlider} from './planning-assumption-slider';
import styles from './planner-design-preview.module.css';

const n=(value:number|null|undefined)=>value==null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:1});
const cash=(value:number|null)=>value===null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const month=(value:string)=>new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value.slice(0,7)+'-01T00:00:00Z'));
type Mix={build:number;move:number;buy:number};

export function PlannerDesignPreview({baseline}:{baseline:BusinessPlanning}){
 const chartRef=useRef<SVGSVGElement>(null),[chartWidth,setChartWidth]=useState(740);
 useEffect(()=>{const element=chartRef.current;if(!element)return;const observer=new ResizeObserver(entries=>setChartWidth(Math.max(280,Math.min(740,entries[0].contentRect.width))));observer.observe(element);return()=>observer.disconnect();},[]);
 const initial=staffingChoiceLeaders(baseline.staffing!.result.options)!.coverage.mix;
 const [mix,setMix]=useState<Mix>(initial),[workingBase,setWorkingBase]=useState(baseline),[compare,setCompare]=useState(false),[notice,setNotice]=useState('');
 const [editor,setEditor]=useState(false),[assumptions,setAssumptions]=useState<PreviewAssumptions>(()=>previewAssumptions(baseline)),[editError,setEditError]=useState('');
 const controlsRef=useRef<HTMLElement>(null),resultsRef=useRef<HTMLElement>(null);
 function reset(){setWorkingBase(baseline);setMix(initial);setAssumptions(previewAssumptions(baseline));setEditor(false);setEditError('');setNotice('Original inputs restored.');}
 function apply(){try{const next=editPreviewAssumptions(workingBase,assumptions,'preview-edit-'+crypto.randomUUID());selectBusinessPlanningMix(next,mix);setWorkingBase(next);setEditor(false);setEditError('');setNotice('Budget and readiness updated. The original remains unchanged.');}catch(error){setEditError((error as Error).message);}}
 const state=selectBusinessPlanningMix(workingBase,mix),option=state.staffing!.result.options[0],spec=state.review.spec,result=state.review.result;
 const total=result.additionalRoles!,existing=result.availableFte!,target=existing+total,points=option.monthly;
 if(!points.length||points.some(p=>p.roles===null))return <main className={styles.page}>This worked example needs complete readiness inputs before it can be drawn.</main>;
 const first=points[0],short=Math.max(0,total-first.roles!),unchanged=workingBase===baseline&&JSON.stringify(mix)===JSON.stringify(initial);
 const alternative=selectBusinessPlanningMix(baseline,initial).staffing!.result.options[0];
 const x=(index:number)=>50+index*(chartWidth-80)/Math.max(1,points.length-1),y=(value:number)=>240-value/target*195;
 const step=(values:number[])=>values.map((v,i)=>i?`H${x(i)}V${y(v)}`:`M${x(i)} ${y(v)}`).join(' ');
 const available=points.map(p=>existing+p.roles!),demand=points.map(()=>target);
 const gap=available.map((v,i)=>`M${x(i)} ${y(target)}H${x(Math.min(i+1,points.length-1))}V${y(Math.min(v,target))}H${x(i)}Z`).join(' ');
 function edit(key:'build'|'move',text:string){if(!/^\d+$/.test(text))return;const next={...mix,[key]:Number(text)};next.buy=total-next.build-next.move;try{selectBusinessPlanningMix(workingBase,next);setMix(next);setNotice('');}catch{setNotice('Keep the mix within the available pools and five-role target.');}}
 return <main className={styles.page}>
  <nav className={styles.top} aria-label="Preview navigation"><Link href="/">Workforce Intelligence<span>Scenario studio</span></Link><span className={styles.preview}>Design preview · fictional worked example</span></nav>
  <div className={styles.intro}><span>SCENARIO PLANNING</span><span>{spec.scope} · {month(spec.startMonth!)}–{month(points.at(-1)!.month)}</span></div>
  <header className={styles.hero}>
   <div><p className={styles.eyebrow}>{unchanged?'Less uncovered work within the entered limits':'Your adjusted staffing option'}</p><h1>{mix.build>0?`Develop ${mix.build}. `:''}{mix.move>0?`Redeploy ${mix.move}. `:''}{mix.buy>0?`Hire ${mix.buy}.`:''}</h1><p>{option.shortfallHours!>0?`${n(option.shortfallHours)} hours still need cover before everyone is ready.`:'No uncovered hours under these assumptions.'} {result.budgetUsd===null?'No budget set; affordability is unknown.':option.cash!==null&&option.cash>result.budgetUsd?`${cash(option.cash-result.budgetUsd)} over the entered budget.`:option.status!=='met'?'Some entered limits are unmet or unverified.':'Readiness and release remain assumptions.'}</p></div>
   <div className={styles.heroNumber}><span>Ready staffing target</span><strong>{n(target)}<small>FTE</small></strong><span>{n(existing)} existing + {total} additional</span></div>
  </header>
  <dl className={styles.metrics}>
   <div><dt>Incremental cash · USD</dt><dd>{cash(option.cash)}</dd><span>{result.budgetUsd===null?'No budget set':cash(result.budgetUsd)+' entered ceiling'}</span></div>
   <div><dt>Uncovered work</dt><dd>{n(option.shortfallHours)}<small>hrs</small></dd><span>Across the full planning period</span></div>
   <div><dt>Full role readiness</dt><dd>{option.coverageDate?month(option.coverageDate):'Unknown'}</dd><span>Conditional on the entered dates</span></div>
   <div><dt>New hires</dt><dd>{n(option.addedEmployees)}<small>people</small></dd><span>{mix.build+mix.move} roles from internal pools</span></div>
  </dl>
  <aside className={styles.mobileResult} aria-label="Current scenario result"><span>Cash<strong>{cash(option.cash)}</strong></span><span>Uncovered<strong>{n(option.shortfallHours)} hrs</strong></span><button onClick={()=>resultsRef.current?.scrollIntoView({block:'start'})}>View chart ↑</button></aside>
  <div className={styles.workspace}>
   <section ref={controlsRef} className={styles.controls} aria-label="Scenario controls"><div className={styles.sectionTitle}><h2>Shape the plan</h2><span>Live calculation</span></div><p>Use internal capacity. Hire the remainder.</p>
    {(['build','move'] as const).map(key=><PlanningAssumptionSlider key={key} label={key==='build'?'Develop':'Redeploy'} value={String(mix[key])} spec={{min:0,max:Math.min(Number(state.staffing!.inputs.values[key==='build'?'buildMax':'moveMax'].value),total-mix[key==='build'?'move':'build']),precision:0,keyboardStep:1,extent:total,unit:'roles · 1 FTE each'}} onChange={text=>edit(key,text)}/>)}
    <div className={styles.hire}><span>Hire remaining</span><strong>{mix.buy}<small> people</small></strong></div>
    <button className={styles.editButton} aria-expanded={editor} onClick={()=>{setAssumptions(previewAssumptions(workingBase));setEditError('');setEditor(v=>!v);}}>Edit budget & dates</button>
    {editor&&<form className={styles.assumptionEditor} aria-label="Budget and readiness" onSubmit={event=>{event.preventDefault();apply();}}>
     <label>Budget ceiling · USD<input aria-label="Budget ceiling USD" inputMode="decimal" value={assumptions.budget} placeholder="Not set" onChange={e=>setAssumptions(v=>({...v,budget:e.target.value}))}/></label><small>Blank means unknown, not zero.</small>
     <label>Hire arrival<input aria-label="Hire arrival" type="date" value={assumptions.arrivalDate} onChange={e=>setAssumptions(v=>({...v,arrivalDate:e.target.value}))}/></label>
     <label>Redeployment ready<input aria-label="Redeployment ready" type="month" value={assumptions.moveMonth} onChange={e=>setAssumptions(v=>({...v,moveMonth:e.target.value}))}/></label>
     <label>Development ready<input aria-label="Development ready" type="month" value={assumptions.buildMonth} onChange={e=>setAssumptions(v=>({...v,buildMonth:e.target.value}))}/></label>
     {editError&&<p role="alert">{editError}</p>}<div><button type="submit">Apply changes</button><button type="button" onClick={()=>{setEditor(false);setEditError('');}}>Cancel</button></div>
    </form>}
    {!editor&&<p className={styles.timing}>Hire {month(String(state.staffing!.inputs.values.arrivalDate.value))} · redeploy {month(String(state.staffing!.inputs.values.moveMonth.value))} · develop {month(String(state.staffing!.inputs.values.buildMonth.value))}</p>}
    <div className={styles.controlActions}><button aria-pressed={compare} onClick={()=>{setCompare(v=>!v);resultsRef.current?.scrollIntoView({block:'start'});}}>{compare?'Hide original':'Compare with original'}</button><button onClick={reset}>Reset all inputs</button></div>
   </section>
   <section ref={resultsRef} className={styles.evidence} aria-label="Scenario results"><div className={styles.sectionTitle}><div><p className={styles.eyebrow}>SEE THE TRADE-OFF</p><h2>When will the team be ready?</h2></div><button className={styles.editLink} onClick={()=>controlsRef.current?.scrollIntoView({block:'start'})}>Edit inputs ↓</button></div>
    <div className={styles.legend}><span><i/>Ready FTE</span><span><i/>Target</span><span><i/>Shortfall</span>{compare&&alternative&&<span>··· Original plan</span>}</div>
    {compare&&<div className={styles.comparison} aria-label="Original plan comparison"><strong>Original → current</strong><span>Cash {cash(alternative.cash)} → {cash(option.cash)}</span><span>Uncovered {n(alternative.shortfallHours)} → {n(option.shortfallHours)} hrs</span></div>}
    <svg className={styles.chart} ref={chartRef} viewBox={`0 0 ${chartWidth} 280`} role="img" aria-label="Conditional ready FTE versus staffing target"><title>End-of-month role readiness; shaded shortfall is not full-period workload hours.</title>
     {[0,target/2,target].map(v=><g key={v}><path d={`M50 ${y(v)}H${chartWidth-30}`} stroke="#dbe4eb" strokeDasharray="3 5"/><text x="35" y={y(v)+5} textAnchor="end">{n(v)}</text></g>)}
     <path d={gap} fill="#fce9b9"/><path d={step(demand)} stroke="#243f5a" strokeWidth="2" strokeDasharray="7 5" fill="none"/>
     {compare&&alternative&&<path d={step(alternative.monthly.map(p=>existing+p.roles!))} stroke="#687b92" strokeWidth="3" strokeDasharray="2 5" fill="none"/>}
     <path d={step(available)} stroke="#007d7d" strokeWidth="4" fill="none"/>
     {points.map((p,i)=><circle key={p.month} cx={x(i)} cy={y(available[i])} r="5" fill="#007d7d" stroke="white" strokeWidth="2" aria-label={`${month(p.month)}: ${n(available[i])} ready FTE; ${n(Math.max(0,target-available[i]))} FTE short`}><title>{month(p.month)}: {n(available[i])} ready / {n(target)} target</title></circle>)}
     {(chartWidth<500?[0,5,points.length-1]:[0,2,5,8,points.length-1]).filter((v,i,a)=>v<points.length&&a.indexOf(v)===i).map(i=><text key={i} x={x(i)} y="269" textAnchor={i===0?'start':i===points.length-1?'end':'middle'}>{month(points[i].month)}</text>)}
    </svg>
    <div className={styles.verdict}><div><span>{month(first.month)} · opening month</span><strong>{short>0?`Short ${n(short)} FTE`:'Target met'}</strong></div><p>{n(existing+first.roles!)} ready / {n(target)} staffing target.<br/>{option.coverageDate?`Full role readiness from ${month(option.coverageDate)}.`:'Full readiness is unknown.'}</p></div>
    <details className={styles.details}><summary>Exact monthly values & calculation</summary><p>Existing allocation plus end-of-month ready roles, each 1 FTE. Shading shows readiness shortfall; uncovered work is calculated separately with partial-month timing. This example is not observed workforce performance.</p><table><thead><tr><th>Month</th><th>Ready FTE</th><th>Target</th><th>Short FTE</th></tr></thead><tbody>{points.map((p,i)=><tr key={p.month}><th>{month(p.month)}</th><td>{n(available[i])}</td><td>{n(target)}</td><td>{n(Math.max(0,target-available[i]))}</td></tr>)}</tbody></table></details>
   </section>
  </div>
  <footer className={styles.actions}><div><strong>Save & reopen: not connected in this preview.</strong><p>The live app’s reviewed plan-save flow remains unchanged. Preview edits last until reload.</p></div></footer>
  <p role="status" className={styles.notice}>{notice}</p>
 </main>;
}
