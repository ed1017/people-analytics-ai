import {boundedJson} from './public-qa-stream.server.mjs';
import {PUBLIC_9037} from './public-9037-contract.mjs';

export const PUBLIC_QA_ENABLED=false;
const reply=(body,status)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-workforce-dataset':PUBLIC_9037.token}});
/** Production route calls this without ports: permanently disabled until review.
 * Injected enabled/answer are for isolated tests and future reviewed composition.
 */
export function createPublicQaPost({enabled=false,answer}={}) {
 return async function POST(request) {
  if(!enabled||typeof answer!=='function')return reply({status:'unavailable',code:'public_qa_disabled'},503);
  if(request.method!=='POST')return reply({status:'unavailable',code:'method_not_allowed'},405);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return reply({status:'unavailable',code:'invalid_input'},400);
  const stop=AbortSignal.timeout(15000),signal=AbortSignal.any([request.signal,stop]);
  try {
   const input=await boundedJson(request.body,4096,signal);
   const result=await answer(input,signal);
   return reply(result,result.status==='unavailable'?503:200);
  } catch {return reply({status:'unavailable',code:'invalid_or_stopped_request'},400);}
 };
}
