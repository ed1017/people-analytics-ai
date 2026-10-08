import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationCatalog,request,operation,proposal,entered} from './fixtures/home-plan-conversation.mjs';
import {previewPlanConversation,savePlanConversation} from '../lib/home-plan-conversation.ts';
import {reconcileBundle,readBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {initialWhatIf} from '../lib/home-plan-what-if.ts';

const cases=[
 ['hyphenated word prefix','Use twenty-one participants.','participants','twenty','twenty-one participants','people'],
 ['spaced word prefix','Use twenty one participants.','participants','twenty','twenty one participants','people'],
 ['word multiplier','Use ten thousand participants.','participants','ten','ten thousand participants','people'],
 ['word hundred','Use one hundred participants.','participants','one','one hundred participants','people'],
 ['word million','Use two million participants.','participants','two','two million participants','people'],
 ['word fraction','Use ten and a half participants.','participants','ten','ten and a half participants','people'],
 ['word decimal','Use two point five participants.','participants','two','two point five participants','people'],
 ['word range','Use ten to twenty participants.','participants','ten','ten to twenty participants','people'],
 ['digit range','Use 10–20 participants.','participants','10','10–20 participants','people'],
 ['digit prefix','Use 200 participants.','participants','20','200 participants','people'],
 ['grouped digit prefix','Use 20,000 participants.','participants','20','20,000 participants','people'],
 ['decimal prefix','Use 20.5 participants.','participants','20','20.5 participants','people'],
 ['abbreviated multiplier','Use 20k participants.','participants','20','20k participants','people'],
 ['scientific notation','Use 2e3 participants.','participants','2','2e3 participants','people'],
 ['fraction','Use 20/2 participants.','participants','20','20/2 participants','people'],
 ['unicode minus','Use −20 participants.','participants','20','−20 participants','people'],
 ['short quote cannot hide word suffix','Use ten thousand participants.','participants','ten','ten','people'],
 ['short quote cannot hide currency','Budget 9000 AUD.','budget_usd','9000','9000',null],
 ['quarters','Run this for 2 quarters.','horizon_months','2','2 quarters',null],
 ['weeks','Run this for 2 weeks.','horizon_months','2','2 weeks',null],
 ['days','Allow 4 days for coordination.','coordination_hours','4','4 days',null],
 ['minutes','Allow 4 minutes per person.','hours_per_participant','4','4 minutes',null],
 ['mixed duration','Run this for 2 years and 6 months.','horizon_months','2','2 years and 6 months',null],
 ['headcount per group','Use 20 participants per team.','participants','20','20 participants per team','people'],
 ['cash per month','Budget 9000 dollars per month.','budget_usd','9000','9000 dollars per month',null],
 ['AUD suffix','Budget 9000 AUD.','budget_usd','9000','9000 AUD',null],
 ['AUD prefix','Budget AUD 9000.','budget_usd','9000','AUD 9000',null],
 ['lowercase aud','Budget aud 9000.','budget_usd','9000','aud 9000',null],
 ['parenthetical AUD','Budget 9000 (AUD).','budget_usd','9000','9000 (AUD)',null],
 ['JPY suffix','Budget 9000 JPY.','budget_usd','9000','9000 JPY',null],
 ['JPY prefix','Budget JPY 9000.','budget_usd','9000','JPY 9000',null],
 ['rupee symbol','Budget ₹9000.','budget_usd','9000','₹9000',null],
 ['qualified dollars','Budget A$9000.','budget_usd','9000','A$9000',null],
 ['named dollars prefix','Budget Australian dollars 9000.','budget_usd','9000','Australian dollars 9000',null],
 ['unknown currency code','Budget 9000 XYZ.','budget_usd','9000','9000 XYZ',null],
 ['unknown unit','Run this for 2 fortnights.','horizon_months','2','2 fortnights',null],
 ['partial ISO date','Start on 2026-11-10.','start_month','2026-11','2026-11-10',null],
 ['partial named year','Start in October 20260.','start_month','October 2026','October 20260',null],
];
for(const [name,message,field,value,quote,targetId] of cases)test('review: reject '+name+' without changing the catalog',()=>{
 const req=request(message),before=JSON.stringify(req.catalog),response=proposal('revise',['A'],[operation(field,value,quote,targetId)]);
 assert.throws(()=>previewPlanConversation(req,response));assert.throws(()=>savePlanConversation(req.catalog,req,response));assert.equal(JSON.stringify(req.catalog),before);
});
for(const literal of ['twenty-one','twenty one'])test('review: complete '+literal+' remains 21',()=>{
 const req=request(`Use ${literal} participants.`),p=previewPlanConversation(req,proposal('revise',['A'],[operation('participants',literal,`${literal} participants`,'people')]));assert.equal(p.kind,'proposal');assert.equal(p.draft.inputs.groups[0].count.value,21);
});
test('review: two years still converts to 24 months',()=>{const req=request('Run this for two years.'),p=previewPlanConversation(req,proposal('revise',['A'],[operation('horizon_months','two','two years')]));assert.equal(p.draft.inputs.scope.months.value,24);});
test('review: supported bare, USD and dollar inputs retain their basis',()=>{
 for(const [message,quote] of [['Budget 9000.','9000'],['Budget 9000 USD.','9000 USD'],['Budget USD 9000.','USD 9000'],['Budget $9000.','$9000'],['Budget 9000 dollars.','9000 dollars']]){const req=request(message),p=previewPlanConversation(req,proposal('revise',['A'],[operation('budget_usd','9000',quote)]));assert.equal(p.draft.inputs.budget.amount.value,9000);assert.equal(p.draft.inputs.scope.currency,'USD');}
});
test('review: matching illustrative baseline and entered target cannot silently disappear',()=>{
 const c=conversationCatalog();for(const source of c.plans.slice(0,2)){const scenario=initialWhatIf(c.goal,source.draft.inputs);scenario.target=entered(9);source.draft.inputs.whatIf=scenario;source.result=reconcileBundle(source.draft);assert.ok(readBundleDraft(source.draft));}
 assert.deepEqual(c.plans[0].draft.inputs.whatIf,c.plans[1].draft.inputs.whatIf);assert.equal(c.plans[0].draft.inputs.whatIf.baseline.kind,'illustrative');assert.equal(c.plans[0].draft.inputs.whatIf.target.kind,'user-entered');
 const req=request('Combine action plan one and two.',c),p=proposal('combine',['A','B']),before=JSON.stringify(c);
 const result=previewPlanConversation(req,p);assert.equal(result.kind,'clarify');assert.match(result.question,/preserve.*scenario.*provenance/);assert.throws(()=>savePlanConversation(c,req,p),/preserve/);assert.equal(JSON.stringify(c),before);
});
test('review: matching non-illustrative scenario is retained with exact provenance',()=>{
 const c=conversationCatalog();for(const source of c.plans.slice(0,2)){source.draft.inputs.whatIf={...initialWhatIf(c.goal,source.draft.inputs),baseline:entered(15),target:entered(9)};source.result=reconcileBundle(source.draft);}
 const req=request('Combine action plan one and two.',c),p=previewPlanConversation(req,proposal('combine',['A','B']));assert.equal(p.kind,'proposal');assert.deepEqual(p.draft.inputs.whatIf,c.plans[0].draft.inputs.whatIf);
});
const comparisons=[
 ['wrong selected plan','What are the assumptions in this plan?',['B']],
 ['extra selected-plan comparison','What are the assumptions in this plan?',['A','B']],
 ['wrong implicit single plan','What are its assumptions?',['B']],
 ['extra named plan','Compare Action Plan #1 and #2.',['A','B','C']],
 ['missing named plan','Compare Action Plan #1 and #2.',['A']],
 ['unselected implicit comparison','Compare the saved plans.',['A','B']],
];
for(const [name,message,ids] of comparisons)test('review: reject '+name+' without mutation',()=>{const req=request(message),before=JSON.stringify(req.catalog);assert.throws(()=>previewPlanConversation(req,proposal('compare',ids)),/references/);assert.equal(JSON.stringify(req.catalog),before);});
test('review: this plan overrides a previously selected comparison pair',()=>{const req=request('What are the assumptions in this plan?',conversationCatalog(),'A',['B','C']);assert.throws(()=>previewPlanConversation(req,proposal('compare',['B','C'])),/references/);assert.equal(previewPlanConversation(req,proposal('compare',['A'])).plans[0].id,'A');});
test('review: exact named comparison accepts reverse ordering but no extras',()=>{const req=request('Compare Action Plan #1 and #2.',conversationCatalog(),'C');assert.deepEqual(previewPlanConversation(req,proposal('compare',['B','A'])).plans.map(p=>p.id),['B','A']);});
test('review: an explicit named plan plus this plan resolves exactly both identities',()=>{const req=request('Compare Action Plan #2 with this plan.',conversationCatalog(),'A');assert.deepEqual(previewPlanConversation(req,proposal('compare',['A','B'])).plans.map(p=>p.id),['A','B']);assert.throws(()=>previewPlanConversation(req,proposal('compare',['B','C'])),/references/);});
test('review: selected comparison pair is accepted without numbered references',()=>{const req=request('How do these compare?',conversationCatalog(),'C',['A','B']);assert.equal(previewPlanConversation(req,proposal('compare',['A','B'])).plans.length,2);assert.throws(()=>previewPlanConversation(req,proposal('compare',['A','C'])),/references/);});
