import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildHomeReplyFormat,decodeHomeModelReply} from '../lib/home-chat-reply.ts';
import {normalizeHomePack} from '../lib/home-pack.mjs';
import {investigationOperations,investigationMetrics,availableInvestigationMetrics} from '../lib/home-investigation-contract.ts';
import {readHomePreparationDiagnostic} from '../lib/home-candidate-options.ts';
const require=createRequire(import.meta.url),Ajv=require('ajv');
const ajv=new Ajv({allErrors:true});
const sourceMap={};for(const m of Object.values(investigationMetrics)){sourceMap[m.source]??={id:m.source,status:'loaded',facts:{}};sourceMap[m.source].facts[m.field]=24;}
const full=normalizeHomePack({sources:Object.values(sourceMap)});
const raw=(id,operation)=>({answer:'Synthetic investigation context.',next_step:'none',problem:'Investigate recorded workforce context',problem_evidence:[id],options:[{operation,evidence:[id]}],question:null});
const fullSchema=ajv.compile(buildHomeReplyFormat(full).schema);
for(const [id,m] of Object.entries(investigationMetrics))test('all operations agree with decoder for '+id,()=>{
 for(const operation of investigationOperations){const reply=raw(id,operation),expected=operation===m.operation;assert.equal(fullSchema(reply),expected);const result=decodeHomeModelReply(JSON.stringify(reply),false,full);assert.equal(!!result.candidateProposal,expected);assert.equal(result.candidateDiagnostic.reason,expected?'ready':'operation_mismatch');}
});
for(const [id,m] of Object.entries(investigationMetrics))test('packet availability controls generation and decoding for '+id,()=>{
 for(const value of [null,undefined,'24',NaN,-1,m.kind==='count'?1.5:m.kind==='percent'?101:Infinity]){
  const pack=structuredClone(full);pack.sources.find(s=>s.id===m.source).facts[m.field]=value;
  const schema=ajv.compile(buildHomeReplyFormat(pack).schema),reply=raw(id,m.operation);
  assert.equal(schema(reply),false);assert.equal(decodeHomeModelReply(JSON.stringify(reply),false,pack).candidateProposal,null);
 }
});
const sparse=normalizeHomePack({sources:Object.entries({W1:{headcount:12},W2:{headcount:12},A1:{total_exits:6},R1:{open_requisitions:4},S1:{engagement_respondents:7},S2:{exit_respondents:8},T1:{current_workforce:12},T2:{current_workforce:12},T3:{active_employees:12},T4:{distinct_recorded_employees:4},P2:{current_positions:20}}).map(([id,facts])=>({id,status:'loaded',facts}))});
test('eleven loaded sources expose only three actually resolvable catalog metrics',()=>{
 assert.equal(sparse.coverage.available,11);assert.equal(sparse.coverage.total,18);
 const ids=['W1.headcount','R1.open_requisitions','S2.exit_respondents'];assert.deepEqual(availableInvestigationMetrics(sparse),ids);
 const format=buildHomeReplyFormat(sparse);assert.deepEqual(format.schema.properties.problem_evidence.items.enum,ids);
 const emitted=format.schema.properties.options.items.anyOf.flatMap(b=>b.properties.evidence.items.enum);assert.deepEqual(emitted,ids);
 const validate=ajv.compile(format.schema);for(const [id,m] of Object.entries(investigationMetrics)){const reply=raw(id,m.operation);assert.equal(validate(reply),ids.includes(id));assert.equal(!!decodeHomeModelReply(JSON.stringify(reply),false,sparse).candidateProposal,ids.includes(id));}
});
test('unavailable sources and suppressed facts never enter the output choices',()=>{
 for(const mutation of ['unavailable','suppressed']){const pack=structuredClone(full);const source=pack.sources.find(s=>s.id==='W1');if(mutation==='unavailable')source.status='unavailable';else source.facts.suppressed=true;const schema=ajv.compile(buildHomeReplyFormat(pack).schema);assert.equal(schema(raw('W1.headcount','review_capacity')),false);assert.equal(decodeHomeModelReply(JSON.stringify(raw('W1.headcount','review_capacity')),false,pack).candidateDiagnostic.reason,'source_unavailable');}
});
test('no eligible metric explicitly allows only null/empty preparation',()=>{
 const packet={sources:[{id:'W2',status:'loaded',facts:{headcount:12}}]},format=buildHomeReplyFormat(packet),validate=ajv.compile(format.schema);
 const empty={answer:'The selected catalog evidence is unavailable.',next_step:'none',problem:null,problem_evidence:[],options:[],question:null};
 assert.equal(validate(empty),true);assert.equal(decodeHomeModelReply(JSON.stringify(empty),false,packet).candidateDiagnostic.reason,'empty');
 for(const changed of [{problem:'Invented investigation'},{problem_evidence:['W1.headcount']},{options:raw('W1.headcount','review_capacity').options},{question:'An investigation question?'}])assert.equal(validate({...empty,...changed}),false);
 assert.equal(JSON.stringify(format).includes('"enum":[]'),false);
});
test('precise remaining runtime reasons expose only fixed fields and structural counts',()=>{
 const base=raw('W1.headcount','review_capacity');
 const cases=[['duplicate_reference','options.evidence',{...base,options:[{operation:'review_capacity',evidence:['W1.headcount','W1.headcount']}]}],['reference_shape','problem_evidence',{...base,problem_evidence:[]}]];
 for(const [reason,field,reply] of cases){assert.equal(fullSchema(reply),true);const result=decodeHomeModelReply(JSON.stringify(reply),false,full);assert.equal(result.candidateProposal,null);assert.deepEqual(result.candidateDiagnostic,{reason,field,optionCount:1,missingFieldCount:0});assert.ok(readHomePreparationDiagnostic(result.candidateDiagnostic));assert.ok(!JSON.stringify(result.candidateDiagnostic).includes('W1'));}
});
test('the packet and model input evidence are never mutated when deriving constraints',()=>{const before=structuredClone(full);buildHomeReplyFormat(full);assert.deepEqual(full,before);assert.deepEqual(buildHomeReplyFormat(full),buildHomeReplyFormat(normalizeHomePack(full)))});

test('independent available problem and candidate sources pass schema and decoder',()=>{const reply={...raw('W1.headcount','review_capacity'),problem_evidence:['R1.open_requisitions']};assert.equal(fullSchema(reply),true);assert.equal(decodeHomeModelReply(JSON.stringify(reply),false,full).candidateDiagnostic.reason,'ready');});
