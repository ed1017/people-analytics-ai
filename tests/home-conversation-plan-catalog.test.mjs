import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationPlanCatalog} from '../lib/home-conversation-plan-catalog.ts';
import {createPlanAlternatives,readPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {readSolutionRequest} from '../lib/home-solution-conversation.ts';
import {conversationCatalog,conversationContext} from './fixtures/home-plan-conversation.mjs';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
const edited={...conversationContext,goal:'Maintain 100 active employees across all countries, business units and levels through 2026-12-31'};
const sources=catalog=>catalog.plans.map(({id,draft})=>({id,draft}));

test('edited goal omits stale original snapshots only from conversational context, without rebinding',()=>{
 const original=conversationCatalog(),snapshots=sources(original),before=JSON.stringify(snapshots);
 assert.equal(conversationPlanCatalog(edited,undefined,snapshots),null);
 assert.equal(JSON.stringify(snapshots),before);
 assert.throws(()=>createPlanAlternatives(edited,snapshots),/exact goal/);
 const request=solutionRequest('Define tracking for my edited goal.',true);
 request.goal={id:edited.goalId,statement:edited.goal};request.catalog=conversationPlanCatalog(edited,undefined,snapshots);request.selectedId=null;
 assert.equal(readSolutionRequest(request).catalog,null);
 assert.throws(()=>readSolutionRequest({...request,selectedId:'A'}),/saved-plan identities/);
 assert.throws(()=>readSolutionRequest({...request,catalog:original}),/saved-plan identities/);
});
test('saved historical catalog remains intact and strict write readers still reject an edited goal',()=>{
 const original=conversationCatalog(),before=JSON.stringify(original);
 assert.equal(conversationPlanCatalog(edited,original,null),null);
 assert.equal(JSON.stringify(original),before);assert.equal(readPlanAlternatives(original,edited),null);
 assert.deepEqual(readPlanAlternatives(original,conversationContext),original);
 assert.deepEqual(conversationPlanCatalog(conversationContext,original,null),original);
 assert.deepEqual(conversationPlanCatalog(conversationContext,undefined,sources(original)),original);
});
test('malformed or foreign historical plans are errors, never silently treated as stale',()=>{
 const original=conversationCatalog();
 for(const changed of [{...original,goalId:'other'},{...original,goal:'forged'},{...original,plans:[]}])assert.throws(()=>conversationPlanCatalog(edited,changed,null),/could not be verified/);
 const snapshots=sources(original),foreign=structuredClone(snapshots);foreign[0].draft.binding.goalId='other';
 assert.throws(()=>conversationPlanCatalog(edited,undefined,foreign),/exact goal/);
 assert.throws(()=>conversationPlanCatalog(edited,undefined,[snapshots[0],snapshots[0]]),/identities/);
 const invalid=structuredClone(snapshots);invalid[0].draft.revision=-1;
 assert.throws(()=>conversationPlanCatalog(edited,undefined,invalid));
});
