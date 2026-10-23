import type {calculateHiringBudget} from '@/lib/hiring-budget';
import {hiringPlanningSummary} from '@/lib/home-hiring-budget';
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
/** Native currencies and incomplete costs never enter the generic USD plan ledger. */
export function HiringPlanningSummary({result,compact=false}:{result:ReturnType<typeof calculateHiringBudget>;compact?:boolean}){
 const summary=hiringPlanningSummary(result),money=(value:number|null)=>value===null?'Unknown':`${number(value)} ${summary.cost.currency??'currency unspecified'}`;
 const costLabel={complete:'Complete period cost',listed:'Listed period costs',subtotal:'Known cost subtotal',allowance:'Budget allowance per hire',unknown:'Cost estimate'}[summary.cost.kind];
 if(compact)return <section aria-label="Hiring planning summary"><ul className="list-disc space-y-2 pl-5 text-sm"><li>{costLabel}: <strong>{money(summary.cost.amount)}</strong>{summary.cost.kind==='allowance'?' · not salary':''}</li><li>Cost horizon: {summary.months??'Unknown'} months</li><li>Arrival: {summary.arrivalDate??'Unknown'}</li><li>People: {number(summary.hires)} proposed hires · {result.input.role??'role unknown'}</li><li>Effort and staffing availability: Unknown</li><li>Entered planning assumptions · unconfirmed</li></ul></section>;
 return <section aria-label="Hiring planning summary" className="space-y-2">
  <p className="font-semibold">{summary.hires===null?'Confirm the hiring quantity to compare this option.':result.budgetStatus==='over'?`Revise this ${number(summary.hires)}-hire option: known costs exceed the budget.`:`Consider ${number(summary.hires)} hires${result.input.role?' for '+result.input.role:''}; confirm availability and timing.`}</p>
  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
   <div><dt>{costLabel}</dt><dd className="font-medium">{money(summary.cost.amount)}{summary.cost.kind==='allowance'?' · not salary':''}</dd></div>
   <div><dt>Horizon</dt><dd className="font-medium">{summary.months===null?'Unknown':`${summary.months} months`}</dd></div>
   <div><dt>Arrival</dt><dd className="font-medium">{summary.arrivalDate??'Unknown'}</dd></div>
  </dl>
  {summary.cost.kind==='allowance'&&<p className="text-xs">Budget allowance only; compensation and complete hiring cost are not established.</p>}
 </section>;
}
