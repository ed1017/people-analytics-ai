import test from 'node:test';import assert from 'node:assert/strict';
import {createSwpDemo} from '../releases/2026-10-21/source/lib/swp-demo.ts';
import {bundleInputKey} from '../releases/2026-10-21/source/lib/home-bundle-reconciliation.ts';
import {scenarioAssumptionDiscussionIntent} from '../releases/2026-10-21/source/lib/scenario-planning-parity.ts';
import {converseSolutions} from '../releases/2026-10-21/source/lib/home-solution-conversation-service.ts';
import {emptySolutionState} from '../releases/2026-10-21/source/lib/home-solution-conversation.ts';
import {buildHomePack} from '../releases/2026-10-21/source/lib/home-pack.mjs';
const draft=await createSwpDemo('guided-swp-followup','2026-10-21T12:00:00Z');
const review={conversationMode:'fictional-swp-demo-v1',classification:'fictional-scenario',datasetToken:'test-token',goalId:draft.binding.goalId,goal:draft.binding.goal,revision:draft.revision,draft,inputKey:bundleInputKey(draft),selectedCandidateId:'build-0-move-0-buy-5',selectedSavedPlanId:null,reviewState:'not-calculated'};
const request=(text,scenarioReview=review)=>({version:1,requestId:'scenario-followup',goal:{id:'',statement:''},scope:'Company-wide',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:buildHomePack({},'Company-wide',text),goalContext:scenarioReview?{scenarioReview}:null,selectedId:null,catalog:null,state:emptySolutionState(),message:{id:'current-question',text}});
const stop=Error('MOCK_COMPLETION_REACHED');
async function check(text,context,mode,expected){
 const req=request(text,context),before=JSON.stringify(req.goalContext);let calls=0;
 const runtime={...mode,readDatasetQuestions:async()=>assert.fail('no descriptive query for scenario followup'),loadProjection:()=>assert.fail('no projection'),complete:async input=>{calls++;assert.deepEqual(JSON.parse(input[0].content.slice(input[0].content.indexOf('{'))).goalContext.scenarioReview,context);throw stop;}};
 if(expected)await assert.rejects(converseSolutions(req,runtime,new AbortController().signal),e=>e===stop);
 else {const reply=await converseSolutions(req,runtime,new AbortController().signal);assert.equal(reply.usage.modelRounds,0);}
 assert.equal(calls,expected?1:0);assert.equal(JSON.stringify(req.goalContext),before);
}
test('bounded intent excludes factual periods, groups and compound instructions',()=>{
 for(const s of ['What if attrition increases?','What if turnover rises by 2%?','What about backfill?'])assert.equal(scenarioAssumptionDiscussionIntent(s),true);
 for(const s of ['What was turnover last year?','What if attrition increases in Canada?','What if attrition increases and hire 2?','What about turnover in 2025?'])assert.equal(scenarioAssumptionDiscussionIntent(s),false);
});
test('validated scenario and natural-mode continuations reach discussion with exact draft, without mutation',async()=>{
 for(const mode of [{scenario:{datasetToken:'test-token'}},{natural:{datasetToken:'test-token'}}])for(const text of ['What if attrition increases?','What about backfill?'])await check(text,review,mode,true);
});
test('reset, foreign dataset, pending and tampered receipt cannot bypass turnover guard',async()=>{
 for(const context of [null,{...review,datasetToken:'other'},{...review,goalId:'other'},{...review,revision:999},{...review,inputKey:'other'},{...review,reviewState:'pending-edits'},{...review,draft:null}])await check('What if attrition increases?',context,{natural:{datasetToken:'test-token'}},false);
 await check('What if attrition increases?',review,{},false);
});
test('historical turnover remains guarded even beside a valid scenario',async()=>{
 for(const text of ['What was turnover last year?','What about turnover in 2025?'])await check(text,review,{scenario:{datasetToken:'test-token'}},false);
});
