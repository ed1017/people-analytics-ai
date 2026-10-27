import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import type {HomeMixCandidate} from '@/lib/home-mix-search';
import {staffingCashBreakdown} from '@/lib/guided-plan-summary';
const money=(value:number|null)=>value===null?'Unknown':`USD ${value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export function StaffingOptionCost({draft,cash}:{draft:BundleDraft;cash:HomeMixCandidate['cash']}){
 const view=staffingCashBreakdown(draft,cash);
 return <details className="mt-2 text-xs" aria-label="Incremental cash components"><summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Cost breakdown (USD)</summary>
 <p>Modeled period: {view.start?view.start+'-01':'Unknown'} through {view.end??'Unknown'} ({view.months??'Unknown'} months). Incremental cash.</p>
 <dl className="my-2 space-y-1">{view.lines.map(line=><div key={line.id} className="flex flex-wrap justify-between gap-x-3"><dt>{line.label}</dt><dd className="tabular-nums">{money(line.total)}</dd></div>)}</dl>
 <p><strong>Incremental cash total: {money(view.total)}.</strong>{view.total===null&&` Known subtotal: ${money(view.knownSubtotal)}; additional costs need inputs.`}</p>
 <p>Existing payroll is excluded except entered salary uplift. New-hire and backfill payroll are prorated to modeled arrival dates. Staff effort remains hours, not cash. Unentered costs, taxes, benefits and vendor obligations are not established; shared cash sources count once.</p>
 </details>;
}
