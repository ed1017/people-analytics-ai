import type {ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses';
import type {InputTokenCountParams} from 'openai/resources/responses/input-tokens';

/** Temporary opt-in on the reviewed tracking Preview branch; never a client switch. */
export function trackingPreviewBudgetEnabled(env:Readonly<Record<string,string|undefined>>){
 return env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF==='codex/progress-target-context'&&env.HOME_TRACKING_QA_BUDGET==='v1';
}
export const trackingPreviewLimits=Object.freeze({rounds:2,inputTokens:25000,outputTokens:2000});
export class PreviewBudgetError extends Error {
 constructor(message:string){super('Tracking Preview budget: '+message);this.name='PreviewBudgetError';}
}
type Count=(body:InputTokenCountParams)=>Promise<{input_tokens:number}>;
/** Per-HTTP-request reservation. Counts every continuation, including prior outputs.
 * Five requests reserve 5*2*(25000*2.50+2000*10)/1e6*1.10 = $0.9075.
 * Browser QA owns the five-Send limit; this is not a cross-instance spending ledger.
 */
export function createTrackingPreviewBudget(){
 let attempts=0;
 return {async prepare(body:ResponseCreateParamsNonStreaming,count:Count){
  if(attempts>=trackingPreviewLimits.rounds)throw new PreviewBudgetError('maximum provider attempts reached; no retry was made.');
  // Snapshot once so the count and inference see identical input and schemas.
  const request:ResponseCreateParamsNonStreaming=JSON.parse(JSON.stringify(body));
  if(request.model!=='gpt-6.1-sol'||request.service_tier!=='default'||request.previous_response_id||request.conversation||request.background||request.stream)
   throw new PreviewBudgetError('unsupported model or request mode; no inference was made.');
  if(request.tools?.some(tool=>tool.type!=='function'))throw new PreviewBudgetError('only local function tools are supported.');
  request.max_output_tokens=trackingPreviewLimits.outputTokens;
  const {max_output_tokens:_output,service_tier:_tier,...countBody}=request;
  void _output;void _tier;
  let tokens:number;
  try{tokens=(await count({...countBody,truncation:countBody.truncation??undefined})).input_tokens;}catch{throw new PreviewBudgetError('input token count unavailable; no inference was made for this round.');}
  if(!Number.isSafeInteger(tokens)||tokens<1||tokens>trackingPreviewLimits.inputTokens)
   throw new PreviewBudgetError('complete provider input exceeds 25000 tokens or has an invalid count; no inference was made for this round.');
  // Reserve before dispatch. A timeout/failure never refunds or retries an attempt.
  attempts++;
  return request;
 }};
}
