/** Central serving boundary. Configuration is supplied only by trusted server code.
 * Keeps the original callback/client for retained bindings. Candidate dispatch
 * never falls through to that callback, including on unsupported requests.
 */
export function createDatasetRequestBoundary({ router, retained, candidate = null }) {
  if (!router || typeof router.request !== 'function' || typeof router.current !== 'function' ||
      !retained || typeof retained !== 'object' || Array.isArray(retained) ||
      !Object.keys(retained).length || Object.values(retained).some(port => typeof port?.assertAvailable !== 'function') ||
      (candidate && (typeof candidate.datasetId !== 'string' || typeof candidate.handle !== 'function' ||
        Object.hasOwn(retained, candidate.datasetId)))) throw Error('Explicit serving bindings required');
  const originals = new Map(Object.entries(retained).map(([id, port]) => [id, port.assertAvailable.bind(port)]));
  const next = candidate && Object.freeze({ datasetId: candidate.datasetId, handle: candidate.handle.bind(candidate) });
  const unavailable = () => Response.json({ error: 'Dataset serving binding unavailable.' }, { status: 503 });
  return function withDatasetRequest(request, originalHandler) {
    return router.request(request, async () => {
      const bound = router.current();
      if (next?.datasetId === bound.datasetId) {
        if (!request) return unavailable();
        return next.handle(request);
      }
      const assertAvailable = originals.get(bound.datasetId);
      if (!assertAvailable || typeof originalHandler !== 'function') return unavailable();
      // A failed/stale original-source certificate must never relabel changed
      // content or cause a fallback to another population.
      try { if (await assertAvailable(bound) !== true) return unavailable(); }
      catch { return unavailable(); }
      return originalHandler();
    });
  };
}
