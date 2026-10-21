import type {ActionPlanAnalysisDemo} from './analysis-demo-consumer';
/** Compact read-only review output. It has no baseline adoption or persistence operation. */
export function analysisReviewPacket(result:ActionPlanAnalysisDemo){
 const base={kind:'offline-analysis-review-packet' as const,status:result.status,inputKey:result.inputKey,identity:result.identity,
  planAssumptions:structuredClone(result.planAssumptions),operationallyQualified:false as const,forecastBaseline:null,causalEffect:null,interval:null};
 if(result.status!=='current')return {...base,domains:null,reasonCodes:[...result.reasonCodes]};
 const {turnover,hiring,satisfaction}=result.domains;
 const metadata=(d:typeof turnover|typeof hiring|typeof satisfaction)=>({kind:d.kind,status:d.status,source:structuredClone(d.planContext.source),
  scopeRelationship:d.scopeRelationship,reasonCodes:[...d.reasonCodes],planBaselineEligible:false as const});
 return {...base,domains:{
  turnover:{...metadata(turnover),analysis:turnover.status==='available'?{
   method:turnover.payload.method,methodVersion:turnover.payload.methodVersion,assumptions:[...turnover.payload.assumptions],
   points:structuredClone(turnover.payload.points),conditionalTotal:turnover.payload.total,evaluation:structuredClone(turnover.payload.evaluation),
   baselineComparison:turnover.payload.baselineComparisons.map(m=>({method:m.id,kind:m.kind,development:structuredClone(m.development.overall),assessment:structuredClone(m.assessment.overall)})),
   uncertainty:structuredClone(turnover.payload.uncertainty)}:null},
  hiring:{...metadata(hiring),analysis:hiring.status==='available'?{
   protocolVersion:hiring.payload.protocolVersion,generatorVersion:hiring.payload.generatorVersion,selectionRule:hiring.payload.selectionRule,
   cases:hiring.payload.cases.map(c=>({id:c.id,model:c.model,dates:c.dates,sample:c.sample,baselineComparison:c.baselineComparison})),
   abstentions:structuredClone(hiring.payload.abstentions),uncertaintyReason:hiring.payload.uncertaintyReason,limitations:[...hiring.payload.limitations]}:null},
  satisfaction:{...metadata(satisfaction),analysis:satisfaction.status==='available'?{
   methodVersion:satisfaction.payload.methodVersion,assumptions:structuredClone(satisfaction.payload.analysis.assumptions),
   waves:structuredClone(satisfaction.payload.analysis.waves),changes:structuredClone(satisfaction.payload.analysis.changes),
   baselineComparison:structuredClone(satisfaction.payload.baselineComparison),confidenceInterval:null,
   limitations:[...satisfaction.payload.analysis.limitations]}:null}}};
}
