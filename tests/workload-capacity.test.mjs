import test from 'node:test';
import assert from 'node:assert/strict';
import {workloadFixture,known,unknown} from './fixtures/workload-capacity.mjs';
import {calculateWorkloadCapacity,readWorkloadCapacityReport} from '../lib/workload-capacity.ts';
import {reviewBundleProposal} from '../lib/home-bundle-reconciliation.ts';
test('12-role example keeps target gaps, source gaps, managers and cash separate',async()=>{
 const input=await workloadFixture(),before=structuredClone(input),r=calculateWorkloadCapacity(input),[a,b]=r.options;
 assert.deepEqual(a.rows.map(x=>x.requiredAdditionalRoles),[12,12,12]);assert.deepEqual(a.rows.map(x=>x.targetGapHours),[640,640,0]);assert.deepEqual(b.rows.map(x=>x.targetGapHours),[1280,1280,0]);
 assert.deepEqual(a.rows.map(x=>x.sourceRemovedHours),[80,80,640]);assert.deepEqual(b.rows.map(x=>x.sourceRemovedHours),[160,160,1280]);assert.deepEqual(a.rows.map(x=>x.sourceGapHours),[0,0,0]);assert.deepEqual(b.rows.map(x=>x.sourceGapHours),[80,80,0]);
 assert.equal(a.rows[0].managerRequiredHours,28);assert.equal(b.rows[0].managerRequiredHours,32);assert.equal(a.rows[0].managerGapHours,0);assert.equal(b.rows[0].managerGapHours,2);assert.equal(b.rows[0].requiredManagerCount,2);assert.equal(b.rows[0].managerGapCount,0);
 assert.equal(a.cash,228400);assert.equal(b.cash,156800);assert.equal(a.addedEmployees,12);assert.equal(b.addedEmployees,12);assert.equal(a.cash,reviewBundleProposal(a.normalizedDraft).cashTotal);assert.equal(a.status,'not-met');assert.equal(b.status,'not-met');assert.deepEqual(input,before);
});
test('nonzero baseline distinguishes total workload from incremental need',async()=>{
 const i=await workloadFixture();i.target.baselineRoles=known(4);i.target.baselineCohortIds=['incumbents'];i.workload.mode='incremental';
 let r=calculateWorkloadCapacity(i);assert.equal(r.options[0].rows[0].demandHours,2560);assert.equal(r.options[0].rows[0].baselineHours,640);assert.equal(r.options[0].rows[0].requiredAdditionalRoles,12);assert.equal(r.options[0].rows[2].targetCapacityHours,2560);
 i.workload.mode='total';r=calculateWorkloadCapacity(i);assert.equal(r.options[0].rows[0].requiredAdditionalRoles,8);assert.equal(r.options[0].rows[0].targetGapHours,0);
});
test('whole-program totals equal per-person rates without multiplying twice',async()=>{
 const i=await workloadFixture(),per=calculateWorkloadCapacity(i);for(const o of i.options){const n=Number(o.draft.inputs.capacity.input.build);o.training={basis:'whole-program',cash:known(n*600),hours:known(n*40)};}
 const total=calculateWorkloadCapacity(i);assert.deepEqual(total.options.map(o=>[o.cash,o.training.wholeProgramHours]),per.options.map(o=>[o.cash,o.training.wholeProgramHours]));assert.equal(total.options[0].training.wholeProgramHours,160);assert.equal(total.options[1].training.wholeProgramHours,320);
 i.options[0].draft.inputs.capacity.input.trainingHours='40';i.options[0].draft.inputs.capacity.origins.trainingHours={kind:'user-entered',basis:'Reviewed synthetic total.'};assert.throws(()=>calculateWorkloadCapacity(i),/disagrees/);
});
test('source training absence precedes permanent removal, and backfill readiness is independent',async()=>{
 const i=await workloadFixture();i.options[0].draft.inputs.timing.find(t=>t.componentId==='c3').finish=unknown();let r=calculateWorkloadCapacity(i);assert.equal(r.options[0].rows[2].restoredHours,null);assert.equal(r.options[0].rows[2].sourceGapHours,null);assert.equal(r.options[0].rows[2].targetGapHours,0);
 const j=await workloadFixture();j.options[0].draft.inputs.capacity.input.backfills='0';j.options[0].draft.inputs.capacity.flows=j.options[0].draft.inputs.capacity.flows.filter(f=>f.path!=='backfills');r=calculateWorkloadCapacity(j);assert.deepEqual(r.options[0].rows.map(x=>x.sourceCapacityHours),[1200,1200,640]);assert.equal(r.options[0].rows[2].sourceGapHours,560);
});
test('shared prerequisite readiness delays productivity without changing payroll arrival',async()=>{
 const i=await workloadFixture();i.options[0].draft.inputs.timing.find(t=>t.componentId==='c2').finish=known('2027-02-01');const r=calculateWorkloadCapacity(i);assert.equal(r.options[0].rows[0].targetReadyRoles,0);assert.equal(r.options[0].rows[1].targetReadyRoles,8);assert.equal(r.options[0].cash,228400);
});
test('manager span and coaching are independent; deficits do not invent leadership or hire cash',async()=>{
 const i=await workloadFixture();i.managers[0].spanLimit=known(6);const r=calculateWorkloadCapacity(i);assert.equal(r.options[0].rows[0].requiredManagerCount,3);assert.equal(r.options[0].rows[0].managerGapCount,1);assert.equal(r.options[0].rows[0].managerGapHours,0);assert.equal(r.options[0].cash,228400);assert.equal(r.options[0].addedEmployees,12);
 i.managers[0].count=known(0);i.managers[0].uncommittedHoursByMonth=[known(0),known(0),known(0)];const zero=calculateWorkloadCapacity(i);assert.equal(zero.options[0].rows[0].managerGapHours,28);assert.equal(zero.options[0].rows[0].managerGapCount,3);
});
test('unknown manager hours, source availability, costs and readiness never imply feasibility',async()=>{
 for(const mutate of [i=>i.managers[0].uncommittedHoursByMonth=i.managers[0].uncommittedHoursByMonth.map(unknown),i=>i.source.capacityHoursByMonth=i.source.capacityHoursByMonth.map(unknown),i=>i.source.disjointFromTarget=null,i=>{i.options[0].draft.inputs.capacity.input.annualHireCost='';i.options[0].draft.inputs.capacity.origins.annualHireCost={kind:'unknown',basis:null};},i=>i.options[0].training.cash=unknown(),i=>i.options[0].draft.inputs.timing.find(t=>t.componentId==='c1').finish=unknown()]){
  const i=await workloadFixture();i.workload.ticketsByMonth=i.workload.ticketsByMonth.map(()=>known(0));i.source.workloadHoursByMonth=i.source.workloadHoursByMonth.map(()=>known(0));mutate(i);const r=calculateWorkloadCapacity(i);assert.notEqual(r.options[0].status,'met');assert.ok(Object.values(r.options[0].checks).includes('unknown')||r.options[0].rows.some(row=>Object.values(row.statuses).includes('unknown')));
 }
});
test('zero ticket demand and explicit zero rates are valid; productive-hour zero is not',async()=>{
 const i=await workloadFixture();i.workload.ticketsByMonth=i.workload.ticketsByMonth.map(()=>known(0));i.managers[0].hoursPerAddedReport=known(0);i.managers[0].coachingHoursPerTraineeMonth=known(0);const r=calculateWorkloadCapacity(i);assert.equal(r.options[0].rows[0].requiredAdditionalRoles,0);assert.equal(r.options[0].rows[0].targetGapHours,0);assert.equal(r.options[0].rows[0].managerRequiredHours,0);
 i.workload.productiveHoursPerRole=known(0);assert.throws(()=>calculateWorkloadCapacity(i),/positive/);
});
test('part-month dates, graded ramps, negative/invalid inputs and inconsistent schedules are rejected',async()=>{
 for(const mutate of [i=>i.options[0].draft.inputs.capacity.input.arrivalDate='2027-01-16',i=>i.options[0].draft.inputs.timing[0].finish=known('2027-03-15'),i=>i.options[0].productivity='graded',i=>i.workload.ticketsByMonth[0]=known(-1),i=>i.workload.minutesPerTicket=known(NaN),i=>i.options[0].draft.inputs.capacity.input.months='0',i=>i.options[0].draft.inputs.capacity.input.build='4.5',i=>i.options[0].cohorts[0].trainingHoursByMonth[0]=known(81),i=>i.options[0].cohorts[0].trainingHoursByMonth[2]=known(1),i=>i.options[0].cohorts[0].assignedMonth='2027-02',i=>i.profile.code='OTHER',i=>i.workload.ramp=[50,75,100]]){const i=await workloadFixture();mutate(i);assert.throws(()=>calculateWorkloadCapacity(i));}
});
test('overlapping cohorts, target/source pools and duplicate managers cannot add capacity',async()=>{
 for(const mutate of [i=>i.options[0].cohorts.push(structuredClone(i.options[0].cohorts[0])),i=>i.options[0].cohortsDisjoint=false,i=>i.target.baselineCohortIds=['trainees'],i=>i.source.poolId='target',i=>i.source.disjointFromTarget=false,i=>i.managers.push(structuredClone(i.managers[0]))]){const i=await workloadFixture();mutate(i);assert.throws(()=>calculateWorkloadCapacity(i),/overlap|distinct|pool|Duplicate/i);}
});
test('reports replay exact goal/dataset/revision and assumption content, not display labels',async()=>{
 const i=await workloadFixture(),r=calculateWorkloadCapacity(i);assert.deepEqual(readWorkloadCapacityReport(r,i),r);for(const mutate of [i=>i.identity.datasetToken='other:1',i=>i.identity.revision++,i=>i.identity.goalId='another',i=>i.workload.minutesPerTicket=known(21)]){const changed=structuredClone(i);mutate(changed);assert.equal(readWorkloadCapacityReport(r,changed),null);}
 const changed=structuredClone(r);changed.options[0].rows[0].targetGapHours=0;assert.equal(readWorkloadCapacityReport(changed,i),null);
 const renamed=structuredClone(i);renamed.profile.label='New display name';assert.deepEqual(calculateWorkloadCapacity(renamed).options,r.options);assert.notEqual(calculateWorkloadCapacity(renamed).sourceKey,r.sourceKey);
});

test('Build and Move are distinct source cohorts; trainees are counted once and moves do not train',async()=>{
 const i=await workloadFixture(),o=i.options[0],d=o.draft,c=d.inputs.capacity;
 c.input.build='2';c.input.move='2';d.inputs.groups[0].count=known(2);d.inputs.groups.push({id:'movers',label:'Separate redeployment cohort',count:known(2)});
 c.flows.push({id:'move',path:'move',componentIds:['c4'],groupId:'movers'});d.inputs.memberships.find(m=>m.componentId==='c4').groupIds=['movers'];
 o.cohorts[0].trainingHoursByMonth=[known(40),known(40),known(0)];o.cohorts.push({id:'movers',path:'move',sourcePoolId:'source',assignedMonth:'2027-01',trainingHoursByMonth:[known(0),known(0),known(0)]});
 let r=calculateWorkloadCapacity(i);assert.deepEqual(r.options[0].rows.map(x=>x.sourceRemovedHours),[40,40,640]);assert.deepEqual(r.options[0].rows.map(x=>x.targetReadyRoles),[8,8,12]);assert.equal(r.options[0].rows[0].assignedRoles,12);assert.equal(r.options[0].rows[0].managerRequiredHours,26);
 o.cohortsDisjoint=null;r=calculateWorkloadCapacity(i);assert.equal(r.options[0].rows[2].targetGapHours,null);o.cohortsDisjoint=true;d.inputs.groupsDisjoint=unknown();r=calculateWorkloadCapacity(i);assert.equal(r.options[0].rows[2].targetGapHours,null);
 d.inputs.groupsDisjoint=known(true);o.cohorts[1].trainingHoursByMonth[0]=known(1);assert.throws(()=>calculateWorkloadCapacity(i),/Move path/);
});
test('a fully specified feasible scenario is conditional; explicit zero costs remain known',async()=>{
 const i=await workloadFixture();i.options=i.options.slice(0,1);i.workload.ticketsByMonth=[known(3840),known(3840),known(5760)];
 let r=calculateWorkloadCapacity(i);assert.equal(r.options[0].status,'met');assert.equal(r.classification,'conditional-scenario');
 const o=i.options[0];for(const f of ['annualHireCost','hireFee','annualBackfillCost','backfillFee','internalAnnualCostChange'])o.draft.inputs.capacity.input[f]='0';o.training.cash=known(0);r=calculateWorkloadCapacity(i);assert.equal(r.options[0].cash,0);assert.equal(r.options[0].status,'met');
 i.managers[0].count=unknown();r=calculateWorkloadCapacity(i);assert.equal(r.options[0].status,'unknown');assert.equal(r.options[0].rows[0].managerGapCount,null);
});
test('unknown and invalid cost, training, workload, availability and readiness assumptions stay bounded',async()=>{
 for(const mutate of [i=>i.workload.minutesPerTicket=unknown(),i=>i.workload.productiveHoursPerRole=unknown(),i=>i.options[0].training.hours=unknown(),i=>i.options[0].cohorts[0].trainingHoursByMonth[0]=unknown(),i=>i.options[0].cohorts[0].assignedMonth=null,i=>i.options[0].draft.inputs.dependenciesConfirmed=unknown()]){const i=await workloadFixture();mutate(i);assert.notEqual(calculateWorkloadCapacity(i).options[0].status,'met');}
 for(const mutate of [i=>i.options[0].training.cash=known(-1),i=>i.options[0].training.hours=known(-1),i=>i.options[0].draft.inputs.capacity.input.annualHireCost='-1',i=>i.options[0].draft.inputs.capacity.input.hireFee='abc',i=>i.managers[0].coachingHoursPerTraineeMonth=known(-1),i=>i.managers[0].uncommittedHoursByMonth[0]=known(2000),i=>i.target.availabilityPct=known(101),i=>i.options[0].draft.inputs.budget.basis=known('all-in'),i=>i.source.capacityHoursByMonth[0]=known(100)]){const i=await workloadFixture();mutate(i);assert.throws(()=>calculateWorkloadCapacity(i));}
});

test('the existing staffing deadline uses prerequisite-gated additional roles',async()=>{
 const i=await workloadFixture();i.workload.ticketsByMonth=i.workload.ticketsByMonth.map(()=>known(0));i.options[0].draft.inputs.capacity.input.deadlineMonth='2027-02';let r=calculateWorkloadCapacity(i);assert.equal(r.options[0].checks.deadline,'not-met');
 i.options[0].draft.inputs.capacity.input.deadlineMonth='';i.options[0].draft.inputs.capacity.origins.deadlineMonth={kind:'unknown',basis:null};r=calculateWorkloadCapacity(i);assert.equal(r.options[0].checks.deadline,'unknown');assert.notEqual(r.options[0].status,'met');
});

// Review regressions: these six cases fail on d937b5f before adapter changes.
test('review 1: a cleared reviewed budget cannot resurrect the older staffing budget',async()=>{
 const i=await workloadFixture();i.options=i.options.slice(0,1);i.workload.ticketsByMonth=[known(3840),known(3840),known(5760)];i.options[0].draft.inputs.budget.amount=unknown();
 const before=structuredClone(i),r=calculateWorkloadCapacity(i);assert.equal(r.options[0].checks.cash,'unknown');assert.equal(r.options[0].status,'unknown');assert.deepEqual(r.options[0].normalizedDraft.inputs.budget.amount,unknown());assert.deepEqual(i,before);
 delete i.options[0].draft.inputs.budget;assert.equal(calculateWorkloadCapacity(i).options[0].checks.cash,'met');
});
test('review 2: comparison rejects different evidence/planning bindings and aggregate scopes',async()=>{
 for(const mutate of [d=>d.binding.evidenceDigest='a'.repeat(64),d=>d.binding.planningDigest='b'.repeat(64),d=>{d.inputs.scope.businessUnit=known('BU-OTHER');d.inputs.capacity.input.businessUnit='BU-OTHER';},d=>d.inputs.scope.population=known('Another source population'),d=>d.inputs.scope.requirements=known('Different service level')]){
  const i=await workloadFixture();mutate(i.options[1].draft);assert.throws(()=>calculateWorkloadCapacity(i),/comparison|binding|scope/i);
 }
});
test('review 3: cohort training cannot precede its learning-component start',async()=>{
 const i=await workloadFixture();i.options[0].draft.inputs.timing.find(t=>t.componentId==='c1').start=known('2027-02-01');assert.throws(()=>calculateWorkloadCapacity(i),/Training.*start/i);
});
test('review 4: decimal per-person cash normalizes in cents without relaxing input precision',async()=>{
 const i=await workloadFixture(),first=i.options[0];Object.assign(first.draft.inputs.capacity.input,{build:'3',buy:'9',backfills:'3'});first.draft.inputs.groups[0].count=known(3);first.cohorts[0].trainingHoursByMonth=[known(60),known(60),known(0)];for(const o of i.options){o.training.cash=known(0.1);o.draft.inputs.capacity.input.trainingCash=Number(o.draft.inputs.capacity.input.build)===3?'0.30':'0.80';o.draft.inputs.capacity.origins.trainingCash={kind:'user-entered',basis:'Reviewed synthetic whole-program cash.'};}
 const before=structuredClone(i),r=calculateWorkloadCapacity(i);assert.deepEqual(r.options.map(o=>o.training.wholeProgramCash),[0.3,0.8]);assert.equal(r.options[0].cash,244500.3);assert.equal(r.options[1].cash,152000.8);assert.deepEqual(i,before);
 i.options[0].training.cash=known(0.001);assert.throws(()=>calculateWorkloadCapacity(i),/decimal|precision/i);
});
test('review 5: manager pool cannot alias the source or target pool',async()=>{
 for(const pool of ['source','target']){const i=await workloadFixture();i.managers[0].poolId=pool;assert.throws(()=>calculateWorkloadCapacity(i),/Manager.*distinct/i);}
});
test('review 6: monthly cash follows reconciled ledger timing, unknown amounts and ownership',async()=>{
 const i=await workloadFixture();let o=calculateWorkloadCapacity(i).options[0];assert.deepEqual(o.rows.map(r=>r.cashTotal),[74400,64000,90000]);assert.equal(o.rows.reduce((n,r)=>n+r.cashTotal,0),o.cash);
 const r=reviewBundleProposal(o.normalizedDraft);assert.deepEqual(o.cashLedger,r.ledger.filter(l=>l.kind==='cash'));assert.deepEqual(o.rows[0].cashLines.map(l=>[l.id,l.amount]),o.cashLedger.map(l=>[l.id,l.monthly[0]]));
 i.options[0].training.cash=unknown();o=calculateWorkloadCapacity(i).options[0];assert.deepEqual(o.rows.map(r=>r.cashTotal),[null,64000,90000]);assert.equal(o.cash,null);
 const j=await workloadFixture();j.options[0].draft.inputs.capacity.input.arrivalDate='';j.options[0].draft.inputs.capacity.origins.arrivalDate={kind:'unknown',basis:null};o=calculateWorkloadCapacity(j).options[0];assert.deepEqual(o.rows.map(r=>r.cashTotal),[null,null,null]);assert.ok(o.cashLedger.find(l=>l.id==='capacity:hireStaffingCost').monthly.every(v=>v===null));
 const k=await workloadFixture();k.options[0].draft.inputs.costsDistinct=unknown();o=calculateWorkloadCapacity(k).options[0];assert.deepEqual(o.rows.map(r=>r.cashTotal),[null,null,null]);
});

async function feasibleReview(){const i=await workloadFixture();i.options=i.options.slice(0,1);i.workload.ticketsByMonth=[known(3840),known(3840),known(5760)];assert.equal(calculateWorkloadCapacity(i).options[0].status,'met');return i;}
test('review 1 exact: reviewed unknown, zero, sufficient and absent budgets retain authority',async()=>{
 const i=await feasibleReview(),d=i.options[0].draft;d.inputs.budget.amount=unknown();let o=calculateWorkloadCapacity(i).options[0];assert.equal(o.checks.cash,'unknown');assert.equal(o.status,'unknown');assert.equal(d.inputs.capacity.input.budget,'1000000');
 d.inputs.budget.amount=known(0);o=calculateWorkloadCapacity(i).options[0];assert.equal(o.checks.cash,'not-met');d.inputs.budget.amount=known(1000000);assert.equal(calculateWorkloadCapacity(i).options[0].status,'met');delete d.inputs.budget;assert.equal(calculateWorkloadCapacity(i).options[0].status,'met');
});
test('review 2 exact: current dataset and expected binding cannot silently rebind old drafts',async()=>{
 for(const mutate of [i=>i.identity.datasetToken='other:1',i=>i.options[0].draft.binding.evidenceDigest='a'.repeat(64),i=>i.options[0].draft.binding.planningDigest='b'.repeat(64)]){const i=await feasibleReview();mutate(i);assert.throws(()=>calculateWorkloadCapacity(i),/current|binding|dataset/i);}
 for(const mutate of [d=>d.binding.evidenceDigest='a'.repeat(64),d=>d.binding.planningDigest='b'.repeat(64),d=>{d.inputs.capacity.input.businessUnit='BU-OTHER';d.inputs.scope.businessUnit=known('BU-OTHER');}]){const i=await feasibleReview(),second=structuredClone(i.options[0]);second.id='other';mutate(second.draft);i.options.push(second);assert.throws(()=>calculateWorkloadCapacity(i),/comparison|binding|scope/i);}
});
test('review 3 exact: learning finish bounds training even when target transfer is later',async()=>{
 const i=await feasibleReview(),timing=i.options[0].draft.inputs.timing.find(t=>t.componentId==='c1');timing.finish=known('2027-02-01');assert.throws(()=>calculateWorkloadCapacity(i),/Training.*window|Training.*finish/i);
 timing.finish=unknown();assert.notEqual(calculateWorkloadCapacity(i).options[0].status,'met');timing.finish=known('2027-03-01');timing.start=unknown();assert.notEqual(calculateWorkloadCapacity(i).options[0].status,'met');timing.start=known('2027-01-01');assert.equal(calculateWorkloadCapacity(i).options[0].status,'met');
});
test('review 4 exact: decimal per-person cash and hours equal explicit whole-program totals',async()=>{
 const i=await feasibleReview(),o=i.options[0],d=o.draft;Object.assign(d.inputs.capacity.input,{build:'3',buy:'9',backfills:'3'});d.inputs.groups[0].count=known(3);o.training.cash=known(600.1);o.cohorts[0].trainingHoursByMonth=[known(60),known(60),known(0)];
 let r=calculateWorkloadCapacity(i).options[0];assert.equal(r.training.wholeProgramCash,1800.3);assert.equal(r.training.wholeProgramHours,120);o.training={basis:'whole-program',cash:known(1800.3),hours:known(120)};assert.equal(calculateWorkloadCapacity(i).options[0].cash,r.cash);
 o.training={basis:'per-person',cash:known(600.1),hours:known(0.1)};o.cohorts[0].trainingHoursByMonth=[known(0.15),known(0.15),known(0)];r=calculateWorkloadCapacity(i).options[0];assert.equal(r.training.wholeProgramHours,0.3);assert.equal(r.normalizedDraft.inputs.capacity.input.trainingHours,'0.3');
 o.training={basis:'whole-program',cash:known(1800.3),hours:known(0.3)};assert.equal(calculateWorkloadCapacity(i).options[0].training.wholeProgramHours,r.training.wholeProgramHours);
 o.training.hours=known(0.001);assert.throws(()=>calculateWorkloadCapacity(i),/decimal|precision/i);
});
test('review 6 exact: additional expense preserves first-month training and unknown complete cash',async()=>{
 const i=await feasibleReview(),d=i.options[0].draft;d.inputs.expenses.push({id:'manual-support',label:'Synthetic additional cost',kind:'cash',amount:known(500),startMonth:known('2027-02'),months:known(1)});d.inputs.expenseLinks.push({expenseId:'manual-support',componentIds:['c1'],allocations:null});
 let o=calculateWorkloadCapacity(i).options[0];assert.deepEqual(o.rows.map(r=>r.cashTotal),[74400,64500,90000]);assert.equal(o.cash,228900);assert.equal(o.status,'met');assert.deepEqual(o.cashLedger.find(l=>l.id==='capacity:trainingCash').monthly,[2400,0,0]);
 d.inputs.costReviews[0].complete=unknown();o=calculateWorkloadCapacity(i).options[0];assert.equal(o.cash,null);assert.equal(o.checks.cash,'unknown');assert.equal(o.status,'unknown');assert.deepEqual(o.rows.map(r=>r.cashTotal),[null,null,null]);
});
