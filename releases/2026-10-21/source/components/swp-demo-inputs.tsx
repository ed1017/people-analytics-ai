"use client";
import {PlanningAssumptionSlider} from './planning-assumption-slider';
import {primarySwpRequest,primarySwpValuesValid} from '@/lib/simple-swp-controls';
import {useState} from 'react';
import {guidedWorkloadFields,guidedWorkloadLabels} from '@/lib/guided-workload';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import {previewBundleChatEdit,type BundleEditPreview} from '@/lib/home-bundle-chat-edit';

/** Edits use the existing coupled-input review; they never alter saved plans. */
export function SwpDemoInputs({draft,disabled,onReview,onPrimaryChange,onValidity}:{draft:BundleDraft;disabled:boolean;onReview:(review:BundleEditPreview)=>void;onPrimaryChange?:(request:string)=>void;onValidity?:(valid:boolean)=>void}){
 const capacity=draft.inputs.capacity!.input;
 const deadline=draft.inputs.mixConstraints?.deadlineMonth?draft.inputs.mixConstraints.deadlineMonth.value??'':capacity.deadlineMonth;
 const [budget,setBudget]=useState(String(draft.inputs.budget?.amount.value??''));
 const [volume,setVolume]=useState(String(draft.inputs.guidedWorkload?.volume.value??''));
 const [error,setError]=useState('');
 const [bounds]=useState(draft.inputs.mixScenario?.bounds);
 const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
 const primary=(label:string,value:string)=>{
  const nextBudget=label==='budget'?value:budget,nextVolume=label==='budget'?volume:value;
  const errors={...fieldErrors,[label]:''};
  try {
   if(!primarySwpValuesValid(label==='budget'?value:'1',label==='budget'?'1':value))throw Error('Enter a whole number within the displayed range.');
   const current=label==='budget'?draft.inputs.budget?.amount.value:draft.inputs.guidedWorkload?.volume.value;
   if(Number(value)!==current)onPrimaryChange?.(primarySwpRequest(draft,bounds,label,value));
  }catch(e){errors[label]=(e as Error).message;}
  setFieldErrors(errors);setError(Object.values(errors).filter(Boolean).join(' '));
  onValidity?.(primarySwpValuesValid(nextBudget,nextVolume)&&!Object.values(errors).some(Boolean));
 };
 return <form className="swp-demo-assumptions" onSubmit={event=>{
  event.preventDefault();if(disabled)return;
  const form=new FormData(event.currentTarget);
  const fields=[...guidedWorkloadFields.filter(()=>draft.inputs.guidedWorkload).map(key=>[guidedWorkloadLabels[key],String(form.get(key)||'Unknown'),String(draft.inputs.guidedWorkload![key].value??'Unknown')]),['recruiting fee per hire',form.get('hireFee'),capacity.hireFee],['Move effective month',form.get('moveMonth'),capacity.moveMonth],['budget',budget,String(draft.inputs.budget?.amount.value??'')],['annual hire cost',form.get('annualHireCost'),capacity.annualHireCost],['internal salary change',form.get('internalAnnualCostChange'),capacity.internalAnnualCostChange],['training cash',form.get('trainingCash'),capacity.trainingCash],['training hours',form.get('trainingHours'),capacity.trainingHours],['Build effective month',form.get('buildMonth'),capacity.buildMonth],['Hire arrival date',form.get('arrivalDate'),capacity.arrivalDate],['Coverage deadline',form.get('deadlineMonth')||'Unknown',deadline||'Unknown'],['Acceptable uncovered work (hours)',form.get('maxUncoveredHours')||'Unknown',String(draft.inputs.mixConstraints?.maxUncoveredHours?.value??'Unknown')]];
  const edits=fields.filter(([,value,previous])=>String(value)!==previous).map(([label,value])=>`Set ${label} to ${value}`);
  if(!edits.length){setError('Change an assumption before reviewing.');return;}
  try{onReview(previewBundleChatEdit(draft,edits.join('; ')));setError('');}catch(reason){setError((reason as Error).message);}
 }}>
  <h3 className="sr-only">Edit example assumptions</h3>
  <fieldset disabled={disabled}>
   <legend className="sr-only">Editable fictional scenario inputs</legend>
   <div className="simple-demo-controls">
   {draft.inputs.guidedWorkload&&<><PlanningAssumptionSlider label="Monthly service requests" value={volume} onChange={value=>{setVolume(value);primary(guidedWorkloadLabels.volume,value);}} disabled={disabled} spec={{min:0,max:1000000,precision:0,keyboardStep:100,extent:2500,unit:'requests'}}/><input type="hidden" name="volume" value={volume}/></>}
   <PlanningAssumptionSlider label="Budget for this plan" value={budget} onChange={value=>{setBudget(value);primary('budget',value);}} disabled={disabled} spec={{min:1,max:2000000,precision:0,keyboardStep:5000,extent:500000,unit:'USD'}}/>
   </div>
   <details><summary className="min-h-11 cursor-pointer py-2 text-sm">Edit detailed assumptions</summary><div className="simple-demo-details">
   {draft.inputs.guidedWorkload&&guidedWorkloadFields.filter(key=>key!=='volume').map(key=><label key={key}>{guidedWorkloadLabels[key]}<input name={key} type="number" min="0" max={key.endsWith('Pct')?100:key==='ftePerPerson'?1:1000000} step={key==='existingPeople'?'1':'0.01'} defaultValue={draft.inputs.guidedWorkload![key].value??''}/></label>)}
   <label>Coverage deadline<input name="deadlineMonth" type="month" defaultValue={deadline}/></label>
   <label>Acceptable uncovered work over this period (hours)<input name="maxUncoveredHours" type="number" min="0" max="100000000" step="0.01" placeholder="Not set" defaultValue={draft.inputs.mixConstraints?.maxUncoveredHours?.value??''}/></label>
   <p className="text-xs">Choose your own service target. Blank means not assessed; zero means no uncovered hours. Meeting this modeled target is not operational approval.</p>
   <label>Recruiting fee per new hire (USD, one-time)<input name="hireFee" type="number" min="0" step="1" defaultValue={capacity.hireFee} required/></label>
   <label>Assumed redeployment / Move effective month<input name="moveMonth" type="month" defaultValue={capacity.moveMonth} required/></label>
   <label>Annual cost per new hire (USD/year)<input name="annualHireCost" type="number" min="0" max="1000000" step="1" defaultValue={capacity.annualHireCost} required/></label>
   <label>Total annual salary uplift for the internal cohort (USD/year)<input name="internalAnnualCostChange" type="number" min="0" max="1000000" step="1" defaultValue={capacity.internalAnnualCostChange} required/></label><p className="text-xs">This is a fixed total for all people developed or moved in each option, not a per-person rate. The calculator shares it equally across that option’s internal people and starts each share at readiness. Changing the internal mix changes the per-person allocation; review this cost premise before comparing.</p>
   <label>Total training cash (USD, one-time)<input name="trainingCash" type="number" min="0" max="1000000" step="1" defaultValue={capacity.trainingCash} required/></label>
   <label>Total training effort (staff hours)<input name="trainingHours" type="number" min="0" max="100000" step="1" defaultValue={capacity.trainingHours} required/></label>
   <label>Assumed skill readiness / Build effective month<input name="buildMonth" type="month" defaultValue={capacity.buildMonth} required/></label>
   <label>Assumed new-hire arrival date<input name="arrivalDate" type="date" defaultValue={capacity.arrivalDate} required/></label>
   </div><p className="my-2 text-xs text-muted-foreground">Existing role holders exclude the separate develop/move pools. Allocation and proficiency coverage apply once. Training completion does not prove readiness. Blank workload values remain unknown.</p>  <button type="submit" disabled={disabled} className="min-h-11 rounded border bg-card px-3 py-2 text-sm font-medium disabled:opacity-50">Review input changes</button></details>
  </fieldset>

  {error&&<p role="alert" className="mt-2 text-sm">{error}</p>}
 </form>;
}
