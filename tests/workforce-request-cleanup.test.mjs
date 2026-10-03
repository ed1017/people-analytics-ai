import test from 'node:test';
import assert from 'node:assert/strict';
import {cancelOwnedWorkforceRequest} from '../lib/workforce-request-cleanup.ts';
import {createWorkforceSolution,emptySolutionInputs,beginSolutionRun,cancelSolutionRun,reviseWorkforceSolution} from '../lib/workforce-solution.ts';
const at='2026-10-03T01:00:00.000Z';
const run=()=>beginSolutionRun(createWorkforceSolution('solution','goal',emptySolutionInputs(),at),1,'old-request',['brief'],at);
test('owned cleanup clears only pending and preserves retained history without mutating input',()=>{
 const {state,ticket}=run(),before=structuredClone(state),next=cancelOwnedWorkforceRequest(state,ticket);
 assert.deepEqual(next,{...state,pending:null});assert.deepEqual(state,before);assert.equal(cancelOwnedWorkforceRequest(next,ticket),null);
});
test('old cleanup cannot clear a newer request or another goal/solution/version',()=>{
 const {state,ticket}=run(),newer=beginSolutionRun(cancelSolutionRun(state,ticket.id),1,'new-request',['brief'],at).state;
 assert.equal(cancelOwnedWorkforceRequest(newer,ticket),null);assert.equal(newer.pending.id,'new-request');
 for(const patch of [{goalId:'other'},{solutionId:'other'},{version:2},{id:'other'}])assert.equal(cancelOwnedWorkforceRequest(state,{...ticket,...patch}),null);
 const revised=reviseWorkforceSolution(cancelSolutionRun(state,ticket.id),1,{scope:{goalStatement:'Changed'}},'sidebar','Change',at);
 assert.equal(cancelOwnedWorkforceRequest(revised,ticket),null);
});
test('missing, deleted and unreadable records are never reconstructed',()=>{
 const {ticket}=run();for(const raw of [undefined,null,{},'bad'])assert.equal(cancelOwnedWorkforceRequest(raw,ticket),null);
});
