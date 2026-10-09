// @ts-expect-error Native Node tests share TypeScript source.
import {readPlanConversationRequest,planConversationModelContext,readPlanConversationProposal,previewPlanConversation} from './home-plan-conversation.ts';

/** Injectable boundary for fixed fixtures. Production supplies the configured model once, without retries/tools. */
export async function interpretPlanConversation(raw:unknown,complete:(context:unknown,message:string)=>Promise<string>) {
 const request=readPlanConversationRequest(raw),context=planConversationModelContext(request);
 const output=await complete(context,request.text);
 if(!output||output.length>8000)throw Error('The plan response was unavailable or too large. Nothing was saved.');
 const proposal=readPlanConversationProposal(JSON.parse(output),request);
 previewPlanConversation(request,proposal); // Validate all operations/calculations before returning even a reviewable proposal.
 return {requestId:request.requestId,proposal};
}
