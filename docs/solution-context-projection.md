# Bounded model views for solution conversations

Model-facing saved plans and candidate calculations omit only internal serialized equality keys: draft signature, result signature/binding key/input key, and evaluation source keys. The structured plan, input values, provenance, uncertainty, original operation text, candidate intent, constraints, exact IDs/revisions, bindings, source references, results and limitations remain visible. Source-current status is explicit. Authoritative state and all save/calculation/metric validation still use the complete server-owned objects.

The model context includes all retained conversation turns and working revisions, with an explicit latest-revision index. It no longer silently slices that retained context to sixteen turns or six candidates. The existing 120,000-byte conversation guard and 65,000-character tool-result guard remain unchanged. If nonredundant semantic context itself exceeds the bound, the request fails explicitly; user intent and constraints are not silently dropped to fit.

Offline verification uses the complete retained application payloads from the fictional failed deployment `dpl_9i62Z9LMr1dZwgE3xriTnrQwsq9z`. Run:

```
node --experimental-strip-types tests/manual/replay-solution-context.mjs
```

The replay preserves both completed answers, checks captured calculation outputs, simulates only the existing in-memory selection boundary, and carries the resulting state into the next recorded request. The third turn reaches the next model callback at 84,967 bytes, compared with 134,445 before the fix. The guard stays at 120,000 bytes. The callback stops with an explicit sentinel because no historical third final answer exists. No response is invented and no provider or workforce loader is called. This is an application-payload replay, not a byte-for-byte SDK envelope replay; private provider internals were deliberately not logged.

Regression coverage also includes multiple candidates and revisions, long retained history, current versus historical constraints, stale source status, unavailable evidence, strict current-turn metric references, rejection of projected data as authoritative state, and explicit refusal when semantic context exceeds the unchanged guard. Live continuation and browser acceptance remain unverified.
