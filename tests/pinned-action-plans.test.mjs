import test from 'node:test';
import assert from 'node:assert/strict';
import {pinnedActionPlans} from '../lib/pinned-action-plans.ts';
import {conversationCatalog} from './fixtures/home-plan-conversation.mjs';
test('only explicitly attached plans become pins; older goals and drafts remain accessible without mutation',()=>{
 const catalog=conversationCatalog(),goal={id:'turnover',statement:'Reduce turnover'},empty={id:'old-goal',statement:'An earlier objective'};
 catalog.attachments.push({id:'pin-A',planId:'A',attachedAt:'2026-10-09T00:00:00.000Z',purpose:'proposal-selection'});
 const workspaces={turnover:{fields:{homePlanAlternativesV1:catalog,sentinel:{keep:true}}},'old-goal':{fields:{chat:{input:'Keep this draft'}}}};
 const before=JSON.stringify(workspaces),items=pinnedActionPlans([goal,empty],workspaces);
 assert.equal(items.length,2);assert.equal(items[0].name,'Manager support · #1');assert.equal(items[0].planId,'A');assert.equal(items[0].goal.statement,goal.statement);assert.equal(items[0].legacy,false);assert.equal(items[1].legacy,true);assert.equal(items[1].planId,null);assert.equal(JSON.stringify(workspaces),before);
});
test('each attached revision stays separately navigable and corrupt or goal-mismatched catalogs remain reviewable',()=>{
 const catalog=conversationCatalog(),goal={id:'turnover',statement:'Reduce turnover'};
 catalog.attachments=['A','B'].map(planId=>({id:'pin-'+planId,planId,attachedAt:'2026-10-09T00:00:00.000Z',purpose:'proposal-selection'}));
 const entries=pinnedActionPlans([goal],{turnover:{fields:{homePlanAlternativesV1:catalog}}});assert.deepEqual(entries.map(item=>item.planId),['A','B']);assert.notEqual(entries[0].key,entries[1].key);
 for(const raw of [{invalid:true},{...catalog,goal:'A changed objective'}]){const result=pinnedActionPlans([goal],{turnover:{fields:{homePlanAlternativesV1:raw}}});assert.equal(result[0].legacy,true);assert.equal(result[0].goal.id,goal.id);}
});
test('legacy attached bundle records stay visible as plans without rewriting their storage',()=>{
 const catalog=conversationCatalog(),plan=catalog.plans[0],goal={id:'turnover',statement:'Reduce turnover'},workspace={version:1,goalId:goal.id,drafts:[plan.draft],calculations:[],attachments:[{id:'old-attachment',status:'attached_proposal',attachedAt:'2026-10-09T00:00:00.000Z',supersedes:null,draft:plan.draft,result:plan.result,unknownsAcknowledged:true}]};
 const before=JSON.stringify(workspace),entries=pinnedActionPlans([goal],{turnover:{fields:{homeSolutionBundlesV1:workspace}}});assert.equal(entries[0].legacy,false);assert.equal(entries[0].name,'Manager support');assert.equal(entries[0].planId,null);assert.equal(JSON.stringify(workspace),before);
});
