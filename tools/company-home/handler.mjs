export function createCompanyHomeHandler(dashboard){
 const registry=Array.isArray(dashboard)?dashboard:[dashboard];
 const token=registry[0].token;
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'x-workforce-dataset':token,'cache-control':'no-store','x-content-type-options':'nosniff'}});
 return (request,env={})=>{
  const u=new URL(request.url);
  if(Object.keys(env).some(k=>k.startsWith('VERCEL'))||u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname))return reply({error:'Loopback fixture only'},403);
  for(const h of ['host','x-forwarded-host']){const v=request.headers.get(h);if(v!==null&&(!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(v)||new URL('http://'+v).port!==u.port))return reply({error:'Local host required'},403);}
  const origin=request.headers.get('origin');if(origin&&origin!==u.origin)return reply({error:'Local origin required'},403);
  if(request.headers.has('forwarded'))return reply({error:'Forwarding unavailable'},403);
  const protocol=request.headers.get('x-forwarded-proto');if(protocol!==null&&protocol!=='http')return reply({error:'Local protocol required'},403);
  if(!['GET','HEAD'].includes(request.method))return reply({error:'AI and writes unavailable'},405);
  if(!u.pathname.startsWith('/api/'))return u.pathname==='/'&&!u.search||u.pathname.startsWith('/_next/')||u.pathname==='/favicon.ico'?null:reply({error:'Only company Home is supported'},404);
  if(u.search||request.method!=='GET')return reply({error:'Unsupported method or scope'},400);
  if(u.pathname==='/api/company-dashboard'){
   const activation=request.headers.get('x-workforce-dataset'),snapshot=request.headers.get('x-workforce-snapshot')??activation;
   const selected=registry.find(d=>d.token===snapshot);
   if(!selected||typeof activation!=='string'||!/^invented-company-[a-f0-9]{64}:[1-9][0-9]{0,11}$/.test(activation)||activation.split(':')[0]!==selected.token.split(':')[0])return reply({error:'Company snapshot changed'},409);
   return Response.json(selected.value,{headers:{'x-workforce-dataset':activation,'x-workforce-snapshot':selected.token,'cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  if(u.pathname==='/api/public-ai-capabilities')return reply({version:2,datasetToken:token,status:'unavailable',expiresAt:new Date(Date.now()+30000).toISOString(),routes:[]});
  return reply({error:'This company does not provide this domain.'},503);
 };
}
