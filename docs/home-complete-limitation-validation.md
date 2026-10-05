# Complete limitations at the schema boundary

The PR146 hosted diagnostic on `59286b32856eb9dd5cf48bfc25c3c617bb72a66d` reported a completed response rejected locally as `incomplete_text`, field `component_limitation`: 3,492 output bytes, 2,205 output tokens including 1,488 reasoning tokens, against a 10,000-token limit. This does not establish token exhaustion. The original response text was not captured, so the exact offending suffix is unknown.

## Reproduction and correction

The fresh-response detector treated any text exactly at its schema character limit without terminal sentence punctuation as incomplete. The synthetic fixture in `tests/fixtures/home-complete-limitation.mjs` is a complete 200-character component limitation without a final full stop. It failed on PR146 and passes after removing that length-and-punctuation assumption. The shorter version passes too; accepted text is preserved byte for byte. This proves a false-positive class, not that the unseen hosted text had this exact form.

The detector still rejects visibly unfinished conjunctions, separators and ellipses. Provider incomplete/failed status, refusals, empty output, malformed JSON, schema limits, reference/dependency validation and delivery scope checks remain enforced. Component limitations now receive the same schema guidance as plan limitations: shorten complete sentences rather than clipping. No model setting, token cap, model input boundary, saved-data contract, retry policy or calculation behavior changed.

This guard is not a semantic proof of complete prose. Arbitrary mid-word or mid-thought truncation can be indistinguishable from valid brief text using only length and punctuation. We do not infer missing words, rewrite accepted content, or promise detection of every such case. Known incomplete provider responses and the tested visible truncation cases still fail closed.

## Verification

- 1,312 unit tests pass (1,253 root tests plus 59 synthetic-workforce tests), including the isolated actual API route with no network and one SDK invocation per explicit request.
- Production build, lint, standalone TypeScript and whitespace checks pass.
- 174 browser checks pass against the production build: incomplete-plan recovery63, prefixed-plan editing60, context staleness51. Each covers desktop1366px, mobile390px and 200%-equivalent683px reflow.
- Recovery accepts and visibly preserves the complete boundary-length limitation, rejects a genuinely dangling component limitation, keeps existing drafts/calculations/immutable attachments after failure, and recovers only through explicit user action. Reload, goal switching, local edits and stale-context rejection remain covered. Browser APIs are intercepted; external network access and app runtime errors fail the harness.
- Held eNPS files are unchanged. No live model request, credential investigation or denied GitHub route was used.

This branch is based on PR146. Existing PR heads and main remain preserved. Hosted acceptance on the exact new preview is still required; no merge is authorized by these local results.
