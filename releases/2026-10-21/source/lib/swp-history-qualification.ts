/** Local qualification of reviewed aggregate histories. No DB/model/UI caller.
 * Evidence references are audit inputs, not authenticated facts or forecast validation.
 */
export type SwpScope={dimension:'company'|'business-unit'|'job-profile'|'location'|'cost-center';id:string;population:string};
export type SwpEvidence={status:'verified'|'unverified'|'contradicted';references:readonly string[]};
export type SwpMetric=
 | {kind:'headcount';unit:'people';definition:SwpEvidence}
 | {kind:'fte';unit:'FTE';definition:SwpEvidence}
 | {kind:'labor-cost';unit:'currency';currency:string|null;period:'monthly'|'annualized'|'unknown';definition:SwpEvidence;fteBasis:SwpEvidence;components:SwpEvidence;fxBasis:SwpEvidence};
export type SwpHistory={scope:SwpScope;metric:SwpMetric;sourceId:string;sourceVersion:string;points:readonly {month:string;value:number|null}[];populationReconciliation:SwpEvidence;historicalMembership:SwpEvidence;completion:SwpEvidence;historicalVintages:SwpEvidence};
const verified=(e:SwpEvidence)=>e.status==='verified'&&e.references.some(r=>r.trim().length>0);
const monthIndex=(month:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(month)?Number(month.slice(0,4))*12+Number(month.slice(5))-1:null;

/** Window counts describe feasibility only, never sample adequacy or model accuracy.
 * Entire target windows precede the final holdout. Overlapping origins remain correlated.
 */
export function swpBacktestWindows(months:readonly string[],minimumTrainingMonths:number,horizonMonths:number,holdoutMonths:number){
 if(![minimumTrainingMonths,horizonMonths,holdoutMonths].every(n=>Number.isSafeInteger(n)&&n>0)||holdoutMonths<horizonMonths)throw Error('Use positive windows with a holdout covering the forecast horizon.');
 const indices=months.map(monthIndex);
 if(indices.some((n,i)=>n===null||(i>0&&n!==indices[i-1]!+1)))throw Error('Backtesting requires ordered consecutive monthly observations.');
 const cutoff=months.length-holdoutMonths,development:{origin:string;targets:string[]}[]=[];
 for(let training=minimumTrainingMonths;training+horizonMonths<=cutoff;training++)development.push({origin:months[training-1],targets:months.slice(training,training+horizonMonths)});
 const holdout=cutoff>=minimumTrainingMonths?{origin:months[cutoff-1],targets:months.slice(cutoff,cutoff+horizonMonths)}:null;
 return {development,holdout,independentOriginCount:null,qualification:'window-feasibility-only' as const};
}

/** A snapshot series can be inspectable while its population or cost semantics block modeling. */
export function qualifySwpHistory(history:SwpHistory,windows={minimumTrainingMonths:12,horizonMonths:6,holdoutMonths:6}){
 const reasons:string[]=[];
 if(!history.sourceId.trim()||!history.sourceVersion.trim()||!history.scope.id.trim()||!history.scope.population.trim())reasons.push('missing-source-or-population-identity');
 if(!history.points.length)reasons.push('empty-history');
 if(history.points.some(p=>p.value===null||!Number.isFinite(p.value)||p.value<0||(history.metric.kind==='headcount'&&!Number.isSafeInteger(p.value))))reasons.push('invalid-or-missing-values');
 let windowPlan:ReturnType<typeof swpBacktestWindows>|null=null;
 try{windowPlan=swpBacktestWindows(history.points.map(p=>p.month),windows.minimumTrainingMonths,windows.horizonMonths,windows.holdoutMonths);}catch{reasons.push('invalid-calendar-or-window');}
 const inspectable=reasons.length===0;
 if(!verified(history.metric.definition))reasons.push('metric-definition-unverified');
 if(!verified(history.populationReconciliation))reasons.push('population-not-reconciled');
 if(!verified(history.historicalMembership))reasons.push('historical-membership-not-reconciled');
 if(history.metric.kind==='labor-cost'){
  if(!history.metric.currency||! /^[A-Z]{3}$/.test(history.metric.currency))reasons.push('cost-currency-unverified');
  if(history.metric.period!=='monthly')reasons.push('monthly-cost-basis-unverified');
  if(!verified(history.metric.fteBasis))reasons.push('cost-fte-basis-unverified');
  if(!verified(history.metric.components))reasons.push('cost-components-unverified');
  if(!verified(history.metric.fxBasis))reasons.push('cost-fx-basis-unverified');
 }
 const conditionalRetrospectiveEligible=reasons.length===0&&!!windowPlan?.development.length&&!!windowPlan.holdout;
 if(!windowPlan?.development.length||!windowPlan?.holdout)reasons.push('insufficient-separated-backtest-windows');
 const limitations=['No model was fitted or evaluated. Window counts are not independent sample counts.','Reviewed input evidence is not authenticated by this local contract.'];
 if(!verified(history.completion))limitations.push('Source completion is unverified; retrospective results would be conditional.');
 if(!verified(history.historicalVintages))limitations.push('As-known-at-origin history is unverified; final-data backtests cannot establish deployment-time accuracy.');
 return {inspectable,conditionalRetrospectiveEligible,reasons,limitations,windowPlan,operationalForecastAvailable:false as const,intervalAvailable:false as const};
}
