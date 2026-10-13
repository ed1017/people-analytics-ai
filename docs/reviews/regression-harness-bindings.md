# Regression harness repair

Base: `141b96fb18586ea6be8d532442c25d55ecc7c9b8` (current main when work began), independent of PR #229. Only tests, a historical test fixture, and this review record change.

## Diagnosis

The three reported files reproduce 17 passing / 5 failing tests on untouched main. The repair passes all 22.

- `calibrated-ta-extension`: the VM allowlist omitted `@/lib/dataset-runtime`, added when the route acquired its dataset request wrapper. The test now imports the real `withDatasetRequest`; source reads remain synthetic. Source drift and missing-period assertions are unchanged.
- `numeric-source-contracts`: three render tests omitted `@/components/evidence-table-region`. The allowlist now loads the real component through the existing transpiler. Numeric, provenance, missing-value and zero-value assertions are unchanged. Server markup is tested; browser overflow behavior is outside this check.
- `home-demo-goals`: the stored evidence digest is correct for the original demo. At `dd178df`, `normalizeHomePack({sources:[]})`, canonically JSON-serialized with recursively sorted object keys, hashes to `0f38dfd582c15171ba2d3150a246d9cdc4710248816e05891670f25af4ee3bf0`. The fixture is that exact historical normalized packet, recovered in a detached worktree, not a regenerated current expectation. It contains no available source facts.

Current normalization hashes to `04e9c73410bc389b7289cec6f5d841c882e4ebe5cca820d61b813d378281f801`. The complete semantic difference is four metadata fields: P2 population and limitation (`0eb86b3`), and F1 scope and limitation (`a042de1`). No source facts differ. `HomeDemoPlans` uses `demoBinding(example)` directly, and saved drafts/results restore by that frozen binding. Rebinding the product would break that saved identity. The repaired test hashes the historical packet, checks the exact original digest, retains current goal/planning identity checks, and additionally verifies every seeded draft binding and restored draft/result. Existing persistence, edits, removal and no-reseeding assertions remain.

The earlier observation in `docs/reviews/pilot-lifecycle-example.md` remains historically accurate. No product defect was demonstrated by these five failures. Broader live evidence fingerprints include metadata; changing that general identity contract is outside this fixture repair.

## Reproduction

```sh
git worktree add --detach /tmp/home-demo-origin dd178df
node --input-type=module -e "import {normalizeHomePack} from '/tmp/home-demo-origin/lib/home-pack.mjs'; console.log(JSON.stringify(normalizeHomePack({sources:[]}),null,2))"
```

The output equals `tests/fixtures/home-demo-origin-evidence.json`. Do not regenerate it from current main. The test independently checks its canonical SHA-256.

## Validation

Node v24.19.0; locked dependencies installed using `npm ci --ignore-scripts --cache /tmp/people-npm-cache`. Initial install with the default cache failed due to its unwritable location; the retry succeeded without lockfile changes.

- `node --test tests/home-demo-goals.test.mjs tests/calibrated-ta-extension.test.mjs tests/numeric-source-contracts.test.mjs`: base 17/22, repair 22/22.
- `npx tsc --noEmit`: passed.
- `npx eslint tests/home-demo-goals.test.mjs tests/calibrated-ta-extension.test.mjs tests/numeric-source-contracts.test.mjs`: passed.
- `git diff --check`: passed.
- `npm run prebuild`: all six checked-in generated artifact checks passed (check mode only).

No DB writes, AI provider calls, country/data/provider configuration edits, merge or deployment were performed. Independent review is required before merge/deploy.

## Additional failures outside this repair

Untouched main: **2,426 passed / 18 failed / 2,444 total**. Repair: **2,431 passed / 13 failed / 2,444 total**. The remaining failure-name multiset is identical; precisely the five reported failures were removed, with no added failures. Both runs exited 1, with zero skipped, cancelled or todo tests.

The aggregate command is `node --test --test-concurrency=4 tests/*.test.mjs` (all 262 top-level test files, broader than the supplied 240-test audit).

| File | Failures | Observed failure boundary |
| --- | ---: | --- |
| `analysis-demo-display.test.mjs` | 1 | Reproduced public artifact differs in saved input identity, including old/current evidence digests. |
| `career-growth-mobility-display.test.mjs` | 1 | Expected `From question to action` copy is absent from current Home instructions. |
| `dashboard-evidence-auth.test.mjs` | 6 | Harness rejects `../../../lib/legacy-source-contracts` before outage assertions. |
| `goal-takeaway-display.test.mjs` | 1 file-level | Harness cannot resolve `@/lib/dataset-client.mjs`. |
| `home-mix-scenario.test.mjs` | 1 | Published source replay digest mismatch at line 81; the preceding original-demo-bytes assertion passes. |
| `home-post175-dashboard-scope.test.mjs` | 1 | Historical serialized evidence hash mismatch. |
| `occupational-reference-route.test.mjs` | 1 file-level | Data-URL test loader cannot resolve `@/lib/dataset-runtime`. |
| `swp-fluid-request.test.mjs` | 1 file-level | Asynchronous activity after test completion reports ambiguous module format (`__dirname` plus top-level await). |

These observations do not establish product defects; identity mismatches require separate semantic investigation, and import errors prevent the affected assertions from executing. No snapshots or assertions in these files were changed.
