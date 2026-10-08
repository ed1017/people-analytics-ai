import { AsyncLocalStorage } from 'node:async_hooks';
import { DATASET_HEADER, LEGACY_DATASET_TOKEN, validDatasetToken } from './dataset-identity.mjs';

/** Trusted provider registry, never populated from request headers or arbitrary schemas.
 * A durable selector adapter must implement read() and atomic compareAndSwap().
 * The application below deliberately registers only legacy v1 during preparation.
 */
export class DatasetRouter {
  #context = new AsyncLocalStorage();
  #providers;
  #selector;
  constructor(providers, selector) {
    this.#providers = new Map(Object.entries(providers).map(([id, provider]) => [id, Object.freeze(provider)]));
    this.#selector = selector;
  }
  async #resolve() {
    const selected = await this.#selector.read();
    const provider = this.#providers.get(selected.datasetId);
    const token = `${selected.datasetId}:${selected.generation}`;
    if (!provider || !validDatasetToken(token) || provider.digest !== selected.digest)
      throw Error('Dataset binding unavailable');
    if (token !== LEGACY_DATASET_TOKEN && (!provider.approved || !provider.complete || !provider.certificate))
      throw Error('Dataset binding unavailable');
    return Object.freeze({ ...selected, token, provider });
  }
  current() {
    const bound = this.#context.getStore();
    if (!bound) throw Error('Dataset request context required');
    return bound;
  }
  async bootstrapToken() { return (await this.#resolve()).token; }
  client() { return this.current().provider.client; }
  // Used by the AI transport as well as database calls, including nested tools.
  assertAIContext() { return this.current().token; }
  async request(request, handler) {
    const inherited = this.#context.getStore();
    let bound;
    try { bound = inherited ?? await this.#resolve(); }
    catch { return Response.json({ error: 'Dataset binding unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
    const expected = request?.headers.get(DATASET_HEADER);
    // Only the original legacy binding accepts clients without version metadata.
    if ((expected && expected !== bound.token) || (!expected && !inherited && bound.token !== LEGACY_DATASET_TOKEN))
      return Response.json({ error: 'Dataset changed. Refresh evidence before continuing.' }, { status: 409, headers: { [DATASET_HEADER]: bound.token, 'Cache-Control': 'no-store' } });
    return this.#context.run(bound, async () => {
      const response = await handler();
      const declared = response.headers.get(DATASET_HEADER);
      if (declared && declared !== bound.token) throw Error('Mixed dataset response');
      response.headers.set(DATASET_HEADER, bound.token);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    });
  }
  /** Proposal control-plane operation; no HTTP route exposes it. Rollback also
   * requires a certified provider and increments generation (never reuses an epoch).
   */
  async select({ expected, target, approval }) {
    const provider = this.#providers.get(target);
    if (!approval?.reference || !approval?.implementationCommit || !approval?.configurationFingerprint ||
        !provider?.certificate || !provider?.approved || provider.digest !== approval.bundleDigest ||
        provider.certificate !== approval.preservationCertificate || !provider.complete)
      throw Error('Reviewed complete binding and preservation certificate required');
    if (!Number.isSafeInteger(expected.generation) || expected.generation < 0 || expected.generation >= 999999999999)
      throw Error('Invalid selector generation');
    const next = { datasetId: target, digest: provider.digest, generation: expected.generation + 1 };
    if (!await this.#selector.compareAndSwap(expected, next, approval)) throw Error('Selector changed; review again');
    return Object.freeze(next);
  }
}
