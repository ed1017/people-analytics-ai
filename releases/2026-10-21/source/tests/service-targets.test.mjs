import test from 'node:test';import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo} from '../lib/swp-demo.ts';
import {guidedBusinessPlanning} from '../lib/guided-business-planning.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {readBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {readStaffingInputs,calculateServiceStaffing} from '../lib/home-service-staffing.ts';
import {prepareBusinessPlanningSelection} from '../lib/home-business-planning-save.ts';
import {guidedPlanSummary} from '../lib/guided-plan-summary.ts';
const edit=(d,text)=>acceptBundleChatEdit(d,previewBundleChatEdit(d,text));
const at='2026-10-24T09:30:00Z';
test('explicit shortfall limits are shared across guide and ordinary calculation; zero differs from unknown',async()=>{
 const base=await createSwpDemo('guided-service-target',at),original=JSON.stringify(base);
 for(const cap of ['Unknown','0','1000','5000']){
  const d=edit(base,`Set Acceptable uncovered work to ${cap}`),g=await compareSwpDemo(d),o=guidedBusinessPlanning(d,'legacy-v1:0');
  const rows=g.options.map(r=>({id:r.id,status:r.candidate.status}));
  assert.deepEqual(rows,o.staffing.result.options.map(r=>({id:r.id,status:r.status})),cap);
  for(const r of o.staffing.result.options)if(cap!=='Unknown'&&r.shortfallHours>Number(cap))assert.equal(r.status,'not-met');
  assert.equal(o.staffing.result.operationalFeasibilityVerified,false);
  const selected=await prepareBusinessPlanningSelection(o,o.staffing.result.options[0].id);
  assert.equal(selected.draft.inputs.mixConstraints.maxUncoveredHours.value,cap==='Unknown'?null:Number(cap));
  assert.deepEqual(readBundleDraft(JSON.parse(JSON.stringify(selected.draft))),selected.draft);
  assert.equal(guidedPlanSummary(selected.draft).serviceTarget,cap==='Unknown'?null:Number(cap));
 }
 assert.equal(JSON.stringify(base),original);
});
test('deadline edits preserve shared option results and explicit target date',async()=>{
 const base=await createSwpDemo('guided-deadline-target',at),d=edit(base,'Set Coverage deadline to 2027-01; Set Acceptable uncovered work to 1000');
 const g=await compareSwpDemo(d),o=guidedBusinessPlanning(d,'legacy-v1:0');
 assert.deepEqual(g.options.map(r=>[r.id,r.candidate.status]),o.staffing.result.options.map(r=>[r.id,r.status]));
 assert.equal(guidedPlanSummary(d).target.deadline,'2027-01-31');
});
test('legacy staffing remains byte-identical and malformed/unknown target fields fail closed',async()=>{
 const d=await createSwpDemo('guided-legacy-target',at),s=guidedBusinessPlanning(d,'legacy-v1:0');
 delete s.staffing.inputs.values.maxUncoveredHours;
 const before=JSON.stringify(s.staffing.inputs);assert.equal(JSON.stringify(readStaffingInputs(s.staffing.inputs)),before);
 assert.deepEqual(calculateServiceStaffing(s.review,s.staffing.inputs),s.staffing.result);
 for(const value of [-1,Infinity,1e9]){const bad=structuredClone(d);bad.inputs.mixConstraints={maxUncoveredHours:{value,kind:'user-entered',basis:'Explicit test'}};assert.equal(readBundleDraft(bad),null);}
 const bad=structuredClone(s.staffing.inputs);bad.values.annualHireCost=null;assert.throws(()=>readStaffingInputs(bad));
 const unknown=structuredClone(s.staffing.inputs);unknown.values.unknown=0;assert.throws(()=>readStaffingInputs(unknown));
});

test('withdrawing a deadline retains unknown through comparison and saved target',async()=>{
 const base=await createSwpDemo('guided-cleared-deadline',at),d=edit(base,'Set Coverage deadline to Unknown; Set Acceptable uncovered work to Unknown');
 assert.equal(guidedPlanSummary(d).target,null);
 const ordinary=guidedBusinessPlanning(d,'legacy-v1:0');assert.equal(ordinary.staffing.inputs.values.deadlineMonth.value,null);
 assert.ok(ordinary.staffing.result.options.every(r=>r.status==='unknown'||r.status==='not-met'));
 const saved=await prepareBusinessPlanningSelection(ordinary,ordinary.staffing.result.options[0].id);
 assert.equal(guidedPlanSummary(readBundleDraft(JSON.parse(JSON.stringify(saved.draft)))).target,null);
});

import {prepareSwpSelection} from '../lib/swp-demo.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
import {goalProgressField,buildGoalProgressContext,readGoalProgressLedger} from '../lib/goal-progress.ts';
test('save dated plan then clear and reopen retains old target only as history',async()=>{
 const memory=new Map(),port={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},store=new DecisionStore();store.initialize(port);
 const original=await createSwpDemo('guided-target-withdrawal',at);
 const save=async(d,date)=>{const c=await compareSwpDemo(d),o=c.options[0],p=await prepareSwpSelection(store,d,c.evaluation,o.id,date,()=>true);store.commitGoalSelection(p.goal.id,p.goal.statement,p.revision,date,()=>p.fields,true);return p;};
 const first=await save(original,at),old=structuredClone(first.fields[goalProgressField].events);
 const cleared=edit(original,'Set Coverage deadline to Unknown; Set Acceptable uncovered work to Unknown');
 const second=await save(cleared,'2026-10-24T09:31:00Z');
 const reopened=new DecisionStore();reopened.initialize(port);const ledger=reopened.getSnapshot().data.workspaces[second.goal.id].fields[goalProgressField];
 assert.deepEqual(ledger.events.slice(0,old.length),old);
 assert.equal(buildGoalProgressContext(ledger,{goalId:second.goal.id,asOf:'2026-10-24'}).measurement,null);
 assert.ok(ledger.events.some(e=>e.kind==='measurement-withdrawn'));
 assert.deepEqual(readGoalProgressLedger(JSON.parse(JSON.stringify(ledger)),second.goal.id),ledger);
 const restored=await save(edit(cleared,'Set Coverage deadline to 2027-03'),'2026-10-24T09:32:00Z');
 assert.equal(buildGoalProgressContext(restored.fields[goalProgressField],{goalId:second.goal.id,asOf:'2026-10-24'}).measurement.target.date,'2027-03-31');
});
