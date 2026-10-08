'use client';
import {useEffect,useRef,useState} from 'react';
import {demandQuantityFields,type DemandReview} from '@/lib/swp-demand';
import {createDemandEditorDraft,demandEditorLabels,type DemandEditorDraft} from '@/lib/swp-demand-editor';
const control='min-h-11 w-full min-w-0 rounded border bg-background px-3 py-2 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
export function SwpDemandEditor({review,disabled,onReview,onCancel}:{review:DemandReview;disabled:boolean;onReview:(draft:DemandEditorDraft)=>void;onCancel:()=>void}){
 const [draft,setDraft]=useState(()=>createDemandEditorDraft(review)),[error,setError]=useState(''),first=useRef<HTMLInputElement>(null);
 useEffect(()=>{first.current?.focus();},[]);
 return <section aria-label="Edit business demand assumptions" className="min-w-0 space-y-3 rounded border p-3 text-sm" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onCancel();}}}>
  <h3 className="font-semibold">Edit assumptions</h3>
  <p>Review changes to recalculate this illustration. Cancel keeps the last reviewed assumptions. This page does not save a workforce plan.</p>
  <p>Role slice: {review.spec.scope??'Unknown'}. This illustration keeps the same role slice and operating linkage. Blank values remain unknown until supplied. Editing a value does not verify it.</p>
  <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"><legend className="sr-only">Optional planning inputs</legend>
   <label className="block min-w-0">Planning months<input ref={first} className={control} type="number" min="1" max="24" step="1" value={draft.months} onChange={e=>{setError('');setDraft({...draft,months:e.target.value});}}/></label>
   <label className="block min-w-0">Planning start<input className={control} type="month" value={draft.startMonth} onChange={e=>{setError('');setDraft({...draft,startMonth:e.target.value});}}/></label>
   {demandQuantityFields.map(field=><div key={field} className="min-w-0 space-y-1">
    <label className="block min-w-0">{demandEditorLabels[field]}<input className={control} type="number" min="0" max={field==='availabilityPct'?100:field==='ftePerRole'||field==='existingFtePerRole'?1:1000000000} step={['contracts','existingRoles','explicitAdditionalRoles'].includes(field)?'1':'any'} value={draft.values[field]} onChange={e=>{setError('');setDraft({...draft,values:{...draft.values,[field]:e.target.value}});}}/></label>
    {(field==='hoursPerContract'||field==='productiveHoursPerFte')&&<label className="block">{demandEditorLabels[field]} period<select className={control} value={draft.periods[field]} onChange={e=>{setError('');setDraft({...draft,periods:{...draft.periods,[field]:e.target.value}});}}><option value="">Unknown</option><option value="month">Per month</option><option value="year">Per year</option><option value="horizon">Whole horizon</option></select></label>}
    <p className="text-xs">Current basis: {review.spec[field].basis.kind}. {review.spec[field].basis.explanation}</p>
   </div>)}
  </fieldset>
  {error&&<p role="alert">{error}</p>}
  <div className="flex flex-wrap gap-2"><button className={button} disabled={disabled} onClick={()=>{if(disabled)return;try{onReview(draft);}catch(e){setError((e as Error).message);}}}>Review edited assumptions</button><button className={button} onClick={onCancel}>Cancel assumption edits</button></div>
 </section>;
}
