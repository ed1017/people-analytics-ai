// Only the existing aggregate GET read is substituted, never the app verifier.
exports.GET=request=>globalThis.__planB.aggregateGET(request);
