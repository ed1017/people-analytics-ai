/** UI-derived reconstruction from the captured PR223 rendered text supplied by the parent.
 * Not provider JSON, a raw API response, or proof of original state serialization.
 * Titles, actions, narrative and visible assumption reasons are copied without shortening.
 */
import {proposedPilot} from './model-proposed-pilot.mjs';
export const vacancyQuestion='how can we reduce positions vacancy rate';
export const vacancyAnswer={
 findings:'I recommend starting with the vacancy triage and recruiting bottleneck pilot below. Your supplied position inventory reports 475 vacant positions and a 4.5% vacancy rate; recruiting reports 323 open requisitions older than 60 days as of September 30, 2026. That makes validating openings and diagnosing stalled hiring a practical starting point—not proof of a particular cause.',
 decisionRationale:'Prioritize the recruiting pilot if needed positions are stuck in approvals, screening, interviews or offers. Prefer the internal-matching alternative where interested employees are demonstrably ready and releasable without creating equivalent vacancies elsewhere. Neither approach is established as faster or cheaper by the supplied evidence.',
 caveats:['The proposals contain editable pilot allowances, not confirmed staffing, funding or promised vacancy reductions. Role scope, start date, baseline and target remain unconfirmed.','Track filled vacancies, new vacancies and obsolete-position closures separately; lowering the reported rate by closing positions does not itself increase delivery capacity.','Internal moves can shift vacancies rather than reduce them. Full recruiting, training, pay-change and backfill costs remain unknown.'],
};
const choices=[{
 name:'Vacancy triage and recruiting bottleneck pilot',
 actionName:'Validate and unblock priority openings',
 step:'Position owners validate continuing demand and approvals; the Talent Acquisition lead maps hiring-stage delays, agrees interview and decision routines with hiring managers, and reviews progress weekly. Record obsolete-position closures separately from filled vacancies.',
 owner:'Talent Acquisition lead and position owners',
 objective:'Test a focused process for filling validated priority vacancies.',
 rationale:'The supplied inventory reports a 4.5% vacancy rate, while recruiting reports 323 open requisitions older than 60 days. Start by verifying which openings are still needed and where approvals, screening, interviews or offers stall; these aggregates do not identify the actual bottleneck.',
 approach:'Validate vacancy demand, then remove hiring bottlenecks for a selected priority role group.',
 tradeoff:'Concentrating on priority roles leaves other vacancies outside the pilot. Closing obsolete positions can change the reported rate without adding delivery capacity; report closures separately.',
 limitation:'No role-level pipeline, approved hiring need, bottleneck cause or recruitment capacity is supplied; the routine is a test, not a guaranteed hiring result.',
 nextStep:'The Talent Acquisition lead and position owners should select a role group, reconcile its vacancies to requisitions, and confirm demand and process bottlenecks before starting the pilot.',
 successMeasure:'Establish a scoped baseline and target; track vacant/current positions, filled vacancies, new vacancies, closures, requisition age and hiring-stage delays using consistent dates and definitions.',
 hours:4,
 reasons:{horizon_months:'A bounded review-and-process pilot, not a deadline for reducing the vacancy rate.',participants:'A small proposed cross-functional group of recruiters, hiring managers and position owners; actual membership and capacity are unconfirmed.',hours_per_participant:'Total pilot allowance per participant for demand review, bottleneck mapping and short progress reviews; excludes ordinary recruiting and interview work.',coordination_hours:'One total allowance for assembling the vacancy register and coordinating reviews.',cash:'Proposed no-purchase process pilot using existing systems; employee time is separate, and any recruitment spending remains outside this allowance.',population:'The priority role group and its current-position denominator are not yet selected.',success_baseline:'The company inventory is context, not a scoped pilot baseline.',success_target:'Set a realistic scoped target only after validating openings and hiring-stage constraints.'},
},{
 name:'Internal matching and net-vacancy review pilot',
 actionName:'Assess internal matches and source-role coverage',
 step:'The internal mobility lead matches interested employees to validated openings, asks hiring managers to assess role readiness, and agrees release and source-role coverage with current managers. Proceed only when the net vacancy effect and delivery tradeoffs are understood.',
 owner:'Internal mobility lead and hiring managers',
 objective:'Test whether ready internal candidates can fill priority positions without shifting vacancies elsewhere.',
 rationale:'Recorded internal hiring and career preferences justify exploring an internal route, but neither proves current readiness or availability. A move can fill one position while creating another vacancy, so evaluate net position effects and any backfill need.',
 approach:'Assess internal matches and release conditions before choosing internal moves over external hiring.',
 tradeoff:'Internal moves may transfer rather than reduce vacancies. Assessment, release negotiation and backfill can delay delivery; no speed or cost advantage is established.',
 limitation:'No available internal pool, individual readiness, release agreement or backfill cost is supplied; preferences are not available capacity.',
 nextStep:'The internal mobility lead should select a priority role group with position owners, validate candidate interest and readiness, and document source-role coverage before proposing moves.',
 successMeasure:'Define a scoped baseline and target; track destination fills, source vacancies created, backfills, readiness decisions and net vacancies with a stable position denominator.',
 hours:6,
 reasons:{horizon_months:'Bounded assessment pilot, not a promised staffing deadline.',participants:'Small proposed assessment group of interested employees and managers; not a count of ready movers.',hours_per_participant:'Whole-pilot allowance per participant for matching, readiness discussion and release planning; excludes substantive retraining and ongoing role work.',coordination_hours:'Total allowance for coordinating assessments and checking source-role coverage.',cash:'No-purchase assessment pilot using existing systems; excludes unconfirmed training, pay changes and backfill spending, while employee time remains separate.',population:'The destination and source-role populations have not been selected.',success_baseline:'No scoped pilot vacancy baseline is supplied.',success_target:'No net vacancy reduction target is established.'},
}];
export const vacancyTitles=choices.map(c=>c.name);
export const vacancyActions=choices.map(c=>c.step);
export function vacancyUiCandidate(index,turnId){
 const value=choices[index],candidate=proposedPilot('vacancy-ui-'+index,turnId);
 Object.assign(candidate,{name:value.name,objective:value.objective,rationale:value.rationale,approach:value.approach,tradeoffs:[value.tradeoff],nextStep:value.nextStep,successMeasure:value.successMeasure});candidate.goal.statement='Reduce the position vacancy rate.';
 Object.assign(candidate.activities[0],{name:value.actionName,domain:index?'mobility':'hiring',step:value.step,ownerRole:value.owner,limitation:value.limitation});
 const values={horizon_months:2,participants:8,hours_per_participant:value.hours,coordination_hours:12,cash:0};
 for(const quantity of candidate.quantities){quantity.number=values[quantity.field];quantity.interpretation=value.reasons[quantity.field];}
 for(const field of ['population','success_baseline','success_target'])candidate.quantities.push({field,target:null,unit:'text',kind:'unknown',number:null,text:null,source:null,factor:null,turnId:null,interpretation:value.reasons[field]});
 return candidate;
}
