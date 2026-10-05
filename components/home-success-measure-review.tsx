"use client";
import {useState} from 'react';
import {suggestSuccessMeasure,reviewSuccessMeasure,successMeasureText} from '@/lib/home-success-measures';
import {bundleInputKey,type BundleDraft,type BundleInputs} from '@/lib/home-bundle-reconciliation';
const control='min-h-11 w-full rounded border bg-background p-2 text-sm';
export function HomeSuccessMeasureReview({draft,pack,basis,disabled,onAccept}:{draft:BundleDraft;pack:unknown;basis:'user-entered'|'illustrative';disabled:boolean;onAccept:(inputs:BundleInputs)=>void}){
 const suggestion=suggestSuccessMeasure(draft.binding.goal,pack),saved=draft.inputs.successMeasure;
 const [name,setName]=useState(saved?.name??suggestion.name),[baseline,setBaseline]=useState(saved?.baseline.value??''),[target,setTarget]=useState(saved?.target.value??''),[observed,setObserved]=useState(false),[confirmed,setConfirmed]=useState<string|null>(null),[notice,setNotice]=useState('');
 const [sourceKey]=useState(()=>bundleInputKey(draft)),stale=sourceKey!==bundleInputKey(draft);
 const reviewKey=JSON.stringify([name,baseline,target,observed,basis,suggestion]);
 function change(){setConfirmed(null);setNotice('');}
 const proposed=()=>reviewSuccessMeasure(draft,name,baseline,target,basis,suggestion,observed);
 return <details className="space-y-2 rounded border p-3 text-sm"><summary className="min-h-11 cursor-pointer py-2 font-medium">Review success measure and baseline</summary>
  <p>For “{draft.binding.goal}”. {suggestion.status}</p><p className="text-xs">Use the same population, metric definition and observation period when reviewing progress. No change is a predicted or causal effect.</p>
  <label className="block">Success measure<input className={control} aria-label="Success measure" maxLength={240} value={name} onChange={event=>{setName(event.target.value);setObserved(false);setBaseline('');change();}}/></label>
  <label className="block">Baseline (value, unit and period; blank means Unknown)<input className={control} aria-label="Measure baseline" maxLength={240} value={observed?suggestion.baseline?.value??'':baseline} readOnly={observed} onChange={event=>{setBaseline(event.target.value);change();}}/></label>
  {suggestion.baseline&&name===suggestion.name&&<label className="flex gap-2"><input type="checkbox" checked={observed} onChange={event=>{setObserved(event.target.checked);change();}}/>Use recorded baseline: {suggestion.baseline.value}. {suggestion.baseline.basis}</label>}
  <label className="block">Target (value, unit and period; blank means Unknown)<input className={control} aria-label="Measure target" maxLength={240} value={target} onChange={event=>{setTarget(event.target.value);change();}}/></label>
  <p className="text-xs">New typed values: {basis==='illustrative'?'Illustrative assumptions':'User assumptions'}. Targets are not predictions. Current: {successMeasureText(saved)}</p>
  <p className="text-xs">Review: {name||'Measure not supplied'} · Baseline: {observed?`recorded ${suggestion.baseline?.value}`:baseline||'Unknown'} · Target: {target||'Unknown'}. Shared population: {draft.inputs.scope.population.value??'Unknown'}; horizon: {draft.inputs.scope.startMonth.value??'Unknown'} / {draft.inputs.scope.months.value??'Unknown'} months.</p>
  <label className="flex gap-2"><input type="checkbox" aria-label="Confirm success measure review" checked={confirmed===reviewKey} onChange={event=>setConfirmed(event.target.checked?reviewKey:null)}/>I reviewed this measure, baseline source, population and period. My target is an assumption, not a predicted effect.</label>
  {stale&&<p role="status">The plan changed. Close and reopen Scope to review this version; no measurement change was accepted.</p>}
  {notice&&<p role="status">{notice}</p>}
  <button type="button" className="min-h-11 rounded border px-3 py-2 disabled:opacity-50" disabled={disabled||stale||confirmed!==reviewKey||!name.trim()} onClick={()=>{try{if(stale)throw Error('Plan changed; review again.');onAccept(proposed());setNotice('Measure accepted into the working draft. Save explicitly; calculate again before attachment.');}catch(error){setNotice((error as Error).message)}}}>Accept measure into draft</button>
 </details>;
}
