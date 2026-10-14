import { DatasetRouter } from './dataset-router.mjs';
import { createDatasetRequestBoundary } from './dataset-request-boundary.mjs';
import { createDeferredLegacyClient } from './dataset-legacy-client.mjs';
// Preparation only: no environment variable, request, or public endpoint can select v2.
// This digest label is deliberately not a claim that live v1 is immutable/certified.
const legacy = Object.freeze({ datasetId: 'legacy-v1', generation: 0, digest: 'uncertified-live-v1' });
const sourceClient = createDeferredLegacyClient();
const provider = { digest: legacy.digest, get client() { return sourceClient.read(); } };
export const datasetRouter = new DatasetRouter({ 'legacy-v1': provider }, {
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
const requestBoundary = createDatasetRequestBoundary({ router: datasetRouter,
  retained: { 'legacy-v1': { assertAvailable: async () => true } },
});
export function withDatasetRequest(request: Request | undefined, handler: () => Promise<Response>): Promise<Response> {
  return requestBoundary(request, handler);
}
export function datasetAI<T>(call: () => T): T {
  datasetRouter.assertAIContext();
  return call();
}
