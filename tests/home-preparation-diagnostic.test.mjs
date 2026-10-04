import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHomeCandidateProposal,readHomeCandidateProposal,readHomePreparationDiagnostic,homePreparationReasons} from '../lib/home-candidate-options.ts';
import {decodeHomeModelReply,homeReplyFormat} from '../lib/home-chat-reply.ts';
const pack={sources:[{id:'W1',status:'loaded',facts:{headcount:10}},{id:'S1',status:'unavailable',facts:null}]};
const option={operation:'review_capacity',evidence:['W1.headcount']};
const valid={version:2,problem:'Investigate the recorded pattern',problem_evidence:['W1.headcount'],options:[option],question:null};
const changed=fields=>({...valid,options:[{...option,...fields}]});
const cases=[
 ['invalid_envelope',null,pack],['invalid_envelope',{...valid,version:1},pack],
 ['missing_fields',{version:2},pack],['empty',{version:2,problem:null,problem_evidence:[],options:[],question:null},pack],
 ['invalid_problem',{...valid,problem:'x'.repeat(241)},pack],['invalid_problem',{...valid,problem:'Investigate 17 invented roles'},pack],
 ['invalid_question',{...valid,question:'What? When?'},pack],['invalid_question',{...valid,question:17},pack],
 ['invalid_options',{...valid,options:{}},pack],['too_many_options',{...valid,options:Array(50).fill(option)},pack],
 ['evidence_unavailable',valid,null],['invalid_investigation',valid,{sources:[{id:'W1',status:'loaded',facts:{headcount:null}}]}],
 ['invalid_investigation',changed({PRIVATE:'PRIVATE_PAYLOAD_SENTINEL'}),pack],['invalid_investigation',changed({evidence:['PRIVATE_SOURCE_SENTINEL']}),pack],
 ['no_options_or_question',{...valid,options:[]},pack],['ready',valid,pack],
];
for(const [index,[reason,raw,evidence]] of cases.entries())test(`diagnostic branch ${index}: ${reason}`,()=>{
 const result=inspectHomeCandidateProposal(raw,evidence);
 assert.equal(result.diagnostic.reason,reason);
 assert.deepEqual(readHomeCandidateProposal(raw,evidence),result.proposal);
 assert.deepEqual(Object.keys(result.diagnostic).sort(),['missingFieldCount','optionCount','reason']);
 assert.ok(readHomePreparationDiagnostic(result.diagnostic));
 assert.ok(!JSON.stringify(result.diagnostic).includes('PRIVATE_'));
 assert.equal(Boolean(result.proposal),reason==='ready');
});
test('each inspect reason is covered and structural counts are bounded',()=>{
 assert.deepEqual([...new Set(cases.map(c=>c[0]))].sort(),homePreparationReasons.filter(reason=>reason!=='diagnostic_unavailable').slice().sort());
 assert.equal(inspectHomeCandidateProposal({version:2},pack).diagnostic.missingFieldCount,4);
 assert.equal(inspectHomeCandidateProposal({...valid,options:Array(100).fill(option)},pack).diagnostic.optionCount,4);
 assert.equal(inspectHomeCandidateProposal({...valid,options:[],question:'Which outcome matters?'},pack).diagnostic.reason,'ready');
});
test('diagnostics do not infer why the model intentionally returned empty fields',()=>{
 const reply=decodeHomeModelReply(JSON.stringify({answer:'No supported pattern is available.',next_step:'none',problem:null,problem_evidence:[],options:[],question:null}),false,pack);
 assert.equal(reply.candidateDiagnostic.reason,'empty');assert.equal(reply.candidateProposal,null);
});
test('omitted model fields differ from schema-valid empty output and source rejection',()=>{
 const decode=fields=>decodeHomeModelReply(JSON.stringify({answer:'A qualified finding.',next_step:'none',...fields}),false,pack);
 assert.deepEqual(decode({}).candidateDiagnostic,{reason:'missing_fields',optionCount:0,missingFieldCount:4});
 assert.equal(decode({problem:null,problem_evidence:[],options:[],question:null}).candidateDiagnostic.reason,'empty');
 assert.equal(decode(changed({evidence:['UNKNOWN']})).candidateDiagnostic.reason,'invalid_investigation');
});
test('UI metadata parser rejects unknown codes, raw additions and unbounded counts',()=>{
 const safe={reason:'empty',optionCount:0,missingFieldCount:0};
 for(const raw of [null,{...safe,reason:'PRIVATE_SENTINEL'},{...safe,raw:'PRIVATE_SENTINEL'},{...safe,optionCount:5},{...safe,optionCount:'1'},{...safe,missingFieldCount:5},{...safe,optionCount:-1}])assert.equal(readHomePreparationDiagnostic(raw),null);
});
test('malformed JSON and invalid reply errors never echo raw model text',()=>{
 for(const [raw,code] of [['PRIVATE_PAYLOAD_SENTINEL {','invalid_json'],[JSON.stringify({answer:'PRIVATE_PAYLOAD_SENTINEL',next_step:'PRIVATE'}),'invalid_reply']])assert.throws(()=>decodeHomeModelReply(raw,false,pack),error=>error.message===`Home answer unavailable. Preparation diagnostic: ${code}.`&&!String(error.stack).includes('PRIVATE_PAYLOAD_SENTINEL'));
});
test('Responses JSON schema requires all fields but allows legitimate empty preparation',()=>{
 assert.equal(homeReplyFormat.type,'json_schema');assert.equal(homeReplyFormat.strict,true);
 assert.deepEqual(homeReplyFormat.schema.required.slice().sort(),Object.keys(homeReplyFormat.schema.properties).sort());
 assert.equal(homeReplyFormat.schema.additionalProperties,false);
 assert.deepEqual(homeReplyFormat.schema.properties.problem.type,['string','null']);
 assert.deepEqual(homeReplyFormat.schema.properties.question.type,['string','null']);
 assert.equal(homeReplyFormat.schema.properties.options.minItems,undefined);
 assert.deepEqual(homeReplyFormat.schema.properties.options.items.required.slice().sort(),['evidence','operation']);
});
