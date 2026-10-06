import artifact from './data/synthetic-pay-demo-v1.json' with {type:'json'};
export type SyntheticPayDemo=typeof artifact;
/** The static, build-verified artifact is the only accepted numeric source. */
export function resolveSyntheticPayDemo(candidate:unknown=artifact){
 try{if(JSON.stringify(candidate)===JSON.stringify(artifact)&&artifact.status==='verified'&&!artifact.evidence.rowRecordsPublished&&!artifact.evidence.overallTotalsPublished&&!artifact.evidence.operationallyQualified)return {status:'ready' as const,data:artifact};}catch{}
 return {status:'unavailable' as const,message:'Synthetic pay demo unavailable: its aggregate artifact is missing or differs from the verified release.'};
}
/** Only one already-published fixed cohort, never a new marginal or recomputed subtotal. */
export function selectSyntheticPayCohort(data:SyntheticPayDemo,job:string,level:string,location:string){return data.cohorts.find(row=>row.job===job&&row.level===level&&row.location===location)??null;}
