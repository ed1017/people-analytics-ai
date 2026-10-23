'use client';
import {PUBLIC_AI_ENABLED} from '@/lib/public-ai-capabilities.mjs';
import {PUBLIC_9037} from '@/lib/public-9037-contract.mjs';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {usePublicAiReadiness} from './use-public-ai-readiness';

/** A configured route does not promise funds or a healthy provider. */
export function PublicAiConfigurationStatus({route}:{route:string}){
 const configured=usePublicAiReadiness(route);
 if(!PUBLIC_AI_ENABLED||datasetSession.snapshot()!==PUBLIC_9037.token||!configured)return null;
 return <details className="text-xs text-muted-foreground"><summary className="cursor-pointer min-h-6">AI configured</summary><p className="mt-1">Budget and provider availability are checked when you submit.</p></details>;
}
