# Local integrity and provenance investigation

Base: `ac505c8e9dfdf5cf7231d1ea099435d5730344bf` (merged PR #231). Scope: local test/provenance investigation plus an inaccurate comment correction. No runtime behavior, reviewed artifact, source/provider/country configuration, DB or AI changes. No publication or deployment.

## Actual resumption

On the new base, the two affected files reproduced 9 passing / 2 failing tests. The exact historical producer at `5cc1eae473a6d6ba60f0bfb72b60b19cb6392854` passed its original `action-plan-analysis-demo.mjs --check`, without source edits or input/hash substitution.

## Analysis has two valid historical release lineages

The earlier first-failing assertion masked a second distinction: the full historical report and the display projection belong to different releases.

| Artifact | Exact source commit | Reproduced identity |
| --- | --- | --- |
| `docs/evidence/action-plan-analysis-demo-v1.json` | `5cc1eae473a6d6ba60f0bfb72b60b19cb6392854` | `b21f50f04b1e31378a7dcd55d4d476cff251c1b8a9f13e2a82581009b66c8386` |
| `lib/data/analysis-demo-display-v1.json` | `e3eae65cc641513041c379dcf2bed6845f323c4d` | `30538f7649089720e86a745f30717ae917784d8d78c8d5d26658e17b09b2ca95` |

The later export changes the display's `analysisIdentity` without replacing the older full report. Executing the exact exported source and its own inputs reproduces the entire display, not merely its identity. It computes implementation identity `6324b8f9348e58c294dd9304e9ece8b77744966ffb5c01632fdf866b11f82330`; no historical identity is injected. The older producer likewise reproduces the full report and its own historical display exactly.

Tests now separate:

1. Full-release provenance using the exact `5cc1eae` tree, producer, dependencies and input factory.
2. Display-release provenance using the exact `e3eae65` tree, producer, dependencies and input factory, then comparing the entire generated projection to the existing checked-in display.
3. Current producer behavior: independently hash its six implementation files and derive its current input key; assert the entire resulting report against the historical payload with only those derived identity fields changed. Every domain payload, source identity, number, limitation and qualification flag remains exact. Verify the producer accepts its current cache, rejects the historical cache with `domains: null`, and rejects a current projection as a substitute for the fixed reviewed display. Historical objects remain unchanged.

The new helper exports immutable local Git trees into temporary directories and executes only the requested historical offline producers there. It supplies no credentials, blocks `fetch`, does not install dependencies or fetch Git history, never patches the historical source, and removes its temporary directory afterward. No `--write` generator was run. A missing historical object is an explicit test failure, not a skip or a fallback to current code.

This introduces a test-environment prerequisite: Git, tar, and the three exact historical commits must be available locally. A shallow checkout must be provisioned with that history before running these checks. The current environment has all three objects. No app/runtime dependency is introduced.

## Five source-meaning changes, individually exercised

Recover exact original packets, bindings, calculated drafts, caches and attachments from the fixture's stated source commit `16018a6358261699a46a8bc3918e61b25bcc9f1e`. Original serialized packet hashes and saved bindings still match the existing fixture. Current code reads the old saved workspace and cache under their original context without rewriting them.

For both global and US/Data & AI/IC2 scopes, apply each transition separately, then all five together:

- P2 population: authorized positions → status records with filled + vacant current total.
- P2 limitation: inventory/Planning selection → no implied hiring need or approved change.
- F1 scope: company aggregate → business-unit rows, country/level filters not applied.
- F1 limitation: generic labor-cost caveat → no annualization, correct BU vacancy-exposure aggregation.
- F1 coverage selection: goal-word ordering → latest-turn named-BU selection, no ranking.

The test compares the whole current packet to the historical packet with exactly these five declared transitions. Workforce facts, effective scope, availability, rows and all other metadata remain unchanged. It also reproduces the original packet hashes and bindings directly from the old source, rather than accepting stored strings as a substitute for computation.

For each of the 12 transition cases:

- The real `actionBinding` computes a different evidence digest, with goal and planning identity unchanged.
- `readBundlePreparation` rejects old-cache reuse in the new context.
- `attachedBundleState` returns `context_changed`.
- Draft/result restoration under the new binding returns null.
- The old attachment confirmation cannot authorize the newly bound draft.
- Even a newly confirmed context cannot silently replace the current attachment: explicit replacement is required.
- An explicitly reviewed replacement appends a new current snapshot, records `supersedes`, and preserves the original attachment.
- Original workspace/cache/draft/result remain readable under their historical binding; saved bytes are unchanged.

The normalizer intentionally reconstructs authoritative source labels rather than trusting raw packet labels. Tests therefore temporarily install the historical/transition definition fields within their isolated Node test process while calling the unchanged binding function, restoring all definitions in `finally`. The full current transition is additionally checked against the normal, unmodified current binding path. No binding hash is supplied or overridden.

Conclusion: substantive source-meaning changes invalidate reuse even where numeric workforce facts are identical. That is the guard behavior to retain, not a reason to update historical hashes or migrate saved records.

## Comment correction

`homeEvidenceBindingValue` previously claimed only facts, population and version bind saved calculations. It actually retains the normalized packet, including meaning, scope, coverage, selection and availability. Only the dataset-context recipe fields are excluded; dataset identity and filters remain. The comment now describes this exact behavior. No hashing or normalization code changes.

## Validation

On Node v24.19.0 with locked dependencies:

- `node --test tests/analysis-demo-display.test.mjs tests/home-post175-dashboard-scope.test.mjs`: 25/25 passed (baseline 9 passed / 2 failed).
- `node --test --test-concurrency=4 tests/*.test.mjs`: 2,464/2,464 passed; zero failures, skips, cancellations or todos.
- `npx tsc --noEmit`: passed.
- `npx eslint lib/home-pack.mjs tests/analysis-demo-display.test.mjs tests/home-post175-dashboard-scope.test.mjs tests/helpers/historical-source.mjs`: passed.
- `npm run prebuild`: all six existing artifact checks passed, check mode only.
- `git diff --check`: passed.
- `git diff --name-only -- lib/data docs/evidence tests/fixtures`: empty; no reviewed artifact or historical fixture changes.

While adding the explicit-review control, an intermediate test tried to append without identifying the replaced attachment. The existing guard correctly rejected it. The final test checks that rejection, then provides the explicit replacement ID and verifies retained history. No product fix was made.

No test is skipped or marked expected-failing. Changes remain local for review; no push, PR, merge or deployment was performed.
