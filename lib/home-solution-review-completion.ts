// @ts-expect-error Native Node checks share application contracts.
import {assertSolutionShape,solutionTools} from './home-solution-conversation-schema.ts';

const reviewTools=new Set(['evaluate_candidate','revise_parameters']);
/** Presentation intent is separate from calculator inputs and never enters saved provenance. */
export const reviewReadySolutionTools=solutionTools.map(tool=>!reviewTools.has(tool.name)?tool:{...tool,parameters:{...tool.parameters,
 properties:{...tool.parameters.properties,readyForReview:{type:'boolean',description:'True only when this calculation completes the requested turn and its checked proposal(s) can be presented immediately. False when more reads, comparisons, calculations or discussion are still required.'}},
 required:[...tool.parameters.required!,'readyForReview'],
}});

export const reviewReadyInstructions=`
For evaluate_candidate and revise_parameters, set readyForReview=true only when the proposed calculation completes the user's current request. On a valid calculated result, code will immediately present the existing full Action Plan cards, checked numeric results, interpreted inputs, tradeoffs, limitations and review/save controls; no final prose generation follows. Do not omit requested work to use this option. Use false when further reads, calculations, comparisons, explanation or questions are needed. Invalid, blocked or awaiting-scope results still return normal feedback for review. This flag never saves, applies, confirms assumptions or relaxes provenance, evidence, calculation or source-identity checks.
Default to a short takeaway and next step. For plan proposals, do not repeat activities, input lists or calculations already shown in the review cards. Keep supporting rationale in the structured plan fields, available in expandable detail. Preserve necessary assumptions and unknowns; give fuller explanation when the user asks for it.`;

export function readReviewReadyArguments(name:string,raw:Record<string,unknown>,enabled:boolean){
 // Existing callers and persisted proposals keep their original argument contract.
 if(!enabled||!reviewTools.has(name)||!raw||typeof raw!=='object'||!Object.hasOwn(raw,'readyForReview'))return {args:raw,ready:false};
 const tool=reviewReadySolutionTools.find(tool=>tool.name===name)!;
 assertSolutionShape(raw,tool.parameters,'review arguments');
 const {readyForReview,...args}=raw;
 return {args,ready:readyForReview===true};
}
