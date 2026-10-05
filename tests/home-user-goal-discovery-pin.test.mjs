import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {exactAcceptancePrompt,exactAcceptanceGoal} from './fixtures/home-exact-acceptance.mjs';
import {homeUserGoalForPin} from '../lib/home-planning-intent.ts';
import {buildHomeReplyFormat,decodeHomeModelReply} from '../lib/home-chat-reply.ts';
import {inspectHomeChatResponse} from '../lib/home-chat-response.ts';
const pack={sources:[{id:'W1',status:'loaded',facts:{headcount:5000}}]},require=createRequire(import.meta.url),Ajv=require('ajv');
const empty={answer:'Three intervention mixes are proposed for review; effectiveness remains unproven.',finding_followups:[],next_step:'none',problem:null,problem_evidence:[],options:[],question:null};
test('schema-valid empty discovery has the exact reported diagnostic while the authored goal remains independently available',()=>{
 const validate=new Ajv({strict:false}).compile(buildHomeReplyFormat(pack).schema);assert.equal(validate(empty),true,JSON.stringify(validate.errors));
 const result=inspectHomeChatResponse({status:'completed',output_text:JSON.stringify(empty)},false,pack,4000);assert.equal(result.ok,true);assert.equal(result.body.candidateProposal,null);assert.deepEqual(result.body.candidateDiagnostic,{reason:'empty',field:'none',optionCount:0,missingFieldCount:0});assert.equal(homeUserGoalForPin([exactAcceptancePrompt]),exactAcceptanceGoal);
});
test('malformed candidates remain rejected and neither model problem nor prose supplies the user goal',()=>{
 const reply=decodeHomeModelReply(JSON.stringify({...empty,answer:exactAcceptanceGoal,problem:'Improve a model-selected objective',options:{}}),false,pack);assert.equal(reply.candidateProposal,null);assert.equal(reply.candidateDiagnostic.reason,'invalid_options');
 assert.equal(homeUserGoalForPin(['What does the evidence show?']),null);assert.equal(homeUserGoalForPin([exactAcceptancePrompt]),exactAcceptanceGoal);
 assert.throws(()=>decodeHomeModelReply('{',false,pack),/invalid_json/);
});
for(const goal of ['Reduce turnover','I want to reduce turnover','I need more AI capability without increasing headcount','We want better manager support','We need stronger internal mobility'])test(`explicit natural declaration: ${goal}`,()=>assert.equal(homeUserGoalForPin([goal]),goal));
for(const label of ['Goal: ','My goal: ','Our goal: ','Outcome: ','Synthetic planning test: '])test(`bounded authored label: ${label}`,()=>assert.equal(homeUserGoalForPin([label+'Reduce turnover']),'Reduce turnover'));
for(const ambiguous of ['What should our goal be?','How can we reduce turnover?','Reduce turnover or increase capacity','Should we reduce turnover or increase capacity?','I need help','I want advice','Three intervention mixes were mentioned.'])test(`no independent goal inferred from: ${ambiguous}`,()=>assert.equal(homeUserGoalForPin([ambiguous]),null));
test('accepted user clarification can retain an earlier explicit goal without using assistant content',()=>{assert.equal(homeUserGoalForPin([exactAcceptancePrompt,'Use the annualized rate, not an exit count.']),exactAcceptanceGoal)});
