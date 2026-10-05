// Constructed aggregate mechanics fixture, NOT a reconstruction of company data.
import {fixture} from './predictive-readiness.mjs';
const DAY=86400000;
export const hiringGeneratorVersion='aggregate-hiring-cohorts-v1';
export const hiringScenarios=['gradual-improvement','stationary','assessment-reversal'];
export function hiringCohortFixture(scenario='gradual-improvement',seed=17,cutoff='2025-07-01T00:00:00.000Z'){
 if(!hiringScenarios.includes(scenario)||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Unsupported constructed scenario/seed.');
 let state=seed>>>0;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 const input=fixture('hiring');input.cutoff=cutoff;input.records=[];
 Object.assign(input.manifest,{generatorVersion:hiringGeneratorVersion,populationVersion:'constructed-opening-cohorts-v1',
  sourceDefinitionVersion:'synthetic-all-openings-fixed-90-day-v1',metricVersion:'actual-start-by-day-90-v1'});
 input.manifest.completion={status:'complete',through:cutoff,observedAt:cutoff,
  populationVersion:input.manifest.populationVersion,evidenceRef:'constructed-full-followup-v1'};
 for(let month=0;month<51;month++){
  const opened=Date.UTC(2021,month,1),openedAt=new Date(opened).toISOString();
  const observedAt=new Date(opened+92*DAY).toISOString(),startedAt=new Date(opened+60*DAY).toISOString();
  const n=60+(month*17)%41;
  const logit=scenario==='stationary'?-.3:scenario==='assessment-reversal'&&month>=48?-1:-1.2+.035*month;
  const probability=1/(1+Math.exp(-logit));let started=0;
  // Bernoulli draws are immediately aggregated; no IDs or case-level predictors.
  for(let i=0;i<n;i++)if(random()<probability)started++;
  const cancelled=Math.floor((n-started)*.3),unresolved=n-started-cancelled;
  for(const [status,count] of [['filled',started],['cancelled',cancelled],['open',unresolved]]){
   if(!count)continue;
   input.records.push({recordKey:`cohort-${month}-${status}`,revision:1,supersedes:null,effectiveAt:openedAt,observedAt,
    populationVersion:input.manifest.populationVersion,metricVersion:input.manifest.metricVersion,
    value:{count,openedAt,acceptedAt:null,acceptedObservedAt:null,hireAt:null,plannedStartAt:null,
     actualStartAt:status==='filled'?startedAt:null,startObservedAt:status==='filled'?startedAt:null,
     capacityAt:null,capacityObservedAt:null,status,features:[{name:'opening-month',availableAt:openedAt}]}});
  }
 }
 const coverage={cohortCoverage:'all-openings',statusCoverageThrough:cutoff,observedAt:cutoff,
  populationVersion:input.manifest.populationVersion,sourceDefinitionVersion:input.manifest.sourceDefinitionVersion,
  evidenceRef:'constructed-complete-fixed-horizon-followup',observationBasis:'simulated'};
 return {input,coverage};
}
