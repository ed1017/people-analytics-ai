import {PREVIEW_9037_PACKAGE} from './dataset-9037-preview-marker.mjs';
import {local9037OperationAllowed} from './dataset-company-routes.mjs';
// Assign only to reviewed 9037 previews after verifying Vercel Authentication.
export const PREVIEW_9037_REVIEW_HOST='people-analytics-9037review-ed-56dc.vercel.app';
export function preview9037Options(env,enabled=PREVIEW_9037_PACKAGE){
 if(!enabled)return null;
 // Fixed predicate names only: never include environment values in server errors.
 const checks={
  NODE_ENV:env.NODE_ENV==='production',
  VERCEL:env.VERCEL==='1',
  VERCEL_ENV:env.VERCEL_ENV==='preview',
  VERCEL_TARGET_ENV:env.VERCEL_TARGET_ENV==='preview',
  VERCEL_PROJECT_ID:env.VERCEL_PROJECT_ID==='prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF',
  VERCEL_ORG_ID:env.VERCEL_ORG_ID==='team_UNDjIdAbXXQZ63p0YuNQQ9zp',
  VERCEL_URL:/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(env.VERCEL_URL??''),
  WORKFORCE_9037_LOCAL_CONFIG_ABSENT:env.WORKFORCE_9037_LOCAL_CONFIG===undefined,
  WORKFORCE_9037_LOCAL_SHA256_ABSENT:env.WORKFORCE_9037_LOCAL_SHA256===undefined,
 };
 const failed=Object.keys(checks).filter(name=>!checks[name]);
 if(failed.length)throw Error('Preview package requires its exact protected project and preview environment; failed predicates: '+failed.join(', '));
 return Object.freeze({hostname:env.VERCEL_URL});
}
export function preview9037RequestAllowed(options,request){
 if(!options)return true;
 const url=new URL(request.url);
 if(url.protocol!=='https:'||![options.hostname,PREVIEW_9037_REVIEW_HOST].includes(url.hostname)||url.port)return false;
 let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{return false;}
 if(decoded!==url.pathname)return false;
 if(url.pathname.startsWith('/api'))return local9037OperationAllowed(request.method,url.pathname);
 // Explicit page/static surface. Private paths and arbitrary routes never pass through.
 return ['GET','HEAD'].includes(request.method)&&(['/','/planning/headcount-demo','/planning/assumptions'].includes(url.pathname)||url.pathname.startsWith('/_next/static/')||url.pathname==='/favicon.ico');
}
