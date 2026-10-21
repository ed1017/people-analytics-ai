// Projection of the existing offline benchmark, not a new model or source adapter.
import {createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const base=implementationIdentity=>({schemaVersion:1,kind:'experimental-synthetic-result',domain:'hiring',dataClass:'constructed-synthetic',
 operationallyQualified:false,sourceTruthVerified:false,forecastBaseline:null,interval:null,causalEffect:null,implementationIdentity});
/** @returns {import('./hiring-experimental-result').ExperimentalHiringResult} */
export function unavailableExperimentalHiring(reason,implementationIdentity){
 const value={...base(implementationIdentity),status:'unavailable',artifactIdentity:null,benchmark:null,reasonCodes:[reason]};
 return freeze({...value,identity:digest(value)});
}
/** Internal: fresh must come from benchmarkHiringSelection(), never supplied model metadata.
 * Whole-artifact comparison includes protocol, labels, fits, metrics and file hashes.
 * Hash equality detects change; it does not authenticate company source truth.
 * @returns {import('./hiring-experimental-result').ExperimentalHiringResult}
 */
export function projectExperimentalHiringArtifact(cached,fresh,implementationIdentity){
 if(!/^[a-f0-9]{64}$/.test(implementationIdentity))throw Error('Implementation identity required.');
 if(fresh?.status!=='constructed-synthetic-selection-benchmark'||fresh.operationallyQualified!==false||fresh.interval!==null||fresh.causalEffect!==null||
  !Array.isArray(fresh.cases)||fresh.cases.length!==9||!Array.isArray(fresh.supportStress)||fresh.supportStress.length!==7)
  return unavailableExperimentalHiring('unsupported-fresh-benchmark',implementationIdentity);
 let equal=false;try{equal=JSON.stringify(cached)===JSON.stringify(fresh);}catch{/* malformed cache */}
 if(!equal)return unavailableExperimentalHiring('artifact-does-not-match-current-benchmark',implementationIdentity);
 if(fresh.cases.some(c=>c.prepared?.status!=='experimental-synthetic-only'||c.prepared.operationallyQualified!==false||c.prepared.interval!==null||
  c.prepared.causalEffect!==null||c.assessment?.status!=='scored')||fresh.supportStress.some(c=>c.result?.status!=='abstained'||
  c.result.predictions!==null||c.result.operationallyQualified!==false))
  return unavailableExperimentalHiring('contradictory-experimental-qualification',implementationIdentity);
 const artifactIdentity=digest(fresh),p=fresh.protocol;
 const cases=fresh.cases.map(c=>({id:`${c.scenario}:${c.seed}`,scenario:c.scenario,seed:c.seed,status:'benchmarked',
  evaluationStatus:'retrospective-constructed-test-comparison',
  model:{identity:digest({artifactIdentity,scenario:c.scenario,seed:c.seed,model:c.prepared.model,selection:c.prepared.selection}),
   version:c.prepared.model.version,selectedMethod:c.prepared.selection.method,selectionReason:c.prepared.selection.reason},
  dates:{origin:p.origin,trainingStart:c.prepared.model.trainingStart,trainingEnd:c.prepared.model.trainingEnd,testMonths:[...p.testMonths],scoredThrough:p.scoreThrough},
  sample:{trainingCohorts:c.prepared.model.trainingCohorts,trainingOpenings:c.prepared.model.trainingOpenings,
   testCohorts:c.assessment.metrics.selected.cohorts,testOpenings:c.assessment.metrics.selected.openings},
  validation:structuredClone(c.prepared.selection.validation),
  baselineComparison:{...structuredClone(c.assessment.metrics),selectedMinusRecentBrier:c.assessment.selectedMinusRecentBrier,
   selectedMinusLogisticBrier:c.assessment.selectedMinusLogisticBrier},
  predictions:structuredClone(c.prepared.selected),interval:null}));
 const value={...base(implementationIdentity),status:'benchmarked',artifactIdentity,reasonCodes:[],
  benchmark:{protocolVersion:p.version,generatorVersion:fresh.generatorVersion,population:'Constructed aggregate opening cohorts',
   metric:'actual-start-within-90-days-fraction',scopeRelationship:'separate-fixture-not-plan-population',planBaselineEligible:false,
   cases,abstentions:fresh.supportStress.map(c=>({id:c.name,status:'abstained',reason:c.result.reason,predictions:null,interval:null})),
   supportLimits:{minimumCohorts:p.minimumCohorts,minimumCohortOpenings:p.minimumCohortOpenings,
    minimumTrainingStarts:p.minimumTrainingStarts,minimumTrainingNonStarts:p.minimumTrainingNonStarts},
   selectionRule:p.rule,uncertaintyReason:'No independent calibration; missing intervals remain unknown, not zero-width bounds.',
   limitations:[...fresh.limitations,'Historical synthetic test results do not match the plan population or establish a plan baseline.',
    'Selection loses to fixed logistic in four cases. All nine cases and seven abstentions are retained.']}};
 return freeze({...value,identity:digest(value)});
}
