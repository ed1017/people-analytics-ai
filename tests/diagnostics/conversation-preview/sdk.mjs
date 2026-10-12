/** Only this test bundle aliases the SDK constructor; production files are untouched. */
import OpenAI from '../../../node_modules/openai/index.mjs';
import {binding,limits} from './config.mjs';
import {fail} from './guard.mjs';
export default class ControlledOpenAI extends OpenAI {
 constructor(options){
  const control=globalThis.__conversationPreviewControl;if(!control)fail('unarmed_sdk');
  if(options?.maxRetries!==0)fail('sdk_retry_policy');
  super({...options,baseURL:'https://api.openai.com/v1',maxRetries:0,logLevel:'off',fetch:control.wrapFetch(options.fetch??globalThis.fetch)});
  const create=this.responses.create.bind(this.responses);
  this.responses.create=(payload,requestOptions)=>control.dispatch(payload,requestOptions,()=>create(payload,{...requestOptions,maxRetries:0,timeout:limits.callTimeoutMs,headers:{...requestOptions.headers,'X-Client-Request-Id':binding.runId+'-'+control.calls}}));
 }
}
