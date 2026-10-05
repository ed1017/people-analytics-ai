// Explicit local proposal editing and a strict bridge to the existing capacity search.
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,readBundleDraft,reviseBundleProposal,type BundleDraft} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {canonical,prepareWorkforceMixSource} from './workforce-mix-search-core.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readWorkforceSolution,currentSolutionVersion,solutionResultIsCurrent} from './workforce-solution.ts';
import type {BundleComponent,SolutionBundle} from './home-solution-bundles';
const methods:Record<BundleComponent['domain'],{name:string;step:string}>={
 manager_workload:{name:'Manager and workload pilot',step:'Propose a manager-led pilot of regular workload reviews and agreed priority changes; record participation, delivery issues and feedback before considering expansion.'},
 learning:{name:'Learning and practice pilot',step:'Propose targeted learning with supervised practice on the reviewed skill needs; agree proficiency checks and review completion before expanding the learning activity.'},
 mobility:{name:'Internal mobility pilot',step:'Propose voluntary internal assignments matched to reviewed role requirements; confirm readiness, source-team coverage and receiving-team support before any move.'},
 compensation:{name:'Compensation review and proposal',step:'Develop a compensation proposal for the reviewed population; assess internal equity, cost and required approvals before any pay change, then define how implementation would be monitored.'},
 hiring:{name:'Hiring and onboarding proposal',step:'Propose hiring against confirmed additional role demand; review the role requirements, funding, recruitment and onboarding sequence before opening approved positions.'},
 execution:{name:'Delivery and evaluation review',step:'Coordinate the proposed methods through their reviewed dependencies; agree owners, baseline measures and review points, then assess delivery and observed outcomes before expanding.'},
};
export type DeliveryMixPreview={inputKey:string;bundle:SolutionBundle};
export function previewDeliveryMix(draft:BundleDraft):DeliveryMixPreview{
 if(!readBundleDraft(draft))throw Error('Review a valid current plan first.');
 const domains=draft.bundle.components.filter(item=>item.domain!=='execution').map(item=>item.domain);
 if(new Set(domains).size<2)throw Error('This mix needs at least two relevant methods already proposed for the goal. Review the components in the working form or prepare another proposal.');
 if(new Set(domains).size!==domains.length)throw Error('Review repeated methods in the working form before creating a delivery mix; costs and populations cannot be merged automatically.');
 const bundle:SolutionBundle={...structuredClone(draft.bundle),name:'Proposed coordinated delivery mix',objective:'Pilot the reviewed workforce methods with delivery and outcome review',coordination:'Coordinate the proposed methods through their reviewed dependencies, then assess delivery and outcomes before expansion.',limitation:'Locally proposed activities for review, not evidence of effectiveness. Confirm relevance, feasibility, costs, participants, dates and measures. No predicted retention effect or optimum.',components:draft.bundle.components.map(component=>({...structuredClone(component),name:methods[component.domain].name,firstStep:methods[component.domain].step,limitation:'Local proposed activity; original references provide context only. Confirm relevance, feasibility, authority and measures before acting.'}))};
 reviseBundleProposal(draft,bundle);
 return {inputKey:bundleInputKey(draft),bundle};
}
export function acceptDeliveryMix(draft:BundleDraft,preview:DeliveryMixPreview):BundleDraft{
 if(bundleInputKey(draft)!==preview.inputKey||canonical(previewDeliveryMix(draft))!==canonical(preview))throw Error('The plan or proposed delivery mix changed. Review again.');
 return reviseBundleProposal(draft,preview.bundle);
}
/** A search of staffing assumptions is never a search over intervention effects. */
export function matchedBundleSearch(draft:BundleDraft,raw:unknown){
 if(!readBundleDraft(draft)||draft.inputs.scope.capacityRequired.value!==true||!draft.inputs.capacity)throw Error('Confirm additional role capacity and review its inputs before searching staffing combinations. Intervention mixes without a validated response model have no predicted optimum or numerical ranking.');
 if(draft.inputs.scope.comparisonConfirmed.value!==true)throw Error('Confirm the shared scope and comparison requirements in the working form first.');
 if(Object.entries(draft.inputs.capacity.input).some(([field,value])=>value&& !['user-entered','adopted'].includes(draft.inputs.capacity!.origins[field].kind)))throw Error('Review the illustrative staffing assumptions before searching.');
 const solution=readWorkforceSolution(raw);
 if(!solution||solution.goalId!==draft.binding.goalId||currentSolutionVersion(solution).inputs.scope.goalStatement!==draft.binding.goal)throw Error('Save and calculate a workforce plan for this exact goal first.');
 const result=solution.results.findLast(item=>solutionResultIsCurrent(solution,item));
 if(!result)throw Error('Calculate the saved workforce plan explicitly before searching.');
 const source=prepareWorkforceMixSource(solution,result.id),scope=draft.inputs.scope,input=source.input;
 if(canonical(input)!==canonical(draft.inputs.capacity.input)||scope.businessUnit.value!==input.businessUnit||scope.jobProfile.value!==input.jobProfile||scope.startMonth.value!==input.planningMonth||scope.months.value!==Number(input.months)||scope.demand.value!==Number(input.roles))throw Error('The bundle and saved workforce calculation have different assumptions or scope. Review and calculate matching inputs first.');
 return {solution,evidenceResultId:result.id,input};
}
