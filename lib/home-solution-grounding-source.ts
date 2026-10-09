import {NextRequest} from 'next/server';
import {datasetRouter} from './dataset-runtime';
import {verifySolutionEvidence} from './home-solution-grounding.mjs';
import type {SolutionRequest} from './home-solution-conversation';
import type {DashboardFilters} from './dashboard-scope';

/** Existing GET readers only. No arbitrary URL, new relation, grant, write or credential. */
const readers={
 dashboard:()=>import('../app/api/dashboard/route'),workforce:()=>import('../app/api/workforce/route'),
 attrition:()=>import('../app/api/attrition/route'),'talent-acquisition':()=>import('../app/api/talent-acquisition/route'),
 'survey-sentiment':()=>import('../app/api/survey-sentiment/route'),skills:()=>import('../app/api/skills/route'),
 'learning-development':()=>import('../app/api/learning-development/route'),'career-mobility':()=>import('../app/api/career-mobility/route'),
 'career-growth-mobility':()=>import('../app/api/career-growth-mobility/route'),'succession-coverage':()=>import('../app/api/succession-coverage/route'),
 'workforce-planning':()=>import('../app/api/workforce-planning/route'),'position-modeling':()=>import('../app/api/position-modeling/route'),
 finance:()=>import('../app/api/finance/route'),bls:()=>import('../app/api/bls/route'),
};
export async function groundSolutionRequest(request:SolutionRequest,signal:AbortSignal){
 const datasetToken=datasetRouter.current().token;
 return verifySolutionEvidence(request,{datasetToken,read:async(key:string,filters:DashboardFilters,readSignal:AbortSignal)=>{
  if(!Object.hasOwn(readers,key))throw Error('Unsupported aggregate source');
  const query=key==='dashboard'?'?'+new URLSearchParams(filters).toString():'';
  const local=new NextRequest('http://local.invalid/api/'+key+query,{headers:{'x-workforce-dataset':datasetToken},signal:readSignal});
  const handler=(await readers[key as keyof typeof readers]()).GET;
  const response=await handler(local);
  if(!response.ok||(key!=='bls'&&response.headers.get('x-workforce-dataset')!==datasetToken))throw Error('Aggregate source unavailable or mixed');
  readSignal.throwIfAborted();return {status:'loaded',data:await response.json()};
 }},signal);
}
