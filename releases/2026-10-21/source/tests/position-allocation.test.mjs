import test from 'node:test';import assert from 'node:assert/strict';
import {DEMO_POSITION_INVENTORY as inventory,COMPANY_POSITION_INVENTORY,generateCompanyPositionInventory,resolvePositionInventory,generateDemoPositionInventory,filterInventory,emptyInventoryFilters,inventorySummary,positionInventoryKey} from '../lib/position-inventory.ts';
import {createPositionAllocation,calculatePositionAllocation as calculate,requirePositionAllocationDraft} from '../lib/position-allocation.ts';
const ids=inventory.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').map(p=>p.id),example=()=>createPositionAllocation(ids,true);
test('versioned demo register is deterministic and reconciles all filled/vacant/budgeted slots without employee or requisition rows',()=>{
 assert.deepEqual(generateDemoPositionInventory(),inventory);assert.equal(new Set(inventory.positions.map(p=>p.id)).size,76);assert.equal(inventory.source,'illustrative-demo');
 assert.deepEqual(inventorySummary(inventory.positions),{positions:76,budgeted:76,filled:60,vacant:16,frozen:4,recruiting:8,available:4,onHold:0,positionFte:70,filledPositionFte:54});
 assert.ok(inventory.positions.every(p=>!('employeeId' in p)&&!('requisitionId' in p)));assert.ok(Object.isFrozen(inventory));assert.ok(inventory.positions.every(Object.isFrozen));
 assert.equal(positionInventoryKey(inventory),positionInventoryKey(generateDemoPositionInventory()));
});
test('combined search and role/team/location/status filters use the exact rows counted by charts',()=>{
 for(const status of ['filled','vacant','recruiting','available','frozen']){const rows=filterInventory(inventory,{...emptyInventoryFilters(),status});const s=inventorySummary(rows);assert.equal(s.filled+s.vacant,rows.length);assert.equal(s.recruiting+s.available+s.frozen+s.onHold,s.vacant);}
 const rows=filterInventory(inventory,{search:'operations',role:'Service Operations Analyst',team:'Service Delivery',location:'Toronto',status:'vacant'});assert.deepEqual(rows.map(p=>p.id),ids);
 assert.equal(filterInventory(inventory,{...emptyInventoryFilters(),search:'no such role'}).length,0);
});
test('12=3+6+3 conserves allocation without instantly filling inventory or making redesigned slots ready',()=>{
 const draft=example(),before=JSON.stringify(inventory),r=calculate(draft);assert.equal(r.valid,true);assert.equal(r.vacancies,12);assert.equal(r.allocated,12);assert.equal(r.unassigned,0);assert.equal(r.redesignedUnstaffed,6);
 assert.equal(r.targetReadyFte,6);assert.equal(r.remainingTargetFte,6);assert.equal(r.sourceGapFte,3);assert.equal(r.netCapacityDeltaFte,3);assert.equal(r.cashTotal,127500);assert.equal(r.timeValue,12000);assert.equal(r.budgetRemaining,22500);
 assert.equal(new Set(Object.values(r.routes).flat()).size,12);assert.equal(JSON.stringify(inventory),before);assert.equal(r.baseline.filled,0);assert.equal(r.baseline.vacant,12);
});
test('filled and frozen selections remain context; frozen stays outside routes until explicit scenario thaw',()=>{
 const draft=createPositionAllocation(inventory.positions.map(p=>p.id));Object.assign(draft.input,{hire:3,repurpose:6,train:3});let r=calculate(draft);
 assert.equal(r.baseline.filled,60);assert.equal(r.vacancies,16);assert.equal(r.frozen,4);assert.equal(r.eligible,12);assert.equal(r.allocated+r.frozen+r.unassigned,16);
 draft.input.thawFrozen=true;r=calculate(draft);assert.equal(r.frozen,0);assert.equal(r.eligible,16);assert.equal(r.unassigned,4);assert.equal(inventorySummary(inventory.positions).frozen,4);
});
test('overallocations and unsupported source release block valid plans without rewriting the draft',()=>{
 const draft=example();draft.input.hire=4;const before=JSON.stringify(draft);assert.equal(calculate(draft).valid,false);assert.match(calculate(draft).errors.join(),/exceed/);assert.equal(JSON.stringify(draft),before);
 draft.input.hire=3;draft.input.repurposeMode='redeploy';assert.equal(calculate(draft).valid,false);draft.input.releaseFte=9;const r=calculate(draft);assert.equal(r.valid,true);assert.equal(r.targetReadyFte,12);assert.equal(r.sourceGapFte,9);assert.equal(r.netCapacityDeltaFte,3);
 draft.input.releaseFte=99;assert.match(calculate(draft).errors.join(),/source capacity/);
});
test('timing and budget controls change projections and costs without changing selected actual status',()=>{
 const draft=example();draft.input.horizonMonths=2;let r=calculate(draft);assert.equal(r.targetReadyFte,0);assert.equal(r.sourceGapFte,0.5);assert.equal(r.cashTotal,37500);
 draft.input.hireReadyMonth=2;assert.equal(calculate(draft).valid,false);draft.input.hireReadyMonth=5;draft.input.horizonMonths=6;draft.input.budgetUsd=100000;r=calculate(draft);assert.equal(r.budgetRemaining,-27500);assert.equal(r.valid,true);
 assert.equal(inventorySummary(resolvePositionInventory(draft.inventory.version).positions).filled,60);
});
test('temporary backfill has explicit cash and capacity effects, not automatic relief',()=>{
 const draft=example();draft.input.repurposeMode='redeploy';draft.input.releaseFte=9;const before=calculate(draft);draft.input.backfill='temporary';const r=calculate(draft);
 assert.equal(before.sourceGapFte,9);assert.equal(before.cash.backfill,0);assert.equal(r.sourceGapFte,0);assert.equal(r.cash.backfill,337500);assert.equal(r.netCapacityDeltaFte,12);assert.ok(r.cashTotal>before.cashTotal);
});
test('unknown input remains unknown, while explicit zero is a supported zero',()=>{
 const draft=example();draft.input.hireFeeUsd=null;let r=calculate(draft);assert.equal(r.cashTotal,null);assert.equal(r.budgetRemaining,null);draft.input.hireFeeUsd=0;r=calculate(draft);assert.equal(r.cash.hiringFees,0);assert.equal(r.cashTotal,109500);
 draft.input.trainingHoursPerSlot=null;draft.input.horizonMonths=2;r=calculate(draft);assert.equal(r.timeValue,null);assert.equal(r.sourceGapFte,null);assert.equal(r.netCapacityDeltaFte,null);
 draft.input.train=0;r=calculate(draft);assert.equal(r.timeValue,0);assert.equal(r.sourceGapFte,0);
});
test('empty and malformed selections, nonnumeric assumptions and unknown model/inventory versions cannot rebase',()=>{
 assert.equal(calculate(createPositionAllocation([])).valid,false);
 for(const change of [d=>d.input.selectedIds.push(ids[0]),d=>d.input.selectedIds.push('fake'),d=>d.inventory.version='next',d=>d.modelVersion='next',d=>d.input.hireFeeUsd='6000',d=>d.input.hire=1.5,d=>d.input.hireFeeUsd=NaN,d=>d.input.sourceTeam='unknown',d=>d.input.repurposeRole='CEO']){const draft=example();change(draft);assert.throws(()=>requirePositionAllocationDraft(draft));}
});

test('company-scale modeled register reconciles every published cohort without fabricating location, FTE or incumbent facts',()=>{
 const i=COMPANY_POSITION_INVENTORY,s=inventorySummary(i.positions);assert.equal(i.source,'aggregate-constrained-model');assert.equal(i.positions.length,9234);assert.equal(s.filled,9037);assert.equal(s.vacant,197);assert.equal(s.recruiting,197);assert.equal(s.frozen,0);assert.equal(s.positionFte,null);assert.equal(s.filledPositionFte,null);
 assert.equal(new Set(i.positions.map(p=>p.id)).size,9234);assert.ok(i.positions.every(p=>p.location==='Not supplied'&&p.fte===null&&!('incumbent_employee_id' in p)));assert.deepEqual(generateCompanyPositionInventory(),i);
});
test('company scenarios retain versioned references and explicit FTE assumptions without storing a manufactured HRIS snapshot',()=>{
 const i=COMPANY_POSITION_INVENTORY,selected=i.positions.filter(p=>p.status==='vacant').slice(0,12).map(p=>p.id),draft=createPositionAllocation(selected,false,i);Object.assign(draft.input,{hire:3,repurpose:6,train:3});const r=calculate(draft);
 assert.equal(r.valid,true);assert.equal(r.baseline.positionFte,null);assert.equal(r.sourceFilledFte,null);assert.equal(r.sourceCapacityLimitFte,20);assert.equal(r.targetReadyFte,6);assert.ok(!('positions' in draft.inventory));assert.ok(JSON.stringify(draft).length<5000);
 draft.input.assumedFtePerUnknownSlot=0.5;const half=calculate(draft);assert.equal(half.targetReadyFte,3);assert.equal(half.internalFte,1.5);assert.equal(inventorySummary(i.positions).filled,9037);
});
test('training effort cannot be clipped or vanish before an impossible readiness date',()=>{
 const draft=example();draft.input.trainingHoursPerSlot=1000;draft.input.trainReadyMonth=2;assert.equal(calculate(draft).valid,false);assert.match(calculate(draft).errors.join(),/Training hours exceed/);
 draft.input.trainingHoursPerSlot=80;draft.input.trainReadyMonth=1;assert.equal(calculate(draft).valid,false);
 draft.input.trainReadyMonth=2;assert.equal(calculate(draft).valid,true);assert.equal(calculate(draft).timeline[1].trainingLoadFte,1.5);
 draft.input.trainingHoursPerSlot=0;draft.input.trainReadyMonth=1;assert.equal(calculate(draft).valid,true);
});

import constraints from '../lib/data/position-inventory-constraints-v1.json' with {type:'json'};
test('every company-model cohort and vacancy status exactly matches its reviewed public aggregate constraint',()=>{
 const groups=new Map();for(const p of COMPANY_POSITION_INVENTORY.positions){const parts=p.id.split('--');parts.pop();const key=parts.join('--'),rows=groups.get(key)??[];rows.push(p);groups.set(key,rows);}
 assert.equal(groups.size,constraints.combinations.length);
 for(const c of constraints.combinations){const rows=groups.get(`MODEL-${c.org_code}--${c.job_profile_code}--${c.level_code}`),s=inventorySummary(rows);assert.equal(s.positions,c.current_positions+c.frozen_positions);assert.equal(s.filled,c.current_positions-c.vacant_positions);assert.equal(s.vacant,c.vacant_positions+c.frozen_positions);assert.equal(s.frozen,c.frozen_positions);assert.equal(s.recruiting,c.open_requisition_vacancies);assert.equal(s.onHold,c.on_hold_requisition_vacancies);assert.equal(s.available,c.uncovered_vacancies);}
});
