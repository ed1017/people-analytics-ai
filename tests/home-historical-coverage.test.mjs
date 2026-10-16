import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack,normalizeHomePack,HOME_MAX_BYTES,HOME_MONTHLY_SOURCE_BYTES} from '../lib/home-pack.mjs';
import {selectHomeHistory} from '../lib/home-history-selection.ts';
import {scopedDashboardResponse} from '../lib/dashboard-scope.ts';
import {verifySolutionEvidence,SolutionEvidenceError} from '../lib/home-solution-grounding.mjs';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
const wrap=data=>({status:'loaded',data});
const months=Array.from({length:33},(_,i)=>{const date=new Date(Date.UTC(2024,i,1));return date.toISOString().slice(0,10)});
const end=month=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
function inputs(filters={country:'all',org:'all',level:'all'}){
 return {dashboard:wrap(scopedDashboardResponse({overview:{snapshot_date:'2026-09-30',headcount:100,fte:90},trend:months.map((m,i)=>({snapshot_date:end(m),headcount:i,fte:i*.9})),filter_options:{countries:[{value:"US",label:"United States"}],business_units:[],levels:[]}},filters)),
 'talent-acquisition':wrap({as_of:'2026-09-30',summary:{hires:999},monthly:months.map((month,i)=>({month,hires:i,applications:i*2,offers:i,interviewed_applications:i}))}),
 attrition:wrap({as_of:'2026-09-30',summary:{total_turnover_ytd_pct:8.4},trend:months.map((month,i)=>({month,total_exits:i,monthly_turnover_pct:i/100,monthly_voluntary_turnover_pct:i/200}))}),
 'survey-sentiment':wrap({as_of:'2026-09-30',summary:{engagement_respondents:10},engagement_trend:['2024-10','2025-10','2026-06'].map(m=>({survey_name:m+' Engagement',launch_date:m+'-01',close_date:m+'-21',denominator_snapshot_date:end(m+'-01'),respondents:10,eligible_population:20,avg_score:3,favorable_pct:50}))}),
 'career-growth-mobility':wrap({source:{first_recorded_date:'2024-03-01',last_recorded_date:'2026-08-17',total_recorded_events:180,recorded_months:30,latest_month_partial:true},composition:[{movement_type:'promotion',events:30,share_pct:16.67}],monthly:months.slice(2,-1).map((month,i)=>({month,events:6,promotions:1,lateral_moves:2,transfers:3,is_partial:i===29}))})};
}
const source=(pack,id)=>pack.sources.find(s=>s.id===id);
for(const [id,key,dateField] of [['W1','dashboard','snapshot_date'],['R1','talent-acquisition','month'],['A1','attrition','month']]){
 test(id+' preserves complete requested YTD and explicit history through normalization',()=>{
  for(const [question,first,last,count] of [['by month ytd','2026-01','2026-09',9],['January through June 2026','2026-01','2026-06',6],['2024-01-01 to 2026-09-30','2024-01','2026-09',33],['monthly history 2025','2025-01','2025-12',12],['2027-01-01 to 2027-09-30',null,null,0]]){
   const data=inputs(),pack=buildHomePack(data,'All workforce',question),s=source(pack,id),rows=id==='A1'?s.facts.monthly:s.facts.rows;
   assert.equal(rows.length,count,question);if(count){assert.equal(rows[0][dateField].slice(0,7),first);assert.equal(rows.at(-1)[dateField].slice(0,7),last)}
   assert.deepEqual(normalizeHomePack(pack),pack);assert.ok(Buffer.byteLength(JSON.stringify(pack))<=HOME_MAX_BYTES);assert.ok(Buffer.byteLength(JSON.stringify(s.facts))<=HOME_MONTHLY_SOURCE_BYTES);
   if(id==='A1')assert.equal(s.facts.total_turnover_ytd_pct,8.4);
   if(id==='R1')assert.equal(s.facts.hires,999,'summary is not substituted for monthly flows');
   assert.ok(data[key]);
  }
 });
}
test('survey history preserves dated events and their own populations, never fills monthly observations',()=>{
 const all=source(buildHomePack(inputs(),'All workforce','full history'),'S1').facts.rows;assert.equal(all.length,3);
 const rows=source(buildHomePack(inputs(),'All workforce','by month ytd'),'S1').facts.rows;assert.equal(rows.length,1);assert.equal(rows[0].close_date,'2026-06-21');assert.equal(rows[0].denominator_snapshot_date,'2026-06-30');assert.equal(rows[0].respondents,10);
 assert.equal(source(buildHomePack(inputs(),'All workforce','January through May 2026'),'S1').facts.rows.length,0);
});
test('mobility keeps all requested months, movement categories and partial latest-month flag',()=>{
 const s=source(buildHomePack(inputs(),'All workforce','monthly ytd'),'T4');assert.equal(s.facts.rows.length,8);assert.equal(s.facts.rows.at(-1).month,'2026-08-01');assert.equal(s.facts.rows.at(-1).is_partial,true);
 for(const row of s.facts.rows)assert.deepEqual([row.events,row.promotions,row.lateral_moves,row.transfers],[6,1,2,3]);
 assert.equal(source(buildHomePack(inputs(),'All workforce','all history'),'T4').facts.rows.length,30);
 assert.equal(source(buildHomePack(inputs(),'All workforce','2026-09-01 to 2026-09-30'),'T4').facts.rows.length,0);
});
test('date bounds are inclusive and validated; missing months and unknown metrics stay absent/unknown',()=>{
 const rows=[{date:'2026-01-31',value:0},{date:'2026-03-31',value:null},{date:'2026-02-30',value:999}];
 assert.deepEqual(selectHomeHistory(rows,'date','2026-01-31 to 2026-03-31','2026-09-30'),rows.slice(0,2));
 for(const q of ['2026-02-30 to 2026-03-31','September through January 2026','by month ytd 2025 2026'])assert.deepEqual(selectHomeHistory(rows,'date',q,'2026-09-30'),[]);
 assert.equal(selectHomeHistory(rows,'date','April 2026 compared to May 2026','2026-09-30'),null,'comparison is not a range');
 assert.deepEqual(selectHomeHistory(rows,'date','by month ytd'),[]);
});
test('selected workforce scope stays separate from unfiltered recruiting, exits, survey and mobility history',async()=>{
 const body=solutionRequest('by month ytd');body.filters={country:'US',org:'all',level:'all'};
 const data=inputs(body.filters);body.scope=data.dashboard.data.workforce_filter_scope.label;body.evidence=buildHomePack(data,body.scope,"by month ytd");
 body.scope=body.evidence.workforceScope;
 for(const id of ['A1','R1','S1','T4'])assert.match(source(body.evidence,id).scope,/Company-wide/);
 const ports={datasetToken:'legacy-v1:0',read:async key=>data[key]??{status:'unavailable'},now:()=>new Date('2026-10-16T00:00:00Z')};
 await verifySolutionEvidence(body,ports,new AbortController().signal);
 const forged=structuredClone(body);source(forged.evidence,'W1').facts.rows[0].headcount=9999;
 await assert.rejects(verifySolutionEvidence(forged,ports,new AbortController().signal),SolutionEvidenceError);
});
test('snapshot cost and other current domains do not acquire historical observations or invented monthly rates',()=>{
 const data={finance:wrap({as_of:'2026-09-30',current:{labor_cost_usd:1000},by_business_unit:[{org_code:'BU-A',org_name:'Alpha',labor_cost_usd:1000}]}),skills:wrap({as_of:'2026-09-30',summary:{current_workforce:100}}),bls:wrap({latest_date:'2026-09-01',metrics:[]})};
 const pack=buildHomePack(data,'US','Alpha cost monthly ytd');const f=source(pack,'F1');assert.equal(f.facts.labor_cost_usd,1000);assert.equal(f.facts.cost_period,null);assert.equal(f.facts.rows[0].org_name,'Alpha');assert.equal(f.facts.monthly,undefined);assert.match(f.scope,/country\/level filters not applied/);
 assert.equal(source(pack,'T1').facts.monthly,undefined);assert.equal(source(pack,'I2').facts.monthly,undefined);
});
test('read_evidence returns all normalized historical rows with no model or live calls',async()=>{
 const body=solutionRequest('Show recorded history without planning');body.evidence=buildHomePack(inputs(),body.scope,'by month ytd');
 const runtime=fixtureRuntime([{name:'read_evidence',args:{sourceIds:['W1','R1','A1','S1','T4']}},final('Recorded observations are supplied; survey observations are event-based.')]);
 await converseSolutions(body,runtime,new AbortController().signal);
 const output=JSON.parse(runtime.contexts[1].find(item=>item.type==='function_call_output').output);
 assert.deepEqual(output.map(s=>[s.id,s.id==='A1'?s.facts.monthly.length:s.facts.rows.length]),[['W1',9],['A1',9],['R1',9],['S1',1],['T4',8]]);
});

test('explicit endpoints override YTD shorthand across every observed historical type',()=>{
 for(const query of ['January through June 2026 YTD','YTD through June 2026','YTD through June','YTD as of 2026-06-30','Jan\u2013Jun 2026 YTD']){
  const pack=buildHomePack(inputs(),'All workforce',query);
  for(const id of ['W1','R1','A1','S1','T4']){
   const s=source(pack,id),rows=id==='A1'?s.facts.monthly:s.facts.rows;
   assert.equal(rows.length,id==='S1'?1:6,id+' '+query);
  }
 }
});
