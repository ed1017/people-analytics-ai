import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildFowLabModel,getFowLabView} from '../lib/fow-lab.ts';
// Authored aggregate fixture, not a private employee export or live model result.
const fixture=()=>{
 const exposure={automate_share_hc:.4,augment_share_hc:.6,exposed_share_hc:1,exposure_score_hc:.7,automate_share_cost:.4,augment_share_cost:.6,exposed_share_cost:1,exposure_score_cost:.7};
 const base={dataset_id:'builtin',suppressed:false,headcount:20,...exposure};
 return {dataset:{id:'builtin',name:'Lab source',asOf:'2026-09-30',headcount:20,scopeLabel:'Lab job architecture'},meta:{version:'v1',sourceCommit:'abc123',exportedAt:'2026-10-28T00:00:00Z'},
 functions:[{...base,function_name:null,is_total:true},{...base,function_name:'Finance',is_total:false}],
 adoption:[{...base,level:'company',function_name:null,family_name:null,weekly_active_users:4,licensed_employees:10,weekly_active_rate:.2,weekly_active_rate_licensed:.4,week_start:'2026-09-21'},{...base,level:'family',function_name:'Finance',family_name:'Analysis',weekly_active_users:4,licensed_employees:10,weekly_active_rate:.2,weekly_active_rate_licensed:.4,week_start:'2026-09-21'}],
 jobs:[{dataset_id:'builtin',job_key:'ROLE-A',title:'Analyst',function_name:'Finance',family_name:'Analysis',suppressed:false,headcount:20,labor_cost_usd:2000000,tasks_total:2,tasks_scored:2,score_coverage:1,exposure_score:.7,exposed_share:1,automate_share:.4,augment_share:.6}],
 taskDetails:[{job_key:'ROLE-A',task_id:1,time_share:.4,task_text:'Task one',label:'automate',exposure:1,run_id:'r1'},{job_key:'ROLE-A',task_id:2,time_share:.6,task_text:'Task two',label:'augment',exposure:.5,run_id:'r1'}],
 scoringRuns:[{run_id:'r1',status:'succeeded',rubric_version:'v1',prompt_sha:'hash1',model:'model'}],
 register:[{use_case_id:'case1',name:'Screening',risk_tier:'high',owner:'HR',status:'pilot',is_overdue:true,bias_audit_due:false,next_review_date:'2026-09-01'}],
 actions:[{dataset_id:'builtin',scope_key:'Finance',move:'reskill',text:'Review training.',created_at:'2026-10-01T00:00:00Z',evidence:[{view:'v_function_exposure',key:{dataset_id:'builtin',is_total:false,function_name:'Finance'},field:'exposure_score_cost',value:.7,kind:'metric'},{view:'v_exposure_adoption',key:{dataset_id:'builtin',level:'company',function_name:null,family_name:null},field:'weekly_active_rate',value:.2,kind:'metric'}]}],
 validation:{sampleSize:100,reviewed:50,agreement:.8,weightedAgreement:.75,kappa:.6,stability:.9,retestTasks:50}};
};
test('read-only complete evidence distinguishes score/share and adoption denominators',()=>{
 const source=fixture(), before=JSON.stringify(source), m=buildFowLabModel(source),v=getFowLabView(m,{functionName:'Finance'});
 assert.equal(m.jobs[0].score,.7);assert.equal(m.jobs[0].exposedShare,1);assert.equal(m.jobs[0].coverage,'complete');assert.equal(m.jobs[0].provenance,'consistent');
 assert.equal(m.adoption.cost[0].activeRate,.2);assert.equal(m.adoption.cost[0].licensedActiveRate,.4);assert.equal(v.selected.name,'Finance');assert.equal(v.actions[0].state,'matched');assert.equal(JSON.stringify(source),before);
 assert.equal('capacity' in m.jobs[0],false);assert.equal(m.validation.complete,false);
});
test('partial/unscored jobs never become zero exposure or complete company score',()=>{
 for(const missing of [1,2]){const s=fixture();for(const t of s.taskDetails.slice(0,missing)){t.label=null;t.exposure=null;t.run_id=null;}
 const m=buildFowLabModel(s);assert.equal(m.jobs[0].score,null);assert.equal(m.functions.cost[0].score,null);assert.equal(m.jobs[0].coverage,missing===2?'unavailable':'partial');assert.ok(m.issues.length);}
 const s=fixture();s.jobs[0].tasks_total=3;assert.equal(buildFowLabModel(s).jobs[0].coverage,'partial');
});
test('mixed runs/rubrics and missing/failed provenance cannot masquerade as consistent',()=>{
 const s=fixture();s.scoringRuns.push({...s.scoringRuns[0],run_id:'r2',rubric_version:'v2'});s.taskDetails[1].run_id='r2';
 let m=buildFowLabModel(s);assert.equal(m.jobs[0].provenance,'mixed');assert.equal(m.jobs[0].score,null);assert.equal(m.adoption.cost[0].score,null);
 s.scoringRuns[1].status='failed';m=buildFowLabModel(s);assert.equal(m.jobs[0].provenance,'unknown');
});
test('malformed numbers, dates, label scores, totals, duplicates and scope fail closed',()=>{
 const mutations=[s=>s.jobs[0].headcount='',s=>s.jobs[0].headcount=-1,s=>s.jobs[0].headcount=Infinity,s=>s.jobs[0].exposure_score=1.1,s=>s.jobs[0].exposure_score=.2,s=>s.taskDetails[0].exposure=.5,s=>s.taskDetails.push({...s.taskDetails[0]}),s=>s.jobs[0].dataset_id='other',s=>s.meta.exportedAt='unknown',s=>s.adoption[0].weekly_active_rate=.9,s=>s.validation.reviewed=101];
 for(const mutate of mutations){const s=fixture();mutate(s);assert.throws(()=>buildFowLabModel(s));}
 const s=fixture();s.jobs[0].headcount='20';assert.equal(buildFowLabModel(s).jobs[0].headcount,20);
});
test('suppressed employee values remain hidden while generic task exposure can remain',()=>{
 const s=fixture();s.jobs[0].headcount=9;s.jobs[0].suppressed=true;s.functions.forEach(r=>{r.suppressed=true;r.headcount=null;});s.adoption.forEach(r=>r.suppressed=true);
 const m=buildFowLabModel(s);assert.equal(m.jobs[0].headcount,null);assert.equal(m.jobs[0].cost,null);assert.equal(m.jobs[0].score,.7);assert.equal(m.functions.cost[0].score,null);assert.equal(m.adoption.cost[0].active,null);assert.equal(m.actions[0].state,'unverifiable');
});
test('missing weights/metrics are unknown, not zero; invalid filters do not leak full scope',()=>{
 const s=fixture();s.jobs[0].labor_cost_usd=null;s.functions.forEach(r=>{r.exposure_score_cost=null;r.exposed_share_cost=null;r.automate_share_cost=null;r.augment_share_cost=null;});
 const m=buildFowLabModel(s);assert.equal(m.jobs[0].cost,null);assert.equal(getFowLabView(m).selected.score,null);assert.equal(getFowLabView(m,{weighting:'headcount'}).selected.score,.7);assert.throws(()=>getFowLabView(m,{functionName:'Unknown'}));
});
test('changed evidence is stale, missing or duplicate facts cannot validate an action',()=>{
 let s=fixture();s.actions[0].evidence[0].value=.8;assert.equal(buildFowLabModel(s).actions[0].state,'changed');
 s=fixture();s.actions[0].evidence[0].field='missing';assert.equal(buildFowLabModel(s).actions[0].state,'unverifiable');
 s=fixture();s.actions[0].evidence[1]=structuredClone(s.actions[0].evidence[0]);assert.equal(buildFowLabModel(s).actions[0].state,'unverifiable');
 s=fixture();s.actions[0].evidence.push({view:'v_course_catalog',key:{course_code:'C1'},field:'title',value:'Course',kind:'course'});assert.equal(buildFowLabModel(s).actions[0].state,'unverifiable');
 s.evidenceViews={v_course_catalog:[{course_code:'C1',title:'Course'}]};assert.equal(buildFowLabModel(s).actions[0].state,'matched');
});
test('recommendations use newest batch and selected function; stored original remains intact',()=>{
 const s=fixture();s.actions.push({...structuredClone(s.actions[0]),created_at:'2026-10-02T00:00:00Z',text:'New review.'});const m=buildFowLabModel(s);assert.equal(m.actions.length,2);assert.equal(getFowLabView(m).actions.length,1);assert.equal(getFowLabView(m).actions[0].text,'New review.');
});
test('enable-first uses strict company threshold consistently and no invented null benchmark',()=>{
 const s=fixture(),m=buildFowLabModel(s);assert.equal(getFowLabView(m).enableFirst.length,0);
 m.adoption.cost[1].score=.8;m.adoption.cost[1].activeRate=.1;assert.equal(getFowLabView(m).enableFirst.length,1);
 m.adoption.cost[0].score=null;assert.equal(getFowLabView(m).enableFirst.length,0);
});
test('validation infrastructure does not imply completed review or retest',()=>{
 const s=fixture();s.validation={sampleSize:100,reviewed:0,agreement:.99,stability:1,retestTasks:0};const m=buildFowLabModel(s);assert.equal(m.validation.complete,false);assert.equal(m.validation.agreement,null);assert.equal(m.validation.stability,null);
 s.validation=null;assert.equal(buildFowLabModel(s).validation.reviewed,null);
});
test('native four-decimal adoption rates reconcile, materially different rates fail',()=>{
 const s=fixture();for(const r of s.adoption){r.weekly_active_users=3;r.licensed_employees=7;r.weekly_active_rate=.15;r.weekly_active_rate_licensed=.4286;}
 assert.equal(buildFowLabModel(s).adoption.cost[0].licensedActiveRate,.4286);
 s.adoption[0].weekly_active_rate_licensed=.429;assert.throws(()=>buildFowLabModel(s),/denominator/);
});
test('versioned authorized aggregate export reconciles without DB or model requests',()=>{
 const s=JSON.parse(fs.readFileSync(new URL('../data/fow-lab-snapshot.json',import.meta.url),'utf8')),m=buildFowLabModel(s);
 assert.equal(m.dataset.headcount,10000);assert.equal(m.jobs.length,50);assert.equal(m.functions.cost.filter(r=>!r.total).length,15);
 assert.equal(m.jobs.reduce((n,j)=>n+j.tasks.length,0),945);assert.equal(m.issues.length,0);
 assert.equal(m.functions.cost.find(r=>r.total).score,s.functions.find(r=>r.is_total).exposure_score_cost);
 assert.equal(m.actions.length,14);assert.ok(m.actions.every(a=>a.state==='matched'&&a.basis==='exported-snapshot'&&a.createdAt.startsWith('2026-10-13')));
 assert.equal(m.validation.reviewed,33);assert.equal(m.validation.sampleSize,100);assert.equal(m.validation.complete,false);assert.equal(m.validation.stability,null);
 assert.equal(m.dataset.asOf,'2026-09-30');assert.ok(m.adoption.cost.every(a=>a.week==='2026-09-21'));
});
