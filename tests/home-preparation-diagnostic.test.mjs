import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHomeCandidateProposal,readHomeCandidateProposal,readHomePreparationDiagnostic,homePreparationReasons} from '../lib/home-candidate-options.ts';
import {decodeHomeModelReply,homeReplyFormat} from '../lib/home-chat-reply.ts';
const pack={sources:[{id:'W1',status:'loaded',facts:{headcount:10}},{id:'S1',status:'unavailable',facts:null}]};
const option={title:'Investigate capacity',outcome:'Assess internal capacity',why:'The recorded snapshot supports an investigation.',source_ids:['W1']};
const valid={version:1,problem:'Investigate the recorded pattern',options:[option],question:null};
const changed=fields=>({...valid,options:[{...option,...fields}]});
const cases=[
 ['invalid_envelope',null,pack],['invalid_envelope',{...valid,version:2},pack],
 ['missing_fields',{version:1},pack],['empty',{version:1,problem:null,options:[],question:null},pack],
 ['invalid_problem',{...valid,problem:'x'.repeat(241)},pack],['invalid_problem',{...valid,problem:null},pack],
 ['invalid_question',{...valid,question:'What? When?'},pack],['invalid_question',{...valid,question:17},pack],
 ['invalid_options',{...valid,options:{}},pack],['too_many_options',{...valid,options:Array(50).fill(option)},pack],
 ['evidence_unavailable',valid,null],['evidence_unavailable',valid,{sources:[{id:'W1',status:'loaded',facts:{headcount:null}}]}],
 ['invalid_option_shape',changed({PRIVATE:'PRIVATE_PAYLOAD_SENTINEL'}),pack],['invalid_option_shape',{...valid,options:[null]},pack],
 ['invalid_option_text',changed({why:''}),pack],['invalid_source_refs',changed({source_ids:[]}),pack],['invalid_source_refs',changed({source_ids:[17]}),pack],
 ['source_unavailable',changed({source_ids:['PRIVATE_SOURCE_SENTINEL']}),pack],['source_unavailable',changed({source_ids:['S1']}),pack],
 ['wording_rejected',changed({outcome:'Improve capacity'}),pack],['numeric_or_effect_token',changed({why:'Review 17 PRIVATE_PAYLOAD_SENTINEL entries.'}),pack],
 ['numeric_or_effect_token',changed({why:'This is not proof of a cause.'}),pack],
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
 assert.equal(inspectHomeCandidateProposal({version:1},pack).diagnostic.missingFieldCount,3);
 assert.equal(inspectHomeCandidateProposal({...valid,options:Array(100).fill(option)},pack).diagnostic.optionCount,4);
 assert.equal(inspectHomeCandidateProposal({...valid,options:[],question:'Which outcome matters?'},pack).diagnostic.reason,'ready');
});
test('diagnostics do not infer why the model intentionally returned empty fields',()=>{
 const reply=decodeHomeModelReply(JSON.stringify({answer:'No supported pattern is available.',next_step:'none',problem:null,options:[],question:null}),false,pack);
 assert.equal(reply.candidateDiagnostic.reason,'empty');assert.equal(reply.candidateProposal,null);
});
test('omitted model fields differ from schema-valid empty output and source rejection',()=>{
 const decode=fields=>decodeHomeModelReply(JSON.stringify({answer:'A qualified finding.',next_step:'none',...fields}),false,pack);
 assert.deepEqual(decode({}).candidateDiagnostic,{reason:'missing_fields',optionCount:0,missingFieldCount:3});
 assert.equal(decode({problem:null,options:[],question:null}).candidateDiagnostic.reason,'empty');
 assert.equal(decode(changed({source_ids:['UNKNOWN']})).candidateDiagnostic.reason,'source_unavailable');
});
test('UI metadata parser rejects unknown codes, raw additions and unbounded counts',()=>{
 const safe={reason:'empty',optionCount:0,missingFieldCount:0};
 for(const raw of [null,{...safe,reason:'PRIVATE_SENTINEL'},{...safe,raw:'PRIVATE_SENTINEL'},{...safe,optionCount:5},{...safe,optionCount:'1'},{...safe,missingFieldCount:4},{...safe,optionCount:-1}])assert.equal(readHomePreparationDiagnostic(raw),null);
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
 assert.deepEqual(homeReplyFormat.schema.properties.options.items.required.slice().sort(),['outcome','source_ids','title','why']);
});
