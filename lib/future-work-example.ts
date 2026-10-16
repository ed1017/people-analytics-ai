import type {CapacityDraft} from './swp-capacity-draft';
// @ts-expect-error Native Node tests share TypeScript source.
import {capacitySpec} from './swp-capacity-draft.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {calculateMonthlyWorkload} from './swp-monthly-workload.ts';
export const futureWorkDefaults={scope:'Fictional service desk - tickets',openingDate:'2026-10-31',months:'3',volume:'1600',effort:'1',exposure:'40',saving:'50',adoption:'50',realization:'80',release:'50'};
export type FutureWorkInputs=typeof futureWorkDefaults;
const numeric=['months','volume','effort','exposure','saving','adoption','realization','release'] as const;
/** This illustrative reduction is applied to task effort once, never to staffing stock. */
export function calculateFutureWork(input:FutureWorkInputs){
 const n={} as Record<typeof numeric[number],number>;
 for(const key of numeric){const raw=input[key];if(typeof raw!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(raw))throw Error('Enter every assumption; blanks remain unknown. Use nonnegative numbers with at most two decimals.');n[key]=Number(raw);const max=key==='months'?6:key==='volume'?100000:key==='effort'?24:100;if(n[key]>max||(key==='months'&&(!Number.isInteger(n[key])||n[key]<1)))throw Error(`Review ${key}: outside the example range.`);}
 if(typeof input.scope!=='string'||!input.scope.trim()||input.scope.length>100)throw Error('Name the fictional workload in 1-100 characters.');
 const baseline=n.volume*n.effort,exposed=baseline*n.exposure/100,potential=exposed*n.saving/100,adopted=potential*n.adoption/100,modeled=adopted*n.realization/100,reassignable=modeled*n.release/100;
 // Conservatively round remaining effort upward to the existing six-decimal contract.
 const netEffort=Math.ceil(Number((n.effort*(1-n.exposure*n.saving*n.adoption*n.realization/1e8)).toFixed(10))*1e6)/1e6;
 const sourceNote=`Fictional task example: opening ${input.openingDate}, ${n.months}mo, ${n.volume} items/mo; baseline ${n.effort}h/item; exposure ${n.exposure}%; saving on exposed time ${n.saving}%; adoption ${n.adoption}%; realization ${n.realization}%; reassignable share ${n.release}%. Net ${netEffort}h/item, rounded up. Origin only, not measured results.`;
 const draft:CapacityDraft={scope:'Fictional: '+input.scope.trim().replace(/^Fictional:?\s*/i,''),openingDate:input.openingDate,months:input.months,volume:input.volume,effort:String(netEffort),hours:'160',people:'10',fte:'10',hires:'0',exits:'0',hireFte:'1',exitFte:'1',allocation:'100',productivity:'0',costRate:'',fullTimeMovements:true,confirmed:false,sourceNote};
 // Reuse the existing calendar, quantity and scope validation and demand calculation.
 const result=calculateMonthlyWorkload(capacitySpec({...draft,confirmed:true}));
 return {baseline,exposed,potential,adopted,modeled,reassignable,netEffort,draft,result,firstMonth:result.points[0].month,lastMonth:result.points.at(-1)!.month};
}
/** Reject stale review; callers own explicit confirmation and the session mutation. */
export function acceptFutureWorkReview(input:FutureWorkInputs,reviewedInputs:string,reviewedContext:string,currentContext:string,reviewedSession:string,currentSession:string){
 if(JSON.stringify(input)!==reviewedInputs||reviewedContext!==currentContext||reviewedSession!==currentSession)throw Error('The inputs, goal, dataset or scenario changed. Review the handoff again.');
 return calculateFutureWork(input).draft;
}
