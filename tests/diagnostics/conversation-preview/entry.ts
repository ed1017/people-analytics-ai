/** Invoke the actual POST and existing aggregate readers; no public test endpoint. */
import {NextRequest} from 'next/server';
import {POST} from '../../../app/api/home-solution-conversation/route';
import {buildHomePack} from '../../../lib/home-pack.mjs';
import {readSolutionRequest,emptySolutionState} from '../../../lib/home-solution-conversation';
import {withDatasetRequest,datasetRouter} from '../../../lib/dataset-runtime';
import {question,binding,limits} from './config.mjs';
import {claimPaidRun,claimVerificationRun} from './claim.mjs';
export {POST};
export {assertPaidClaim} from './claim.mjs';
async function withClaimClient<T>(claim:(client:typeof import('../../../lib/supabase-server').supabaseServer)=>Promise<T>):Promise<T>{
 let value:T|undefined;
 const response=await withDatasetRequest(new Request('http://local.invalid/claim',{headers:{'x-workforce-dataset':'legacy-v1:0'}}),async()=>{
  const {supabaseServer}=await import('../../../lib/supabase-server');
  value=await claim(supabaseServer);return Response.json({claimed:true});
 });
 if(!response.ok||value===undefined)throw Error('Claim context unavailable');return value;
}
export const claimPaidPreview=(manifest:unknown,env:NodeJS.ProcessEnv)=>withClaimClient(client=>claimPaidRun(client,manifest,env));
export const claimProviderFreePreview=(env:NodeJS.ProcessEnv)=>withClaimClient(client=>claimVerificationRun(client,env));
// Same read-only source routes as groundSolutionRequest; never the public survey BU reader.
const readers={
 dashboard:async()=>({GET:(await import('../../../lib/dashboard-overview-reader')).readDashboardOverview}),workforce:()=>import('../../../app/api/workforce/route'),
 attrition:()=>import('../../../app/api/attrition/route'),'talent-acquisition':()=>import('../../../app/api/talent-acquisition/route'),
 'survey-sentiment':async()=>({GET:(await import('../../../lib/survey-sentiment-reader')).readHomeSurveyEvidence}),skills:()=>import('../../../app/api/skills/route'),
 'learning-development':()=>import('../../../app/api/learning-development/route'),'career-mobility':()=>import('../../../app/api/career-mobility/route'),
 'career-growth-mobility':()=>import('../../../app/api/career-growth-mobility/route'),'succession-coverage':()=>import('../../../app/api/succession-coverage/route'),
 'workforce-planning':()=>import('../../../app/api/workforce-planning/route'),'position-modeling':()=>import('../../../app/api/position-modeling/route'),
 finance:()=>import('../../../app/api/finance/route'),bls:()=>import('../../../app/api/bls/route'),
};
export async function prepareRequest(){
 const start=new Request('http://local.invalid/api/home-solution-conversation',{headers:{'x-workforce-dataset':'legacy-v1:0'}});
 const response=await withDatasetRequest(start,async()=>{
  const token=datasetRouter.current().token;if(token!=='legacy-v1:0')throw Error('Unexpected dataset');
  const filters={country:'all',org:'all',level:'all'},scope='All countries; All business units; All levels';
  const controller=new AbortController(),signal=AbortSignal.any([controller.signal,AbortSignal.timeout(limits.preparationTimeoutMs)]),entries=Object.entries(readers),results:Record<string,unknown>={};let next=0;
  const worker=async()=>{while(next<entries.length){signal.throwIfAborted();const [key,load]=entries[next++],query=key==='dashboard'?'?'+new URLSearchParams(filters).toString():'';
   const handler=(await load()).GET,response=await handler(new NextRequest('http://local.invalid/api/'+key+query,{headers:{'x-workforce-dataset':token},signal}));
   signal.throwIfAborted();if(!response.ok||key!=='bls'&&response.headers.get('x-workforce-dataset')!==token)throw Error('Aggregate preparation unavailable');
   results[key]={status:'loaded',data:await response.json()};
  }};
  // Race uncancellable legacy reads too; no model is dispatched after preparation failure.
  try{await Promise.race([Promise.all([worker(),worker()]),new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('Preparation deadline')),{once:true}))]);signal.throwIfAborted();}catch(error){controller.abort();throw error;}
  const evidence=buildHomePack(results,scope,question);
  const body=readSolutionRequest({version:1,requestId:binding.runId,goal:{id:'',statement:''},scope,filters,timeZone:'Etc/UTC',evidence,goalContext:null,selectedId:null,catalog:null,state:emptySolutionState(),message:{id:'preview-user-1',text:question}});
  return Response.json(body);
 });
 if(!response.ok)throw Error('Preparation failed');return response.json();
}
