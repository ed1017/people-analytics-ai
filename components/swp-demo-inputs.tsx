"use client";
import {useState} from 'react';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import {previewBundleChatEdit,type BundleEditPreview} from '@/lib/home-bundle-chat-edit';

/** Edits use the existing coupled-input review; they never alter saved plans. */
export function SwpDemoInputs({draft,disabled,onReview}:{draft:BundleDraft;disabled:boolean;onReview:(review:BundleEditPreview)=>void}){
 const capacity=draft.inputs.capacity!.input;
 const [budget,setBudget]=useState(String(draft.inputs.budget?.amount.value??''));
 const [error,setError]=useState('');
 return <form className="swp-demo-assumptions" onSubmit={event=>{
  event.preventDefault();if(disabled)return;
  const form=new FormData(event.currentTarget);
  const fields=[['budget',budget,String(draft.inputs.budget?.amount.value??'')],['annual hire cost',form.get('annualHireCost'),capacity.annualHireCost],['training cash',form.get('trainingCash'),capacity.trainingCash],['training hours',form.get('trainingHours'),capacity.trainingHours],['Build effective month',form.get('buildMonth'),capacity.buildMonth],['Hire arrival date',form.get('arrivalDate'),capacity.arrivalDate]];
  const edits=fields.filter(([,value,previous])=>String(value)!==previous).map(([label,value])=>`Set ${label} to ${value}`);
  if(!edits.length){setError('Change an assumption before reviewing.');return;}
  try{onReview(previewBundleChatEdit(draft,edits.join('; ')));setError('');}catch(reason){setError((reason as Error).message);}
 }}>
  <h3 className="font-semibold">1. Review the baseline and edit assumptions</h3>
  <p className="my-2 text-sm">Fictional demand: five additional roles over 12 months. Existing role availability and skill readiness are unverified; the internal pools below are separate scenario assumptions. No actual workforce baseline is replaced.</p>
  <fieldset disabled={disabled}>
   <legend className="sr-only">Editable fictional scenario inputs</legend>
   <label>Incremental cash ceiling (USD, whole 12-month period)<input aria-label="Incremental cash ceiling" type="number" min="1" max="2000000" step="1" value={budget} onChange={e=>setBudget(e.target.value)} required/><input aria-label="Adjust cash ceiling" type="range" min="25000" max="500000" step="5000" value={Math.min(500000,Math.max(25000,Number(budget)||25000))} onChange={e=>setBudget(e.target.value)}/></label>
   <label>Annual cost per new hire (USD/year)<input name="annualHireCost" type="number" min="0" max="1000000" step="100" defaultValue={capacity.annualHireCost} required/></label>
   <label>Total training cash (USD, one-time)<input name="trainingCash" type="number" min="0" max="1000000" step="100" defaultValue={capacity.trainingCash} required/></label>
   <label>Total training effort (staff hours)<input name="trainingHours" type="number" min="0" max="100000" step="1" defaultValue={capacity.trainingHours} required/></label>
   <label>Assumed skill readiness / Build effective month<input name="buildMonth" type="month" defaultValue={capacity.buildMonth} required/></label>
   <label>Assumed new-hire arrival date<input name="arrivalDate" type="date" defaultValue={capacity.arrivalDate} required/></label>
  </fieldset>
  <p className="my-2 text-xs text-muted-foreground">Inputs are hypothetical and editable. Readiness requires a work-sample assessment and manager validation; training completion is not proof of capability. All other cost and release assumptions are available below.</p>
  <button type="submit" disabled={disabled} className="min-h-11 rounded border bg-card px-3 py-2 text-sm font-medium disabled:opacity-50">Review input changes</button>
  {error&&<p role="alert" className="mt-2 text-sm">{error}</p>}
 </form>;
}
