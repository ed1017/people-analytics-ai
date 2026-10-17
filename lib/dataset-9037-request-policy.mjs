import {local9037OperationAllowed} from './dataset-company-routes.mjs';
export function local9037RequestAllowed(env,request){
 if(env.WORKFORCE_9037_LOCAL_CONFIG===undefined&&env.WORKFORCE_9037_LOCAL_SHA256===undefined)return true;
 if(env.NODE_ENV!=='development'||env.VERCEL)return false;
 const url=new URL(request.url);
 if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))return false;
 let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{return false;}
 if(decoded.startsWith('/api')&&decoded!==url.pathname)return false;
 if(url.pathname.startsWith('/api'))return local9037OperationAllowed(request.method,url.pathname);
 return request.method==='GET'||request.method==='HEAD';
}
