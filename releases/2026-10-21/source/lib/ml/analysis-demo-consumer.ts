import {createHash} from 'node:crypto';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft,bundleInputKey,type BundleDraft} from '../home-bundle-reconciliation.ts';
import {composePlanForecastContext} from './plan-forecast-context.mjs';
import type {ExperimentalHiringResult} from './hiring-experimental-result';
import type {PlanAnalysisContext,TurnoverReference,SatisfactionAnalysisView,SatisfactionPayload} from './analysis-demo-types';

// Trusted fresh producer shape, not an external ingestion contract. Public payload types are explicit.
type WaveReport={status:string;example:SatisfactionAnalysisView;restrictedAssumptionExample:SatisfactionAnalysisView;
 blockedExamples:SatisfactionPayload['blockedExamples'];sourceEvidence:{domainEvaluation:{contractStatus:string}}};
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function freeze<T>(value:T):T{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export type SatisfactionDemo={kind:'descriptive-satisfaction-wave-change';status:'available';artifactIdentity:string;
 payload:SatisfactionPayload}
 |{kind:'descriptive-satisfaction-wave-change';status:'unavailable';artifactIdentity:null;payload:null;reasonCodes:string[]};
type DomainBase={planContext:PlanAnalysisContext;operationallyQualified:false;forecastBaseline:null;causalEffect:null;interval:null};
type Domain<K,P>=DomainBase&{kind:K;scopeRelationship:string}&(
 {status:'available';payload:P;reasonCodes:[]}|{status:'unavailable';payload:null;reasonCodes:string[]});
type Domains={turnover:Domain<'conditional-count-reference',TurnoverReference>;
 hiring:Domain<'experimental-hiring-benchmark',NonNullable<ExperimentalHiringResult['benchmark']>>;
 satisfaction:Domain<'descriptive-satisfaction-wave-change',Extract<SatisfactionDemo,{status:'available'}>['payload']>};
type Envelope={schemaVersion:1;kind:'offline-action-plan-analysis-demo';inputKey:string;implementationIdentity:string;identity:string;
 planAssumptions:{whatIf:BundleDraft['inputs']['whatIf']|null;successMeasure:BundleDraft['inputs']['successMeasure']|null};
 operationallyQualified:false;forecastBaseline:null;causalEffect:null;interval:null};
export type ActionPlanAnalysisDemo=Envelope&(
 {status:'current';domains:Domains;evidenceIdentities:{source:string;hiring:string;satisfaction:string|null};reasonCodes:[]}
 |{status:'stale'|'unavailable';domains:null;reasonCodes:string[]});
export function unavailableSatisfactionDemo(reason:string):SatisfactionDemo{
 return freeze({kind:'descriptive-satisfaction-wave-change',status:'unavailable',artifactIdentity:null,payload:null,reasonCodes:[reason]});
}
/** Internal projection: fresh is regenerated locally, never supplied as external qualification. */
export function projectSatisfactionDemo(cached:unknown,rawFresh:unknown):SatisfactionDemo{
 const fresh=rawFresh as WaveReport;
 if(fresh?.status!=='constructed-satisfaction-wave-change-report'||fresh.example?.status!=='descriptive-observed-wave-change'||
  fresh.example.evidenceKind!=='synthetic-mechanics-only'||fresh.example.operationallyQualified!==false||
 fresh.example.forecast!==null||fresh.example.causalEffect!==null||fresh.example.confidenceInterval!==null||
  fresh.example.waves.length!==3||fresh.example.changes.length!==2||fresh.sourceEvidence.domainEvaluation.contractStatus!=='blocked')
  return unavailableSatisfactionDemo('unsupported-satisfaction-report');
 if([fresh.example,fresh.restrictedAssumptionExample].some(a=>a?.schemaVersion!==1||a.methodVersion!=='satisfaction-wave-change-v1'||
  a.status!=='descriptive-observed-wave-change'||a.evidenceKind!=='synthetic-mechanics-only'||a.sourceTruthVerified!==false||a.operationallyQualified!==false||
  a.forecast!==null||a.causalEffect!==null||a.confidenceInterval!==null||a.withinPersonChange!==null||a.compositionEffect!==null||a.waves.length!==3||a.changes.length!==2)||
  fresh.blockedExamples.incompatibleInstrument.status!=='unavailable'||fresh.blockedExamples.suppressedWave.status!=='unavailable')
  return unavailableSatisfactionDemo('unsupported-satisfaction-report');
 let matches=false;try{matches=JSON.stringify(cached)===JSON.stringify(fresh);}catch{/* malformed artifact */}
 if(!matches)return unavailableSatisfactionDemo('satisfaction-artifact-stale');
 const analysis=(a:SatisfactionAnalysisView):SatisfactionAnalysisView=>({schemaVersion:a.schemaVersion,methodVersion:a.methodVersion,domain:a.domain,status:a.status,
  evidenceKind:a.evidenceKind,sourceTruthVerified:false,operationallyQualified:false,forecast:null,causalEffect:null,confidenceInterval:null,withinPersonChange:null,compositionEffect:null,
  assumptions:structuredClone(a.assumptions),waves:structuredClone(a.waves),changes:structuredClone(a.changes),reasonCodes:[...a.reasonCodes],limitations:[...a.limitations]});
 const blocked=(a:SatisfactionPayload['blockedExamples']['suppressedWave'])=>({status:a.status,reasonCodes:[...a.reasonCodes]});
 return freeze({kind:'descriptive-satisfaction-wave-change',status:'available',artifactIdentity:digest(fresh),payload:{
  methodVersion:fresh.example.methodVersion,analysis:analysis(fresh.example),restrictedAssumptionAnalysis:analysis(fresh.restrictedAssumptionExample),
  blockedExamples:{incompatibleInstrument:blocked(fresh.blockedExamples.incompatibleInstrument),suppressedWave:blocked(fresh.blockedExamples.suppressedWave)},
  baselineComparison:{status:'not-applicable',reason:'Descriptive adjacent-wave arithmetic; no predictive model benchmark.'}}});
}
function envelope(raw:unknown,implementationIdentity:string):Omit<Envelope,'identity'>{
 const draft=readBundleDraft(raw);if(!draft)throw Error('Valid exact Action Plan draft required.');
 if(!/^[a-f0-9]{64}$/.test(implementationIdentity))throw Error('Implementation identity required.');
 return {schemaVersion:1,kind:'offline-action-plan-analysis-demo',inputKey:bundleInputKey(draft),implementationIdentity,
  planAssumptions:{whatIf:structuredClone(draft.inputs.whatIf??null),successMeasure:structuredClone(draft.inputs.successMeasure??null)},
  operationallyQualified:false,forecastBaseline:null,causalEffect:null,interval:null};
}
export function unavailableAnalysisDemo(draft:unknown,implementationIdentity:string,reason:string):ActionPlanAnalysisDemo{
 const body={...envelope(draft,implementationIdentity),status:'unavailable' as const,domains:null,reasonCodes:[reason]};
 return freeze({...body,identity:digest(body)});
}
/** No adoption, mutation or cross-domain substitution. All source qualifications stay separate. */
export function composeActionPlanAnalysisDemo(draft:unknown,source:unknown,hiring:ExperimentalHiringResult,satisfaction:SatisfactionDemo,implementationIdentity:string):ActionPlanAnalysisDemo{
 const base=envelope(draft,implementationIdentity);
 const turnoverContext=composePlanForecastContext(draft,'turnover',source,implementationIdentity);
 // @ts-expect-error Existing JS optional null default is inferred narrowly; its runtime guard accepts this explicit experimental contract.
 const hiringContext=composePlanForecastContext(draft,'hiring',source,implementationIdentity,hiring);
 const satisfactionContext=composePlanForecastContext(draft,'satisfaction',source,implementationIdentity);
 const context=(raw:PlanAnalysisContext):PlanAnalysisContext=>({inputKey:raw.inputKey,evidenceIdentity:raw.evidenceIdentity,status:raw.status,
  source:{status:raw.source.status,contractStatus:raw.source.contractStatus,reasonCodes:[...raw.source.reasonCodes],missingInputs:[...raw.source.missingInputs]},reasonCodes:[...raw.reasonCodes]});
 const common={operationallyQualified:false as const,forecastBaseline:null,causalEffect:null,interval:null};
 const domains:Domains={
  turnover:{...common,kind:'conditional-count-reference',planContext:context(turnoverContext),scopeRelationship:'exact-count-scope-review-only',
   ...(turnoverContext.reference?{status:'available' as const,payload:structuredClone(turnoverContext.reference),reasonCodes:[] as []}:
    {status:'unavailable' as const,payload:null,reasonCodes:[...turnoverContext.reasonCodes]})},
  hiring:{...common,kind:'experimental-hiring-benchmark',planContext:context(hiringContext),scopeRelationship:'separate-fixture-not-plan-population',
   ...(hiring.status==='benchmarked'?{status:'available' as const,payload:structuredClone(hiring.benchmark),reasonCodes:[] as []}:
    {status:'unavailable' as const,payload:null,reasonCodes:[...hiring.reasonCodes]})},
  satisfaction:{...common,kind:'descriptive-satisfaction-wave-change',planContext:context(satisfactionContext),scopeRelationship:'separate-fixture-not-plan-population',
   ...(satisfaction.status==='available'?{status:'available' as const,payload:structuredClone(satisfaction.payload),reasonCodes:[] as []}:
    {status:'unavailable' as const,payload:null,reasonCodes:[...satisfaction.reasonCodes]})}};
 const body={...base,status:'current' as const,domains,evidenceIdentities:{source:domains.turnover.planContext.evidenceIdentity,hiring:hiring.identity,satisfaction:satisfaction.artifactIdentity},reasonCodes:[] as []};
 return freeze({...body,identity:digest(body)});
}
export function resolveAnalysisDemoCache(cached:unknown,fresh:ActionPlanAnalysisDemo):ActionPlanAnalysisDemo{
 try{if(JSON.stringify(cached)===JSON.stringify(fresh))return fresh;}catch{/* malformed cache */}
 const body={schemaVersion:fresh.schemaVersion,kind:fresh.kind,inputKey:fresh.inputKey,implementationIdentity:fresh.implementationIdentity,
  planAssumptions:structuredClone(fresh.planAssumptions),operationallyQualified:false as const,forecastBaseline:null,causalEffect:null,interval:null,
  status:'stale' as const,domains:null,reasonCodes:['plan-or-evidence-or-implementation-changed']};
 return freeze({...body,identity:digest(body)});
}
