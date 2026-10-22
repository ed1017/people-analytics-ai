'use client';
import {useState} from 'react';
import {PlanningAssumptionSlider} from './planning-assumption-slider';
import {sliderNumber,type PlanningSliderSpec} from '@/lib/planning-slider';
import type {HiringBudgetReview} from '@/lib/home-hiring-budget';
import {calculateHiringBudget,type HiringBudgetInput} from '@/lib/hiring-budget';
const specs:Record<'hires'|'budget'|'months',PlanningSliderSpec>={
 hires:{min:0,max:10000,precision:0,keyboardStep:1,extent:20,unit:'people'},
 budget:{min:0,max:1e9,precision:2,keyboardStep:1000,extent:1e6,unit:'currency units'},
 months:{min:1,max:24,precision:0,keyboardStep:1,extent:24,unit:'months'},
};
/** Edits the existing calculator inputs; never requests model completion or changes estimated rates. */
export function HiringScenarioControls({review,onUpdate,onRestore,disabled}:{review:HiringBudgetReview;onUpdate:(input:HiringBudgetInput)=>void;onRestore:(baseline:HiringBudgetReview)=>void;disabled:boolean}){
 const {inputs:input,datasetToken}=review;
 const [error,setError]=useState(''),[adjustment,setAdjustment]=useState<{baseline:HiringBudgetReview;last:string}|null>(null);
 const current=JSON.stringify([input,datasetToken,review.scopeKey,review.revision]),canReset=adjustment!==null&&adjustment.last===current;
 function change(field:'hires'|'budget'|'months',text:string){
  const value=text.trim()===''?null:sliderNumber(text,specs[field]);
  if(text.trim()!==''&&value===null){setError('Use a value within the displayed range.');return;}
  const next={...input,[field]:value};
  try{calculateHiringBudget(next,datasetToken);onUpdate(next);setAdjustment({baseline:canReset?adjustment!.baseline:structuredClone(review),last:JSON.stringify([next,datasetToken,review.scopeKey,review.revision+1])});setError('');}catch(e){setError(e instanceof Error?e.message:'These inputs could not be recalculated.');}
 }
 const result=calculateHiringBudget(input,datasetToken),max=Math.max(1,...result.rows.map(r=>r.hiresPresent??0));
 return <section aria-label="Adjust this hiring scenario" className="space-y-2 border-t pt-2">
  <h4 className="font-semibold">Adjust this scenario</h4>
  <PlanningAssumptionSlider label="Proposed hires" value={input.hires===null?'':String(input.hires)} spec={specs.hires} onChange={v=>change('hires',v)} disabled={disabled}/>
  <PlanningAssumptionSlider label="Optional period budget ceiling" value={input.budget===null?'':String(input.budget)} spec={{...specs.budget,unit:input.currency??'currency unspecified'}} onChange={v=>change('budget',v)} disabled={disabled} help="Blank means no budget ceiling. An estimated cost is not a budget approval."/>
  <PlanningAssumptionSlider label="Planning horizon" value={input.months===null?'':String(input.months)} spec={specs.months} onChange={v=>change('months',v)} disabled={disabled}/>
  <p className="text-xs">Recalculates the entered scenario locally. Start {input.startMonth??'unknown'}; arrival {input.arrivalDate??'unknown'}. Change exact dates in the input editor. This does not approve hiring.</p>
  {result.rows.length>0&&<figure aria-label="Recalculated hiring presence" className="space-y-1"><figcaption className="font-medium">Proposed hires present by month</figcaption><div className="flex gap-1 overflow-x-auto" tabIndex={0} role="region" aria-label="Monthly hiring scenario">{result.rows.map(r=><div key={r.month} className="min-w-14 flex-1 text-center text-xs"><span>{r.hiresPresent===null?'Unknown':r.hiresPresent}</span><div aria-hidden="true" className="flex h-12 items-end justify-center border-b"><div className="w-6 bg-primary" style={{height:`${(r.hiresPresent??0)/max*100}%`}}/></div><span>{r.month}</span></div>)}</div><p className="text-xs">Scenario headcount, not productive FTE or verified recruiting capacity. Partial-month costs use the same entered arrival date.</p></figure>}
  <button type="button" className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" disabled={disabled||!canReset} onClick={()=>{try{if(adjustment){onRestore(adjustment.baseline);setAdjustment(null);setError('');}}catch(e){setError(e instanceof Error?e.message:'Reset failed.');}}}>Reset scenario adjustments</button>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
