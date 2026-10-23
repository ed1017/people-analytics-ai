import {PUBLIC_9037_ENABLED} from './public-9037-contract.mjs';
import {local9037OperationAllowed} from './dataset-company-routes.mjs';
export function public9037Options(env){
 if(!PUBLIC_9037_ENABLED)return null;
 const checks={
  NODE_ENV:env.NODE_ENV==='production',VERCEL:env.VERCEL==='1',
  VERCEL_ENV:['preview','production'].includes(env.VERCEL_ENV),
  VERCEL_TARGET_ENV:env.VERCEL_TARGET_ENV===env.VERCEL_ENV,
  VERCEL_PROJECT_ID:env.VERCEL_PROJECT_ID==='prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF',
  VERCEL_ORG_ID:env.VERCEL_ORG_ID==='team_UNDjIdAbXXQZ63p0YuNQQ9zp',
  VERCEL_URL:/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(env.VERCEL_URL??''),
  WORKFORCE_9037_LOCAL_CONFIG_ABSENT:env.WORKFORCE_9037_LOCAL_CONFIG===undefined,
  WORKFORCE_9037_LOCAL_SHA256_ABSENT:env.WORKFORCE_9037_LOCAL_SHA256===undefined,
 };
 const failed=Object.keys(checks).filter(key=>!checks[key]);
 // Predicate names only: never log deployment values or credentials.
 if(failed.length)throw Error('Public synthetic release requires the exact reviewed project and deployment environment; failed predicates: '+failed.join(', '));
 return Object.freeze({hostname:env.VERCEL_URL,production:env.VERCEL_ENV==='production'});
}
export function public9037RequestAllowed(options,request){
 const u=new URL(request.url),hosts=[options.hostname,'people-analytics-9037review-ed-56dc.vercel.app',...(options.production?['www.ed-ai.app','ed-ai.app','ed-workforce-ai.vercel.app','people-analytics-ai-git-main-ed-56dc.vercel.app']:[])];
 if(u.protocol!=='https:'||u.port||!hosts.includes(u.hostname))return false;
 try{if(decodeURIComponent(u.pathname)!==u.pathname)return false;}catch{return false;}
 if(u.pathname.startsWith('/api'))return local9037OperationAllowed(request.method,u.pathname);
 return ['GET','HEAD'].includes(request.method)&&(['/','/about','/planning/headcount-demo','/planning/assumptions','/favicon.ico'].includes(u.pathname)||u.pathname.startsWith('/_next/static/'));
}
