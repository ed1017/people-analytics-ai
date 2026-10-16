// @ts-expect-error Native offline tests share application source.
import {createPlanAlternatives,readPlanAlternatives,type AlternativeContext,type PlanAlternatives} from './home-plan-alternatives.ts';
import type {BundleDraft} from './home-bundle-reconciliation';

/** Read-only model context. Historical plans stay in storage/UI with their original
 * goal binding; they are not usable sources for an edited goal. Write paths must
 * continue to use the strict catalog reader, never this filtered context.
 */
export function conversationPlanCatalog(context:AlternativeContext,raw:unknown,sources:{id:string;draft:BundleDraft}[]|null):PlanAlternatives|null{
 if(raw!==undefined){
  const historicalGoal=raw&&typeof raw==='object'&&'goal' in raw&&typeof raw.goal==='string'?raw.goal:'';
  const verified=readPlanAlternatives(raw,{goalId:context.goalId,goal:historicalGoal});
  if(!verified)throw Error('Saved plans could not be verified. They have been preserved.');
  return historicalGoal===context.goal?verified:null;
 }
 if(!sources?.length)return null;
 // Validate historical snapshots under their own goal text, but the same goal ID.
 // A malformed or foreign-goal snapshot must not be disguised as mere staleness.
 if(new Set(sources.map(source=>source.id)).size!==sources.length)throw Error('Original plan identities could not be verified.');
 for(const source of sources)createPlanAlternatives({goalId:context.goalId,goal:source.draft?.binding?.goal??''},[source]);
 const current=sources.filter(source=>source.draft.binding.goal===context.goal);
 return current.length?createPlanAlternatives(context,current):null;
}
