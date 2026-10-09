/** Exact retained-evidence save/reload contract replay. No browser or provider claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {checkReply,appCommit} from './fixture.mjs';
import {currentSolutionProposals,saveSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {DecisionStore,DECISIONS_STORAGE_KEY} from '../lib/local-decisions.ts';
import {associatePlanProposal,packPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
export async function replayPrivateArtifact(artifact){
 if(artifact?.binding?.appCommit!==appCommit||artifact.redacted||!artifact.records?.completion?.replayEligible)throw Error('private_replay_unavailable');
 const report=artifact.records.completion.report,continuation=artifact.records['provider-2']?.continuation;
 if(!report?.continuationPassed||report.generationAttempts!==2||report.wireAttempts!==2||
    continuation?.call?.name!=='evaluate_candidate'||continuation.output?.call_id!==continuation.call.call_id||
    createHash('sha256').update(continuation.output.output).digest('hex')!==report.continuation?.toolResultSha256)throw Error('private_replay_unavailable');
 const {request}=artifact.records.request,{replyText,httpStatus,datasetToken}=artifact.records.reply,{final,checks}=artifact.records.checks;
 if(httpStatus!==200||datasetToken!=='legacy-v1:0')throw Error('private_replay_unavailable');
 const reply=JSON.parse(replyText);assert.deepEqual(await checkReply(request,reply,0,final),checks);
 const proposals=currentSolutionProposals(reply.state),results=[];
 assert.equal(JSON.parse(continuation.output.output).id,proposals[0].id);
 assert.equal(JSON.parse(continuation.call.arguments).candidate.id,proposals[0].id);
 for(const proposal of proposals){
  // Each plan is independently reviewed against identical retained evidence/state.
  const reviewRequest={...structuredClone(request),state:structuredClone(reply.state)},before=JSON.stringify(reviewRequest);
  const goal={id:'offline-reviewed-goal',statement:proposal.candidate.goal.statement};
  const outcome=await saveSolutionCandidate(reviewRequest,null,proposal,goal,request.evidence,true);
  assert.equal(outcome.status,'ready');assert.equal(JSON.stringify(reviewRequest),before);
  const selected=associatePlanProposal(outcome.catalog,outcome.catalog,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:outcome.plan.requestId,at:'2026-10-09T00:00:00Z',acknowledgeUnknowns:true});
  assert.equal(selected.plans[0].applied,false);assert.equal(selected.plans.length,1);assert.equal(selected.attachments.length,1);
  assert.deepEqual(selected.plans[0].draft.bundle,proposal.draft.bundle);assert.equal(selected.plans[0].operation.proposalKey,JSON.stringify(proposal.candidate));
  const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)},store=new DecisionStore();store.initialize(storage);
  store.commitExplorationFields(store.getSnapshot().data.revision,'2026-10-09T00:00:00Z',()=>({[planAlternativesField]:packPlanAlternatives(selected)}));
  assert.ok(memory.get(DECISIONS_STORAGE_KEY));const reloaded=new DecisionStore();reloaded.initialize(storage);
  assert.deepEqual(reloaded.getSnapshot().data.exploration.fields[planAlternativesField],packPlanAlternatives(selected));
  results.push({candidateId:proposal.id,exactCandidateRetained:true,reviewInputUnchanged:true,saveContractPassed:true,attachmentRetained:true,reloadPreserved:true,applied:false});
 }
 return {providerCalls:0,databaseCalls:0,exactRetainedEvidence:true,browserVerified:false,liveGoalSaved:false,checks:results};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)throw Error('one_private_artifact_required');
 console.log(JSON.stringify(await replayPrivateArtifact(JSON.parse(readFileSync(process.argv[2])))));
}
