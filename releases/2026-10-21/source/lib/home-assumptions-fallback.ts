// @ts-expect-error Native Node tests share TypeScript source.
import {homeGoalForPin} from './home-planning-intent.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validActionBinding,type ActionBinding} from './home-action-drafts.ts';
import type {SolutionBundle} from './home-solution-bundles';
// @ts-expect-error Native Node tests share TypeScript source.
import {whatIfKind} from './home-plan-what-if.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validDemoBundle} from './home-demo-catalog.ts';
export const assumptionsFallbackField='homeAssumptionsFallbackV1';
export const assumptionsOrigin='local-assumptions-v1' as const;
/** Keep mixed/replacement scope out even if a long request has a shorter display goal. */
export function assumptionsGoalFromStatements(statements:string[]):string|null{
 const text=statements.join(' '),retention=/\b(turnover|retention|retain|exits)\b/i.test(text),capacity=/\b(add|additional|increase|expand|grow)\b/i.test(text)&&/\b(roles?|capacity|headcount|positions?)\b/i.test(text);
 if(retention&&capacity||/\b(replace|replacement|backfill)\b|\bwithout\s+(?:hiring|adding|roles|capacity)\b/i.test(text))return null;
 const goal=homeGoalForPin(statements);return goal&&assumptionsOnlyBundle(goal)?goal:null;
}
/** Deterministic local proposal. Never a model response or an evidence reference. */
export function assumptionsOnlyBundle(goal:string):SolutionBundle|null{
 const kind=whatIfKind(goal);if(!kind||!goal.trim()||goal.length>240)return null;
 const capacity=kind==='capacity';
 return {origin:assumptionsOrigin,id:'A',name:capacity?'Assumptions-only capacity review':'Assumptions-only retention pilot',objective:capacity?'Review additional role capacity and compare staffing paths using explicitly reviewed planning assumptions.':'Select and review one retention intervention before running a bounded pilot and measuring the agreed turnover target.',coordination:capacity?'Review the role need, then compare build, move and hire assumptions before any staffing decision.':'Choose the intervention and pilot scope together, then review the same turnover measure and period.',components:[{id:'c1',name:capacity?'Review additional capacity':'Review and run a retention pilot',domain:capacity?'hiring':'execution',firstStep:capacity?'Confirm the additional role and business-unit need, then review build, move and hire inputs before calculating options.':'Agree one retention intervention and a bounded pilot scope, then review feasibility and measurement before running it.',evidence:[],ownerRole:capacity?'Workforce planning lead':'HR programme lead',dependsOn:[],limitation:'Local starting proposal only; relevance, feasibility, funding and effectiveness are unproven.'}],limitation:'Assumptions-only local template, not evidence-based advice. Missing sources remain unavailable. No execution or causal effect is established.'};
}
/** Empty references belong only to exact immutable local templates, including fictional first-run examples. */
export function validAssumptionsOnlyBundle(bundle:SolutionBundle,goal:string){const expected=assumptionsOnlyBundle(goal);return !!expected&&JSON.stringify(bundle)===JSON.stringify(expected)||validDemoBundle(bundle,goal);}
export function unavailableSourceLabels(pack:unknown):string[]{
 if(!pack||typeof pack!=='object'||!('sources' in pack)||!Array.isArray(pack.sources))return [];
 return pack.sources.filter(source=>source&&typeof source==='object'&&['timeout','unavailable','invalid'].includes(source.status)).map(source=>String(source.label??source.id)).slice(0,18);
}

export type AssumptionsFallbackRecord={version:1;binding:ActionBinding;sourceBinding:ActionBinding;preparedAt:string;missingSources:string[];planningContext:unknown};
export function readAssumptionsFallback(raw:unknown,goalId:string):AssumptionsFallbackRecord|null{
 if(!raw||typeof raw!=='object'||!validateJson(raw)||JSON.stringify(raw).length>40000)return null;const value=raw as AssumptionsFallbackRecord;
 if(Object.keys(value).sort().join()!==['version','binding','sourceBinding','preparedAt','missingSources','planningContext'].sort().join()||value.version!==1||!validActionBinding(value.binding)||!validActionBinding(value.sourceBinding)||value.sourceBinding.goalId!==value.binding.goalId||value.sourceBinding.goal!==value.binding.goal||value.binding.goalId!==goalId||!assumptionsOnlyBundle(value.binding.goal)||typeof value.preparedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(value.preparedAt)||!Number.isFinite(Date.parse(value.preparedAt))||!Array.isArray(value.missingSources)||!value.missingSources.length||value.missingSources.length>18||value.missingSources.some(label=>typeof label!=='string'||!label||label.length>200))return null;
 return value;
}
