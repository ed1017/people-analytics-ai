import {resolveWorkforcePerformance, type PerformanceFilters} from '@/lib/workforce-performance';
import type {SelectedBusinessContext} from '@/lib/talent-evidence-scope';

/** Uses the same dashboard response and filters. No separate cohort controls or dataset. */
export function WorkforcePerformanceField({value,filters,selectedContext,population,loading=false}:{value:unknown;filters:PerformanceFilters;selectedContext:SelectedBusinessContext;population?:number|null;loading?:boolean}) {
 const result=loading?null:resolveWorkforcePerformance(value,filters,population),counts=result?.counts;
 return <div className="mb-6 border-b pb-5" aria-label="Workforce performance ratings">
  <h3 className="font-semibold">Performance ratings</h3>
  <p className="mt-1 text-xs text-muted-foreground">30 Sep 2026 workforce · {selectedContext.country} · {selectedContext.businessUnit} · {selectedContext.level}</p>
  {counts?<>
   <p className="mt-2 text-sm">2026 year to date · {counts.population.toLocaleString()} employees in the selected workforce</p>
   <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
    {[...counts.ratings.map((n,i)=>({label:`Rating ${i+1}`,n})),{label:'Not rated',n:counts.notRated},{label:'Unavailable',n:counts.unavailable}].map(({label,n})=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{n.toLocaleString()}</dd></div>)}
   </dl>
   <p className="mt-3 text-xs text-muted-foreground">Ratings are ordinal categories. Not rated means a verified absence of a review; unavailable means the source or release timing is unconfirmed. No category labels or performance effects are inferred.</p>
  </>:<p role="status" className="mt-2 text-sm text-muted-foreground">{loading?'Loading ratings for the selected workforce…':result?.status==='suppressed'?'Ratings are withheld for this selection to protect small groups.':'Ratings for this workforce are not available yet.'}</p>}
 </div>;
}
