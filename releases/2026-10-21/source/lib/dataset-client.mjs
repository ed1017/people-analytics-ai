import { DATASET_HEADER, DATASET_ROUTES, LEGACY_DATASET_TOKEN, validDatasetToken } from './dataset-identity.mjs';

export class DatasetSession {
  #token;
  #ready;
  #managed;
  #listeners = new Set();
  constructor(token = LEGACY_DATASET_TOKEN, { requireBootstrap = false } = {}) {
    if (!validDatasetToken(token)) throw Error('Invalid dataset identity');
    this.#token = token;
    this.#managed = requireBootstrap;
    this.#ready = !requireBootstrap;
  }
  current = () => this.#token;
  snapshot = () => this.#ready ? this.#token : `pending:${this.#token}`;
  /** @param {string} token @param {(token: string) => void} [prepare] */
  bootstrap(token, prepare = () => {}) {
    if (!validDatasetToken(token)) throw Error('Invalid server dataset identity');
    const incoming=Number(token.split(':')[1]), current=Number(this.#token.split(':')[1]);
    if (incoming===current && token!==this.#token) throw Error('Conflicting server dataset identity');
    // A newer API receipt may arrive before an older streamed layout finishes.
    const selected=incoming>=current?token:this.#token;
    if (this.#ready && selected===this.#token) return selected;
    prepare(selected);
    this.#token=selected;this.#ready=true;
    for (const listener of this.#listeners) listener();
    return selected;
  }
  subscribe = listener => { this.#listeners.add(listener); return () => { this.#listeners.delete(listener); }; };
  #change(token) {
    if (!validDatasetToken(token)) throw Error('Invalid dataset response identity');
    if (Number(token.split(':')[1]) <= Number(this.#token.split(':')[1])) throw Error('Older or conflicting dataset deployment');
    this.#token = token;
    if (this.#managed) this.#ready=false;
    for (const listener of this.#listeners) listener();
  }
  async fetch(input, init, transport = globalThis.fetch) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // No dataset header is added to external URLs or unrelated API routes.
    const pathname = url.startsWith('/') && !url.startsWith('//') ? url.split('?')[0] : null;
    if (!DATASET_ROUTES.includes(pathname)) return transport(input, init);
    if (!this.#ready) throw Error('Dataset bootstrap pending');
    const token = this.#token;
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set(DATASET_HEADER, token);
    const response = await transport(input, { ...init, headers });
    // Old in-flight completions cannot move the session backwards after a cutover.
    if (!this.#ready || this.#token !== token) throw Error('Superseded dataset response');
    const actual = response.headers?.get(DATASET_HEADER);
    if (actual && actual !== token) {
      // A mismatch is a refresh signal, never permission to consume its body.
      this.#change(actual);
      throw Error('Dataset changed. Refresh evidence before continuing.');
    }
    if (!actual && token !== LEGACY_DATASET_TOKEN) throw Error('Unversioned evidence unavailable');
    // Guard body completion as well as header arrival.
    return new Proxy(response, { get: (target, key) => {
      const value = Reflect.get(target, key, target);
      if (['json', 'text', 'arrayBuffer', 'blob', 'formData'].includes(String(key))) return async (...args) => {
        const result = await value.apply(target, args);
        if (!this.#ready || this.#token !== token) throw Error('Superseded dataset response body');
        return result;
      };
      return typeof value === 'function' ? value.bind(target) : value;
    } });
  }
}
export const datasetSession = new DatasetSession(LEGACY_DATASET_TOKEN, { requireBootstrap: true });
export const datasetFetch = (input, init) => datasetSession.fetch(input, init);
