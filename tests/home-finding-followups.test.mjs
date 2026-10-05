import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {normalizeHomePack} from '../lib/home-pack.mjs';
import {readHomeFindingFollowups,buildHomeFindingPrompt} from '../lib/home-finding-followups.ts';
import {buildHomeReplyFormat,decodeHomeModelReply} from '../lib/home-chat-reply.ts';
const Ajv=createRequire(import.meta.url)('ajv'),ajv=new Ajv();
const pack=normalizeHomePack({sources:[{id:'W1',status:'loaded',facts:{headcount:10}},{id:'A1',status:'loaded',facts:{voluntary_exits:4}}]});
const item={id:'f1',text:'Four voluntary exits were recorded company-wide; causes are unknown. [A1]',evidence:['A1:summary'],prompt:'What can the supplied exit evidence tell us, and which details are unavailable?'};
const answer=`A recorded pattern needs review.\n\n- ${item.text}\n- Keep the scope and uncertainty visible.\n\nChoose an investigation.`;
const reply=(items=[item])=>({answer,finding_followups:items,next_step:'none',problem:null,problem_evidence:[],options:[],question:null});
test('production schema and decoder preserve one exact visible finding/prompt pair',()=>{
 assert.equal(ajv.compile(buildHomeReplyFormat(pack).schema)(reply()),true);
 assert.deepEqual(decodeHomeModelReply(JSON.stringify(reply()),false,pack).findingFollowups,[item]);
 assert.equal(decodeHomeModelReply(JSON.stringify(reply()),false,pack).answer,answer);
});
test('legacy replies, ordinary bullets and empty metadata never acquire inferred actions',()=>{
 for(const finding_followups of [undefined,null,[],{}])assert.deepEqual(decodeHomeModelReply(JSON.stringify({...reply(),finding_followups}),false,pack).findingFollowups,[]);
});
test('exact unique visible correspondence rejects paraphrases, substring matching, duplicate text and non-bullets',()=>{
 for(const text of [answer.replace('Four','Five'),answer+'\n'+item.text,answer.replace('- '+item.text,item.text),answer.replace('- '+item.text,'- Prefix '+item.text),answer.replace('- '+item.text,'* '+item.text),answer+'\n- '+item.text])assert.deepEqual(readHomeFindingFollowups([item],text,pack),[]);
});
test('unavailable, suppressed, unknown or uncited evidence fails closed',()=>{
 for(const evidence of [[],['A1:summary','A1:summary'],['A1:row:99'],['S2:summary'],['W1:summary'],['A1:summary','W1:summary']])assert.deepEqual(readHomeFindingFollowups([{...item,evidence}],answer,pack),[]);
 for(const source of [{id:'A1',status:'unavailable',facts:{voluntary_exits:4}},{id:'A1',status:'loaded',facts:{voluntary_exits:null}},{id:'A1',status:'loaded',facts:{suppressed:true,voluntary_exits:4}}])assert.deepEqual(readHomeFindingFollowups([item],answer,{sources:[source]}),[]);
});
test('IDs, text, prompts, metadata fields and evidence lengths are bounded and unique',()=>{
 for(const patch of [{id:'f5'},{id:' f1'},{extra:true},{prompt:''},{prompt:'x'.repeat(241)},{prompt:'Question\nInjected line'},{text:'x'.repeat(281)},{text:'**'+item.text+'**'},{text:item.text+'\u200b'},{evidence:['A1:summary','W1:summary','x','y']}])assert.deepEqual(readHomeFindingFollowups([{...item,...patch}],answer,pack),[]);
 const second={...item,id:'f2',text:'Ten employees are in the selected snapshot. [W1]',evidence:['W1:summary'],prompt:'Which snapshot limitations affect interpretation?'};
 const two=answer+'\n- '+second.text;
 assert.equal(readHomeFindingFollowups([item,second],two,pack).length,2);
 for(const bad of [[item,{...second,id:'f1'}],[item,{...second,prompt:item.prompt}],Array(5).fill(item)])assert.deepEqual(readHomeFindingFollowups(bad,two,pack),[]);
});
test('all four designated findings validate without activating adjacent ordinary prose',()=>{
 const items=Array.from({length:4},(_,i)=>({...item,id:`f${i+1}`,text:`Recorded finding ${i+1} retains uncertainty. [A1]`,prompt:`What uncertainty should we review for finding ${i+1}?`}));
 const text=items.map(value=>'- '+value.text).join('\n')+'\n- Plain next step.';
 assert.deepEqual(readHomeFindingFollowups(items,text,pack),items);
 assert.deepEqual(decodeHomeModelReply(JSON.stringify({...reply(items),answer:text}),false,pack).findingFollowups,items);
});
test('request-specific schema restricts finding evidence and empty packets to zero actions',()=>{
 const schema=ajv.compile(buildHomeReplyFormat(pack).schema);
 assert.equal(schema(reply([{...item,evidence:['S2:summary']}])),false);
 assert.equal(schema(reply(Array(5).fill(item))),false);
 assert.equal(ajv.compile(buildHomeReplyFormat({sources:[]}).schema)(reply()),false);
 assert.equal(ajv.compile(buildHomeReplyFormat({sources:[]}).schema)(reply([])),true);
});
test('follow-up sends the exact selected text and question with bounded existing-evidence constraints',()=>{
 const prompt=buildHomeFindingPrompt(item);
 assert.ok(prompt.includes(item.text)&&prompt.includes(item.prompt));
 assert.match(prompt,/current supplied Home evidence/);
 assert.match(prompt,/sampled coverage and uncertainty/);
 assert.match(prompt,/breakdown is unavailable/);
 assert.ok(prompt.length<1000);
 assert.doesNotMatch(prompt,/homeSolutionBundlesV1|overviewBriefingContext|employee_name/);
});
