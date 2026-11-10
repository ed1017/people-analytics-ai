// @ts-expect-error Native offline tests share application source.
import {emptySolutionState,readSolutionRequest,readSolutionState,type SolutionRequest,type SolutionState} from './home-solution-conversation.ts';
import {businessUnitTurnoverIntent} from './home-bu-turnover-chat.mjs';

/** A bounded workforce question is not a request to use or edit the selected plan.
 * Keep the saved workspace intact and verify fresh public evidence separately.
 * Scenario discussions and unrecognized questions retain the strict plan route. */
export function independentWorkforceQuestion(request:SolutionRequest):SolutionRequest|null {
 if(request.goalContext&&typeof request.goalContext==='object'&&'scenarioReview' in request.goalContext)return null;
 if(!businessUnitTurnoverIntent(request.message.text,request.state.turns))return null;
 return readSolutionRequest({version:1,requestId:request.requestId,goal:{id:'',statement:''},scope:request.scope,filters:request.filters,timeZone:request.timeZone,evidence:request.evidence,goalContext:null,selectedId:null,catalog:null,state:{...emptySolutionState(),turns:request.state.turns},message:request.message});
}

/** Only conversation turns return from the detached read. Never replace planning
 * state with its empty transport state, or accept new proposals on this route. */
export function retainIndependentWorkforceAnswer(original:SolutionRequest,reply:{state:SolutionState;candidateIds:string[];analysisIds:string[];progressProposal?:unknown;demandReview?:unknown}):SolutionState {
 const state=readSolutionState(structuredClone(reply.state)),empty=readSolutionState(emptySolutionState());
 if(reply.candidateIds.length||reply.analysisIds.length||reply.progressProposal||reply.demandReview||JSON.stringify({...state,turns:[]})!==JSON.stringify(empty))throw Error('The independent workforce answer included unexpected planning changes. Your saved work is kept.');
 const turns=state.turns;
 if(turns.at(-2)?.id!==original.message.id||turns.at(-2)?.text!==original.message.text||turns.at(-2)?.role!=='user'||turns.at(-1)?.role!=='assistant')throw Error('The independent workforce answer did not match your question.');
 const result=structuredClone(original.state);result.turns=turns;
 // Answer visibility belongs to this turn, not to older planning calculations.
 result.currentCalculationKinds=[];
 return readSolutionState(result);
}
