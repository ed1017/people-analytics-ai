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
 ['AUD after dollars','Budget 9000 dollars (AUD).','budget_usd','9000','9000 dollars (AUD)',null],
 ['AUD after dollars in','Budget 9000 dollars in AUD.','budget_usd','9000','9000 dollars in AUD',null],
 ['short quote cannot hide trailing currency','Budget 9000 dollars (AUD).','budget_usd','9000','9000 dollars',null],
 ['USD with trailing foreign currency','Budget 9000 USD (AUD).','budget_usd','9000','9000 USD',null],
 ['foreign currency after comma','Budget 9000 dollars, in AUD.','budget_usd','9000','9000 dollars',null],
 ['foreign currency after semicolon','Budget 9000 dollars; in AUD.','budget_usd','9000','9000 dollars',null],
 ['unknown trailing currency modifier','Budget 9000 dollars denominated in AUD.','budget_usd','9000','9000 dollars',null],
 ['weekly participant hours','Allow 4 hours per person per week.','hours_per_participant','4','4 hours per person per week',null],
 ['monthly participant hours','Allow 4 hours per participant each month.','hours_per_participant','4','4 hours per participant',null],
 ['parenthetical weekly basis','Allow 4 hours per person (weekly).','hours_per_participant','4','4 hours',null],
 ['weekly basis after comma','Allow 4 hours per person, per week.','hours_per_participant','4','4 hours per person',null],
 ['weekly basis after purpose','Allow 4 hours for coordination per week.','coordination_hours','4','4 hours for coordination',null],
 ['weekly basis after slash','Allow 4 hours per person/week.','hours_per_participant','4','4 hours per person',null],
 ['headcount basis after punctuation','Use 20 participants, per team.','participants','20','20 participants','people'],
 ['ambiguous alternative amount','Budget 9000, perhaps 8000.','budget_usd','9000','Budget 9000',null],
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
for(const [literal,amount] of [['fifty',50],['twenty-one',21],['twenty one',21],['ninety',90]])test('review: complete '+literal+' dollars is a supported cash allowance',()=>{
 const req=request(`Cash allowance should be ${literal} dollars.`),before=JSON.stringify(req.catalog),p=proposal('revise',['A'],[operation('cash_allowance_usd',literal,`${literal} dollars`,'fee')]);
 const preview=previewPlanConversation(req,p),out=savePlanConversation(req.catalog,req,p);assert.equal(preview.kind,'proposal');assert.equal(out.plan.result.cashEstimate.cash,amount);assert.equal(out.plan.draft.inputs.budget.amount.value,10000);assert.equal(JSON.stringify(req.catalog),before);
});
for(const suffix of ['dollars (USD)','dollars in USD','(USD)'])test('review: explicit '+suffix+' is supported',()=>{
 const req=request(`Budget 9000 ${suffix}.`),p=previewPlanConversation(req,proposal('revise',['A'],[operation('budget_usd','9000',`9000 ${suffix}`)]));assert.equal(p.kind,'proposal');assert.equal(p.draft.inputs.budget.amount.value,9000);
});
for(const [message,first,second] of [
 ['Budget 8000 USD and 25 participants.','8000 USD','25 participants'],
 ['Budget 8000 USD, with 25 participants.','8000 USD','25 participants'],
 ['Budget 8000 dollars; use twenty-five participants.','8000 dollars','twenty-five participants'],
 ['Use 25 participants and budget 8000 USD.','8000 USD','25 participants'],
])test('review: independently quoted compound assumptions save atomically: '+message,()=>{
 const req=request(message),before=JSON.stringify(req.catalog),count=second.startsWith('twenty')?'twenty-five':'25',p=proposal('revise',['A'],[operation('budget_usd','8000',first),operation('participants',count,second,'people')]);
 const out=savePlanConversation(req.catalog,req,p);assert.equal(out.plan.draft.inputs.budget.amount.value,8000);assert.equal(out.plan.draft.inputs.groups[0].count.value,25);assert.equal(out.plan.result.deliveryEstimate.hours,58);assert.equal(out.catalog.plans.length,4);assert.equal(out.plan.applied,false);assert.equal(out.catalog.attachments.length,0);assert.equal(JSON.stringify(req.catalog),before);
});
test('review: adjacent word-dollar amounts remain independent supported cash fields',()=>{
 const req=request('Cash allowance should be fifty dollars, and budget 8000 dollars.'),p=proposal('revise',['A'],[operation('cash_allowance_usd','fifty','fifty dollars','fee'),operation('budget_usd','8000','8000 dollars')]);const out=savePlanConversation(req.catalog,req,p);assert.equal(out.plan.result.cashEstimate.cash,50);assert.equal(out.plan.draft.inputs.budget.amount.value,8000);
});
test('review: compound dimensions accept each complete basis and compute hours',()=>{
 const req=request('Allow four hours per person and six hours for coordination.'),p=proposal('revise',['A'],[operation('hours_per_participant','four','four hours per person'),operation('coordination_hours','six','six hours for coordination')]);const out=savePlanConversation(req.catalog,req,p);assert.equal(out.plan.result.deliveryEstimate.hours,46);
});
test('review: every supported acceptance-plan clause survives complete-tail validation',()=>{
 const req=request('Start this plan in October 2026, run it for two years, allow four hours per person, and set the Test delivery fee to 2400 USD.'),p=proposal('revise',['A'],[operation('start_month','October 2026','October 2026'),operation('horizon_months','two','two years'),operation('hours_per_participant','four','four hours per person'),operation('cash_allowance_usd','2400','2400 USD','fee')]);const out=savePlanConversation(req.catalog,req,p);assert.equal(out.plan.draft.inputs.scope.months.value,24);assert.equal(out.plan.result.deliveryEstimate.hours,48);assert.equal(out.plan.result.cashEstimate.cash,2400);
});
for(const [message,field,value,quote,targetId] of [
 ['Budget 9000 dollars (AUD) and 25 participants.','budget_usd','9000','9000 dollars',null],
 ['Budget 9000 dollars in AUD, with 25 participants.','budget_usd','9000','9000 dollars',null],
 ['Allow 4 hours per person per week and 25 participants.','hours_per_participant','4','4 hours per person',null],
 ['Allow 4 hours per person, per week, and 25 participants.','hours_per_participant','4','4 hours per person',null],
])test('review: another valid operation cannot hide an unsupported modifier: '+message,()=>{
 const req=request(message),before=JSON.stringify(req.catalog),p=proposal('revise',['A'],[operation(field,value,quote,targetId),operation('participants','25','25 participants','people')]);assert.throws(()=>previewPlanConversation(req,p));assert.throws(()=>savePlanConversation(req.catalog,req,p));assert.equal(JSON.stringify(req.catalog),before);
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
