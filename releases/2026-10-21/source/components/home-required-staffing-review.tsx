'use client';
import {staffingInputQuestion} from '@/lib/normal-staffing-intake';
import {catalogProseDisplay} from '@/lib/catalog-display';
import {useId,useState} from 'react';
import {PlanningAssumptionSlider} from './planning-assumption-slider';
import {InteractivePlanner} from './interactive-planner';
import {calculateRequiredStaffing,defaultRequiredStaffingCostBasis,resolveRequiredStaffingCostBasis,staffingRateFields,type RequiredStaffingCostBasis,type StaffingRateField,readRequiredStaffingInput,staffingFlagFields,requiredStaffingFields,staffingInputLabels,type RequiredStaffingInput,type StaffingInputField,type RequiredStaffingOption} from '@/lib/required-staffing';
import {canFillStaffingIdentity,staffingDeliveryConflict,type RequiredStaffingReview} from '@/lib/home-required-staffing';
const number=(n:number|null)=>n===null?'Unknown':n.toLocaleString('en-US',{maximumFractionDigits:2});
export function StaffingOptionSummary({option:o,input,deliveryMonths}:{option:RequiredStaffingOption;input:RequiredStaffingInput;deliveryMonths:number|null}){
 const cash=o.completeCash??o.listedCash??o.knownSubtotal,training=o.totalTrainingHours??(o.train>0?o.plannedTrainingHours:null),internal=o.train+o.redeploy;
 return <ul className="list-disc space-y-1 pl-5">
  {cash!==null&&input.currency&&<li>{o.completeCash===null?'Known cost subtotal':'Scenario cost'}: <strong>{number(cash)} {input.currency}</strong></li>}
  {o.completeCash===null&&<li>Complete incremental cost is unconfirmed.</li>}
  {o.budgetStatus==='over'&&<li className="font-semibold">Over budget</li>}
  {o.coverage==='not-met'&&<li className="font-semibold">Coverage assumptions not met</li>}
  {training!==null&&<li>{o.totalTrainingHours===null?'Planned training':'Training'}: <strong>{number(training)} hours</strong></li>}
  {o.newHireTrainingUnspecified&&<li>New-hire training requirements: Unknown.</li>}
  <li>Timing: <strong>{o.readyAfterMonths===null?'Unknown':o.readyAfterMonths===0?'Ready at start':`After ${o.readyAfterMonths} month${o.readyAfterMonths===1?'':'s'}`}</strong>{o.readyAfterMonths===null?'. Confirm readiness before committing.':o.readyAfterMonths>0?'. Coverage is not from the period start.':null}</li>
  {internal>0&&<>
   <li>Internal release: <strong>{input.internalRelease===null?'Unknown':input.internalRelease?'Assumed available; not verified':'Not available'}</strong>.</li>
   <li>Backfill cash per internal person: <strong>{input.backfillCostPerInternalPerson===null?'Unknown, not zero':`${number(input.backfillCostPerInternalPerson)} ${input.currency??'(currency unknown)'}`}</strong>{input.backfillCostPerInternalPerson===null?'. Confirm the cost for this period.':input.backfillCostPerInternalPerson===0?' for the period (entered zero).':' for the period.'}</li>
   {o.train>0&&o.redeploy>0&&input.poolsDistinct!==true&&<li>Overlap between the training and redeployment pools is unknown.</li>}
  </>}
  {deliveryMonths!==null&&<li>Delivery target: {deliveryMonths} months</li>}
  {input.months!==null&&cash!==null&&input.currency&&<li>Cost horizon: {input.months} months</li>}
 </ul>;
}
export function HomeRequiredStaffingReview({review,onApply,onClear,onPin,disabled,pinned,deliveryMonths=null,deliveryIssue,notes}:{review:RequiredStaffingReview;onApply?:(expected:string,inputs:RequiredStaffingInput,costBasis?:RequiredStaffingCostBasis)=>void;onClear:()=>void;onPin?:(id:string)=>void;disabled:boolean;pinned?:(id:string)=>number|undefined;deliveryMonths?:number|null;deliveryIssue?:string|null;notes?:string}){
 const radioId=useId(),canFillRole=canFillStaffingIdentity(review,'role'),canFillCurrency=canFillStaffingIdentity(review,'currency');
 const [choice,setChoice]=useState<{key:string;id:string}|null>(null);
 const [raw,setRaw]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(review.inputs).map(([k,v])=>[k,v===null?'':String(v)])));
 const [costBasis,setCostBasis]=useState<RequiredStaffingCostBasis>(()=>review.costBasis??defaultRequiredStaffingCostBasis(review.inputs));
 const [costsOpen,setCostsOpen]=useState(false);
 const [last,setLast]=useState(review.inputs),[notice,setNotice]=useState('');
 function parse(values:Record<string,string>){return readRequiredStaffingInput(Object.fromEntries(requiredStaffingFields.map(field=>[field,!values[field].trim()?null:field==='role'||field==='currency'?values[field]:staffingFlagFields.includes(field as typeof staffingFlagFields[number])?values[field]==='true':Number(values[field])])));}
 let inputs=last,invalid='';try{inputs=resolveRequiredStaffingCostBasis(parse(raw),costBasis);}catch(error){invalid=(error as Error).message;}
 const dirty=JSON.stringify(inputs)!==JSON.stringify(review.inputs)||JSON.stringify(costBasis)!==JSON.stringify(review.costBasis??defaultRequiredStaffingCostBasis(review.inputs))||!!invalid;
 function change(field:StaffingInputField,value:string){const next={...raw,[field]:value};if(field==='months'&&value!==raw.months){next.costsComplete='';setNotice('Review budget and period quotes for the new horizon.');}setRaw(next);try{setLast(resolveRequiredStaffingCostBasis(parse(next),costBasis));}catch{/* Retain valid chart. */}}
 function updateBasis(next:RequiredStaffingCostBasis){setCostBasis(next);try{setLast(resolveRequiredStaffingCostBasis(parse(raw),next));}catch{/* Retain valid chart. */}}
 function rateControl(field:StaffingRateField){const rate=costBasis.rates[field],months=inputs.months;return <div key={field} className="space-y-1"><label className="block">{staffingInputLabels[field]}<input type="number" min="0" step="0.01" className="min-h-11 w-full rounded border bg-background p-2" value={rate.amount??''} onChange={event=>{const value=event.target.value;updateBasis({...costBasis,rates:{...costBasis.rates,[field]:{...rate,amount:value===''?null:Number(value),quotedMonths:months}}});}}/></label><select aria-label={`${staffingInputLabels[field]} basis`} className="min-h-11 w-full rounded border bg-background p-2" value={rate.kind} onChange={event=>updateBasis({...costBasis,rates:{...costBasis.rates,[field]:{...rate,kind:event.target.value as typeof rate.kind,quotedMonths:months,fullPeriod:false}}})}><option value="whole-period">Per person · whole period</option><option value="one-time">Per person · one time</option><option value="monthly">Per person · monthly</option><option value="annual">Per person · annual</option></select>{(rate.kind==='annual'||rate.kind==='monthly')&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={rate.fullPeriod} onChange={event=>updateBasis({...costBasis,rates:{...costBasis.rates,[field]:{...rate,fullPeriod:event.target.checked}}})}/>Applies for every month of this scenario</label>}{rate.kind==='whole-period'&&rate.amount!==null&&rate.quotedMonths!==months&&<button type="button" className="min-h-11 rounded border px-3" onClick={()=>updateBasis({...costBasis,rates:{...costBasis.rates,[field]:{...rate,quotedMonths:months}}})}>Confirm quote for {months??'selected'} months</button>}</div>;}
 function slider(field:StaffingInputField){const months=field==='months'||field.endsWith('AfterMonths'),people=['requiredRoles','trainablePeople','redeployablePeople'].includes(field);return <PlanningAssumptionSlider key={field} label={field==='months'?'Cost horizon':staffingInputLabels[field]} value={raw[field]} onChange={value=>change(field,value)} disabled={disabled} spec={{min:field==='months'?1:0,max:months?24:people?20:1e9,precision:months||people?0:2,keyboardStep:months||people?1:100,extent:months?24:people?20:10000,unit:months?'months':people?'people':field.includes('Hours')?'hours per person':review.inputs.currency??'currency unknown'}}/>;}
 const r=calculateRequiredStaffing(inputs),unit=r.input.currency??'currency unknown';
 const costRecommendation=r.recommendation;
 const budgetReviewPending=costBasis.budget.amount!==null&&costBasis.budget.quotedMonths!==inputs.months;
 if(budgetReviewPending||deliveryIssue||r.options.some(o=>o.id===r.recommendation?.optionId&&staffingDeliveryConflict(o,r.input,deliveryMonths)))r.recommendation=null;
 const selected=r.options.find(o=>o.id===r.recommendation?.optionId),missing=[inputs.internalRelease===null&&selected&&(selected.train+selected.redeploy)>0?'whether internal staff can be released':null,selected?.readyAfterMonths===null?'readiness dates':null,inputs.backfillCostPerInternalPerson===null&&selected&&(selected.train+selected.redeploy)>0?'backfill costs':null].filter(Boolean);
 const choiceKey=JSON.stringify([inputs,deliveryMonths,deliveryIssue]),shown=r.options.find(o=>o.id===(choice?.key===choiceKey?choice.id:selected?.id))??null;
 const recommendationBlocker=budgetReviewPending?'Confirm the budget for this cost horizon before reviewing a recommendation.':deliveryIssue?deliveryIssue:costRecommendation?'The lowest listed-cash mix misses the delivery target. Review readiness or inspect the alternatives below.':'Review the supplied role, headcount, costs, budget and coverage conditions below.';
 return <section aria-label="Fixed-role staffing comparison" className="min-w-0 space-y-3 rounded border p-3 text-sm">
  {budgetReviewPending&&<p role="status">Confirm the budget for this horizon to review a recommendation.</p>}
  {dirty&&<p role="status" className="font-semibold">Unapplied changes</p>}
  <p className="font-semibold">Editable staffing planner</p>
  <p role="status">{staffingInputQuestion(inputs,deliveryMonths!==null)}</p>
  <p className="text-xs">Only supplied inputs are retained. Blank means unknown, not zero. These controls do not verify staffing availability or save a plan.</p>
  <section aria-label="Staffing recommendation" className="space-y-2 rounded border p-3">
   <h3 className="font-semibold">{r.recommendation?'Conditional recommendation':'No conditional recommendation'}</h3>
   {invalid?<p role="status">Last valid inputs shown. Correct invalid values and apply the revision before pinning.</p>:dirty?<p role="status">Preview of unapplied changes. Apply the revision before pinning.</p>:null}
   {r.recommendation&&selected?<>
    <p>{r.recommendation.text}</p>
    <p>Listed cash basis: <strong>{number(selected.listedCash)} {unit}</strong> over the {number(r.input.months)}-month cost horizon.</p>
    {selected.completeCash===null&&<p>Known subtotal only. Complete incremental cost is unconfirmed.</p>}
    {r.input.budget===null&&<p>Budget ceiling: Unknown for this horizon.</p>}
    <p>Listed cash does not establish total employer cost or operational feasibility. Actual people and skills remain unverified.</p>
    {selected.unknowns.length>0&&<div><p className="font-semibold">Conditions to resolve</p><ul className="list-disc space-y-1 pl-5">{selected.unknowns.map(line=><li key={line}>{line}</li>)}</ul></div>}
    <p>Next step: {r.recommendation.nextStep}</p>
    {shown&&shown.id!==selected.id&&<p>The chart is inspecting another mix. The conditional recommendation above is unchanged.</p>}
   </>:<p>{recommendationBlocker}</p>}
  </section>
  <InteractivePlanner compact scope={`${catalogProseDisplay(r.input.role??'Role unknown')} · ${r.input.months??'Unknown'}-month cost horizon · delivery ${deliveryMonths??'unknown'} months`}
   outcome={shown?`Review ${shown.train} train, ${shown.redeploy} redeploy and ${shown.hire} hire under these assumptions.`:'Compare staffing options'}
   metrics={[{label:'Required people',value:number(r.input.requiredRoles)},{label:'Selected allocation',value:shown?number(shown.coveredRoles)+' people':'Not selected'},{label:'Complete period cost',value:shown?number(shown.completeCash)+' '+unit:'Not selected'},{label:'Ready after',value:shown?number(shown.readyAfterMonths)+' months':'Not selected'}]}
   levers={<div className="space-y-3">{onApply&&<><fieldset disabled={disabled} className="space-y-3"><legend className="sr-only">Staffing assumptions</legend>
    {(review.inputs.role===null&&!canFillRole||review.inputs.currency===null&&!canFillCurrency)&&<p>Clarify the missing role or currency in chat so existing costs and staffing assumptions can be reviewed together.</p>}
    {review.inputs.role===null&&canFillRole&&<label className="block">Required role<input aria-label="Required role" type="text" maxLength={120} className="min-h-11 w-full rounded border bg-background p-2" value={raw.role} onChange={event=>change('role',event.target.value)} placeholder="Enter the role, or leave unknown"/></label>}
    {review.inputs.currency===null&&canFillCurrency&&<label className="block">Currency<select aria-label="Currency" className="min-h-11 w-full rounded border bg-background p-2" value={raw.currency} onChange={event=>change('currency',event.target.value)}><option value="">Unknown</option>{['USD','EUR','GBP','CAD','AUD','JPY','INR','SGD','CHF','CNY'].map(currency=><option key={currency} value={currency}>{currency}</option>)}</select></label>}{(['requiredRoles','trainablePeople','redeployablePeople','months'] as StaffingInputField[]).map(slider)}<details open={costsOpen} onToggle={event=>setCostsOpen(event.currentTarget.open)}><summary className="min-h-11 cursor-pointer py-2">Costs, readiness and availability</summary><div className="space-y-3">{staffingRateFields.map(rateControl)}<label className="block">Scenario budget<input type="number" min="0" step="0.01" className="min-h-11 w-full rounded border bg-background p-2" value={costBasis.budget.amount??''} onChange={event=>updateBasis({...costBasis,budget:{amount:event.target.value===''?null:Number(event.target.value),quotedMonths:inputs.months}})}/></label>{costBasis.budget.amount!==null&&costBasis.budget.quotedMonths!==inputs.months&&<button type="button" className="min-h-11 rounded border px-3" onClick={()=>updateBasis({...costBasis,budget:{...costBasis.budget,quotedMonths:inputs.months}})}>Confirm budget for {inputs.months??'selected'} months</button>}{requiredStaffingFields.filter(f=>!['role','currency','requiredRoles','trainablePeople','redeployablePeople','months','budget',...staffingRateFields,...staffingFlagFields].includes(f)).map(slider)}{staffingFlagFields.map(field=><label key={field} className="block">{staffingInputLabels[field]}<select aria-label={staffingInputLabels[field]} className="min-h-11 w-full rounded border bg-background p-2" value={raw[field]} onChange={event=>change(field,event.target.value)}><option value="">Unknown</option><option value="true">Yes — scenario assumption</option><option value="false">No</option></select></label>)}</div></details></fieldset>{invalid&&<p role="status">{invalid} Chart retains the last valid inputs; apply is disabled.</p>}{notice&&<p role="status">{notice}</p>}<div className="flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded border px-3" disabled={disabled||!dirty||!!invalid} onClick={()=>{try{onApply(JSON.stringify(review),inputs,costBasis);}catch(error){setNotice((error as Error).message)}}}>Apply staffing revision</button><button type="button" className="min-h-11 rounded border px-3" disabled={disabled||!dirty} onClick={()=>{setRaw(Object.fromEntries(Object.entries(review.inputs).map(([k,v])=>[k,v===null?'':String(v)])));setCostBasis(review.costBasis??defaultRequiredStaffingCostBasis(review.inputs));setLast(review.inputs);setNotice('');}}>Reset inputs</button></div></>}<details><summary className="min-h-11 cursor-pointer py-2">Compare staffing mixes</summary><fieldset disabled={disabled}><legend className="sr-only">Compare a staffing mix</legend>{r.options.map(o=><label key={o.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name={radioId} checked={shown?.id===o.id} onChange={()=>setChoice({key:choiceKey,id:o.id})}/>Train {o.train}, redeploy {o.redeploy}, hire {o.hire}</label>)}<p className="text-xs">Apply adjusted inputs before saving.</p></fieldset></details></div>}
   visual={<figure aria-label="Selected staffing allocation" className="space-y-3"><figcaption className="font-semibold">People allocated by channel</figcaption>{shown?<>{[['Train',shown.train],['Redeploy',shown.redeploy],['Hire',shown.hire]].map(([label,value])=><div key={label} className="text-sm"><span>{label}: {value} people</span><div aria-hidden="true" className="h-3 rounded bg-muted"><div className="h-3 rounded bg-primary" style={{width:`${Number(value)/Math.max(1,r.input.requiredRoles??0,shown.coveredRoles)*100}%`}}/></div></div>)}</>:<p>Select an option to inspect its allocation.</p>}</figure>}
  />
  {deliveryIssue&&<p role="status">{deliveryIssue}</p>}
  {r.missing.map(line=><p key={line}>{line}</p>)}
  {onApply&&(!!missing.length||r.options.some(o=>o.listedCash===null||o.readyAfterMonths===null))&&<button type="button" className="min-h-11 rounded border px-3" onClick={()=>setCostsOpen(true)}>Add costs and ready dates</button>}
  <div className="grid min-w-0 gap-3 md:grid-cols-3">{r.options.map(o=><article key={o.id} aria-label={`Train ${o.train}, redeploy ${o.redeploy}, hire ${o.hire}`} className={`min-w-0 space-y-2 rounded border p-3 ${r.recommendation?.optionId===o.id?'border-primary bg-muted/30':''}`}>
   {r.recommendation?.optionId===o.id&&<p className="text-xs font-semibold">Conditional recommendation</p>}
   <h4 className="font-semibold">{[o.redeploy?`Redeploy ${o.redeploy}`:null,o.train?`Train ${o.train}`:null,o.hire?`Hire ${o.hire}`:null].filter(Boolean).join(' · ')}</h4>
   {staffingDeliveryConflict(o,r.input,deliveryMonths)&&<p role="status">Misses the {deliveryMonths}-month delivery target.</p>}
   <StaffingOptionSummary option={o} input={r.input} deliveryMonths={deliveryMonths}/>
   {r.recommendation?.optionId===o.id&&onPin&&<button type="button" className="min-h-11 rounded border px-3 py-2 disabled:opacity-50" disabled={disabled||dirty||!!pinned?.(o.id)||o.coverage==='not-met'||o.budgetStatus==='over'} onClick={()=>onPin(o.id)}>{pinned?.(o.id)?`Pinned Action Plan #${pinned(o.id)}`:'Pin Action Plan'}</button>}
  </article>)}</div>

  <details><summary className="min-h-11 cursor-pointer py-2">Details</summary><div className="space-y-2">
   {notes&&<p className="whitespace-pre-wrap">{notes}</p>}
   <p>{number(r.input.requiredRoles)} required people · {catalogProseDisplay(r.input.role??'Role unknown')}. Review inputs in the scenario controls.</p>
   {costRecommendation&&<p>Cost-only comparison: {costRecommendation.text} Next step: {costRecommendation.nextStep}</p>}
   {r.options.map(o=><section key={o.id}><h4 className="font-semibold">Train {o.train} · redeploy {o.redeploy} · hire {o.hire}</h4><p>{o.coveredRoles} roles allocated; actual people and skills are unverified. Complete cash: {number(o.completeCash)} {unit}. Coverage: {o.coverage}.</p>{o.newHireTrainingUnspecified&&<p>{number(o.plannedTrainingHours)} planned training hours; new-hire training requirements remain unknown.</p>}{o.unknowns.map(line=><p key={line}>{line}</p>)}</section>)}
   <p>{r.enumerated} combinations evaluated; up to three representative comparisons shown. Company population is not used to derive this requirement. Cost horizon is not a delivery target.</p><ul className="list-disc pl-5">{Object.entries(review.origins).map(([field,basis])=><li key={field} className="[overflow-wrap:anywhere]">{staffingInputLabels[field as StaffingInputField]}: {String(review.inputs[field as StaffingInputField]??'Unknown')} · {basis.kind.replaceAll('-',' ')} — {basis.explanation}{basis.quote?` “${basis.quote}”`:''}</li>)}</ul>{r.limitations.map(line=><p key={line}>{line}</p>)}
   <button type="button" className="min-h-11 rounded border px-3 py-2 disabled:opacity-50" disabled={disabled} onClick={onClear}>Clear staffing comparison</button>
  </div></details>
 </section>;
}
