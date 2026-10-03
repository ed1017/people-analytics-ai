import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSkillsEvidence} from '../lib/skills-evidence-validation.ts';
import {createSkillsEvidenceHandoff} from '../lib/evidence-handoff.ts';
import {enterpriseTalentEvidenceScope} from '../lib/talent-evidence-scope.ts';
import {skill,skillsData} from './fixtures/skills-evidence.mjs';
const handoff=createSkillsEvidenceHandoff({skillsData,skill,evidenceScope:enterpriseTalentEvidenceScope({label:'Company',asOf:skillsData.as_of,populationLabel:'employees',populationCount:10000,supportedBreakdowns:['skill']}),selectedBusinessContext:{country:'All',businessUnit:'All',level:'All'},businessGoal:'Synthetic goal'}).value;
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
test('validation uses only the Skills endpoint with its cancellation signal',async()=>{
 const controller=new AbortController();let calls=0;
 const result=await validateSkillsEvidence(handoff,controller.signal,async(url,options)=>{calls++;assert.equal(url,'/api/skills');assert.equal(options.signal,controller.signal);assert.equal(options.cache,'no-store');return Response.json(skillsData)});
 assert.equal(calls,1);assert.equal(result.freshness.status,'current');assert.deepEqual(result.skills,skillsData);
});
test('already cancelled validation never fetches',async()=>{
 const controller=new AbortController();controller.abort();
 assert.equal(await validateSkillsEvidence(handoff,controller.signal,()=>{throw Error('must not fetch')}),null);
});
test('late response after cancellation cannot publish evidence',async()=>{
 const controller=new AbortController(),late=deferred();
 const result=validateSkillsEvidence(handoff,controller.signal,()=>late.promise);controller.abort();late.resolve(Response.json(skillsData));
 assert.equal(await result,null);
});
test('cancellation during body parsing ignores a late payload',async()=>{
 const controller=new AbortController(),body=deferred(),started=deferred();
 const result=validateSkillsEvidence(handoff,controller.signal,async()=>({ok:true,json:()=>{started.resolve();return body.promise}}));
 await started.promise;controller.abort();body.resolve(skillsData);assert.equal(await result,null);
});
test('failure reports unavailable without overwriting shared Skills data',async()=>{
 const result=await validateSkillsEvidence(handoff,new AbortController().signal,async()=>Response.json({error:'Synthetic source unavailable'},{status:503}));
 assert.equal(result.freshness.status,'unavailable');assert.equal(result.skills,undefined);
});
test('an aborted transport failure cannot replace the new scope result',async()=>{
 const controller=new AbortController();
 const result=await validateSkillsEvidence(handoff,controller.signal,async()=>{controller.abort();throw Error('Old scope')});assert.equal(result,null);
});
