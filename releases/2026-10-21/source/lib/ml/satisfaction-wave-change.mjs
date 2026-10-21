// Descriptive aggregate arithmetic only; no fitted model, imputed history or causal effect.
import {satisfactionDomainEvidence} from './satisfaction-domain-adapter.mjs';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const satisfactionSensitivityAssumptions=freeze({nonrespondentMeanRange:[0,1],constantNonrespondentMeans:[0,.5,1],
 populationInterpretation:'repeated-cross-section-not-matched'});
function validAssumptions(a){
 try{
 const array=value=>Array.isArray(value)&&value.length<=5&&Object.getPrototypeOf(value)===Array.prototype&&
  Reflect.ownKeys(value).length===value.length+1&&Array.from({length:value.length},(_,i)=>Object.getOwnPropertyDescriptor(value,i)).every(d=>d&&'value' in d&&d.enumerable);
 if(!a||Object.getPrototypeOf(a)!==Object.prototype||Reflect.ownKeys(a).length!==3||Reflect.ownKeys(a).some(key=>{const d=Object.getOwnPropertyDescriptor(a,key);return !d||!('value' in d)||!d.enumerable;}))return false;
 return Object.keys(a).sort().join(',')===
  'constantNonrespondentMeans,nonrespondentMeanRange,populationInterpretation'&&a.populationInterpretation==='repeated-cross-section-not-matched'&&
  array(a.nonrespondentMeanRange)&&a.nonrespondentMeanRange.length===2&&
  a.nonrespondentMeanRange.every(x=>Number.isFinite(x)&&x>=0&&x<=1)&&a.nonrespondentMeanRange[0]<=a.nonrespondentMeanRange[1]&&
  array(a.constantNonrespondentMeans)&&a.constantNonrespondentMeans.length<=5&&
  new Set(a.constantNonrespondentMeans).size===a.constantNonrespondentMeans.length&&
  a.constantNonrespondentMeans.every(x=>Number.isFinite(x)&&x>=a.nonrespondentMeanRange[0]&&x<=a.nonrespondentMeanRange[1]);
 }catch{return false;}
}
/** Reuses raw source-contract validation and as-of selection. Never accepts a qualification flag.
 * Scores are mean respondent favorable-answer shares, not percent satisfied employees.
 */
export function satisfactionWaveChange(contract,scoreDefinition=null,assumptions=satisfactionSensitivityAssumptions){
 const evidence=satisfactionDomainEvidence(contract,scoreDefinition),reasons=[...evidence.missingInputs];
 const assumptionsValid=validAssumptions(assumptions);
 if(!assumptionsValid)reasons.push('unsupported-sensitivity-assumptions');
 if(evidence.contractStatus==='passed'&&evidence.waves.length<2)reasons.push('two-comparable-observed-waves-required');
 if(evidence.waves.length>3)reasons.push('more-than-three-waves-outside-bounded-analysis');
 const base={schemaVersion:1,methodVersion:'satisfaction-wave-change-v1',domain:'satisfaction',
  evidenceKind:evidence.evidenceKind,sourceTruthVerified:false,operationallyQualified:false,
  forecast:null,causalEffect:null,confidenceInterval:null,withinPersonChange:null,compositionEffect:null,
  source:evidence,assumptions:assumptionsValid?structuredClone(assumptions):null,
  limitations:[...evidence.limitations,
   'Observed cross-sectional score and coverage changes do not identify within-person, workforce-composition or causal effects.',
   'Nonresponse bounds assume each eligible person has a comparable latent favorable-answer share in [0,1].',
   'Range bounds allow a different nonrespondent mean in each wave; fixed-mean scenarios explicitly assume the same mean across waves.',
   'These are arithmetic identification/sensitivity bounds, not sampling confidence intervals or forecasts.',
   'Missing-item scoring remains conditional on answered items; this calculation does not resolve item-level missingness.',
   'No monthly interpolation, annualization, trend fit, independent-wave sample claim or person-level estimate.']};
 if(reasons.length)return freeze({...base,status:'unavailable',reasonCodes:[...new Set(reasons)],waves:[],changes:[]});
 const [low,high]=assumptions.nonrespondentMeanRange;
 const waves=evidence.waves.map(w=>{
  const m=w.scorePct/100,r=w.respondents/w.eligible,contribution=r*m;
  return {...w,nonrespondents:w.eligible-w.respondents,respondentContributionPct:100*contribution,
   nonresponseBounds:{kind:'assumption-dependent-identification-bounds',lowerPct:100*(contribution+(1-r)*low),upperPct:100*(contribution+(1-r)*high)},
   fixedMeanScenarios:assumptions.constantNonrespondentMeans.map(u=>({nonrespondentMean:u,eligibleMeanPct:100*(contribution+(1-r)*u)}))};
 });
 const changes=waves.slice(1).map((after,i)=>{
  const before=waves[i],m0=before.scorePct/100,m1=after.scorePct/100,r0=before.respondents/before.eligible,r1=after.respondents/after.eligible;
  const scoreTerm=100*(r0+r1)/2*(m1-m0),coverageTerm=100*(m0+m1)/2*(r1-r0);
  return {from:before.waveId,to:after.waveId,fromDate:before.effectiveAt,toDate:after.effectiveAt,
   elapsedDays:(Date.parse(after.effectiveAt)-Date.parse(before.effectiveAt))/86400000,
   respondentScoreChangePp:after.scorePct-before.scorePct,responseRateChangePp:100*(r1-r0),
   respondentCountChange:after.respondents-before.respondents,eligibleCountChange:after.eligible-before.eligible,
   respondentContributionChangePp:after.respondentContributionPct-before.respondentContributionPct,
   decomposition:{method:'symmetric-product-identity',scoreTermPp:scoreTerm,responseRateTermPp:coverageTerm,
    reconciledChangePp:scoreTerm+coverageTerm,interpretation:'Arithmetic terms in change of response-rate times respondent score; not effects.'},
   nonresponseChangeBounds:{kind:'assumption-dependent-identification-bounds',
    lowerPp:after.nonresponseBounds.lowerPct-before.nonresponseBounds.upperPct,
    upperPp:after.nonresponseBounds.upperPct-before.nonresponseBounds.lowerPct},
   fixedMeanScenarios:assumptions.constantNonrespondentMeans.map(u=>({nonrespondentMean:u,
    eligibleMeanChangePp:100*(r1*m1+(1-r1)*u-r0*m0-(1-r0)*u),
    scoreTermPp:scoreTerm,responseRateTermPp:100*((m0+m1)/2-u)*(r1-r0)}))};
 });
 return freeze({...base,status:'descriptive-observed-wave-change',reasonCodes:[],waves,changes});
}
