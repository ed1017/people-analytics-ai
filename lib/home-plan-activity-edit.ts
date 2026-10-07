import type {BundleDraft} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft,reviseBundleProposal,unknownAssumption} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {resolveHomePlanningIntent} from './home-planning-intent.ts';

/** Bounded activity additions, with retained constraints checked against this exact
 * saved plan. A cap never supplies a missing activity cost, owner or work estimate.
 */
export function revisePlanActivities(source:BundleDraft,request:string):BundleDraft|null{
 const text=request.trim().replace(/^(?:please\s+|(?:can|could|would)\s+you\s+)/i,'');
 const parts=text.split(/(?<=[.!?])\s+/).map(part=>part.replace(/[.!?]$/,'').trim());
 const addition=parts[0].match(/^(?:add|adding)\s+(.+?)(?:\s+to\s+(?:the\s+)?(?:selected|this)\s+(?:action\s+)?plan)?$/i);
 if(!addition||!/(?:manager\s+check[- ]ins|turnover[- ]signal|turnover signals)/i.test(addition[1]))return null;
 const requested=addition[1].split(/\s+and\s+/i),activities:{domain:string;action:string}[]=[];
 for(const raw of requested){
  let match=raw.match(/^(monthly|quarterly|weekly)\s+manager\s+check[- ]ins$/i);
  if(match){activities.push({domain:'manager_workload',action:`${match[1].toLowerCase()} manager check-ins`});continue;}
  match=raw.match(/^(?:a\s+)?(monthly|quarterly|weekly)\s+(?:review of turnover signals|turnover[- ]signal reviews)$/i);
  if(match){activities.push({domain:'execution',action:`${match[1].toLowerCase()} turnover-signal reviews`});continue;}
  throw Error('Describe a manager check-in or turnover-signal review cadence explicitly. Other activity changes need separate review; nothing has changed.');
 }
 if(!activities.length||activities.length>2||new Set(activities.map(item=>item.domain)).size!==activities.length)throw Error('Review one explicit cadence for each added activity. Nothing has changed.');
 for(const clause of parts.slice(1)){
  if(/^create this as a new numbered alternative and preserve the first three plans$/i.test(clause))continue;
  const keep=clause.match(/^keep the target exactly (?:a\s+)?(\d+(?:\.\d+)?)[- ]percentage[- ]point reduction over (\d+) months and the (?:illustrative|demo) (\$(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?) budget cap$/i);
  if(!keep)throw Error('Review the added activities and retained constraints separately; no part of this request was applied.');
  const intent=resolveHomePlanningIntent([`Reduce turnover by ${keep[1]} percentage points over ${keep[2]} months with a ${keep[3]} budget`]);
  const retained=resolveHomePlanningIntent([source.inputs.successMeasure?.target.value??'']);
  if(retained.pointReduction!==intent.pointReduction||source.inputs.scope.months.value!==intent.months||source.inputs.budget?.amount.value!==intent.budgetCap||source.inputs.budget?.basis.value!=='cash')throw Error('The retained target, horizon or cash cap differs from this saved plan. Review that difference explicitly before adding activities; nothing has changed.');
 }
 const bundle=structuredClone(source.bundle),added=activities.map(item=>item.action).join(' and ');
 if(bundle.coordination.toLowerCase().includes(added))throw Error('These added activities are already recorded in this plan. No new alternative is needed.');
 bundle.coordination+=` Added activities: ${added}.`;
 if(bundle.coordination.length>240)throw Error('The saved approach needs a shorter reviewed description before these activities can be added. Nothing has changed.');
 const changed=new Set<string>();
 for(const activity of activities){
  const component=bundle.components.find(item=>item.domain===activity.domain);
  if(!component)throw Error('This plan has no matching proposed activity owner. Review the intended manager or turnover-review component first; nothing has changed.');
  component.firstStep+=` Added activity: ${activity.action}.`;
  if(component.firstStep.length>360)throw Error('The saved activity description needs review before adding this cadence. Nothing has changed.');
  changed.add(component.id);
 }
 const draft=reviseBundleProposal(source,bundle),inputs=draft.inputs;
 // Keep every original allowance, but do not reuse its subtotal as the price of
 // additional work. Exact dates, incremental cash and effort still need review.
 inputs.expenses.push({id:`activity-addition-${draft.revision}`,label:'Added activity incremental cash — unreviewed; not the budget cap',kind:'cash',amount:unknownAssumption(),startMonth:unknownAssumption(),months:unknownAssumption()});
 inputs.expenseLinks.push({expenseId:`activity-addition-${draft.revision}`,componentIds:[...changed],allocations:null});
 if(inputs.deliveryEstimate)inputs.deliveryEstimate.coordinationHours=unknownAssumption();
 for(const timing of inputs.timing)if(changed.has(timing.componentId))timing.finish=unknownAssumption();
 if(!readBundleDraft(draft))throw Error('The added activities could not be validated. Earlier plans are kept.');
 return draft;
}
