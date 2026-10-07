import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import {planDirections} from '@/lib/plan-directions';

/** Native disclosure: keyboard/touch accessible and closed for each new revision. */
export function PlanDirections({draft,snapshot=false}:{draft:BundleDraft;snapshot?:boolean}){
 const steps=planDirections(draft);
 return <details key={JSON.stringify([draft.binding,draft.bundle.id,draft.revision])} aria-label="Plan directions" className="min-w-0 rounded border px-3 text-sm">
  <summary className="min-h-11 cursor-pointer break-words py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">How to carry out this plan</summary>
  <div className="space-y-3 pb-3">
   <p className="text-xs text-muted-foreground">{snapshot?`Saved revision ${draft.revision}; review current conditions before acting. `:`Proposed steps for revision ${draft.revision}. `}Owner roles are proposed, not assigned. Completion records show delivery, not measured improvement.</p>
   <ol aria-label="Plan steps" className="list-decimal space-y-4 pl-5">
    {steps.map(step=><li key={step.id} className="min-w-0 space-y-1 break-words">
     <p className="font-semibold">{step.title}</p>
     <p><strong>Action:</strong> {step.action}</p>
     <p><strong>Proposed owner:</strong> {step.owner}</p>
     <p><strong>Timing:</strong> {step.timing}</p>
     <p><strong>Prerequisite:</strong> {step.prerequisites.length?step.prerequisites.join('; '):'None recorded; this numbering does not add a dependency.'}</p>
     <p><strong>Completion evidence (proposed):</strong> {step.completionEvidence}</p>
    </li>)}
   </ol>
  </div>
 </details>;
}
