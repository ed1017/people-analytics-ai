'use client';
import {useState} from 'react';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import type {PlanningInputChange} from '@/lib/home-solution-conversation';
import {proposedPlanningInputs} from '@/lib/home-proposed-planning';
/** Parent keys this editor by reviewed revision; typing does not mutate the plan. */
export function ProposedPlanningEditor({draft,disabled,onReview}:{draft:BundleDraft;disabled:boolean;onReview:(changes:PlanningInputChange[])=>Promise<void>}){
 const rows=proposedPlanningInputs(draft),[values,setValues]=useState(()=>rows.map(row=>row.assumption.value===null?'':String(row.assumption.value)));
 const changes=rows.flatMap((row,index)=>{const value=values[index]===''?null:Number(values[index]);return value===row.assumption.value?[]:[{field:row.field,target:row.target,value}];});
 return <details><summary className="min-h-11 cursor-pointer py-2 font-medium">Edit planning assumptions</summary><form className="space-y-3" onSubmit={event=>{event.preventDefault();void onReview(changes);}}>
  <p className="text-sm">Blank means unknown. Changes recalculate this proposal; pinning remains separate.</p>
  <div className="grid gap-3 sm:grid-cols-2">{rows.map((row,index)=><label className="min-w-0 text-sm" key={row.field+row.target}>{row.label} ({row.unit})<input aria-label={`${row.label} (${row.unit})`} className="mt-1 min-h-11 w-full rounded border bg-background px-2" type="number" min={row.field==='horizon_months'?1:0} max={row.field==='horizon_months'?24:row.field==='hours_per_participant'?1000:1000000} step={row.field==='horizon_months'||row.field==='participants'?1:'any'} value={values[index]} disabled={disabled} onChange={event=>setValues(previous=>previous.map((value,i)=>i===index?event.target.value:value))}/><span className="text-xs text-muted-foreground">{row.assumption.kind==='model-proposed'?'Model-proposed · unconfirmed':row.assumption.kind==='unknown'?'Unknown':'Retained or user-interpreted assumption'}</span></label>)}</div>
  <button className="min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50" disabled={disabled||!changes.length} type="submit">Recalculate proposal</button>
 </form></details>;
}
