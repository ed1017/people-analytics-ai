import {createServer} from 'node:http';

/** Loopback-only synthetic fixture transport. No ingestion/upload endpoint.
 * Callers pass an already validated immutable binding. Raw targets are preserved.
 */
export function createCompanyFixtureServer(binding){
 return createServer((req,res)=>{
  const deny=(status,error)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify({error}));};
  const port=req.socket.localPort;
  if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.localAddress)||
   req.headers.host!==`127.0.0.1:${port}`||req.headers.origin&&req.headers.origin!==`http://127.0.0.1:${port}`||
   Object.keys(req.headers).some(h=>h==='forwarded'||h.startsWith('x-forwarded-')))return deny(403,'loopback_only');
  if(req.method!=='GET'||req.headers['transfer-encoding']||req.headers['content-length']&&req.headers['content-length']!=='0')return deny(405,'read_only_fixture');
  try{
   const result=binding.read(req.url,{method:req.method,datasetToken:req.headers['x-workforce-dataset']});
   res.writeHead(result.status,result.headers);res.end(JSON.stringify(result.body));
  }catch{return deny(503,'fixture_unavailable');}
 });
}
