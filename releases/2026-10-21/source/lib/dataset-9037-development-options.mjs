/** Configuration gate only: does not load candidate artifacts or integrations. */
import path from 'node:path';
const must=(v,m)=>{if(!v)throw Error(m);};
const canonical=p=>typeof p==='string'&&path.isAbsolute(p)&&path.normalize(p)===p;
export function development9037Options(env){
 const enabled=env.WORKFORCE_9037_LOCAL_CONFIG!==undefined||env.WORKFORCE_9037_LOCAL_SHA256!==undefined;
 if(!enabled)return null;
 must(env.NODE_ENV==='development'&&!env.VERCEL,'9037 serving is loopback development only');
 must(canonical(env.WORKFORCE_9037_LOCAL_CONFIG)&&/^[a-f0-9]{64}$/.test(env.WORKFORCE_9037_LOCAL_SHA256??''),'Explicit local config and separate pin required');
 return Object.freeze({file:env.WORKFORCE_9037_LOCAL_CONFIG,pin:env.WORKFORCE_9037_LOCAL_SHA256});
}
