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
