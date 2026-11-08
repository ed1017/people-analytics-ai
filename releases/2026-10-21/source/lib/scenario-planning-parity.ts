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
/** Parse only bounded capacity questions. Extra role, timing or compound instructions
 * remain with the general assistant rather than silently adopting demo assumptions. */
export function capacityPlanningRequest(text:string):{gap:number;budget:number|null}|null{
 const question=text.trim();
 const match=question.match(/^(?:please\s+)?(?:(?:how (?:would|can|could|should) (?:you|we|I) )|(?:(?:help me|help us) (?:to )?))?(?:close|fill|address)(?: the| a| an| our| my)? (\d+(?:\.\d+)?)\s*-?\s*(?:FTE|full[- ]time equivalent)(?: capacity| staffing)? gap(?: (?:with|on|within|under)(?: a| an| the| our| my)? (?:budget of )?\$((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(k)?(?: USD)?(?: budget)?)?\s*[?.!]?$/i) ||question.match(/^(?:I|we) have (?:a |an )?(\d+(?:\.\d+)?)\s*-?\s*(?:FTE|full[- ]time equivalent)(?: capacity| staffing)? gap (?:and|with) (?:a |an )?(?:budget of )?\$((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(k)?(?: USD)?(?: budget)?(?:[.,;]?\s+(?:what are (?:my|our|the) (?:staffing )?options|how (?:can|should) (?:I|we) close it|compare (?:my|our|the|staffing) options))?\s*[?.!]?$/i);
 if(!match)return null;
 const gap=Number(match[1]),budget=match[2]===undefined?null:Number(match[2].replaceAll(',',''))*(match[3]?1000:1);
 return Number.isFinite(gap)&&(budget===null||Number.isFinite(budget))?{gap,budget}:null;
}
/** A matching incomplete question may OFFER the example, never silently adopt it. */
export function offersCapacityExample(text:string){
 const request=capacityPlanningRequest(text);
 return !!request&&request.gap===5&&(request.budget===null||request.budget===325000);
}
/** Priority questions reuse the exact current calculation; they never imply one universal best option. */
export function scenarioRecommendationIntent(text:string){return /^(?:(?:which|what) (?:staffing )?option (?:is (?:cheapest|lowest[- ]cost)|has (?:the )?(?:least|lowest) (?:uncovered work|workload shortfall))|which is (?:cheapest|lowest[- ]cost)|show (?:me )?(?:the )?(?:lowest[- ]cost|least[- ]uncovered[- ]work) option)[?.!]?$/i.test(text.trim())||/^(?:(?:with|under) (?:the )?(?:new|updated|current|revised) budget[, ]*)?(?:(?:which|what) (?:staffing )?option (?:would|do|should) you recommend|(?:what|which) (?:is|would be) (?:your|the) recommendation|recommend (?:a|an|the) (?:staffing )?option)[?.!]?$/i.test(text.trim());}
export function scenarioComparisonIntent(text:string){return !!capacityPlanningRequest(text)||/^(?:please\s+)?(?:compare(?: the)?(?: staffing)? options|recalculate(?: the)?(?: staffing)? options|show(?: me)?(?: the)? staffing options)\s*[?.!]?$/i.test(text.trim());}
/** Only bounded hypothetical follow-ups; factual dates/groups remain descriptive queries. */
export function scenarioAssumptionDiscussionIntent(text:string){
 return /^(?:what if (?:attrition|turnover) (?:increases?|decreases?|rises?|falls?)(?: (?:by|to) \d+(?:\.\d+)?(?:%| percent))?|what about (?:backfill|backfills|attrition|turnover))(?: (?:in|for) (?:this|the|our) (?:scenario|plan))?\s*[?.!]?$/i.test(text.trim());
}
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
 const request=capacityPlanningRequest(text);
 if(!request)return null;
 const gap=guidedWorkloadResult(draft.inputs)?.additionalFte;
 if(request.gap!==gap||request.budget!==null&&request.budget!==draft.inputs.budget?.amount.value)return 'The quantities in your question differ from the current scenario. Review and change the workload inputs or budget beside the chat, then compare again. Existing options do not answer the changed question.';
 return null;
}
