import type {BundleDraft} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {componentOrder} from './home-solution-bundles.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleAssumptionText,bundleDisplayText} from './home-bundle-display.ts';

export type PlanDirection={
 id:string;
 title:string;
 action:string;
 owner:string;
 timing:string;
 prerequisites:string[];
 completionEvidence:string;
};

/** Suggested delivery records, never a claim that the activity or an outcome occurred. */
function completionEvidence(action:string,title:string):string{
 if(/\bcheck[ -]?ins?\b/i.test(action))return 'Keep dated check-in notes with the topics discussed, agreed actions and unresolved items.';
 if(/\b(?:practi[sc]e|sessions?|workshops?|training|coaching)\b/i.test(action))return 'Keep the materials or work samples used, a dated participation record and any follow-up actions.';
 if(/\b(?:review|analy[sz]e|audit|assess|compare)\b/i.test(action))return 'Keep the dated review or assessment, its source references and any unresolved questions.';
 return `Keep dated outputs or notes for “${title}”, showing what was completed and what remains open.`;
}

/** Read-only projection of the supplied revision, including historical snapshots.
 * No calculator, model, clock, storage, inferred cadence or resource assignment.
 */
export function planDirections(draft:BundleDraft):PlanDirection[]{
 const {bundle,inputs}=draft;
 return componentOrder(bundle.components).map(id=>{
  const component=bundle.components.find(item=>item.id===id)!;
  const timing=inputs.timing.find(item=>item.componentId===id);
  const action=bundleDisplayText(component.firstStep,bundle,inputs);
  const title=bundleDisplayText(component.name,bundle,inputs);
  const start=timing?.start.value?bundleAssumptionText(timing.start):'Not specified';
  const finish=timing?.finish.value?bundleAssumptionText(timing.finish):'Not specified';
  return {id,title,action,owner:component.ownerRole,timing:`Start — ${start}. Finish — ${finish}.`,
   prerequisites:component.dependsOn.map(parent=>bundle.components.find(item=>item.id===parent)!.name),
   completionEvidence:completionEvidence(action,title)};
 });
}
