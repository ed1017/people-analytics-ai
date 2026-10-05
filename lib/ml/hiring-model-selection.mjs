// Bounded offline synthetic experiment; not a source qualification or release API.
import {hiringTrainingCohorts,fitHiringCohorts,predictHiringCohorts,scoreHiringCohorts} from './hiring-cohort-model.mjs';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const hiringSelectionProtocol=freeze({version:'hiring-selection-v1',origin:'2025-07-01T00:00:00.000Z',
 validationOrigins:['2024-07-01','2025-01-01'],testMonths:['2025-07','2025-08','2025-09'],scoreThrough:'2026-01-01T00:00:00.000Z',
 minimumCohorts:24,minimumCohortOpenings:30,minimumTrainingStarts:20,minimumTrainingNonStarts:20,
 rule:'Logistic only when Brier is strictly lower than recent cohorts in both past validation windows; otherwise recent cohorts.'});
const index=month=>Number(month.slice(0,4))*12+Number(month.slice(5,7))-1;
const monthAt=(origin,offset)=>{const d=new Date(origin);d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString().slice(0,7);};

/** Internal past-fold selector. Scores are recomputed, never accepted from a stored summary. */
export function selectHiringMethod(folds){
 if(!Array.isArray(folds))throw Error('Validation windows required.');
 for(const fold of folds){
  const expectedCutoff=new Date(`${monthAt(fold.origin,6)}-01T00:00:00.000Z`).toISOString();
  if(!hiringSelectionProtocol.validationOrigins.includes(fold.origin)||
   fold.scoreThrough!==expectedCutoff||fold.scoreThrough>hiringSelectionProtocol.origin||
   !fold.model?.converged||fold.model.trainingCohorts<24||fold.model.trainingEnd>=fold.origin.slice(0,7))
   throw Error('Validation must precede selection and use earlier training cohorts.');
 }
 if(folds.length!==2||new Set(folds.map(f=>f.origin)).size!==2)
  return freeze({method:'recent-3-fraction',reason:'insufficient-validation',validation:[]});
 const validation=[];
 for(const origin of hiringSelectionProtocol.validationOrigins){
  const fold=folds.find(f=>f.origin===origin),months=[0,1,2].map(i=>monthAt(origin,i));
  if(!Array.isArray(fold.actual)||JSON.stringify(fold.actual.map(r=>r.month))!==JSON.stringify(months))
   return freeze({method:'recent-3-fraction',reason:'incomplete-validation-cohorts',validation:[]});
  // Score first to validate exact count/prediction shapes before checking support.
  const metrics=scoreHiringCohorts(fold.actual,fold.predictions);
  if(fold.actual.some(r=>r.openings<hiringSelectionProtocol.minimumCohortOpenings))
   return freeze({method:'recent-3-fraction',reason:'undersized-validation-cohorts',validation:[]});
  validation.push({origin,scoreThrough:fold.scoreThrough,metrics,
   logisticImproves:metrics['logistic-trend'].brier<metrics['recent-3-fraction'].brier});
 }
 const improve=validation.every(f=>f.logisticImproves);
 return freeze({method:improve?'logistic-trend':'recent-3-fraction',reason:improve?'consistent-past-improvement':'no-consistent-past-improvement',validation});
}

/** Incomplete support abstains rather than silently replacing missing outcomes. */
export function prepareSelectedHiringForecast(snapshot,folds){
 try{
  if(snapshot.input.cutoff!==hiringSelectionProtocol.origin)throw Error('Fixed selection origin required.');
  const rows=hiringTrainingCohorts(snapshot.input,snapshot.coverage),p=hiringSelectionProtocol;
  if(rows.length<p.minimumCohorts)throw Error('Insufficient mature training cohorts.');
  if(rows.some(r=>r.openings<p.minimumCohortOpenings))throw Error('Undersized training cohort; subgroup pooling is unsupported.');
  if(rows.some((r,i)=>i>0&&index(r.month)!==index(rows[i-1].month)+1))throw Error('Sparse training calendar.');
  let latest=new Date(snapshot.input.cutoff);latest.setUTCDate(1);
  while(latest.getTime()+92*86400000>Date.parse(snapshot.input.cutoff))latest.setUTCMonth(latest.getUTCMonth()-1);
  if(rows.at(-1).month!==latest.toISOString().slice(0,7))throw Error('Stale mature-cohort history.');
  const starts=rows.reduce((s,r)=>s+r.started,0),nonStarts=rows.reduce((s,r)=>s+r.openings-r.started,0);
  if(starts<p.minimumTrainingStarts||nonStarts<p.minimumTrainingNonStarts)throw Error('Insufficient outcome support.');
  const selection=selectHiringMethod(folds),model=fitHiringCohorts(rows),predictions=predictHiringCohorts(model,p.testMonths);
  return freeze({status:'experimental-synthetic-only',operationallyQualified:false,selection,model,predictions,
   selected:predictions.map(r=>({month:r.month,fraction:r[selection.method]})),interval:null,causalEffect:null});
 }catch(error){return freeze({status:'abstained',operationallyQualified:false,reason:error instanceof Error?error.message:'Invalid experiment input.',
  selection:null,model:null,predictions:null,selected:null,interval:null,causalEffect:null});}
}

/** Test outcomes enter only here, after the frozen selection/fit. */
export function scoreSelectedHiringForecast(prepared,actual){
 if(prepared.status!=='experimental-synthetic-only')throw Error('No supported prediction to score.');
 if(actual.some(r=>r.openings<hiringSelectionProtocol.minimumCohortOpenings))
  return freeze({status:'suppressed',reason:'Undersized test cohort; no subgroup metrics.',metrics:null});
 const metrics=scoreHiringCohorts(actual,prepared.predictions);
 return freeze({status:'scored',metrics:{recent:metrics['recent-3-fraction'],logistic:metrics['logistic-trend'],selected:metrics[prepared.selection.method]},
  selectedMinusRecentBrier:metrics[prepared.selection.method].brier-metrics['recent-3-fraction'].brier,
  selectedMinusLogisticBrier:metrics[prepared.selection.method].brier-metrics['logistic-trend'].brier});
}
