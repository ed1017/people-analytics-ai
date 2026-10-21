import {PUBLIC_AI_ENABLED} from './public-ai-capabilities.mjs';
import {createPublicAiDispatcher} from './public-ai-dispatch.server.mjs';
import {after} from 'next/server';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';

/** No dynamic configuration can enable this gate. A reviewed code release is
 * required after the ledger, provider and route acceptance checks pass. */
export function createPublicAiRuntime(options: {hostname:string;production?:boolean}|undefined) {
  const disabled=createPublicAiDispatcher({options,enabled:false});
  let application: Promise<(request:Request)=>Promise<Response|null>>|undefined;
  return async(request:Request):Promise<Response|null>=>{
    if(!PUBLIC_AI_ENABLED||!options)return disabled(request);
    application??=(async()=>{
      const [{createPublicAiApplication},{createPublicPlannerLedger,PUBLIC_PLANNER_DATABASE_URL},{createPublicPlannerProvider},{openAIProxyTransport}]=await Promise.all([
        import('./public-ai-application.server.mjs'),import('./public-planner-ledger.server.mjs'),
        import('./public-planner-round.server.mjs'),import('./openai-proxy-transport'),
      ]);
      if(process.env.SUPABASE_URL!==PUBLIC_PLANNER_DATABASE_URL||!process.env.SUPABASE_SECRET_KEY||!process.env.OPENAI_API_KEY)return disabled;
      const proxy=openAIProxyTransport();
      const transport=(url:string,init:RequestInit)=>(proxy.fetch??fetch)(url,{...proxy.fetchOptions,...init});
      const ledger=createPublicPlannerLedger({transport,url:process.env.SUPABASE_URL,secretKey:process.env.SUPABASE_SECRET_KEY});
      const provider=createPublicPlannerProvider({transport,apiKey:process.env.OPENAI_API_KEY});
      const settle=(receipt:Parameters<typeof ledger.settle>[0],signal:AbortSignal)=>{
        const task=awaitPublicQaBinding(ledger.settle(receipt,signal),signal).catch(()=>({settled:false}));
        // Keep the same bounded RPC alive after client cancellation; never dispatch twice.
        after(task.then(()=>undefined));
        return task;
      };
      return createPublicAiApplication({options,enabled:true,...ledger,settle,provider});
    })().catch(()=>disabled);
    return (await application)(request);
  };
}
