'use client';
import {AssumptionsDisclosure} from '@/components/assumptions-disclosure';
import {useState,type ReactNode} from 'react';
import {HiringPlanningSummary} from './hiring-planning-summary';
import {calculateHiringBudget,hiringBudgetFields,type HiringBudgetInput,type HiringBudgetField} from '@/lib/hiring-budget';
import type {HiringBudgetReview} from '@/lib/home-hiring-budget';
const labels:Record<HiringBudgetField,string>={role:'Comparable role',level:'Level',location:'Location',snapshotDate:'Salary snapshot date',hires:'Number of hires',budget:'Total budget for the period',currency:'Currency',startMonth:'Budget start month',months:'Budget horizon (months)',arrivalDate:'Hire arrival date',ftePerHire:'FTE per hire',annualBasePay:'Annual base pay override',payBasis:'Base pay basis',annualAdditionalCostPerHire:'Annual non-base cost per hire',recruitingFeePerHire:'One-time recruiting cost per hire',otherCostsComplete:'All other costs included'};
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
const control='mt-1 block min-h-11 w-full rounded border bg-background p-2';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50';
type Props={children?:ReactNode;recommended?:boolean;onDirtyChange?:(dirty:boolean)=>void;review:HiringBudgetReview;onUpdate:(inputs:HiringBudgetInput|null)=>void;disabled:boolean};
export function HomeHiringBudgetReview({review,onUpdate,onDirtyChange,disabled,children,recommended=false}:Props){
 const result=calculateHiringBudget(review.inputs,review.datasetToken),salary=result.salary,unit=review.inputs.currency??'currency unspecified';
 const money=(v:number|null)=>v===null?'Unknown':`${number(v)} ${unit}`;
 return <section aria-label="Hiring budget estimate" className="space-y-3 rounded border p-3 text-sm">
  <h3 className="font-semibold">{recommended?'Recommended Action Plan · conditional hiring':'Hiring budget estimate'}</h3>
  <HiringPlanningSummary result={result}/>
  {Object.values(review.origins).some(b=>b.kind==='model-proposed')&&<p className="font-medium">Model-proposed scenario assumptions · unconfirmed</p>}
  {result.annualBasePayCeiling!==null&&<p><strong>Annual base-pay ceiling per hire:</strong> {money(result.annualBasePayCeiling)} before any unlisted costs. This is a spending limit under the entered timing and cost assumptions, not a salary estimate or proof that hiring is feasible.</p>}
  <p><strong>Budget check:</strong> {result.budgetStatus==='within'?'Within the entered period budget, subject to the stated cost coverage':result.budgetStatus==='over'?'Known costs exceed the budget':'Unknown until costs, currency and coverage are supplied'}. Hiring feasibility remains unverified.</p>
  {children}
  <details><summary className="min-h-11 cursor-pointer py-2">Calculation details and unknowns</summary><div className="space-y-3">
  {result.budgetPerHire===null&&<p><strong>Budget allowance per hire:</strong> Unknown</p>}
  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
   {([['Base-pay subtotal',result.baseCost],['Listed period costs',result.listedCost],['Complete period cost',result.periodCost],['Recurring annual cost',result.annualRunRate]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd className="font-medium">{money(value)}</dd></div>)}
  </dl>
  <p>Hires arriving within the period: {number(result.hiresInHorizon)}. Affordable hires under these inputs: {number(result.maxAffordableHires)}.</p>
  <p><strong>Comparable company salary:</strong> {salary.status==='unavailable'?salary.reason:`${money(salary.annualBasePerHire)} annual base per proposed hire; ${salary.cohort.coveredCount} of ${salary.cohort.eligibleCount} employees, ${salary.cohort.coverage} coverage, ${salary.cohort.coveredFte} FTE, ${salary.cohort.snapshotDate}, ${salary.cohort.payBasis.replaceAll('_',' ')} (${salary.cohort.aggregation.replaceAll('_',' ')}). Source: ${salary.cohort.releaseId} (${salary.cohort.provenance}).`}</p>
  {result.rateSource==='scenario-override'&&<p>The base-pay override is an unverified scenario input. Benefits, employer costs and recruiting fees are separate.</p>}
  {!!result.missing.length&&<div><p>Unknowns ({result.missing.length})</p><ul className="list-disc pl-5">{result.missing.map(line=><li key={line}>{line}</li>)}</ul></div>}
  </div></details>
  <HiringBudgetEditor key={JSON.stringify(review)} review={review} onUpdate={onUpdate} onDirtyChange={onDirtyChange} disabled={disabled}/>
  <AssumptionsDisclosure><ul className="list-disc pl-5">{Object.entries(review.origins).map(([field,basis])=><li key={field}>{labels[field as HiringBudgetField]}: {basis.kind.replaceAll('-',' ')} — {basis.explanation}{basis.quote?` “${basis.quote}”`:''}</li>)}</ul>{result.limitations.map(line=><p key={line}>{line}</p>)}</AssumptionsDisclosure>
 </section>;
}

function HiringBudgetEditor({review,onUpdate,onDirtyChange,disabled}:Props){
 const [draft,setDraft]=useState<HiringBudgetInput>(review.inputs),[error,setError]=useState('');
 function set(field:HiringBudgetField,text:string){
  const numeric=['hires','budget','months','ftePerHire','annualBasePay','annualAdditionalCostPerHire','recruitingFeePerHire'].includes(field);
  const next={...draft,[field]:text===''?null:field==='otherCostsComplete'?text==='true':numeric?Number(text):text};
  if(field==='currency'&&draft.currency!==null&&draft.currency!==text){next.budget=null;next.annualBasePay=null;next.annualAdditionalCostPerHire=null;next.recruitingFeePerHire=null;}
  setDraft(next);onDirtyChange?.(JSON.stringify(next)!==JSON.stringify(review.inputs));
 }
 function apply(inputs:HiringBudgetInput|null){try{onUpdate(inputs);onDirtyChange?.(false);setError('');}catch(e){setError(e instanceof Error?e.message:'Review the entered inputs.');}}
 const dirty=JSON.stringify(draft)!==JSON.stringify(review.inputs);
 return <>
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
    <button type="button" className={button} disabled={disabled||!dirty} onClick={()=>{setDraft(review.inputs);onDirtyChange?.(false);setError('');}}>Discard estimate edits</button>
    {dirty&&<p>Update the estimate or explicitly discard its edits before reviewing or pinning a hiring plan.</p>}
   </form>
  </details>
  {error&&<p role="alert">{error}</p>}
  <button type="button" className={button} disabled={disabled} onClick={()=>apply(null)}>Clear hiring estimate</button>
 </>;
}
