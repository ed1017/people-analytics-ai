'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {demandQuantityFields,type DemandReview,type DemandQuantityField} from '@/lib/swp-demand';
import {createDemandEditorDraft,demandEditorLabels,demandInputSourceLabel,type DemandEditorDraft} from '@/lib/swp-demand-editor';
const control='min-h-11 w-full min-w-0 rounded border bg-background px-3 py-2 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
const fieldLabels:Record<DemandQuantityField,string>={contracts:'Contracts',hoursPerContract:'Work hours per contract',productiveHoursPerFte:'Work hours per full-time role',existingRoles:'Existing roles',existingFtePerRole:'Current role workload (full-time = 1)',availabilityPct:'Available team time (%)',ftePerRole:'New role workload (full-time = 1)',explicitAdditionalRoles:'Extra roles to assume (optional)',budgetUsd:'Budget limit (USD)'};
const help:Record<DemandQuantityField,string>={contracts:'Number of contracts to cover.',hoursPerContract:'Hours of work for this role in each contract, for the selected period.',productiveHoursPerFte:'Hours one full-time role can deliver in the selected period.',existingRoles:'Number of current roles in this team, before allowing for availability.',existingFtePerRole:'Use 1 for full-time or 0.5 for half-time.',availabilityPct:'Share of team time free for this work, from 0 to 100.',ftePerRole:'Use 1 for full-time or 0.5 for half-time.',explicitAdditionalRoles:'Optional staffing assumption; it does not establish workload.',budgetUsd:'Input only. Costs and remaining budget are not calculated.'};
const advanced:DemandQuantityField[]=['existingFtePerRole','ftePerRole','explicitAdditionalRoles'];
export function SwpDemandEditor({review,disabled,onReview,onCancel}:{review:DemandReview;disabled:boolean;onReview:(draft:DemandEditorDraft)=>void;onCancel:()=>void}){
 const [draft,setDraft]=useState(()=>createDemandEditorDraft(review)),[error,setError]=useState(''),first=useRef<HTMLInputElement>(null);
 const prefix=useId();
 useEffect(()=>{first.current?.focus();},[]);
 const field=(field:DemandQuantityField)=><div key={field} className="min-w-0 space-y-1">
  <label className="block min-w-0">{fieldLabels[field]}<input aria-describedby={`${prefix}-${field}`} className={control} type="number" min="0" max={field==='availabilityPct'?100:field==='ftePerRole'||field==='existingFtePerRole'?1:1000000000} step={['contracts','existingRoles','explicitAdditionalRoles'].includes(field)?'1':'any'} value={draft.values[field]} onChange={e=>{setError('');setDraft({...draft,values:{...draft.values,[field]:e.target.value}});}}/></label>
  <p id={`${prefix}-${field}`} className="text-xs">{help[field]}</p>
  {(field==='hoursPerContract'||field==='productiveHoursPerFte')&&<label className="block">{fieldLabels[field]} period<select className={control} value={draft.periods[field]} onChange={e=>{setError('');setDraft({...draft,periods:{...draft.periods,[field]:e.target.value}});}}><option value="">Unknown</option><option value="month">Per month</option><option value="year">Per year</option><option value="horizon">Whole planning period</option></select></label>}
  <p className="text-xs">{demandInputSourceLabel(review.spec[field].basis.kind)}</p>
 </div>;
 return <section aria-label="Planning Calculator inputs" className="min-w-0 space-y-3 rounded border p-3 text-sm" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onCancel();}}}>
  <h3 className="font-semibold">Planning Calculator</h3>
  <p>Type directly in the boxes, then review to recalculate. Cancel discards your edits. Reviewing does not accept assumptions or save a plan.</p>
  <p className="text-xs">Inputs remain labelled assumptions or unverified entries. Results are conditional estimates, not verified actuals. Leave unknown inputs blank.</p>
  <p className="text-xs">Team or role: {review.spec.scope??'Unknown'}</p>
  <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"><legend className="sr-only">Optional planning inputs</legend>
   <div><label className="block min-w-0">Planning months<input ref={first} aria-describedby={`${prefix}-months`} className={control} type="number" min="1" max="24" step="1" value={draft.months} onChange={e=>{setError('');setDraft({...draft,months:e.target.value});}}/></label><p id={`${prefix}-months`} className="text-xs">How long to plan for: 1–24 months.</p><p className="text-xs">{demandInputSourceLabel(review.spec.monthsBasis.kind)}</p></div>
   <div><label className="block min-w-0">Planning start<input className={control} type="month" value={draft.startMonth} onChange={e=>{setError('');setDraft({...draft,startMonth:e.target.value});}}/></label><p className="text-xs">Month the work starts. {demandInputSourceLabel(review.spec.startBasis.kind)}</p></div>
   {(['existingRoles','availabilityPct','budgetUsd','contracts','hoursPerContract','productiveHoursPerFte'] as DemandQuantityField[]).map(field)}
  </fieldset>
  <details><summary className="min-h-11 cursor-pointer py-2">Advanced role assumptions</summary><fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"><legend className="sr-only">Advanced role inputs</legend>{advanced.map(field)}</fieldset></details>
  <details><summary className="min-h-11 cursor-pointer py-2">Input sources and calculation limits</summary><p>The calculation assumes steady work hours across the planning period. It does not check when people are ready to start, delivery coverage, or costs.</p><dl className="space-y-2">{demandQuantityFields.map(field=><div key={field}><dt>{demandEditorLabels[field]}</dt><dd>{demandInputSourceLabel(review.spec[field].basis.kind)}. {review.spec[field].basis.explanation}</dd></div>)}</dl></details>
  {error&&<p role="alert">{error}</p>}
  <div className="flex flex-wrap gap-2"><button className={button} disabled={disabled} onClick={()=>{if(disabled)return;try{onReview(draft);}catch(e){setError((e as Error).message);}}}>Review planning inputs</button><button className={button} onClick={onCancel}>Cancel input edits</button></div>
 </section>;
}
