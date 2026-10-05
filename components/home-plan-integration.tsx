"use client";
import {useState} from 'react';
import {useDecisionStorage} from '@/components/decision-store';
import {HomeCapacityAdoption} from '@/components/home-capacity-adoption';
import {WorkforceAlternatives} from '@/components/workforce-alternatives';
import {previewDeliveryMix,acceptDeliveryMix,matchedBundleSearch,type DeliveryMixPreview} from '@/lib/home-plan-integration';
import {bundleInputKey,type BundleDraft} from '@/lib/home-bundle-reconciliation';
const button='min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50';
export function HomePlanIntegration({draft,disabled,isCurrent,onAccept}:{draft:BundleDraft;disabled:boolean;isCurrent:()=>boolean;onAccept:(draft:BundleDraft)=>void}){
 const storage=useDecisionStorage(),[preview,setPreview]=useState<DeliveryMixPreview|null>(null),[notice,setNotice]=useState('');
 const current=!disabled&&isCurrent();let search:ReturnType<typeof matchedBundleSearch>|null=null,searchNotice='';
 try{search=matchedBundleSearch(draft,storage.data.workspaces[draft.binding.goalId]?.fields.workforceSolution)}catch(error){searchNotice=(error as Error).message}
 return <details className="space-y-3 rounded border p-3"><summary className="min-h-11 cursor-pointer py-2 font-medium">Develop the delivery mix and compare staffing</summary>
  <section aria-label="Integrated plan review" className="space-y-3 text-sm">
   <p>Review concrete proposed activities for the methods already in this plan. Original references describe context; they do not prove that an intervention works.</p>
   <button className={button} disabled={!current} onClick={()=>{try{if(!isCurrent())throw Error('Current context needs review.');setPreview(previewDeliveryMix(draft));setNotice('')}catch(error){setNotice((error as Error).message)}}}>Review proposed delivery mix</button>
   {preview&&<><p>Proposed local revision for “{draft.binding.goal}”. Review relevance and prerequisites before accepting. Existing quantities, dates and cost entries are retained as assumptions; completeness and dependency reviews will reset.</p><ul className="space-y-3">{preview.bundle.components.map(item=><li key={item.id}><strong>{item.name}</strong><p>Previous: {draft.bundle.components.find(old=>old.id===item.id)?.firstStep}</p><p>Proposed: {item.firstStep}</p><p className="text-xs">Context references: {item.evidence.join(', ')}. Proposed role: {item.ownerRole}. Prerequisites: {item.dependsOn.map(id=>preview.bundle.components.find(component=>component.id===id)?.name).join('; ')||'None proposed'}.</p></li>)}</ul><button className={button} disabled={!current||preview.inputKey!==bundleInputKey(draft)} onClick={()=>{try{if(!isCurrent())throw Error('Current context needs review.');onAccept(acceptDeliveryMix(draft,preview));setPreview(null);setNotice('Delivery mix accepted into the working draft. Review costs, dates and measures; Save and Calculate explicitly.')}catch(error){setNotice((error as Error).message)}}}>Accept proposed delivery mix</button></>}
   {notice&&<p role="status">{notice}</p>}
   <h4 className="font-semibold">Staffing combinations for this plan</h4>
   <p>Only a matching reviewed additional-capacity calculation supports this local search. Its counts and tradeoffs describe staffing assumptions, not complete intervention plans or predicted retention outcomes. No intervention optimum is established.</p>
   {!current?<p>Review the current plan context before searching.</p>:search?<WorkforceAlternatives key={bundleInputKey(draft)} {...search} blocked={false} renderBundleAdoption={(offer,currentContext)=><HomeCapacityAdoption key={JSON.stringify([offer.snapshot.searchFingerprint,offer.selectedIds,bundleInputKey(draft)])} draft={draft} offer={offer} currentContext={currentContext} isCurrent={isCurrent} onAccept={onAccept}/>}/>:<p role="status">{searchNotice}</p>}
  </section>
 </details>;
}
