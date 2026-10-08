# Source-bound demand references and adaptive clarification

This successor retains the provenance fix and immutable review validation. The app's demand mode now advertises `review_scoped_service_demand` and `revise_scoped_service_demand`. The shared `demandReferenceModelContract` exports the exact tools, instructions and response format for the route and portable test transport. Model identity, profile, credentials, existing size limits and paid authorization remain outside that pure contract.

Initial proposals can choose `{ref:"illustrative-service-role"}` instead of copying the supported fictional role label. A quantity can explicitly use `{ref:"scenario-scope"}`, a distinct literal scope, or null. A reference to an unknown scenario scope fails; different literal scopes remain different. No alias guessing or fuzzy matching is performed.

The service issues a short `reviewRef` for its validated current review at each request/step. A successful change rotates the reference. A stale or cross-request reference fails. Code retains the complete review and serialized equality key; the model receives a labeled projection with all assumptions/results and the reference, while original user turns remain in the conversation. Projected data is never an authoritative save payload.

Each edit supplies exactly one current-user basis. Quantity value/period can explicitly retain their previous values, and scope must explicitly retain, reference the scenario, or name a literal. Omission preserves the whole field. Code resolves those choices and then runs the original exact-key, source-kind, turn-ID, exact-quote, units, range, duplicate-target and unknown-value checks. A scalar scope edit does not repair any unnamed quantities. A reference is an identity aid, not authorization or verification of a business fact. Scope-only changes to an unknown-valued quantity are not silently promoted to user-known values; unsupported edits remain blocked.

Legacy full reviews and the optional editor still use the existing validators and keys. Historical fixtures remain byte-identical. Reference mode is explicit in the service runtime and enabled by the demand API route; old wire requests are not accepted in that mode. No app flag, model configuration, dataset, release, save or deployment is changed by publishing this source branch.

The unarmed v5 fixture executes four bounded follow-up turns from a separately supplied preserved clarification anchor. The first three retain valid incomplete reviews. The fourth is explicitly authored fictional user input: a January 2027 start, the same already-reviewed client-operations scope, and preservation of the nine-month horizon, four staff/25% availability and all other assumptions. It supplies no new effort or productivity numbers. Calculations use the actual retained values. If other required values remain unknown, the final stage remains incomplete. Structural checks are never full acceptance; narrative meaning, explicit local acceptance, save/reload and operational outcomes remain separate.

The driver requires caller-supplied completion and durable recording, stops on failure without retry, and bounds the script to four follow-ups, at most sixteen model rounds and twenty-four tool calls. It supplies no SDK, credentials, endpoint, count request, budget reservation or paid execution authority. Use only a separately reviewed transport and the exact shared contract. Check the complete serialized envelope under that transport's existing size cap before every authorized call; a smaller example does not certify all possible model output sizes.

Offline commands:

```sh
node --test tests/swp-*.test.mjs
node tests/manual/verify-swp-reference-source.mjs EXPECTED_MANIFEST_SHA256
node tests/manual/replay-swp-reference-offline.mjs PRIVATE_ANCHOR_PATH EXPECTED_ANCHOR_SHA256
node tests/manual/replay-swp-recorded-reference-edit.mjs PRIVATE_REVIEW_PATH REVIEW_SHA256 PRIVATE_ARGUMENT_PATH ARGUMENT_SHA256
```

The last two scripts require private files supplied separately; none are embedded in this repository. Hashes verify exact bytes, not origin. The preserved anchor's model clarification was recorded; its conversation state was reconstructed offline and does not prove saved/reloaded UI state. The new reference arguments are derived from the recorded rejected edit, and all new follow-up tool calls/replies in offline fixtures are synthetic. The earlier paid failure remains failed/consumed. No independent forecast or real-world validation is claimed.

Whole-app build limitation at preparation: Webpack compilation succeeds, but generated Next route types reject optional `Request` parameters in 21 inherited API routes. Those route files are byte-identical to the frozen predecessor. This source/fixture handoff does not suppress type checking or certify a production deployment; resolve that separate build boundary before deploying the whole application.
