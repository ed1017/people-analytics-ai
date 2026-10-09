import type {ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses';
import type {SolutionRequest} from './home-solution-conversation';
import {validDatasetToken} from './dataset-identity.mjs';
// @ts-expect-error Native Node fixtures share TypeScript source.
import {SWP_DEMAND_MODE,requestDemandContext} from './swp-demand.ts';

export const SWP_CONVERSATION_HEADER='x-workforce-conversation';
export const SWP_CONVERSATION_MODE='fictional-swp-demo-v1';
export const SWP_MODEL_PROFILE='medium-acceptance-v1';
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

/** Explicit UI mode, never inferred from a question, a goal name, or model output. */
export function swpConversationHeaders(goalContext:unknown):Record<string,string>{
 const mode=object(goalContext)&&object(goalContext.scenarioReview)?goalContext.scenarioReview.conversationMode:null;
 return mode===SWP_CONVERSATION_MODE||mode===SWP_DEMAND_MODE?{[SWP_CONVERSATION_HEADER]:mode}:{};
}

/** These checks bind a fictional client scenario; they do not certify its numbers
 * or promote it to workforce evidence. The existing dataset/source checks remain.
 * Model identity is trusted server configuration, never a request parameter.
 */
export function swpConversationModel(mode:string|null,request:SolutionRequest,datasetToken:string,config:{profile?:string;modelId?:string}):Partial<Pick<ResponseCreateParamsNonStreaming,'model'|'reasoning'>>{
 if(mode===null)return {};
 if(mode!==SWP_CONVERSATION_MODE&&mode!==SWP_DEMAND_MODE)throw Error('Unsupported conversation mode.');
 if(mode===SWP_DEMAND_MODE){if(!requestDemandContext(request,datasetToken))throw Error('Business demand context is required.');}
 else {
 const review=object(request.goalContext)?request.goalContext.scenarioReview:null;
 if(!object(review)||review.conversationMode!==SWP_CONVERSATION_MODE||review.classification!=='fictional-scenario'||!validDatasetToken(datasetToken)||review.datasetToken!==datasetToken||typeof review.goalId!=='string'||!/^guided-swp-[A-Za-z0-9_-]{1,69}$/.test(review.goalId)||typeof review.goal!=='string'||!review.goal.trim()||review.goal.length>240||!Number.isSafeInteger(review.revision)||Number(review.revision)<1||request.goal.id&&(request.goal.id!==review.goalId||request.goal.statement!==review.goal))throw Error('The fictional SWP scenario binding changed.');
 }
 if(config.profile===undefined||config.profile==='')return {};
 if(config.profile!==SWP_MODEL_PROFILE||typeof config.modelId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(config.modelId))throw Error('An exact configured SWP model identifier is required.');
 return {model:config.modelId,reasoning:{effort:'medium'}};
}
