"use client";
import {useDecisionStorage} from '@/components/decision-store';
import {HomeCapacityAdoption} from '@/components/home-capacity-adoption';
import {WorkforceAlternatives} from '@/components/workforce-alternatives';
import {matchedBundleSearch} from '@/lib/home-plan-integration';
import {bundleInputKey,type BundleDraft} from '@/lib/home-bundle-reconciliation';
export function HomePlanIntegration({draft,disabled,isCurrent,onAccept}:{draft:BundleDraft;disabled:boolean;isCurrent:()=>boolean;onAccept:(draft:BundleDraft)=>void}){
 const storage=useDecisionStorage();
 const current=!disabled&&isCurrent();let search:ReturnType<typeof matchedBundleSearch>|null=null,searchNotice='';
 try{search=matchedBundleSearch(draft,storage.data.workspaces[draft.binding.goalId]?.fields.workforceSolution)}catch(error){searchNotice=(error as Error).message}
 if(draft.inputs.scope.capacityRequired.value!==true||!draft.inputs.capacity)return null;
 return <details className="space-y-3 rounded border p-3"><summary className="min-h-11 cursor-pointer py-2 font-medium">Compare staffing options</summary>
  <section aria-label="Integrated plan review" className="space-y-3 text-sm">
   <h4 className="font-semibold">Staffing combinations for this plan</h4>
   <p>Only a matching reviewed additional-capacity calculation supports this local search. Its counts and tradeoffs describe staffing assumptions, not complete intervention plans or predicted retention outcomes. No intervention optimum is established.</p>
   {!current?<p>Review the current plan context before searching.</p>:search?<WorkforceAlternatives key={bundleInputKey(draft)} {...search} blocked={false} renderBundleAdoption={(offer,currentContext)=><HomeCapacityAdoption key={JSON.stringify([offer.snapshot.searchFingerprint,offer.selectedIds,bundleInputKey(draft)])} draft={draft} offer={offer} currentContext={currentContext} isCurrent={isCurrent} onAccept={onAccept}/>}/>:<p role="status">{searchNotice}</p>}
  </section>
 </details>;
}
