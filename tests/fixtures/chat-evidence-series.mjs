import {buildHomePack} from '../../lib/home-pack.mjs';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
import {solutionRequest} from './home-solution-conversation.mjs';
export function chatSeriesFixture(question='Show headcount over time'){
 const request=solutionRequest(question),source=data=>({status:'loaded',data});
 const results={dashboard:source(scopedDashboardResponse({overview:{snapshot_date:'2026-09-30',headcount:105,fte:100,voluntary_turnover_ytd_pct:6.2},trend:[{snapshot_date:'2026-07-31',headcount:100},{snapshot_date:'2026-08-31',headcount:103},{snapshot_date:'2026-09-30',headcount:105}]},request.filters)),attrition:source({as_of:'2026-09-30',summary:{total_exits:9,voluntary_turnover_ytd_pct:6.2},trend:[{month:'2026-07-01',monthly_turnover_pct:1,monthly_voluntary_turnover_pct:.8},{month:'2026-08-01',monthly_turnover_pct:2,monthly_voluntary_turnover_pct:1.4},{month:'2026-09-01',monthly_turnover_pct:1.5,monthly_voluntary_turnover_pct:1}]}),'talent-acquisition':source({as_of:'2026-09-30',summary:{hires:9},monthly:[{month:'2026-07-01',hires:2},{month:'2026-08-01',hires:3},{month:'2026-09-01',hires:4}]})};
 request.evidence=buildHomePack(results,request.scope,question);return {request,results};
}
export function chartGrounding(evidence){return {datasetToken:'legacy-v1:0',packetSha256:'a'.repeat(64),sources:evidence.sources.map(source=>({id:source.id,status:source.status,scope:source.scope,asOf:source.date,basis:'database-backed-aggregate'}))};}
