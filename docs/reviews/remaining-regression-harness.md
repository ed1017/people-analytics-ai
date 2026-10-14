# Remaining regression harness follow-up

Base: `f115ee5d2bb13effff1fb922ff35ca273f569828` (merged PR #230). No app/library, product/data/provider configuration, published data artifact, or historical expected output hash changes. No DB writes or AI calls.

## Completed repairs

- Six `dashboard-evidence-auth` failures: add the actual `legacy-source-contracts.ts` module to the existing strict loader. All outage classification, sibling cancellation, redaction, ordering and zero-provider-call assertions remain.
- `goal-takeaway-display`: import the actual `dataset-client.mjs` in its VM allowlist. Its three server-render tests now execute; no effects or transport calls run during server rendering.
- `occupational-reference-route`: resolve the actual `dataset-runtime.ts` to a file URL before importing the data-URL route. Its three tests retain the network prohibition, in-memory source, sanitized diagnostics, cancellation and unknown-value assertions.
- `career-growth-mobility-display`: replace the obsolete `From question to action` heading assertion with the current objective → workforce choices → reviewed Action Plan → progress meaning, plus four explicit conditional-benefit/review/save/outcome assertions. Dialog accessibility and Planning disclosures remain tested.
- `swp-fluid-request`: use the established `offlineBusinessRoute` helper. This still executes the actual POST module with synthetic provider/source ports, while using the real dataset wrapper and the established timers/crypto sandbox. All three previously unreachable POST tests now execute. Their old 30-second timeout expectation is corrected to the explicitly introduced 60-second provider budget (`f111fed`), not removed; model, tier, reasoning, tool, retry, output-token and request-integrity assertions remain.
- `home-mix-scenario`: replay the historical source binding rather than binding a new source packet with today's metadata. Recover the old digest from the independently verified historical normalized packet added in PR #230. Add a whole-draft hash check recovered at `5cc1eae`; retain the original published output hash unchanged.

## SWP exact failure chain

A temporary `uncaughtExceptionMonitor` captured the original exception before Node's test runner reformatted it:

```text
ReferenceError: __dirname is not defined
  at evalmachine.<anonymous>:12739:694
  at ./node_modules/next/dist/compiled/ua-parser-js/ua-parser.js
  at __webpack_require__
  at ./node_modules/next/dist/server/web/spec-extension/user-agent.js
  at __webpack_require__
  at ./node_modules/next/server.js
  at __webpack_require__
  at ./lib/home-solution-grounding-source.ts
```

The duplicate harness aliased `dataset-runtime` but not `home-solution-grounding-source`, accidentally bundling the real source/Next server chain into a VM without `__dirname`. The top-level compiler callback then raised an uncaught exception after the first three tests. Node reported ambiguous module syntax (`__dirname` plus top-level await); this was not evidence that the application's module format needed changing. The shared offline helper already isolates the source transport before bundling and supplies the required test globals. Adding `__dirname` alone would have left the unintended real-source dependency in place.

Reproduction of the original stack on untouched main:

```sh
printf '%s\n' "process.on('uncaughtExceptionMonitor', e => console.error(e.stack));" > /tmp/trace-harness-error.cjs
node --require /tmp/trace-harness-error.cjs --test tests/swp-fluid-request.test.mjs
```

## Three identity investigations

### Staffing source replay: repaired fixture, identical behavior

At `5cc1eae`, the source draft used by the existing test hashes to `3ab00c36de6fbbb5e95ee1c3a8a772e50aab68ec24a1b1e36cab9918ac82884e`; its evaluation hashes to the existing expectation `d8f5b13a68678f333fd051ad4cece3ce19db1f40cda542414c08e4266949ec44`.

A fresh current draft differs in exactly `/binding/evidenceDigest`: historical `0f38df…` versus current `04e9c7…`. Its evaluation consequently changes identity fields: the binding copies, input keys, source fingerprints and report fingerprint. The current implementation given the **original draft** produces the original complete output byte-for-byte, including all numbers, assumptions and decisions. That establishes a fixture problem, not a staffing calculation defect. The test now checks both historical input and original output. The original-demo-bytes assertion also remains unchanged and passes.

### Analysis release: unresolved integrity mismatch, assertion retained

`analysis-demo-display.test.mjs:11` remains failing. Comparing the checked-in full release with the current public producer yields exactly six changed paths:

- `/inputKey`
- `/implementationIdentity`
- `/domains/turnover/planContext/inputKey`
- `/domains/hiring/planContext/inputKey`
- `/domains/satisfaction/planContext/inputKey`
- `/identity`

The historical input binding has `0f38df…`; `analysisDemoDraft()` currently produces `04e9c7…`. Replaying the old binding removes all four input-key differences, but **still** changes implementation identity from `bb3a6e78db3303994e4ba6c4fea037749bd0ae5b67f64d62bff8a391cf1c78a2` to `4ff058ff86f7335e71362c88c50f2a0a8b02194eba6a07d4312ac58fc8a7827d` and the derived overall identity. Among the producer's six hashed files, only `lib/home-bundle-reconciliation.ts` differs from the last full-release update at `5cc1eae`; its later receipt/validation/review changes are real implementation changes.

All domain payloads, numbers, source evidence identities, limitations and qualification flags are unchanged in this replay. The UI explicitly presents fixed reviewed artifacts with no live freshness claim (`AnalysisDemoComparison`, `resolveAnalysisDisplay`), so this does not prove a wrong displayed metric. It does prove that today's producer does not exactly reproduce the published release identity. Resolving that requires a separately reviewed release/provenance decision. Do not supply an invented old implementation identity, regenerate the artifact, or weaken this equality assertion to make it green.

### Historical scope binding: unresolved contract mismatch, assertion retained

`home-post175-dashboard-scope.test.mjs:30` remains failing. Recovering the producer at the fixture's stated `16018a6358261699a46a8bc3918e61b25bcc9f1e` exactly reproduces both stored serialized hashes. Comparing its packets to current packets gives **only** these five changes, for both global and US/Data & AI/IC2:

| Field | Historical meaning | Current meaning |
| --- | --- | --- |
| P2 population | Authorized positions, not employees | Status records; current total is filled + vacant |
| P2 limitation | Current inventory; Planning selection required | Inventory does not establish hiring need or approved change |
| F1 scope | Company-wide current aggregate | Business-unit rows; country/level filters not applied |
| F1 limitation | Not base pay/market benchmarks; period unknown | No annualization; vacancy exposure sums BU estimates |
| F1 coverage selection | Explicit goal words first | Named BU matches in latest turn first; no ranking |

P2 changes come from `0eb86b3`; F1 changes come from `a042de1`. Workforce facts, selected country/org/level scope, row values and source availability do not change. The historical global serialized hash is `5cf47a8afab17f6e66e716911189383a1b09709547eb26394df437d8ddc060fd`, current `69b15db589a31e2964f501720ca8e18ead092f90de7f1a33142397e8281c9bb8`; historical US hash is `373781bd892bf3b83de7eab8b707993c070d1d0083ad07a20fd00a3cbe7d6fe6`, current `eb025960a7914a33d48a301f7b4c66341cf6ad5b57c9dfd78ed9412a14ce7b1c`.

The binding also changes: global `cb4f8e40…` → `27054486…`; US `00f235e5…` → `1cdf6600…`. `actionBinding` hashes normalized metadata as well as facts, so strict saved-binding guards see these contexts as different. Whether those reviewed source-semantic changes should invalidate an old plan is a product identity decision, not a loader repair. No country correction, saved-binding migration, metadata rollback or hash refresh was attempted. No incorrect workforce value or lost persisted record was demonstrated.

Historical worktrees used for read-only comparison:

```sh
git worktree add --detach /tmp/harness-mix-origin 5cc1eae
git worktree add --detach /tmp/harness-scope-origin 16018a6358261699a46a8bc3918e61b25bcc9f1e
```

## Validation

Node v24.19.0, existing locked dependencies. Both full runs used `node --test --test-concurrency=4 tests/*.test.mjs` on the same machine, with separate untouched-main and repair worktrees.

| Check | Untouched main | Repair |
| --- | --- | --- |
| Eight investigated files | 26 pass / 13 fail / 39 total | 43 pass / 2 fail / 45 total |
| All 262 top-level test files | 2,431 pass / 13 fail / 2,444 total | 2,448 pass / 2 fail / 2,450 total |

The six additional tests reflect previously blocked execution: Goal takeaway +2 net, Occupational reference +2 net, and SWP +2 net (file-level failure entries replaced by runnable tests). Eleven baseline failures disappear; no failure is added. Remaining failures are the two exact unchanged assertions documented above. No tests are skipped, cancelled or marked todo. Aggregate and eight-file checks deliberately exit 1.

Additional successful checks:

- Four repaired loader/guidance files: 18/18.
- `node --test tests/swp-fluid-request.test.mjs tests/home-provider-error-classification.test.mjs`: 14/14, including the fake-clock 60-second provider/90-second shared-deadline contract.
- `node --test tests/home-mix-scenario.test.mjs tests/home-demo-goals.test.mjs`: 18/18.
- `npx tsc --noEmit`.
- `npx eslint` on all six changed test files.
- `npm run prebuild`: all six artifact checks, check mode only.
- `git diff --check`.

Exact investigated-file command:

```sh
node --test --test-concurrency=4 \
  tests/dashboard-evidence-auth.test.mjs \
  tests/goal-takeaway-display.test.mjs \
  tests/occupational-reference-route.test.mjs \
  tests/career-growth-mobility-display.test.mjs \
  tests/swp-fluid-request.test.mjs \
  tests/analysis-demo-display.test.mjs \
  tests/home-mix-scenario.test.mjs \
  tests/home-post175-dashboard-scope.test.mjs
```

The unresolved tests above are intentionally neither skipped nor marked expected failures. Independent review is required; no merge or deployment is requested.
