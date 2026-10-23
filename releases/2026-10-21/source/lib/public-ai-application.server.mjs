/** Fixed public route composition. Ports are server-owned and default closed;
 * callers cannot select readers, handlers, prices, providers or ledger policies. */
import {PUBLIC_AI_ENABLED,PUBLIC_AI_ROUTES} from './public-ai-capabilities.mjs';
import {createPublicAiDispatcher} from './public-ai-dispatch.server.mjs';
import {createPublicHomeRoute} from './public-home-route.server.mjs';
import {createPublicOtherRoutes} from './public-other-routes.server.mjs';
import {createPublicPlannerRoundBoundary} from './public-planner-round.server.mjs';
import {publicPlannerPriceCandidate} from './public-planner-price-candidate.mjs';
import {loadPublic9037Binding} from './public-9037.server.mjs';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';

/**
 * @param {{options?:{hostname:string,production?:boolean},enabled?:boolean,admit?:Function,settle?:Function,provider?:Function,now?:()=>number,progressEnabled?:boolean}} config
 */
export function createPublicAiApplication({options,enabled=PUBLIC_AI_ENABLED,admit,settle,provider,now=Date.now,progressEnabled=false}={}){
 const configured=enabled===true&&typeof admit==='function'&&typeof provider==='function';
 if(!configured)return createPublicAiDispatcher({options,enabled:false,now});
 const completionFactory=({kind,currentContext})=>createPublicPlannerRoundBoundary({
  enabled:true,policy:publicPlannerPriceCandidate(kind),admit,settle,provider,currentContext,now,
 });
 const home=createPublicHomeRoute({enabled:true,hostname:options?.hostname,progressEnabled,
  completionFactory:context=>completionFactory({...context,kind:'home-solution'})});
 const other=createPublicOtherRoutes({enabled:true,hostname:options?.hostname,completionFactory,progressEnabled});
 // Configuration only, not provider health or current budget availability.
 // Existing atomic admission remains the authority for every attempted round.
 const configurationCheck=async signal=>{
  signal.throwIfAborted();
  const binding=await loadPublic9037Binding({hostname:options?.hostname,production:false});
  signal.throwIfAborted();
  const identity=binding.router.current();
  if(identity.datasetId!==P.datasetId||identity.token!==P.token||identity.generation!==P.generation||!/^[a-f0-9]{64}$/.test(identity.digest)||await binding.router.bootstrapToken()!==P.token)return false;
  signal.throwIfAborted();
  const at=now();
  return Number.isFinite(at)&&['home-solution','chat','plan','intake','capability'].every(kind=>{
   const policy=publicPlannerPriceCandidate(kind);
   // Receipt lasts30seconds; leave the per-round timeout and safety margin too.
   return at>=Date.parse(policy.verifiedAt)&&at+30000+policy.timeoutMs+30000<Date.parse(policy.validUntil);
  });
 };
 return createPublicAiDispatcher({options,enabled:true,configurationCheck,now,handlers:Object.fromEntries(
  PUBLIC_AI_ROUTES.map(path=>[path,path==='/api/home-solution-conversation'?r=>home.handle(r):r=>other.handle(r)])
 )});
}
