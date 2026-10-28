// @ts-expect-error Shared native tests resolve TypeScript extensions.
import {canonicalFoWLabReference,type FoWLabSelection} from './fow-lab-reference.ts';
// @ts-expect-error Shared native tests resolve TypeScript extensions.
import {capacitySpec} from './swp-capacity-draft.ts';
// @ts-expect-error Shared native tests resolve TypeScript extensions.
import {futureWorkDefaults,calculateFutureWork,type FutureWorkInputs} from './future-work-example.ts';

/** Lab identity is context. Every numerical starting value remains an editable example. */
export function createFoWWorkModel(selection:FoWLabSelection={}){
 const reference=canonicalFoWLabReference(selection);
 const label=reference.selection.jobTitle??reference.selection.functionName??'Task redesign';
 return {key:JSON.stringify(reference.selection),reference,inputs:{...futureWorkDefaults,scope:`${label} work`.slice(0,100)}};
}
export function handoffFoWWorkModel(input:FutureWorkInputs,selection:FoWLabSelection){
 const {reference}=createFoWWorkModel(selection),calculation=calculateFutureWork(input),draft=calculation.draft;
 const n=(key:keyof FutureWorkInputs)=>Number(input[key]);
 const sourceNote=`Task example. ${reference.source.version}; ${reference.source.dataset.id}; ${reference.source.dataset.asOf}; ${reference.selection.jobKey??reference.selection.functionName??'all functions'}. Baseline ${n('effort')}h/item; eligible ${n('exposure')}%; saving ${n('saving')}%; adoption ${n('adoption')}%; realization ${n('realization')}%; reassignable ${n('release')}%. Proposed ${calculation.netEffort}h/item; staffing unchanged.`;
 const reviewed={...draft,sourceNote};
 // Validate the final transferred note against the existing saved-scenario contract.
 capacitySpec({...reviewed,confirmed:true});
 return reviewed;
}
