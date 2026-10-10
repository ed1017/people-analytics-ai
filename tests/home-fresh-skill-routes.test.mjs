import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSkillClient} from './fixtures/fresh-skill-client.mjs';
import {offlineFreshSkillRoutes} from './helpers/offline-fresh-skill-routes.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';

test('actual fresh reader routes preserve evidence, deduplicate, reject changed facts and reread on the next request',async t=>{
 const {client,state}=freshSkillClient(),routes=await offlineFreshSkillRoutes(client);t.after(routes.dispose);
 const local=()=>new Request('http://offline.invalid/',{headers:{'x-workforce-dataset':'legacy-v1:0'}});
 const skills=await(await routes.skills(local())).json(),learning=await(await routes.learning(local())).json();
 const body=solutionRequest('Review a synthetic learning option');body.evidence=buildHomePack({skills:{status:'loaded',data:skills},'learning-development':{status:'loaded',data:learning}},body.scope);
 const before=JSON.stringify(body.evidence),timings=[];state.calls.length=0;
 const run=()=>routes.withDatasetRequest(local(),async()=>Response.json(await routes.ground(body,new AbortController().signal,value=>timings.push(value))));
 const result=await(await run()).json();
 assert.match(result.packetSha256,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(body.evidence),before);
 assert.equal(state.calls.filter(c=>c.table==='skills_proficiency_gap_summary').length,1);
 assert.equal(state.calls.filter(c=>c.table==='dashboard_overview_current').length,1);
 assert.equal(state.calls.length,8,'Same other queries; two duplicate reads removed');
 assert.deepEqual(Array.from(timings[0],x=>x.reader).sort(),['learning-development','skills']);
 assert.ok(timings[0].every(x=>x.startedAfterMs>=0&&x.elapsedMs>=0));
 assert.equal(result.groundingReaders,undefined,'Timing stays outside model evidence');
 await run();assert.equal(state.calls.filter(c=>c.table==='skills_proficiency_gap_summary').length,2);
 state.headcount=19;await assert.rejects(run(),/Current database evidence is unavailable or changed/);
 assert.equal(timings.length,2,'Failed verification does not report successful reader timings');
 const learningOnly=solutionRequest('Review learning only');learningOnly.evidence=buildHomePack({'learning-development':{status:'loaded',data:learning}},learningOnly.scope);state.headcount=17;state.calls.length=0;
 await routes.withDatasetRequest(local(),async()=>Response.json(await routes.ground(learningOnly,new AbortController().signal)));
 assert.equal(state.calls.length,5);assert.doesNotMatch(state.calls.find(c=>c.table==='skills_proficiency_gap_summary').columns,/avg_required_proficiency/);
});
