import artifact from './data/synthetic-career-demo-v1.json' with {type:'json'};
export type SyntheticCareerDemo=typeof artifact;
export function resolveSyntheticCareerDemo(candidate:unknown=artifact){
 try{if(JSON.stringify(candidate)===JSON.stringify(artifact)&&artifact.status==='verified'&&!artifact.evidence.rowRecordsPublished&&!artifact.evidence.overallTotalsPublished&&!artifact.evidence.operationallyQualified)return {status:'ready' as const,data:artifact};}catch{}
 return {status:'unavailable' as const,message:'Synthetic career demo unavailable: the aggregate artifact differs from the verified release.'};
}
export function selectSyntheticCareerCohort(data:SyntheticCareerDemo,department:string,level:string){return data.cohorts.find(row=>row.department===department&&row.level===level)??null;}
