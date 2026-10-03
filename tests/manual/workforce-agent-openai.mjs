// Manual opt-in only. Do not run the live mode until a relevant configuration
// fix is confirmed. This is not discovered by the tests/*.test.mjs unit suite.
import {workforceReviewFixture} from '../fixtures/workforce-review.mjs';
import {createWorkforceSolution,emptySolutionInputs,beginSolutionRun,completeSolutionRun} from '../../lib/workforce-solution.ts';
import {calculateWorkforceIncrement} from '../../lib/workforce-increment.ts';
import {runWorkforcePlanningAgent,readWorkforceAgentReview} from '../../lib/workforce-planning-agent.ts';
import {configuredWorkforceAgentOpenAIModel} from '../../lib/workforce-agent-openai.ts';

if (process.argv.length!==3 || process.argv[2]!=='--live-synthetic-after-confirmed-config-fix') {
  console.log('Not run. Live synthetic testing requires a confirmed relevant configuration fix and explicit opt-in. No request was sent.');
  process.exitCode=2;
} else {
  let calls=0;
  try {
    const payload=workforceReviewFixture(),at=payload.calculatedAt;
    payload.input.budget='20000';
    payload.proposed=calculateWorkforceIncrement(payload.input,payload.timing);
    payload.hireOnly=calculateWorkforceIncrement({...payload.input,build:'0',move:'0',buy:payload.input.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},payload.timing);
    const initial=createWorkforceSolution('synthetic-solution','synthetic-goal',{...emptySolutionInputs(),scope:{...payload.input,goalStatement:'Synthetic test: compare three additional Engineer positions in Technology.'}},at);
    const started=beginSolutionRun(initial,1,'synthetic-source',['brief'],at);
    const solution=completeSolutionRun(started.state,started.ticket,[{id:'synthetic-evidence',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);
    const model=configuredWorkforceAgentOpenAIModel();
    const review=await runWorkforcePlanningAgent({solution,currentSolution:()=>solution,evidenceResultId:'synthetic-evidence',reviewedRevisions:[{...payload.input,trainingCash:'0'}],allowRevision:true,runId:'synthetic-agent',signal:new AbortController().signal,model:async(turn,signal)=>{calls++;return model(turn,signal)}});
    if(!readWorkforceAgentReview(review,solution))throw Error('Unvalidated synthetic review.');
    console.log(JSON.stringify({syntheticOnly:true,protocolValidated:true,modelTurns:calls,conclusion:review.conclusion,preferredOptionId:review.preferredOptionId,revisionEvaluations:review.revisionEvaluations,requiresUserReview:true}));
  } catch(error) {
    // Emit only fixed adapter outcomes; never print a stack, raw response or
    // arbitrary SDK/parser error. The first failure ends this single scenario.
    const message=error instanceof Error?error.message:'';
    const http=message.match(/^Workforce model request failed \(HTTP (\d{3})\); no retry was attempted\.$/);
    console.log(JSON.stringify({syntheticOnly:true,protocolValidated:false,modelTurns:calls,status:http?Number(http[1]):null,result:'Stopped; no retry or saved review. Check configuration or protocol in the approved boundary.'}));
    process.exitCode=1;
  }
}
