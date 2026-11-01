import {createHash} from 'node:crypto';
import {load9037PreviewBinding} from './dataset-9037-preview.server.mjs';
import {LOCAL_COMPANY_GET_ROUTES} from './dataset-company-routes.mjs';
import {PUBLIC_9037} from './public-9037-contract.mjs';
import {public9037RequestAllowed} from './public-9037-options.mjs';
import {projectPublic9037,public9037Fields} from './public-9037-projection.mjs';

/** Private source loading is unchanged. Only the new projected response escapes. */
export async function loadPublic9037Binding(options){
 const source=await load9037PreviewBinding({hostname:options.hostname}),privateToken=await source.router.bootstrapToken();
 const documents=[];
 for(const path of LOCAL_COMPANY_GET_ROUTES){const r=await source.handle(new Request('https://'+options.hostname+path,{headers:{'x-workforce-dataset':privateToken}}));if(!r.ok)throw Error('Public source verification failed');documents.push(projectPublic9037(path,await r.json(),'public-projection-digest-placeholder'));}
 const digest=createHash('sha256').update(JSON.stringify({version:PUBLIC_9037.contract,fields:public9037Fields,documents})).digest('hex');
 const reply=(value,status=200)=>Response.json(value,{status,headers:{'x-workforce-dataset':PUBLIC_9037.token,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 return Object.freeze({router:Object.freeze({bootstrapToken:async()=>PUBLIC_9037.token,current:()=>({datasetId:PUBLIC_9037.datasetId,digest,token:PUBLIC_9037.token,generation:PUBLIC_9037.generation})}),async turnoverHistory(filters){
  const scope=Object.freeze({...filters}),rows=await source.turnoverHistory(scope);
  return Object.freeze({contract:'public-group-turnover-history-v1',datasetToken:PUBLIC_9037.token,bundleDigest:digest,asOf:PUBLIC_9037.cutoff,filters:scope,rows});
 },async handle(request){
  if(!request||!public9037RequestAllowed(options,request))return reply({error:'Unavailable in the public synthetic release.'},503);
  const received=request.headers.get('x-workforce-dataset');if(received&&received!==PUBLIC_9037.token)return reply({error:'Dataset changed. Refresh evidence before continuing.'},409);
  const u=new URL(request.url),path=u.pathname;
  if(LOCAL_COMPANY_GET_ROUTES.includes(path)&&path!=='/api/dashboard'){
   if(path==='/api/compensation-job-release'){
    for(const [k,v]of u.searchParams)if(!['country','org','level','release'].includes(k)||u.searchParams.getAll(k).length!==1||(k==='release'?v!==PUBLIC_9037.compensationRelease:v!=='all'))return reply({error:'Unsupported public release scope.'},400);
    u.searchParams.delete('release');
   }else if(u.searchParams.size)return reply({error:'Unsupported public query scope.'},400);
  }
  u.hostname=options.hostname;
  const headers=new Headers(request.headers);headers.set('x-workforce-dataset',privateToken);
  try{
   const forwarded=new Request(u,{method:request.method,headers,...(!['GET','HEAD'].includes(request.method)?{body:request.body,duplex:'half'}:{})});
   const response=await source.handle(forwarded);
   if(!response.ok)return reply({error:response.status===413?'Calculation input is too large.':'Unsupported or unavailable calculation. Review the scope and assumptions.'},response.status);
   return reply(projectPublic9037(path,await response.json(),digest));
  }catch{return reply({error:'Public synthetic evidence unavailable.'},503);}
 }});
}
