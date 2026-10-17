import {development9037Options} from './dataset-9037-development-options.mjs';
import type {load9037DevelopmentBinding} from './dataset-9037-development.server.mjs';
import { DatasetRouter } from './dataset-router.mjs';
import { createDatasetRequestBoundary } from './dataset-request-boundary.mjs';
import { createDeferredLegacyClient } from './dataset-legacy-client.mjs';
// Production stays on legacy. The separately pinned development launcher is loopback-only.
// This digest label is deliberately not a claim that live v1 is immutable/certified.
const legacy = Object.freeze({ datasetId: 'legacy-v1', generation: 0, digest: 'uncertified-live-v1' });
const sourceClient = createDeferredLegacyClient();
const provider = { digest: legacy.digest, get client() { return sourceClient.read(); } };
const legacyRouter = new DatasetRouter({ 'legacy-v1': provider }, {
  read: async () => legacy,
  compareAndSwap: async () => false,
});
export function registerLegacyDatasetClient(client: unknown) {
  sourceClient.register(client);
}
export function registerLegacyDatasetClientFactory(factory: () => unknown) {
  sourceClient.registerFactory(factory);
}
// Generation-zero production behavior remains the same mutable live binding.
// This guard is not an immutable-source certificate. No candidate is configured.
const requestBoundary = createDatasetRequestBoundary({ router: legacyRouter,
  retained: { 'legacy-v1': { assertAvailable: async () => true } },
});
export function withDatasetRequest(request: Request | undefined, handler: () => Promise<Response>): Promise<Response> {
  if (localOptions) return localBinding().then(binding => binding.handle(request)).catch(() => Response.json({error:'Local candidate unavailable.'},{status:503}));
  return requestBoundary(request, handler);
}
export function datasetAI<T>(call: () => T): T {
  if(localOptions)throw Error("AI is disabled in local 9037 serving");
  legacyRouter.assertAIContext();
  return call();
}

// Capture configuration once. Failed loads stay failed; never fall back to live data.
const localOptions=development9037Options(process.env);
export const isLocal9037Development=localOptions!==null;
let activeLocal: Awaited<ReturnType<typeof load9037DevelopmentBinding>> | null=null;
let localPromise: Promise<Awaited<ReturnType<typeof load9037DevelopmentBinding>>> | null=null;
function localBinding(){
 if(!localOptions)throw Error('Local binding not configured');
 return localPromise??=import('./dataset-9037-development.server.mjs')
  .then(({load9037DevelopmentBinding})=>load9037DevelopmentBinding(localOptions))
  .then(binding=>{activeLocal=binding;return binding;});
}
export const datasetRouter=localOptions?{
 bootstrapToken:async()=>localOptions?(await localBinding()).router.bootstrapToken():legacyRouter.bootstrapToken(),
 request:async(request: Request,handler:()=>Promise<Response>)=>localOptions?(await localBinding()).handle(request):legacyRouter.request(request,handler),
 current:()=>{if(localOptions){if(!activeLocal)throw Error('Local binding unavailable');return activeLocal.router.current();}return legacyRouter.current();},
 client:()=>{if(localOptions)throw Error('Database clients disabled in local 9037 serving');return legacyRouter.client();},
 assertAIContext:()=>{if(localOptions)throw Error('AI disabled in local 9037 serving');return legacyRouter.assertAIContext();},
}:legacyRouter;
