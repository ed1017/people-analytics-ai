/** Offline reservation guard. It neither authorizes nor sends provider requests.
 * A future runner must supply a verified local full-request token upper bound,
 * durable journal callback and independently checked endpoint/pricing receipt.
 * Missing token/rate provenance is a stop, never a paid token-count fallback.
 */
export const evaluationLimits=Object.freeze({turns:18,requests:72,roundsPerTurn:4,inputTokensPerRequest:200000,outputTokensPerRequest:5000,inputTokensTotal:14400000,outputTokensTotal:360000,inputUsdPerMillion:.25,outputUsdPerMillion:1.2,requestReservationMicrousd:56000,totalReservationMicrousd:4032000,ceilingMicrousd:4500000,requestsPerMinute:6,concurrentRequests:1,hostedAcceptanceCalls:0});
export function createEvaluationReservation({receipt,persist,now=()=>Date.now()}){
 if(receipt?.model!=='gpt-5.6-luna'||receipt?.standardTier!==true||receipt?.endpointRatesVerified!==true||receipt?.localTokenUpperBoundVerified!==true||receipt?.inputUsdPerMillion!==.25||receipt?.outputUsdPerMillion!==1.2||typeof persist!=='function')throw Error('Verified endpoint, pricing, local token bounds and durable reservations are required before evaluation.');
 let entries=[],inFlight=null,closed=false;
 return {
  get entries(){return structuredClone(entries);},
  reserve({turnId,inputTokenUpperBound,maxOutputTokens,hosted=false}){
   if(closed||inFlight!==null)throw Error('Evaluation is stopped or another request is in flight.');
   if(hosted)throw Error('Hosted acceptance and manual preview calls are outside this evaluation budget.');
   if(typeof turnId!=='string'||!turnId||!Number.isSafeInteger(inputTokenUpperBound)||inputTokenUpperBound<0||inputTokenUpperBound>200000||maxOutputTokens!==5000)throw Error('Request exceeds the approved token envelope.');
   const time=now(),turns=new Set(entries.map(item=>item.turnId));turns.add(turnId);
   if(turns.size>18||entries.length>=72||entries.filter(item=>item.turnId===turnId).length>=4)throw Error('Evaluation request or turn limit reached; no reruns.');
   if(entries.filter(item=>time-item.at<60000).length>=6)throw Error('Evaluation rate limit reached; wait before reserving.');
   const entry={id:entries.length+1,turnId,at:time,inputTokenUpperBound,reservedInputTokens:200000,reservedOutputTokens:5000,reservedMicrousd:56000};
   if((entries.length+1)*56000>4500000)throw Error('Evaluation budget exhausted.');
   // The full pessimistic reservation is durable before the caller can send.
   // Failed, timed-out and cancelled requests keep their reservation forever.
   const next=[...entries,entry];persist(structuredClone(next));entries=next;inFlight=entry.id;return structuredClone(entry);
  },
  settle(id,usage){
   if(inFlight!==id)throw Error('Unknown evaluation reservation.');inFlight=null;
   if(usage&&(!Number.isSafeInteger(usage.input_tokens)||!Number.isSafeInteger(usage.output_tokens)||usage.input_tokens>200000||usage.output_tokens>5000||usage.input_tokens<0||usage.output_tokens<0)){closed=true;throw Error('Provider usage exceeded the reviewed envelope; stop evaluation.');}
  },
  stop(){closed=true;},
 };
}
