import type {calculateHiringBudget} from '@/lib/hiring-budget';
import {hiringPlanningSummary} from '@/lib/home-hiring-budget';
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
/** Native currencies and incomplete costs never enter the generic USD plan ledger. */
export function HiringPlanningSummary({result}:{result:ReturnType<typeof calculateHiringBudget>}){
 const summary=hiringPlanningSummary(result),money=(value:number|null)=>value===null?'Unknown':`${number(value)} ${summary.cost.currency??'currency unspecified'}`;
 const costLabel={complete:'Complete period cost',listed:'Listed period costs',subtotal:'Known cost subtotal',allowance:'Budget allowance per hire',unknown:'Cost estimate'}[summary.cost.kind];
 return <section aria-label="Hiring planning summary" className="space-y-2">
  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
   <div><dt>{costLabel}</dt><dd className="font-medium">{money(summary.cost.amount)}</dd><dd className="text-xs">{summary.cost.kind==='allowance'?'For the budget period; not an annual salary.':summary.cost.kind==='unknown'?'Enter cost assumptions to calculate.':'Under the entered cost and timing assumptions.'}</dd></div>
   <div><dt>Time</dt><dd className="font-medium">{summary.months===null?'Budget period unconfirmed':`${summary.months} months`}</dd><dd className="text-xs">Start: {summary.startMonth??'unconfirmed'} · Arrival: {summary.arrivalDate??'unconfirmed'}</dd></div>
   <div><dt>Resources</dt><dd className="font-medium">{number(summary.hires)} proposed hires · {result.input.role??'role unconfirmed'}</dd><dd className="text-xs">{summary.ftePerHire===null?'FTE per hire unconfirmed':`${number(summary.ftePerHire)} FTE per hire`}. Availability and recruiting effort unverified.</dd></div>
  </dl>
  {summary.cost.kind!=='allowance'&&result.budgetPerHire!==null&&<p><strong>Budget allowance per hire:</strong> {money(result.budgetPerHire)} for the budget period; not an annual salary.</p>}
 </section>;
}
