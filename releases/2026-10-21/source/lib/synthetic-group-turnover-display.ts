import type artifact from './data/synthetic-group-turnover-consumer-v1.json';
type Display=typeof artifact;
export type GroupTurnoverDisplay={status:'current';data:Display}|{status:'unavailable'|'stale';message:string};
/** Fixed build-verified projection only. This does not assert live source freshness. */
export function resolveGroupTurnoverDisplay(candidate:unknown,expected:Display):GroupTurnoverDisplay{
 if(candidate==null||(typeof candidate==='object'&&'status' in candidate&&candidate.status==='unavailable'))return {status:'unavailable',message:'Synthetic group benchmark unavailable: verified evidence is missing. No results are shown.'};
 try{if(expected.status==='current'&&expected.operationallyQualified===false&&expected.realWorldPerformanceValidated===false&&expected.rateForecast===null&&expected.individualRisk===null&&expected.causalEffect===null&&/^[a-f0-9]{64}$/.test(expected.identity)&&JSON.stringify(candidate)===JSON.stringify(expected))return {status:'current',data:expected};}catch{/* Invalid projections never supply partial numeric results. */}
 return {status:'stale',message:'Synthetic group benchmark withheld: the projection does not match the build-verified evidence. No results are shown.'};
}
