import { DatasetRouter } from './dataset-router.mjs';
// Preparation only: no environment variable, request, or public endpoint can select v2.
// This digest label is deliberately not a claim that live v1 is immutable/certified.
const legacy = Object.freeze({ datasetId: 'legacy-v1', generation: 0, digest: 'uncertified-live-v1' });
let sourceClient: unknown;
const provider = { digest: legacy.digest, get client() { if (!sourceClient) throw Error('Source client unavailable'); return sourceClient; } };
export const datasetRouter = new DatasetRouter({ 'legacy-v1': provider }, {
  read: async () => legacy,
  compareAndSwap: async () => false,
});
export function registerLegacyDatasetClient(client: unknown) {
  if (sourceClient && sourceClient !== client) throw Error('Legacy client already registered');
  sourceClient = client;
}
export function withDatasetRequest(request: Request | undefined, handler: () => Promise<Response>): Promise<Response> {
  return datasetRouter.request(request, handler);
}
export function datasetAI<T>(call: () => T): T {
  datasetRouter.assertAIContext();
  return call();
}
