import {NextRequest} from 'next/server';
import {datasetRouter} from './dataset-runtime';
import {createFreshSkillReadRequest} from './home-fresh-skill-reads';
import {homeDefinitions,normalizeHomePack} from './home-pack.mjs';
import type {SupabaseClient} from '@supabase/supabase-js';
import {verifySolutionEvidence,AggregateEvidenceReadError} from './home-solution-grounding.mjs';
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
export async function groundSolutionRequest(request:SolutionRequest,signal:AbortSignal,onReadersComplete?:(value:unknown)=>void){
 const datasetToken=datasetRouter.current().token;
 const loaded=new Set(normalizeHomePack(request.evidence).sources.filter(source=>source.status==='loaded').map(source=>homeDefinitions.find(def=>def[0]===source.id)?.[1]));
 const shared=createFreshSkillReadRequest(loaded.has('skills')&&loaded.has('learning-development'));
 try{return await verifySolutionEvidence(request,{datasetToken,onReadersComplete,read:async(key:string,filters:DashboardFilters,readSignal:AbortSignal)=>{
  readSignal.throwIfAborted();
  if(!Object.hasOwn(readers,key))throw Error('Unsupported aggregate source');
  const query=key==='dashboard'?'?'+new URLSearchParams(filters).toString():'';
  const local=new NextRequest('http://local.invalid/api/'+key+query,{headers:{'x-workforce-dataset':datasetToken},signal:readSignal});
  const handler=(await readers[key as keyof typeof readers]()).GET;
  readSignal.throwIfAborted();
  const response=key==='skills'||key==='learning-development'
   ?await shared.run({authorization:datasetRouter.client() as SupabaseClient,datasetToken,schema:'public',scope:JSON.stringify(['company-wide',filters.country,filters.org,filters.level]),signal:readSignal},()=>handler(local))
   :await handler(local);
  if(!response.ok)throw new AggregateEvidenceReadError('http_error',response.status);
  if(key!=='bls'&&response.headers.get('x-workforce-dataset')!==datasetToken)throw new AggregateEvidenceReadError('mixed_dataset');
  readSignal.throwIfAborted();
  try{return {status:'loaded',data:await response.json()};}catch{throw new AggregateEvidenceReadError('invalid_json');}
 }},signal);}finally{shared.close();}
}
