import type {BundleDraft,BundleResult} from '@/lib/home-bundle-reconciliation';
import {homePlanSummary,planSummarySentences} from '@/lib/home-plan-summary';
import {bundleAssumptionText} from '@/lib/home-bundle-display';

export function HomePlanSummary({draft,result,measurePack}:{draft:BundleDraft;result?:BundleResult|null;measurePack?:unknown}){
 return <>
  <ul aria-label="Selected plan summary" className="space-y-3 text-sm">
   {homePlanSummary(draft,result,measurePack).map(section=><li key={section.heading} className="min-w-0 break-words">
    <strong>{section.heading}:</strong>
    <ul aria-label={section.label??section.heading} className="mt-1 list-disc space-y-1 pl-5">
     {section.items.map((item,index)=><li key={index}>{item}</li>)}
    </ul>
   </li>)}
  </ul>
  {draft.inputs.scope.requirements.value&&<section aria-label="Planning constraints" className="text-sm"><strong>Planning constraints:</strong><ul className="mt-1 list-disc space-y-1 pl-5">{planSummarySentences(draft.inputs.scope.requirements.value).map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
  <ul aria-label="Plan population and source scope" className="list-disc space-y-1 pl-5 text-xs">
   <li>Plan population: {bundleAssumptionText(draft.inputs.scope.population)}.</li>
   <li>Business unit: {bundleAssumptionText(draft.inputs.scope.businessUnit)}.</li>
   <li>Planning inputs are separate from workforce filters and source populations; Home evidence does not verify department scope.</li>
  </ul>
 </>;
}
