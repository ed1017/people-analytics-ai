import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareSwpHeadcount, swpDemoDisclaimer} from '../experiments/swp-headcount/comparison.ts';
import {monthlyHeadcountFlow} from '../lib/monthly-headcount-flow.ts';
import {calculateHeadcountProjection} from '../lib/home-solution-projection.ts';
const dev = JSON.parse(readFileSync(new URL('../experiments/swp-headcount/development-history.json', import.meta.url)));
const holdout = JSON.parse(readFileSync(new URL('../experiments/swp-headcount/holdout.json', import.meta.url)));
const history = {...dev, points:[...dev.points, ...holdout.points]};
const flows = (hires, departures) => ({basis:'user-entered',monthlyHires:hires,monthlyDepartures:departures});

test('reviewed baseline extends the full history across six explicitly dated month ends', () => {
  const result = compareSwpHeadcount(history,null);
  assert.equal(result.asOf,'2026-09-30');assert.equal(result.opening,10000);
  assert.deepEqual(result.points.map(p=>p.month),['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03']);
  assert.deepEqual(result.points.map(p=>p.baseline),[10050,10100,10150,10200,10250,10300]);
  assert.ok(result.points.every(p=>p.scenario===null&&p.difference===null));
  assert.equal(result.disclaimer,swpDemoDisclaimer);assert.equal(result.cost,null);assert.equal(result.interval,null);assert.equal(result.operationalForecastAvailable,false);
});
test('user flows replace the path from the same opening, never add to baseline growth', () => {
  const original=JSON.stringify(history), input=flows(100,60), result=compareSwpHeadcount(history,input);
  assert.deepEqual(result.points.map(p=>p.scenario),[10040,10080,10120,10160,10200,10240]);
  assert.deepEqual(result.points.map(p=>p.difference),[-10,-20,-30,-40,-50,-60]);
  assert.equal(JSON.stringify(history),original);input.monthlyHires=999;assert.equal(result.assumptions.monthlyHires,100);
  assert.deepEqual(compareSwpHeadcount(history,flows(0,0)).points.map(p=>p.scenario),Array(6).fill(10000));
  assert.equal(compareSwpHeadcount(history,flows(100,150)).points.at(-1).scenario,9700);
});
test('missing, negative, fractional, nonfinite and infeasible flows fail instead of inventing zero', () => {
  for(const value of [undefined,null,NaN,Infinity,-1,0.1,'10',1000001]) assert.throws(()=>compareSwpHeadcount(history,flows(value,0)));
  assert.throws(()=>compareSwpHeadcount(history,{...flows(10,0),basis:'model-proposed'}));
  assert.throws(()=>compareSwpHeadcount(history,{...flows(10,0),monthlyCost:100}));
  assert.throws(()=>compareSwpHeadcount(history,flows(0,10000)),/infeasible/);
});
test('subgroups, costs, unqualified population, altered dates and unreviewed sources are blocked', () => {
  for(const mutate of [h=>{h.scope.dimension='cost-center';},h=>{h.metric.kind='labor-cost';},h=>{h.sourceVersion='other';},h=>{h.points.pop();},h=>{h.points[1].month='2024-03';},h=>{h.points[0].value+=1;},h=>{h.populationReconciliation.status='unverified';}]) {
    const modified=structuredClone(history);mutate(modified);assert.throws(()=>compareSwpHeadcount(modified,null));
  }
});
test('shared flow arithmetic preserves scoped transfers, date rollover, decimals, and infeasibility rejection', () => {
  const p=monthlyHeadcountFlow({asOf:'2026-12-31',opening:100.5,months:2,hires:10,exits:3,transfersIn:2,transfersOut:1});
  assert.deepEqual(p.map(x=>[x.month,x.opening,x.headcount,x.reference]),[['2027-01-01',100.5,108.5,null],['2027-02-01',108.5,116.5,null]]);
  assert.throws(()=>monthlyHeadcountFlow({asOf:'2026-02-30',opening:10,months:1,hires:0,exits:0,transfersIn:0,transfersOut:0}));
});
test('existing conversation monthly-flow engine still returns the same resolved flows and blocks company transfers', async () => {
  const spec={id:'regression',base:null,method:'monthly_flow',months:6,changes:[['monthly_hires',100],['monthly_exits',60]].map(([field,value])=>({field,value,kind:'literal',basis:'user',turnId:'user-1',interpretation:'User supplied monthly count.'}))};
  const inputs={asOf:'2026-09-30',opening:10000,filters:{country:'all',org:'all',level:'all'},scope:'Company-wide',relations:['fixture'],datasetVersion:null,defaults:null,baseline:[]};
  const result=await calculateHeadcountProjection(spec,inputs,[],['user-1']);
  assert.deepEqual(result.points,monthlyHeadcountFlow({asOf:inputs.asOf,opening:10000,months:6,hires:100,exits:60,transfersIn:0,transfersOut:0}));
  const transfer={field:'monthly_transfers_in',value:1,kind:'literal',basis:'user',turnId:'user-1',interpretation:'Transfer'};
  await assert.rejects(calculateHeadcountProjection({...spec,changes:[...spec.changes,transfer]},inputs,[],['user-1']),/Internal transfers/);
});

const costRate = amount => ({basis:'user-entered',currency:'USD',unit:'per-employee-month',amount});
test('explicit monthly USD rate yields endpoint run-rates with separate provenance and cent arithmetic',()=>{
 const assumption=costRate(12.34), result=compareSwpHeadcount(history,flows(100,60),assumption);
 assert.deepEqual(result.cost.points.at(-1),{month:'2027-03',baseline:127102,scenario:126361.6,difference:-740.4});
 assert.equal(result.cost.unit,'USD/month');assert.equal(result.cost.basis,'user-assumption-run-rate');
 assert.equal(result.points.at(-1).scenario,10240);assert.equal(result.operationalForecastAvailable,false);
 assert.equal(Object.hasOwn(result.cost,'total'),false);assumption.amount=0;assert.equal(result.cost.assumption.amount,12.34);
});
test('blank cost remains unknown, explicit zero remains zero, baseline-only does not invent scenario cost',()=>{
 assert.equal(compareSwpHeadcount(history,flows(0,0),null).cost,null);
 assert.ok(compareSwpHeadcount(history,flows(0,0),costRate(0)).cost.points.every(p=>p.baseline===0&&p.scenario===0&&p.difference===0));
 assert.ok(compareSwpHeadcount(history,null,costRate(1.01)).cost.points.every(p=>p.scenario===null&&p.difference===null));
 assert.equal(compareSwpHeadcount(history,flows(100,0),costRate(1.01)).cost.points.at(-1).difference,303);
});
test('invalid amount, unit, currency, provenance and unsafe products are rejected without inference',()=>{
 for(const amount of [undefined,null,'12',NaN,Infinity,-1,1.001,1e-10,1.0000000001,1e15])assert.throws(()=>compareSwpHeadcount(history,flows(0,0),costRate(amount)));
 for(const override of [{currency:'EUR'},{unit:'per-employee-year'},{unit:'per-fte-month'},{basis:'observed'},{benefits:0}])assert.throws(()=>compareSwpHeadcount(history,flows(0,0),{...costRate(12),...override}));
});
