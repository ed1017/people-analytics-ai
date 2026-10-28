'use client';

import {useMemo,useState,useRef,useEffect} from 'react';
import snapshotData from '../data/fow-lab-snapshot.json';
import {buildFowLabModel,getFowLabView,type FowLabModel,type FowWeighting,type FowJob} from '@/lib/fow-lab';
import styles from './fow-lab-workspace.module.css';
import {FutureWorkExample} from './future-work-example';
import type {AppPage} from '@/lib/types';
import type {FoWLabSelection} from '@/lib/fow-lab-reference';

const count=(n:number|null)=>n===null?'Unavailable':n.toLocaleString('en-US',{maximumFractionDigits:1});
const percent=(n:number|null)=>n===null?'Unavailable':`${(n*100).toFixed(1)}%`;
const index=(n:number|null)=>n===null?'Unavailable':n.toFixed(2);
const dateLabel=(value:string)=>new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const status=(row:{suppressed:boolean;coverage:string;provenance:string})=>row.suppressed?'Withheld':row.coverage!=='complete'?`${row.coverage==='partial'?'Partial':'Missing'} task coverage`:row.provenance!=='consistent'?`${row.provenance==='mixed'?'Mixed':'Unknown'} scoring provenance`:'Complete task coverage';

/** Independent, read-only Lab snapshot. No app workforce filters, storage or AI calls. */
export function FowLabWorkspace({onReference,onNavigate,snapshot=snapshotData}:{onNavigate?:(page:AppPage)=>void;onReference?:(jobKey?:string,functionName?:string)=>void;snapshot?:unknown}){
 const parsed=useMemo(()=>{try{return {model:buildFowLabModel(snapshot),error:null};}catch{return {model:null,error:'The Lab snapshot could not be verified. Exposure, adoption and actions are unavailable.'};}},[snapshot]);
 if(!parsed.model)return <section className={styles.workspace} aria-label="Future of Work Lab"><h2>Future of Work Lab</h2><p role="alert" className={styles.notice}>{parsed.error}</p></section>;
 return <LabView key={`${parsed.model.dataset.id}:${parsed.model.meta.exportedAt}`} model={parsed.model} onReference={onReference} onNavigate={onNavigate}/>;
}

function LabView({model,onReference,onNavigate}:{model:FowLabModel;onNavigate?:(page:AppPage)=>void;onReference?:(jobKey?:string,functionName?:string)=>void}){
 const [functionName,setFunctionName]=useState(''),[weighting,setWeighting]=useState<FowWeighting>('cost'),[jobKey,setJobKey]=useState('');
 const [modelSelection,setModelSelection]=useState<FoWLabSelection|null>(null),modelNode=useRef<HTMLDivElement>(null),modelTrigger=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{if(modelSelection){modelNode.current?.focus();modelNode.current?.scrollIntoView({block:'nearest'});}},[modelSelection]);
 const startModel=(event:React.MouseEvent<HTMLButtonElement>)=>{modelTrigger.current=event.currentTarget;setModelSelection({functionName:functionName||undefined,jobKey:jobKey||undefined});};
 const view=getFowLabView(model,{functionName:functionName||null,weighting});
 const selectedJob=view.jobs.find(job=>job.key===jobKey)??null;
 const adoptionRows=view.adoption.filter(row=>row.level===(functionName?'family':'function'));
 const chartRows=adoptionRows.filter(row=>!row.suppressed&&row.score!==null&&row.activeRate!==null);
 const adoptionWeeks=[...new Set(adoptionRows.flatMap(row=>row.week?[row.week]:[]))];
 const selected=view.selected;
 const functions=model.functions[weighting].filter(row=>!row.total);
 return <section className={styles.workspace} aria-label="Future of Work Lab">
  <header className={styles.hero}>
   <div><p className={styles.eyebrow}>Future of Work Lab</p><h2>Explore AI exposure and adoption</h2><p>Find where to investigate task redesign, enablement and governance.</p></div>
   <span className={styles.badge}>Research snapshot</span>
  </header>
  <p className={styles.scope}>Lab: {count(model.dataset.headcount)} people · {functions.length} functions · {dateLabel(model.dataset.asOf)}. Lab filters apply only to this dataset.</p>
  <div className={styles.controls}>
   <label>Lab function<select value={functionName} onChange={event=>{setFunctionName(event.target.value);setJobKey('');}}><option value="">All functions</option>{functions.map(row=><option key={row.name} value={row.name}>{row.name}</option>)}</select></label>
   <label>Exposure weighting<select value={weighting} onChange={event=>setWeighting(event.target.value as FowWeighting)}><option value="cost">Labor cost</option><option value="headcount">Headcount</option></select></label>
   {onNavigate&&<button type="button" onClick={startModel}>Model this work</button>}
   {onReference&&<button type="button" onClick={()=>onReference(undefined,functionName||undefined)}>Review planning handoff</button>}
  </div>
  {modelSelection&&onNavigate&&<div ref={modelNode} tabIndex={-1} className={styles.panel} aria-label="Task redesign planner"><FutureWorkExample key={JSON.stringify(modelSelection)} selection={modelSelection} onNavigate={onNavigate} onClose={()=>{setModelSelection(null);requestAnimationFrame(()=>modelTrigger.current?.focus());}}/></div>}
  <dl className={styles.metrics}>
   <div><dt>{functionName||'Company'} exposure index</dt><dd>{selected?.suppressed?'Withheld':index(selected?.score??null)}<small> / 1</small></dd></div>
   <div><dt>Automate task share</dt><dd>{selected?.suppressed?'Withheld':percent(selected?.automateShare??null)}</dd></div>
   <div><dt>Augment task share</dt><dd>{selected?.suppressed?'Withheld':percent(selected?.augmentShare??null)}</dd></div>
   <div><dt>People in scope</dt><dd>{selected?.suppressed?'Withheld':count(selected?.headcount??null)}</dd></div>
  </dl>
  {selected&&(selected.suppressed||selected.score===null)&&<p role="status" className={styles.notice}>{status(selected)}. A comparable exposure index is unavailable for this scope.</p>}
  <div className={styles.chartGrid}>
   <figure className={styles.panel}>
    <figcaption><h3>Exposure by function</h3><p>{weighting==='cost'?'Labor-cost':'Headcount'} weighted index · 0–1 scale</p></figcaption>
    <div className={styles.barList}>{view.functions.map(row=><div className={styles.barRow} key={row.name}>
     <button type="button" aria-pressed={functionName===row.name} onClick={()=>{setFunctionName(row.name);setJobKey('');}}>{row.name}</button>
     <div className={styles.track} aria-hidden="true">{!row.suppressed&&row.score!==null&&<span style={{width:`${row.score*100}%`}}/>}</div>
     <span>{row.suppressed?'Withheld':index(row.score)}</span>
     {row.score===null&&!row.suppressed&&<small className={styles.rowNote}>{status(row)}</small>}
    </div>)}</div>
    {!view.functions.length&&<p role="status">No function exposure rows are available.</p>}
   </figure>
   <figure className={styles.panel}>
    <figcaption><h3>Exposure and weekly adoption</h3><p>{functionName?'Job families':'Functions'} · Active users as a share of headcount · {adoptionWeeks.length?`Week of ${adoptionWeeks.map(dateLabel).join(', ')}`:'Usage week unavailable'}</p></figcaption>
    {chartRows.length?<svg viewBox="0 0 500 310" className={styles.scatter} role="img" aria-label="Exposure index versus weekly active share. Exact values and dates are in the adoption table below.">
     {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="58" x2="470" y1={258-t*220} y2={258-t*220} stroke="#d9e3eb"/><text x="48" y={262-t*220} textAnchor="end">{t*100}%</text><text x={58+t*412} y="278" textAnchor="middle">{t.toFixed(2)}</text></g>)}
     <line x1="58" x2="58" y1="38" y2="258" stroke="#496277"/><line x1="58" x2="470" y1="258" y2="258" stroke="#496277"/>
     <text x="58" y="20">Weekly active share</text><text x="264" y="302" textAnchor="middle">Exposure index</text>
     {chartRows.map((row,i)=><circle key={`${row.functionName}:${row.family}:${i}`} cx={58+row.score!*412} cy={258-row.activeRate!*220} r="6" fill="#087f8c" stroke="#fff" strokeWidth="1.5"><title>{`${row.family??row.functionName}: exposure ${index(row.score)}, active ${percent(row.activeRate)}, week ${row.week??'unavailable'}`}</title></circle>)}
    </svg>:<p role="status" className={styles.empty}>No comparable exposure and adoption pairs are available.</p>}
    <details><summary>Adoption values and dates</summary><div className={styles.tableScroll} role="region" aria-label="Lab adoption values" tabIndex={0}><table><thead><tr><th scope="col">{functionName?'Family':'Function'}</th><th scope="col">Exposure</th><th scope="col">Active / people</th><th scope="col">Active share</th><th scope="col">Week</th></tr></thead><tbody>{adoptionRows.map((row,i)=><tr key={`${row.functionName}:${row.family}:${i}`}><th scope="row">{row.family??row.functionName??'Company'}</th><td>{row.suppressed?'Withheld':index(row.score)}</td><td>{row.suppressed?'Withheld':`${count(row.active)} / ${count(row.headcount)}`}</td><td>{row.suppressed?'Withheld':percent(row.activeRate)}</td><td>{row.week??'Unavailable'}</td></tr>)}</tbody></table>{!adoptionRows.length&&<p>No adoption rows available for this scope.</p>}</div></details>
    <p className={styles.note}>Weighting changes exposure only. Adoption retains its headcount denominator and recorded week.</p>
   </figure>
  </div>
  <section className={styles.panel} aria-label="Lab job and task detail">
   <div className={styles.sectionHeading}><div><h3>Explore the work behind the score</h3><p>Select a job to review its task shares and scoring coverage.</p></div><label>Job<select value={selectedJob?.key??''} onChange={event=>setJobKey(event.target.value)}><option value="">Choose a job</option>{view.jobs.map(job=><option key={job.key} value={job.key}>{job.title} · {job.functionName}</option>)}</select></label>{onNavigate&&<button type="button" onClick={startModel}>Model this work</button>}</div>
   {selectedJob?<JobDetail job={selectedJob} onReference={onReference}/>:<p className={styles.note}>{view.jobs.length} jobs in this scope. Task exposure describes the work; it is not a staffing reduction estimate.</p>}
  </section>
  <div className={styles.chartGrid}>
   <section className={styles.panel} aria-label="Lab action evidence"><h3>Actions to review</h3><p>Latest exported action batch · {functionName||'All functions'}</p>
    {!view.actions.length?<p className={styles.empty}>No saved actions are available for this scope.</p>:<ul className={styles.cards}>{view.actions.map((action,i)=><li key={`${action.functionName}:${action.move}:${i}`}><div className={styles.sectionHeading}><strong>{action.functionName} · {action.move}</strong><span className={styles.tag}>{action.state==='matched'?'Evidence matches this snapshot':action.state==='changed'?'Evidence changed':'Evidence unverified'}</span></div>{action.state==='matched'?<p>{action.text}</p>:<p role="status">Review the source evidence before using this saved action.</p>}<small>Generated {action.createdAt} · Snapshot {model.dataset.asOf} · {action.matching} matching, {action.changed} changed, {action.missing} missing evidence fields</small></li>)}</ul>}
   </section>
   <section className={styles.panel} aria-label="Lab governance register"><h3>Governance reviews</h3><p>Company-wide register · independent of function selection</p>
    {!view.register.length?<p className={styles.empty}>No use cases are available in this snapshot.</p>:<ul className={styles.cards}>{view.register.map(item=><li key={item.id}><strong>{item.name}</strong><p>{item.tier??'Risk tier unavailable'} · {item.status}{item.owner?` · Owner: ${item.owner}`:''}</p><p>Next review: {item.nextReview??'Not supplied'}{item.overdue?' · Overdue':''}{item.biasAuditDue?' · Bias audit due':''}</p></li>)}</ul>}
   </section>
  </div>
  <details className={styles.panel}><summary>Methodology and snapshot details</summary><div className={styles.method}>
   <p>{model.dataset.scopeLabel}. Lab functions are separate from the app’s business units; this view does not merge their workforce totals.</p>
   <p>Task labels contribute automate = 1, augment = 0.5 and unaffected = 0, weighted by task time share. The exposure index differs from the combined automate and augment share. Function results use the selected cost or headcount weighting.</p>
   <p>Partial task coverage or mixed/unknown scoring provenance prevents a comparable exposure result. Withheld workforce groups stay withheld. Action evidence must match the snapshot before its saved text is shown.</p>
   <p>Exposure indicates potential task change, not observed productivity, jobs displaced or capacity released. Weekly usage is an adoption measure, not a causal estimate of impact.</p>
   <dl className={styles.methodMetrics}><div><dt>Validation reviewed</dt><dd>{count(view.validation.reviewed)} / {count(view.validation.sampleSize)}{view.validation.complete?' · Complete':' · Incomplete'}</dd></div><div><dt>Agreement among reviewed tasks</dt><dd>{percent(view.validation.agreement)}</dd></div><div><dt>Weighted agreement</dt><dd>{percent(view.validation.weightedAgreement)}</dd></div><div><dt>Kappa</dt><dd>{index(view.validation.kappa)}</dd></div><div><dt>Retest stability</dt><dd>{percent(view.validation.stability)} · {count(view.validation.retestTasks)} tasks</dd></div></dl>
   <p>Dataset: {model.dataset.name} ({model.dataset.id}). Export: {model.meta.exportedAt}. Version: {model.meta.version}. Source revision: <code>{model.meta.sourceCommit}</code>.</p>
   <details><summary>Scoring provenance</summary><ul>{model.scoringRuns.map(run=><li key={run.id}>{run.model} · Rubric {run.rubric} · {run.status} · Finished {run.finishedAt??'Unavailable'}<br/><small>Run {run.id} · Prompt <code>{run.promptSha}</code></small></li>)}</ul></details>
   {model.issues.length>0&&<details><summary>Coverage and provenance issues ({model.issues.length})</summary><ul>{model.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></details>}
  </div></details>
 </section>;
}

function JobDetail({job,onReference}:{job:FowJob;onReference?:(jobKey?:string,functionName?:string)=>void}){
 if(job.suppressed)return <p role="status" className={styles.notice}>This job’s workforce detail is withheld. Select another job to explore its task profile.</p>;
 const usable=job.coverage==='complete'&&job.provenance==='consistent';
 return <div className={styles.jobDetail}>
  <div className={styles.sectionHeading}><p><strong>{job.title}</strong> · {job.family} · {count(job.headcount)} people · Exposure {index(job.score)}</p>{onReference&&<button type="button" onClick={()=>onReference(job.key,job.functionName)}>Review planning handoff</button>}</div>
  <p className={usable?styles.note:styles.notice} role={usable?undefined:'status'}>{status(job)} · Scored task share {percent(job.coverageShare)}{!usable?' · Comparable task scores are unavailable.':''}</p>
  <div className={styles.tableScroll} role="region" aria-label={`${job.title} task profile`} tabIndex={0}><table><caption>Task time shares and source labels</caption><thead><tr><th scope="col">Task</th><th scope="col">Time share</th><th scope="col">Label</th><th scope="col">Score</th></tr></thead><tbody>{job.tasks.map(task=><tr key={task.id}><th scope="row">{task.text}</th><td>{percent(task.share)}</td><td>{usable?task.label??'Unavailable':'Unavailable'}</td><td>{usable?index(task.score):'Unavailable'}</td></tr>)}</tbody></table>{!job.tasks.length&&<p>No task detail is available.</p>}</div>
 </div>;
}
