/** A process-local, synchronous source slot. Registration never opens a client.
 * Ownership cannot change after registration, including after a failed startup.
 */
export function createDeferredLegacyClient() {
  /** @type {object | undefined} */
  let client;
  /** @type {(() => unknown) | undefined} */
  let factory;
  let state = 'uninitialized';
  const unavailable = () => Error('Legacy source client unavailable');
  const valid = value => {
    if (value === null || typeof value !== 'object') return false;
    if (typeof value.then === 'function') {
      // Observe unsupported async results without awaiting or accepting them.
      // Otherwise a rejected factory Promise can escape as an unhandled error.
      void Promise.resolve(value).catch(() => undefined);
      return false;
    }
    return true;
  };

  return Object.freeze({
    /** @param {unknown} value */
    register(value) {
      if (factory || (client && client !== value)) throw Error('Legacy client already registered');
      if (!valid(value)) throw unavailable();
      client = /** @type {object} */ (value);
      state = 'ready';
    },
    /** @param {() => unknown} value */
    registerFactory(value) {
      if (client || (factory && factory !== value)) throw Error('Legacy client already registered');
      if (typeof value !== 'function') throw unavailable();
      factory = value;
    },
    read() {
      if (state === 'ready') return client;
      if (state === 'initializing') state = 'failed';
      if (state === 'failed' || !factory) throw unavailable();
      state = 'initializing';
      try {
        const value = factory();
        const validClient = valid(value);
        if (state !== 'initializing' || !validClient) throw unavailable();
        client = /** @type {object} */ (value);
        state = 'ready';
        return client;
      } catch {
        // Do not expose credentials or source error details, or retry implicitly.
        state = 'failed';
        throw unavailable();
      }
    },
  });
}
