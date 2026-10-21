import type {BundleDraft} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share application source.
import {readBundleDraft,bundleInputKey} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share application source.
import {compareSwpDemo,swpTradeoffOptions,swpEnd,guidedOptionEffort} from './swp-demo.ts';
// @ts-expect-error Native Node tests share application source.
import {guidedWorkloadResult} from './guided-workload.ts';
// @ts-expect-error Native Node tests share application source.
import {staffingChoiceSummary} from './staffing-choice-summary.ts';
const num=(n:number|null|undefined)=>n==null?'unknown':n.toLocaleString('en-US',{maximumFractionDigits:2});
/** A matching incomplete question may OFFER the example, never silently adopt it. */
export function offersCapacityExample(text:string){
 if(!scenarioComparisonIntent(text))return false;
 const match=text.match(/close(?: the| a)? (\d+(?:\.\d+)?) fte capacity gap(?: with a \$([\d,]+)(?: USD)? budget)?/i);
 return !!match&&Number(match[1])===5&&(match[2]===undefined||Number(match[2].replaceAll(',',''))===325000);
}
export function scenarioRecommendationIntent(text:string){return /^(?:(?:with|under) (?:the )?(?:new|updated|current|revised) budget[, ]*)?(?:(?:which|what) (?:staffing )?option (?:would|do|should) you recommend|(?:what|which) (?:is|would be) (?:your|the) recommendation|recommend (?:a|an|the) (?:staffing )?option)[?.!]?$/i.test(text.trim());}
export function scenarioComparisonIntent(text:string){return /^(?:please\s+)?(?:compare(?: the)?(?: staffing)? options|recalculate(?: the)?(?: staffing)? options|show(?: me)?(?: the)? staffing options|(?:how (?:would|can|could) (?:you|we) )?close(?: the| a)? \d+(?:\.\d+)? fte capacity gap(?: with a \$[\d,]+(?: USD)? budget)?)\s*[?.!]?$/i.test(text.trim());}
export function scenarioAssumptionText(draft:BundleDraft){const w=guidedWorkloadResult(draft.inputs);return `Explicit fictional scenario: ${draft.inputs.scope.population.value}. ${draft.inputs.scope.startMonth.value} through ${swpEnd(draft)}. Incremental cash budget: $${num(draft.inputs.budget?.amount.value)} USD. Qualified capacity: ${num(w?.qualifiedAllocatedFte)} FTE; additional gap: ${num(w?.additionalFte)} FTE. All workload, internal-pool, cost and readiness inputs remain assumptions. Review the complete inputs beside this conversation. No live AI is used for these calculations.`;}
export function scenarioRecommendation(draft:BundleDraft,result:Awaited<ReturnType<typeof compareSwpDemo>>){
 const options=swpTradeoffOptions(result.evaluation);
 if(!options.some(o=>o.candidate.status==='met'))return 'No displayed option meets the entered staffing and budget limits. Review constraints rather than treating an infeasible option as recommended.';
 return `Under the current $${num(draft.inputs.budget?.amount.value)} USD budget: `+staffingChoiceSummary(options.map(o=>({mix:o.candidate.mix,cash:o.candidate.cash.complete,status:o.candidate.status,shortfallHours:guidedOptionEffort(o)?.shortfallHours??null})));
}
export async function compareScenarioForChat(draft:BundleDraft,signal?:AbortSignal){
 if(!readBundleDraft(draft)||!draft.inputs.guidedWorkload)throw Error('Review a complete scenario draft before comparing.');
 const result=await compareSwpDemo(draft,signal);
 const recommendation=scenarioRecommendation(draft,result);
 const rows=swpTradeoffOptions(result.evaluation).map(o=>{const e=guidedOptionEffort(o);return `${o.candidate.mix.build} develop / ${o.candidate.mix.move} move / ${o.candidate.mix.buy} hire: $${num(o.candidate.cash.complete)} USD incremental cash; conditional readiness ${o.candidate.metrics?.fullCoverageDate??'unknown'}; uncovered work ${num(e?.shortfallHours)} hours. ${o.candidate.status==='met'?'Within entered end-date staffing and budget limits.':'Outside entered limits.'}`;});
 return {...result,answer:[scenarioAssumptionText(draft),'Calculated with the same staffing-option engine and exact inputs used by the guided view.',recommendation,...rows,'End-date staffing does not guarantee whole-period coverage. These are conditional options, not approved actions. Select and review an option before saving.'].join('\n\n')};
}
export function readScenarioChatDraft(raw:unknown,datasetToken:string):BundleDraft|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const review=(raw as {scenarioReview?:unknown}).scenarioReview;
 if(!review||typeof review!=='object'||Array.isArray(review))return null;
 const r=review as Record<string,unknown>;
 if(r.conversationMode!=='fictional-swp-demo-v1'||r.classification!=='fictional-scenario'||r.datasetToken!==datasetToken||r.reviewState==='pending-edits')return null;
 const draft=readBundleDraft(r.draft);
 if(!draft||!draft.inputs.guidedWorkload||draft.binding.goalId!==r.goalId||draft.binding.goal!==r.goal||draft.revision!==r.revision||bundleInputKey(draft)!==r.inputKey)return null;
 return draft;
}

export function scenarioQuestionMismatch(text:string,draft:BundleDraft):string|null{
 const match=text.match(/close(?: the| a)? (\d+(?:\.\d+)?) fte capacity gap(?: with a \$([\d,]+)(?: USD)? budget)?/i);
 if(!match)return null;
 const gap=guidedWorkloadResult(draft.inputs)?.additionalFte;
 if(Number(match[1])!==gap||match[2]!==undefined&&Number(match[2].replaceAll(',',''))!==draft.inputs.budget?.amount.value)return 'The quantities in your question differ from the current scenario. Review and change the workload inputs or budget beside the chat, then compare again. Existing options do not answer the changed question.';
 return null;
}
