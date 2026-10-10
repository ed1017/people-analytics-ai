'use client';
import {useState} from 'react';
import {calculateHiringBudget,hiringBudgetFields,type HiringBudgetInput,type HiringBudgetField} from '@/lib/hiring-budget';
import type {HiringBudgetReview} from '@/lib/home-hiring-budget';
const labels:Record<HiringBudgetField,string>={role:'Comparable role',level:'Level',location:'Location',snapshotDate:'Salary snapshot date',hires:'Number of hires',budget:'Total budget for the period',currency:'Currency',startMonth:'Budget start month',months:'Budget horizon (months)',arrivalDate:'Hire arrival date',ftePerHire:'FTE per hire',annualBasePay:'Annual base pay override',payBasis:'Base pay basis',annualAdditionalCostPerHire:'Annual non-base cost per hire',recruitingFeePerHire:'One-time recruiting cost per hire',otherCostsComplete:'All other costs included'};
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
const control='mt-1 block min-h-11 w-full rounded border bg-background p-2';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50';
export function HomeHiringBudgetReview({review,onUpdate,disabled}:{review:HiringBudgetReview;onUpdate:(inputs:HiringBudgetInput|null)=>void;disabled:boolean}){
 const [draft,setDraft]=useState<HiringBudgetInput>(review.inputs),[error,setError]=useState('');
 const result=calculateHiringBudget(review.inputs,review.datasetToken),unit=review.inputs.currency??'currency unspecified';
 const money=(v:number|null)=>v===null?'Unknown':`${number(v)} ${unit}`;
 function set(field:HiringBudgetField,text:string){
  const numeric=['hires','budget','months','ftePerHire','annualBasePay','annualAdditionalCostPerHire','recruitingFeePerHire'].includes(field);
  setDraft(old=>{
   const next={...old,[field]:text===''?null:field==='otherCostsComplete'?text==='true':numeric?Number(text):text};
   if(field==='currency'&&old.currency!==null&&old.currency!==text){next.budget=null;next.annualBasePay=null;next.annualAdditionalCostPerHire=null;next.recruitingFeePerHire=null;}
   return next;
  });
 }
 function apply(inputs:HiringBudgetInput|null){try{onUpdate(inputs);setError('');}catch(e){setError(e instanceof Error?e.message:'Review the entered inputs.');}}
 const salary=result.salary;
 return <section aria-label="Hiring budget estimate" className="space-y-3 rounded border p-3 text-sm">
  <h3 className="font-semibold">Hiring budget estimate</h3>
  <p>{number(review.inputs.hires)} hires · {review.inputs.role??'Role unknown'} · {review.inputs.months===null?'Period unknown':`${review.inputs.months} months`} from {review.inputs.startMonth??'start unknown'}</p>
  <p><strong>Budget allowance per hire:</strong> {money(result.budgetPerHire)} for the budget period. This is not an annual salary.</p>
  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
   {([['Base-pay subtotal',result.baseCost],['Listed period costs',result.listedCost],['Complete period cost',result.periodCost],['Recurring annual cost',result.annualRunRate]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd className="font-medium">{money(value)}</dd></div>)}
  </dl>
  <p><strong>Budget check:</strong> {result.budgetStatus==='within'?'Within the entered period budget, subject to the stated cost coverage':result.budgetStatus==='over'?'Known costs exceed the budget':'Unknown until costs, currency and coverage are supplied'}. Hires arriving within the period: {number(result.hiresInHorizon)}. Affordable hires under these inputs: {number(result.maxAffordableHires)}.</p>
  <p><strong>Comparable company salary:</strong> {salary.status==='unavailable'?salary.reason:`${money(salary.annualBasePerHire)} annual base per proposed hire; ${salary.cohort.coveredCount} of ${salary.cohort.eligibleCount} employees, ${salary.cohort.coverage} coverage, ${salary.cohort.coveredFte} FTE, ${salary.cohort.snapshotDate}, ${salary.cohort.payBasis.replaceAll('_',' ')} (${salary.cohort.aggregation.replaceAll('_',' ')}). Source: ${salary.cohort.releaseId} (${salary.cohort.provenance}).`}</p>
  {result.rateSource==='scenario-override'&&<p>The base-pay override is an unverified scenario input. Benefits, employer costs and recruiting fees are separate.</p>}
  {!!result.missing.length&&<details open><summary className="min-h-11 cursor-pointer py-2">Unknowns ({result.missing.length})</summary><ul className="list-disc pl-5">{result.missing.map(line=><li key={line}>{line}</li>)}</ul></details>}
  <details><summary className="min-h-11 cursor-pointer py-2">Edit inputs and salary override</summary>
   <p>Blank means unknown. Enter zero only when the cost is explicitly zero. Changing currency clears prior money amounts. Changes recalculate this estimate; they do not approve a hiring plan.</p>
   <form className="space-y-3" onSubmit={event=>{event.preventDefault();apply(draft);}}>
    <fieldset disabled={disabled} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
     <legend className="sr-only">Hiring estimate inputs</legend>
     {hiringBudgetFields.map(field=>{
      const value=draft[field],options=field==='payBasis'?[['per_hire','Annual base per hire'],['per_fte','Annual base per full-time equivalent']]:field==='otherCostsComplete'?[['true','Yes — all other costs included'],['false','No — other costs remain']]:field==='currency'?['USD','EUR','GBP','CAD','AUD','JPY','INR','SGD','CHF','CNY'].map(c=>[c,c]):null;
      const type=field.endsWith('Date')?'date':field==='startMonth'?'month':['hires','budget','months','ftePerHire','annualBasePay','annualAdditionalCostPerHire','recruitingFeePerHire'].includes(field)?'number':'text';
      return <label key={field}>{labels[field]}{options?<select className={control} value={value===null?'':String(value)} onChange={e=>set(field,e.target.value)}><option value="">Unknown</option>{options.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>:<input className={control} type={type} step={type==='number'?(['hires','months'].includes(field)?1:.01):undefined} maxLength={120} value={value===null?'':String(value)} onChange={e=>set(field,e.target.value)}/>}</label>;
     })}
    </fieldset>
    <button className={button} disabled={disabled}>Update estimate</button>
   </form>
  </details>
  <details><summary className="min-h-11 cursor-pointer py-2">Input provenance and calculation limits</summary><ul className="list-disc pl-5">{Object.entries(review.origins).map(([field,basis])=><li key={field}>{labels[field as HiringBudgetField]}: {basis.kind.replaceAll('-',' ')} — {basis.explanation}{basis.quote?` “${basis.quote}”`:''}</li>)}</ul>{result.limitations.map(line=><p key={line}>{line}</p>)}</details>
  {error&&<p role="alert">{error}</p>}
  <button type="button" className={button} disabled={disabled} onClick={()=>apply(null)}>Clear hiring estimate</button>
 </section>;
}
