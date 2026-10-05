// Offline-only route harness. No SDK transport, credentials or data-service calls.
export default class OpenAI {
 responses={create:async(request:unknown,options?:unknown)=>{
  const harness=globalThis as unknown as {__requests:unknown[];__replies:unknown[];__requestOptions?:unknown[]};
  harness.__requests.push(request);harness.__requestOptions?.push(options);
  const reply=harness.__replies.shift();if(!reply)throw Error('Unexpected synthetic Responses call');return reply;
 }};
}
export const openAIProxyTransport=()=>({});
export const peopleAnalyticsTools=[];
export async function runPeopleAnalyticsTool(){throw Error('Home route must not invoke a tool in this test')}
export const NextResponse={json:(body:unknown,init?:ResponseInit)=>new Response(JSON.stringify(body),{...init,headers:{'content-type':'application/json'}})};
