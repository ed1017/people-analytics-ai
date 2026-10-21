import {public9037Options} from './public-9037-options.mjs';
export const PUBLIC_QA_DIAGNOSTIC_ENABLED=false;
export const PUBLIC_QA_DIAGNOSTIC_CONCURRENCY_ENABLED=false;
export function publicQaDiagnosticAllowed(env,request,enabled=PUBLIC_QA_DIAGNOSTIC_ENABLED){
 if(enabled!==true||env.VERCEL_ENV!=='preview'||env.VERCEL_TARGET_ENV!=='preview')return false;
 try{
  const options=public9037Options(env),url=new URL(request.url);
  return !!options&&!options.production&&request.method==='POST'&&url.protocol==='https:'&&url.hostname===options.hostname&&!url.port&&!url.username&&!url.password&&url.pathname==='/api/public-qa-diagnostic'&&!url.search&&!url.hash&&request.url===url.origin+'/api/public-qa-diagnostic';
 }catch{return false;}
}
