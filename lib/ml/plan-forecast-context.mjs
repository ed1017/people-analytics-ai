// Offline sidecar only. The public runner re-executes the domain evidence adapters.
import {createHash} from 'node:crypto';
import {readBundleDraft,bundleInputKey} from '../home-bundle-reconciliation.ts';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const domains=['turnover','hiring','satisfaction'];

/** Internal composition, not an API for accepting caller-provided model output.
 * Current adapters qualify no operational forecasts. A future adapter requires a
 * reviewed metric, exposure, scope, evaluation and interval contract here first.
 */
export function composePlanForecastContext(rawDraft,domain,consumer,implementationIdentity){
 const draft=readBundleDraft(rawDraft);
 if(!draft||!domains.includes(domain))throw Error('A valid exact plan draft and supported domain are required.');
 if(consumer?.status!=='unqualified'||consumer.operationalForecast!==null||
    consumer.domains?.[domain]?.sourceTruthVerified!==false||consumer.domains[domain].operationalForecast!==null||
    consumer.domains[domain].status!=='unqualified'||consumer.evaluation?.operationallyValidated!==false||
    !/^[a-f0-9]{64}$/.test(implementationIdentity))throw Error('Unsupported evidence producer; qualification cannot be supplied by a caller.');
 const {identity,...body}=consumer;
 if(identity!==digest(body))throw Error('Evidence identity mismatch.');
 const source=consumer.domains[domain],input=draft.inputs,scope=input.scope;
 const preview=consumer.conditionalDemo?.preview;
 const reasons=[];
 if(domain!=='turnover')reasons.push('no-domain-forecast-reference');
 if(input.whatIf)reasons.push(input.whatIf.kind==='turnover'?'count-is-not-turnover-rate':'count-is-not-capacity');
 const measure=input.successMeasure;
 if(!measure||measure.name!=='Voluntary exits (count)'||measure.goal!==draft.binding.goal||
    measure.scopeKey!==JSON.stringify([scope.population.value,scope.startMonth.value,scope.months.value]))reasons.push('missing-or-mismatched-count-measure');
 if(!preview||preview.provenance.population!==scope.population.value||scope.businessUnit.value!==null||scope.jobProfile.value!==null)
  reasons.push('population-scope-mismatch');
 const points=preview?.conditional.points;
 if(!Array.isArray(points)||scope.startMonth.value!==points[0]?.month||scope.months.value!==points.length)
  reasons.push('horizon-mismatch');
 const eligible=reasons.length===0;
 const result={schemaVersion:1,status:eligible?'conditional-reference-only':'unavailable',domain,
  inputKey:bundleInputKey(draft),evidenceIdentity:consumer.identity,implementationIdentity,
  operationallyQualified:false,forecastBaseline:null,
  // Never replace entered baselines/targets, subtract a target from this demo,
  // or turn any difference into predicted avoided exits, savings or ROI.
  planAssumptions:{whatIf:structuredClone(input.whatIf??null),successMeasure:structuredClone(measure??null)},
  interventionEffect:{status:'not-estimated',estimate:null,interval:null,
   reason:'Plan targets are assumptions. Predictive backtests do not identify intervention effects.'},
  source:structuredClone(source),evaluation:structuredClone(consumer.evaluation),
  reference:eligible?{status:'conditional-retrospective-synthetic-demo',metric:'voluntary-exit-count',
   provenance:structuredClone(preview.provenance),method:preview.selectedMethod,methodVersion:preview.methodVersion,
   identities:structuredClone(preview.identities),evaluation:structuredClone(preview.evaluation),
   baselineComparisons:structuredClone(preview.methods),assumptions:structuredClone(preview.assumptions),
   points:structuredClone(points),total:preview.conditional.remainingTotal,
   uncertainty:structuredClone(preview.uncertainty),operationallyQualified:false}:null,
  reasonCodes:[...reasons,...source.reasonCodes],
  limitations:['Reference eligibility means matching conditional demo context, not a qualified forecast.',
   'Missing intervals remain unknown; no coverage, target probability or risk bound is inferred.',
   'This sidecar does not adopt a baseline, update a plan, or estimate effects.']};
 return freeze({...result,identity:digest(result)});
}

/** Compare the whole sidecar against a freshly regenerated current plan result. */
export function resolvePlanForecastContextCache(cached,fresh){
 try{if(JSON.stringify(cached)===JSON.stringify(fresh))return fresh;}catch{/* invalid cache */}
 return freeze({schemaVersion:1,status:'stale',forecastBaseline:null,reference:null,
  interventionEffect:{status:'not-estimated',estimate:null,interval:null},
  reasonCodes:['plan-or-evidence-or-implementation-changed'],currentIdentity:fresh.identity});
}
