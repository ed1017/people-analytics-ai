import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkforceSolution,emptySolutionInputs,currentSolutionVersion,reviseWorkforceSolution,attachSolutionEvidence,beginSolutionRun,completeSolutionRun,cancelSolutionRun,solutionResultIsCurrent,recordSolutionApproval,solutionInspection} from '../lib/workforce-solution.ts';
import {DecisionStore,encodeDecisions,parseDecisions} from '../lib/local-decisions.ts';
const at='2026-10-03T01:00:00.000Z';
const make=()=>createWorkforceSolution('solution-a','goal-a',{...emptySolutionInputs(),scope:{jobProfile:'ENGINEER',businessUnit:'TECH'},demand:{additionalRoles:3,intent:'additional'},response:{build:1,move:1,buy:1},costs:{annualHireCost:null,currency:'USD'},timing:{startLagDays:null},constraints:{budget:null},training:{}},at);
const evidence=(id,kind='recruiting')=>({id,kind,source:'approved-role-recruiting',sourceVersion:'1',capturedAt:at,asOf:'2026-09-30',periodStart:'2025-10-01',periodEnd:'2026-09-30',scope:{jobProfile:'ENGINEER',population:'external filled requisitions, company-wide'},provenance:'synthetic',payload:{medianDays:45,validDurationCount:null},limitations:['Fill is not employee arrival.']});
const version=s=>currentSolutionVersion(s).version;
function run(s,kinds=['costs','timing','constraints'],id='run-a'){
 const started=beginSolutionRun(s,version(s),id,kinds,at);
 return completeSolutionRun(started.state,started.ticket,kinds.map(kind=>({id:id+'-'+kind,kind,calculator:{name:'test-adapter',version:'1'},payload:{value:null}})),at);
}
test('conversation and sidebar edits share versioned inputs without changing prior snapshots',()=>{
 const original=make(),s=reviseWorkforceSolution(original,1,{response:{build:0,move:1,buy:2}},'sidebar','Changed response mix',at);
 assert.equal(version(s),2);assert.equal(s.versions[1].origin,'sidebar');assert.equal(s.versions[0].inputs.response.buy,1);
 assert.equal(original.versions.length,1);assert.equal(s.versions[1].inputs.response.buy,2);
 assert.throws(()=>reviseWorkforceSolution(s,1,{costs:{}},'conversation','Stale edit',at),/solution changed/);
 const next=reviseWorkforceSolution(s,2,{costs:{annualHireCost:90000,currency:'USD'}},'conversation','User supplied annual cost',at);
 assert.equal(next.versions[2].inputs.response.buy,2);assert.equal(next.versions[2].inputs.costs.annualHireCost,90000);
});
test('timing edits stale timing and constraints but preserve unchanged total-cost evidence',()=>{
 const completed=run(make()),next=reviseWorkforceSolution(completed,1,{timing:{startLagDays:30}},'sidebar','Changed start lag',at);
 assert.equal(solutionResultIsCurrent(next,next.results.find(r=>r.kind==='costs')),true);
 assert.equal(solutionResultIsCurrent(next,next.results.find(r=>r.kind==='timing')),false);
 assert.equal(solutionResultIsCurrent(next,next.results.find(r=>r.kind==='constraints')),false);
 assert.equal(next.results.length,3);
 const changed=reviseWorkforceSolution(next,2,{costs:{annualHireCost:90000,currency:'USD'}},'conversation','Changed cost',at);
 assert.equal(solutionResultIsCurrent(changed,changed.results[0]),false);
});
test('refresh keeps exact prior evidence and invalidates only dependent result kinds',()=>{
 let s=attachSolutionEvidence(make(),1,evidence('evidence-old'),null,at);s=run(s,['demand','response','costs','timing']);
 const next=attachSolutionEvidence(s,2,{...evidence('evidence-new'),payload:{medianDays:60,validDurationCount:12}},'evidence-old',at);
 assert.equal(next.evidence.length,2);assert.equal(solutionInspection(next,2).evidence[0].payload.medianDays,45);
 assert.equal(solutionInspection(next,3).evidence[0].payload.medianDays,60);
 assert.equal(solutionResultIsCurrent(next,next.results.find(r=>r.kind==='demand')),true);
 assert.equal(solutionResultIsCurrent(next,next.results.find(r=>r.kind==='costs')),true);
 assert.equal(solutionResultIsCurrent(next,next.results.find(r=>r.kind==='response')),false);
 assert.equal(solutionResultIsCurrent(next,next.results.find(r=>r.kind==='timing')),false);
 assert.throws(()=>attachSolutionEvidence(next,3,evidence('evidence-old'),null,at),/immutable/);
});
test('edits, cancellation and other goals reject late results instead of overwriting state',()=>{
 const initial=make(),{state,ticket}=beginSolutionRun(initial,1,'run-pending',['costs'],at);
 const result=[{id:'result-a',kind:'costs',calculator:{name:'test',version:'1'},payload:{total:100}}];
 const edited=reviseWorkforceSolution(state,1,{costs:{annualHireCost:10}},'sidebar','Edit while running',at);
 assert.equal(edited.pending,null);assert.throws(()=>completeSolutionRun(edited,ticket,result,at),/cancelled, superseded/);
 assert.throws(()=>completeSolutionRun(cancelSolutionRun(state,ticket.id),ticket,result,at),/cancelled, superseded/);
 const other=createWorkforceSolution('solution-b','goal-b',emptySolutionInputs(),at);
 assert.throws(()=>completeSolutionRun(other,ticket,result,at),/another solution/);
 assert.equal(initial.results.length,0);
});
test('results require the exact ticket, requested kinds and distinct identities',()=>{
 const {state,ticket}=beginSolutionRun(make(),1,'run-a',['costs','timing'],at);
 const cost={id:'result-a',kind:'costs',calculator:{name:'test',version:'1'},payload:{total:100}};
 assert.throws(()=>completeSolutionRun(state,ticket,[cost],at),/do not match/);
 assert.throws(()=>completeSolutionRun(state,ticket,[cost,{...cost,kind:'timing'}],at),/ID already/);
 assert.throws(()=>completeSolutionRun(state,{...ticket,goalId:'goal-b'},[cost],at),/another solution/);
 assert.throws(()=>beginSolutionRun(state,1,'run-b',['costs'],at),/already running/);
});
test('approval stays attached to reviewed version and never migrates after edits',()=>{
 let s=run(make());s=recordSolutionApproval(s,1,'approval-a',s.results.map(r=>r.id),'Review this scenario only',at);
 const next=reviseWorkforceSolution(s,1,{response:{build:0,move:0,buy:3}},'sidebar','Different hiring mix',at);
 assert.equal(next.approvals.length,1);assert.equal(next.approvals[0].version,1);
 assert.equal(solutionInspection(next,2).approvals.length,0);assert.equal(solutionInspection(next,1).approvals.length,1);
 assert.throws(()=>recordSolutionApproval(next,2,'approval-b',[next.results[0].id],'Approve stale results',at),/current calculated/);
});
test('invalid evidence metadata and non-JSON values are rejected without altering records',()=>{
 const s=make();for(const patch of [{periodStart:'2027-01-01'},{asOf:'2026-02-30'},{provenance:'real'},{payload:{medianDays:Infinity}},{kind:'employee-records'}])assert.throws(()=>attachSolutionEvidence(s,1,{...evidence('e'),...patch},null,at));
 assert.throws(()=>reviseWorkforceSolution(s,1,{madeUp:{}},'sidebar','Invalid section',at));
 assert.throws(()=>reviseWorkforceSolution(s,1,{costs:{salary:NaN}},'sidebar','Invalid amount',at));
 assert.equal(s.evidence.length,0);assert.equal(s.versions.length,1);
});
test('caller changes cannot rewrite stored inputs, evidence or completed outputs',()=>{
 const input=emptySolutionInputs();input.costs={value:100};let s=createWorkforceSolution('s','g',input,at);input.costs.value=999;
 const e=evidence('e');s=attachSolutionEvidence(s,1,e,null,at);e.payload.medianDays=999;
 assert.equal(s.versions[0].inputs.costs.value,100);assert.equal(s.evidence[0].payload.medianDays,45);
 const inspection=solutionInspection(s,2);inspection.version.inputs.costs.value=0;
 assert.equal(currentSolutionVersion(s).inputs.costs.value,100);
});
test('browser decision storage round-trips solution history while preserving unrelated goal fields',()=>{
 const s=recordSolutionApproval(run(make()),1,'approval-a',['run-a-costs'],'Cost review',at);
 const data={version:1,revision:1,goals:{version:1,activeId:'goal-a',goals:[{id:'goal-a',statement:'Workforce decision'},{id:'goal-b',statement:'Other goal'}]},workspaces:{'goal-a':{savedAt:at,fields:{workforceSolution:s,brief:{owner:'Keep owner'},chat:{messages:[{role:'user',content:'Keep conversation'}],input:''}}}}};
 const raw=encodeDecisions(data);assert.deepEqual(parseDecisions(raw),data);
 let value=raw;const store=new DecisionStore();store.initialize({getItem:key=>key==='insights-to-action.decisions.v1'?value:null,setItem:(_,v)=>{value=v},removeItem:()=>{}});
 store.setField('goal-a','workforceSolution',reviseWorkforceSolution(s,1,{timing:{startLagDays:10}},'sidebar','Changed timing',at));
 const saved=parseDecisions(value);assert.equal(saved.workspaces['goal-a'].fields.brief.owner,'Keep owner');assert.equal(saved.workspaces['goal-a'].fields.chat.messages.length,1);assert.equal(saved.workspaces['goal-b'],undefined);
 assert.equal(saved.workspaces['goal-a'].fields.workforceSolution.approvals[0].version,1);
});
test('history/storage limits fail visibly without truncating previous records',()=>{
 let s=make();for(let i=2;i<=50;i++)s=reviseWorkforceSolution(s,i-1,{timing:{startLagDays:i}},'sidebar','Changed timing',at);
 assert.throws(()=>reviseWorkforceSolution(s,50,{timing:{startLagDays:51}},'sidebar','Another edit',at),/limit reached/);assert.equal(s.versions.length,50);
 assert.throws(()=>attachSolutionEvidence(make(),1,{...evidence('large'),payload:{one:'x'.repeat(190000),two:'x'.repeat(190000),three:'x'.repeat(190000)}},null,at),/storage limit/);
});
test('cancelled run IDs cannot be reused to accept an older response',()=>{
 const started=beginSolutionRun(make(),1,'cancelled-id',['costs'],at);
 const cancelled=cancelSolutionRun(started.state,'cancelled-id');
 assert.throws(()=>beginSolutionRun(cancelled,1,'cancelled-id',['costs'],at),/already used/);
 assert.equal(cancelled.runs.length,1);
});
test('inspection retains a still-valid cost result after a timing-only edit',()=>{
 const s=run(make()),next=reviseWorkforceSolution(s,1,{timing:{startLagDays:14}},'sidebar','Changed lag',at);
 const view=solutionInspection(next,2);
 assert.deepEqual(view.results.map(r=>r.kind),['costs']);assert.equal(view.results[0].version,1);
 assert.equal(solutionInspection(next,1).results.length,3);
});
