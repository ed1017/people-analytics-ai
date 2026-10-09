// Invented aggregate for tests only; never imported by build.mjs or its runtime.
import {aggregateHash,projectAggregate,aggregateContract} from './aggregate.mjs';
export const syntheticAggregate={as_of:'2026-09-30',summary:{
 total_exits:120,voluntary_exits:90,involuntary_exits:25,regrettable_exits:20,retirements:5,
 total_turnover_ytd_pct:12,voluntary_turnover_ytd_pct:9,annualized_voluntary_turnover_pct:12,regrettable_share_of_voluntary_pct:22.22,
},trend:['2026-07-01','2026-08-01','2026-09-01'].map(month=>({month,total_exits:10,voluntary_exits:7,involuntary_exits:3,regrettable_exits:2,monthly_turnover_pct:1,monthly_voluntary_turnover_pct:0.7}))};
export const syntheticAggregateSha256=aggregateHash(projectAggregate(syntheticAggregate));
export const aggregateResponse=(raw=syntheticAggregate)=>Response.json(structuredClone(raw),{headers:{'x-workforce-dataset':aggregateContract.datasetToken}});
export const aggregateDispatch=async()=>aggregateResponse();
