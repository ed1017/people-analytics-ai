import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures/swp-reference-continuation.mjs';
import {runReferenceContinuation,checkReferenceContinuationTurn} from './helpers/swp-reference-continuation.mjs';
import {lane,anchor} from './fixtures/swp-reference-synthetic-driver.mjs';
test('incomplete real failure shape survives three turns, then explicit natural clarification permits arithmetic',async()=>{
 const r=await lane(),checked=r.events.filter(e=>e.phase==='checked-turn');assert.deepEqual(checked.map(e=>e.reply.demandReview.result.status),['needs-inputs','needs-inputs','needs-inputs','calculated']);
 const third=checked[2].reply.demandReview;assert.equal(third.spec.startMonth,null);assert.notEqual(third.spec.contracts.scope,third.spec.scope);assert.equal(third.result.additionalRoles,null);
 const fourth=checked[3].reply.demandReview;assert.equal(fourth.spec.startMonth,'2027-01');assert.equal(fourth.spec.contracts.scope,fourth.spec.scope);assert.equal(fourth.spec.hoursPerContract.value,40);assert.equal(fourth.spec.productiveHoursPerFte.value,120);assert.equal(fourth.result.workloadHours,720);assert.equal(fourth.result.capacityHours,1080);assert.equal(fourth.result.additionalRoles,0);
 assert.equal(r.result.fullAcceptance,false);assert.equal(r.result.calculatedAcceptance,false);assert.equal(r.result.acceptedForScenario,false);assert.equal(r.result.semanticReview,'pending');assert.equal(fixture.paidExecutionAuthorized,false);
 for(const context of r.contexts.slice(1)){const projected=context.goalContext.scenarioReview.demandProposal;assert(projected.reviewRef);assert(!('key' in projected));assert(!('basisTurns' in projected));}
});
test('calculation follows retained variable workload assumptions, with no fixed outcome',async()=>{
 const r=await lane({hours:150,productive:100});assert.equal(r.result.review.result.workloadHours,2700);assert.equal(r.result.review.result.capacityHours,900);assert.equal(r.result.review.result.additionalRoles,2);
});
test('other legitimate unknowns stay incomplete even after the explicit date/scope turn',async()=>{
 const r=await lane({unknownProductivity:true});assert.equal(r.result.review.spec.productiveHoursPerFte.value,null);assert.equal(r.result.requiresClarification,true);assert.equal(r.result.codeArithmeticVerified,false);assert.equal(r.result.review.result.additionalRoles,null);
});
test('clarification cannot alter retained workload, prior state, or claim a computed result without inputs',async()=>{
 const r=await lane(),last=r.events.filter(e=>e.phase==='checked-turn').at(-1),request=r.events.filter(e=>e.phase==='before-turn').at(-1).request;
 const changed=structuredClone(last.reply);changed.demandReview.spec.hoursPerContract.value=999;assert.throws(()=>checkReferenceContinuationTurn(3,request,changed,request.goalContext.scenarioReview.demandProposal));
 const history=structuredClone(last.reply);history.state.turns[0].text='Replaced history';assert.throws(()=>checkReferenceContinuationTurn(3,request,history,request.goalContext.scenarioReview.demandProposal),/history/);
});
test('durable recorder failure stops before any completion or automatic retry',async()=>{
 const preserved=await anchor();let calls=0;await assert.rejects(()=>runReferenceContinuation({anchor:preserved,record:async()=>{throw Error('record failed');},complete:()=>{calls++;throw Error('unreachable');}}),/record failed/);assert.equal(calls,0);
});
