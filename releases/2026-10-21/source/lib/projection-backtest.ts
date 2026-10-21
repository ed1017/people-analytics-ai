import rankings from './data/projection-backtest-ranking-v1.json' with {type:'json'};
import simulated from './data/synthetic-domain-demo-v1.json' with {type:'json'};
import stock from './data/synthetic-ta-calibrated-v2.json' with {type:'json'};
export type RankedDomain='turnover'|'satisfaction'|'hiring';
export function resolveProjectionBacktest(domain:RankedDomain,candidate:unknown){
 try{if(JSON.stringify(candidate)!==JSON.stringify(domain==='hiring'?stock:simulated))return null;}catch{return null;}
 const result=rankings.domains[domain];
 return result.status==='ranked'&&result.ranked.length===3?result:null;
}
export function projectionBacktestPrompt(domain:RankedDomain,candidate:unknown){
 const result=resolveProjectionBacktest(domain,candidate);
 if(!result)return 'Comparable historical backtest ranking unavailable for this source. Do not invent scores or a best method.';
 return `3 methods ranked by backtest. ${result.scope} Lower MAE is better, measured in ${result.unit}. ${result.eligibleOrigins} common historical origins, ${result.scoredTargets} origin-target pairs; labels available by ${result.cutoff}. `+JSON.stringify(result.ranked.map(row=>({method:row.method,rank:row.rank,mae:row.mae})))+'. Current forecasts are unchanged. This past ordering does not establish future accuracy or an operational winner.';
}
export function projectionBacktestSummary(domain:RankedDomain,candidate:unknown){
 const result=resolveProjectionBacktest(domain,candidate);
 if(!result)return 'Comparable historical backtest ranking is unavailable for this source.';
 return `3 methods ranked by backtest: lower historical MAE in ${result.unit}, across ${result.eligibleOrigins} common origins and ${result.scoredTargets} origin-target pairs. This order compares only the three existing methods on the same versioned synthetic history. No broader model search or real-workforce validation. See Details on the corresponding page for scores, dates and exclusions; this is not a future-accuracy guarantee or an operational recommendation.`;
}
