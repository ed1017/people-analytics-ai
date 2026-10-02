import test from "node:test";
import assert from "node:assert/strict";
import {buildHomePack,normalizeHomePack,homeDefinitions,HOME_MAX_BYTES,HOME_SOURCE_BYTES,readHomeSource} from "../lib/home-pack.mjs";
import {employeeListeningEvidence,exitSurveyEvidence} from "../lib/employee-listening.ts";
import {overviewBriefingPrompt} from "../lib/overview-briefing.ts";
const wrap=data=>({status:"loaded",data});
const find=(pack,id)=>pack.sources.find(s=>s.id===id);
const survey={as_of:"2026-09-30",summary:{engagement_respondents:120,engagement_eligible_population:200,exit_respondents:15},engagement_trend:[{survey_code:"ENG-2026",respondents:120,launch_date:"2026-06-01",close_date:"2026-06-30",denominator_snapshot_date:"2026-06-30"}],exit_reasons:[{primary_reason:"Career",exits:5,pct_of_exit_responses:33.3}],exit_dimensions:[{survey_code:"EXIT",question_text:"Support?",dimension:"Support",separation_respondents:12,avg_score:3,favorable_pct:40}],exit_enps:{score:95},comments:["PRIVATE"]};
test("Home attempts every configured category and keeps source-specific scopes and dates",()=>{
 const sources=Object.fromEntries(homeDefinitions.map(d=>[d[1],wrap({as_of:"2026-09-30",summary:{[d[7].split(" ")[0]]:1}})]));
 sources.dashboard=wrap({overview:{snapshot_date:"2026-08-31",headcount:20,fte:18,open_positions:0},trend:[]});sources["survey-sentiment"]=wrap(survey);
 const pack=buildHomePack(sources,"Australia; Engineering; all levels");
 assert.equal(pack.sources.length,18);assert.equal(find(pack,"W1").date,"2026-08-31");assert.equal(find(pack,"W1").facts.open_positions,0);
 for(const id of ["T1","T2","T3","T4","T5","A1","R1","S1","S2","P1","P2","F1"])assert.match(find(pack,id).scope,/Company-wide/);
 assert.match(find(pack,"I2").scope,/US national/);assert.equal(find(pack,"P1").date,null);
 assert.equal(find(pack,"S1").facts.exit_respondents,undefined);assert.equal(find(pack,"S2").facts.exit_respondents,15);assert.equal(find(pack,"S2").page,"attrition");
 assert.doesNotMatch(JSON.stringify(pack),/PRIVATE|"exit_enps"|recruiter_name/);
});
test("partial failure distinguishes timeout, missing, zero and sampled rows; coverage survives server normalization",()=>{
 const p=buildHomePack({attrition:{status:"timeout"},skills:wrap({summary:{skills_with_demand:0},largest_gaps:Array.from({length:8},(_,i)=>({skill_name:i===7?"Leadership":"Skill"+i,requirement_met_pct:40}))})},"all","Leadership");
 assert.equal(find(p,"A1").status,"timeout");assert.equal(find(p,"A1").facts,null);assert.equal(find(p,"T1").facts.skills_with_demand,0);
 assert.equal(find(p,"T1").facts.rows[0].skill_name,"Leadership");assert.equal(find(p,"T1").coverage.rowsAvailable,8);assert.ok(find(p,"T1").coverage.detailTruncated);
 assert.deepEqual(normalizeHomePack(p),p);
});
test("server allowlists metadata/fields, bounds UTF-8 payload and caps text/rows",()=>{
 const malicious={workforceScope:"x".repeat(20000),sources:homeDefinitions.map(d=>({id:d[0],label:"INJECTED",scope:"Australia",status:"loaded",date:"junk",rowsAvailable:999,facts:{employee_name:"PRIVATE",headcount:Infinity,rows:Array.from({length:500},()=>({skill_name:"😀".repeat(10000),provider:"P".repeat(9000),requirement_met_pct:50,employee_name:"PRIVATE"}))}}))};
 const p=normalizeHomePack(malicious);assert.ok(new TextEncoder().encode(JSON.stringify(p)).length<=HOME_MAX_BYTES);
 assert.doesNotMatch(JSON.stringify(p),/PRIVATE|INJECTED/);
 for(const s of p.sources){assert.equal(s.date,null);if(s.facts){assert.ok(new TextEncoder().encode(JSON.stringify(s.facts)).length<=HOME_SOURCE_BYTES);assert.ok((s.facts.rows?.length??0)<=3);}}
});
test("invalid succession never leaks suppressed counts",()=>{
 const p=buildHomePack({"succession-coverage":wrap({as_of_date:"2026-09-30",small_cell_threshold:10,filled_critical_positions:5,positions_with_recorded_plan:3,plan_coverage_suppressed:true})},"all");
 assert.equal(find(p,"T5").facts,null);assert.equal(find(p,"T5").status,"invalid");
});
test("session cost totals are recomputed on the server and blank costs stay unknown",()=>{
 const session={options:[{goal:"Leadership",quote:{provider:"Custom",currency:"USD",basis:"person",capacity:"10",provenance:"user-provided"},inputs:{participants:"2",sessions:"3",hours:"2",fee:"100",additionalFees:"0",hourlyCost:"50"}}]};
 const p=buildHomePack({},"all","",session);let row=find(p,"D1").facts.rows[0];assert.equal(row.quoteTotal,600);assert.equal(row.total,1200);
 row.total=999999;assert.equal(find(normalizeHomePack(p),"D1").facts.rows[0].total,1200);
 session.options[0].inputs.hourlyCost="";row=find(buildHomePack({},"all","",session),"D1").facts.rows[0];assert.equal(row.total,null);assert.equal(row.timeCost,null);assert.equal(row.cashCost,600);
});
test("each source read times out even if fetch does not settle and handles failures independently",async()=>{
 const controller=new AbortController();const slow=await readHomeSource("/api/a",controller.signal,10,()=>new Promise(()=>{}));assert.equal(slow.status,"timeout");
 const failed=await readHomeSource("/api/a",controller.signal,50,async()=>({ok:false}));assert.equal(failed.status,"unavailable");
 const ok=await readHomeSource("/api/a",controller.signal,50,async()=>({ok:true,json:async()=>({count:0})}));assert.deepEqual(ok,{status:"loaded",data:{count:0}});
});
test("Employee Listening excludes exit and comments; Attrition preserves respondent questions and null/suppression",()=>{
 const listening=employeeListeningEvidence(survey),exit=exitSurveyEvidence(survey);
 assert.equal(listening.summary.exit_respondents,undefined);assert.equal(listening.exit_reasons,undefined);assert.equal(exit.respondents,15);assert.equal(exit.dimensions[0].question_text,"Support?");assert.equal(exit.dimensions[0].separation_respondents,12);assert.equal(exit.summary,undefined);
 assert.doesNotMatch(JSON.stringify(listening),/PRIVATE|"exit_enps"/);assert.deepEqual(exitSurveyEvidence(exit),exit);assert.deepEqual(employeeListeningEvidence(listening),listening);
 const hidden=exitSurveyEvidence({...survey,exit_reasons:[{primary_reason:"Hidden",exits:3,pct_of_exit_responses:20,suppressed:true}],exit_dimensions:[{survey_code:"EXIT",avg_score:null,favorable_pct:null,separation_respondents:null}]});
 assert.equal(hidden.reasons[0].exits,null);assert.equal(hidden.dimensions[0].avg_score,null);assert.match(hidden.period,/not supplied/);
});
test("cross-source prompt requires citations, separate populations and honest unavailable coverage",()=>{
 const prompt=overviewBriefingPrompt(buildHomePack({},"all"));for(const term of ["Cite exact source IDs","Coverage is partial","No tool calls","Do not combine denominators","S2 is the sole exit-survey block","market pay requires an explicitly supplied reference","not independently refreshed"])assert.ok(prompt.includes(term),term);
});

test("Canada goal surfaces existing country composition without changing the filtered snapshot",()=>{
 const results={dashboard:wrap({overview:{snapshot_date:"2026-09-30",headcount:10000,voluntary_turnover_ytd_pct:6.2}}),workforce:wrap({summary:{headcount:10000},business_units:[{org_name:"Operations",headcount:2500}],countries:[{country_name:"Canada",headcount:850,fte:820},{country_name:"US",headcount:5000}]})};
 const global=buildHomePack(results,"All countries; all business units; all levels","I want less turnover for Canada");
 assert.equal(find(global,"W1").facts.headcount,10000);assert.match(find(global,"W1").scope,/All countries/);assert.equal(find(global,"W2").facts.rows[0].country_name,"Canada");assert.equal(find(global,"W2").facts.rows[0].voluntary_turnover_ytd_pct,undefined);
 const selected=buildHomePack({...results,dashboard:wrap({overview:{snapshot_date:"2026-09-30",headcount:850,voluntary_turnover_ytd_pct:4.1}})},"Canada; all business units; all levels","Reduce turnover");assert.equal(find(selected,"W1").facts.voluntary_turnover_ytd_pct,4.1);assert.match(find(selected,"W1").scope,/Canada/);assert.match(find(selected,"A1").scope,/Company-wide/);
});
