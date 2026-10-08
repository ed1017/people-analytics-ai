# Projection backtest ranking — local review checkpoint

`projection-backtest-ranking-v1` orders the three existing methods in each projection by historical mean absolute error (MAE). The visible label is **3 methods ranked by backtest**. This is a comparison within a fixed pool, not a search for the best three methods from a wider universe. All current projection values, sources and calculations remain unchanged. No production publication is included in this checkpoint.

## Source and evaluation boundaries

Turnover and Satisfaction reuse the existing frozen `synthetic-domain-demo-v1` generator/replay: seed 7001, stationary family, cutoff 30 September 2026. The generator reproduces the displayed artifact, its history values, release dates and forecast values before any ranking is written. It supplies 68 released monthly Turnover periods and 22 released quarterly Satisfaction records, including the invalid/missing waves; the visible excerpts contain 24 months and eight waves respectively. Invalid waves are not removed to construct a convenient training window.

Active requisitions reuse the 35 complete snapshots in `synthetic-ta-calibrated-v2`, November 2023–September 2026. This is a retrospectively constructed and calibrated synthetic ledger, with event-date availability assumed. It is not a recovered history of source vintages. The cutoff-truncated fill ledger affects recent changes; the ranking describes this construction only.

At each monthly/quarterly origin, models receive only records whose effective and simulated availability dates are at or before that origin. Evaluation labels must be available by the current display cutoff. Turnover and requisitions score the next three calendar months equally; Satisfaction scores the next calendar quarter. Release lags remain in place, so the latest training observation can precede the origin. Every eligible method scores exactly the same targets at every eligible origin. A whole origin is excluded if any method or requested label is ineligible.

MAE is the mean absolute prediction error across all common origin-target pairs, using unrounded scores. Overlapping targets are repeated forecast tasks, not independent observations. At least three common origins and three eligible methods are required. Equal MAE within `1e-10` shares an accuracy rank; original pool order only resolves display ties. No ties occur in this release. These are selection scores, not an independent evaluation of the selected ordering, and do not establish real-workforce accuracy or a future operational winner.

## Results

| Projection | Rank | Existing method | MAE | Unit |
| --- | ---: | --- | ---: | --- |
| Turnover | 1 | Same month last year | 9.6992 | Monthly voluntary exits |
| Turnover | 2 | Recent mean (3) | 11.8537 | Monthly voluntary exits |
| Turnover | 3 | Linear Regression | 15.8254 | Monthly voluntary exits |
| Satisfaction | 1 | Last quarterly wave | 0.1670 | Percentage points of respondent favorable-answer share |
| Satisfaction | 2 | Linear Regression | 0.2571 | Percentage points of respondent favorable-answer share |
| Satisfaction | 3 | Recent mean (3) | 0.2693 | Percentage points of respondent favorable-answer share |
| Active requisitions | 1 | Recent mean (3) | 40.2000 | Active requisitions |
| Active requisitions | 2 | Last count | 41.3444 | Active requisitions |
| Active requisitions | 3 | Damped change | 52.0222 | Active requisitions |

| Projection | Common origins | Origin dates | Origin-target pairs | Distinct target periods | Target range |
| --- | ---: | --- | ---: | ---: | --- |
| Turnover | 41 | 31 Jan 2023–31 May 2026 | 123 | 43 | Feb 2023–Aug 2026 |
| Satisfaction | 7 | 30 Sep 2024–31 Mar 2026 | 7 | 7 | Dec 2024–Jun 2026 |
| Active requisitions | 30 | 31 Jan 2024–30 Jun 2026 | 90 | 32 | Feb 2024–Sep 2026 |

Turnover excludes one origin with no available releases, 23 without the required 24 consecutive months, one with unavailable scoring labels and two whose targets exceed the cutoff. Satisfaction excludes one origin with no releases, seven with insufficient quarterly history, six with invalid/incomplete waves and one with an unavailable target label. Requisitions exclude two origins without three consecutive complete training months and two without three complete future labels. The new JSON artifact records every scored origin, training end, latest training availability, target, target release, method score and exclusion reason.

The original frozen multi-case assessment (including its 80/100 scored-case counts and 150 constructed histories) remains separate. Its sample counts and scores are not inputs to this ranking; UI Details and Home text identify that distinction.

## Presentation and safeguards

The domain panels and shared Home charts use the same rank order. Rows, chart series and legends preserve the original method IDs, values, colors and symbols; sorting never reinterprets a value's array index. Home deterministic answers and AI context use the same versioned ranking with explicit scope. Missing or mismatched sources retain unranked comparison wording and never acquire invented scores.

The compact summary layout is preserved. Satisfaction's explanatory axis sentence moves into its existing Details disclosure; the visible tick values, percentage units and axis geometry remain unchanged. Turnover and the separate legacy opening-cohort example retain their existing axis-note placement. The legacy opening-cohort example is not assigned the new active-stock ranking.

The evaluator imports the existing forecasting functions. It changes no generator, forecasting method, source artifact, database, planning calculation, provider or chat model. The artifact is reproducible and checked during `prebuild`.

Source SHA-256 values in the ranking are hashes of `JSON.stringify` of the parsed canonical artifacts, not pretty-printed file bytes:

- `synthetic-domain-demo-v1`: `4feba90b4ac09b71abd64243bf92a4060769e27aae775808341329737ef6c5ff`
- `synthetic-ta-calibrated-v2`: `ddba522fe7b4ad8deb71468613a980a2785a6286a0e1d9d200aed07b8f1484af`
- Frozen original report: `5e4a2f441b9577d51deb7a6605b96503e8a5e5706f1c025d888ae7f58c0bc6e5`

## Validation

Run `node tests/manual/generate-projection-backtests.mjs --check` to reproduce the artifact. Dedicated tests cover independent expected scores, release clocks, common target eligibility, future-data poisoning, ties, insufficient/gappy history, canonical-source matching and ranked prose value identity. Browser tests exercise the actual components at desktop/mobile/zoom widths, exact ranked cell values, plot method identities, keyboard Details, tooltips, stacking and absence of network/provider requests.

Validation passed: 1,865 unit tests; production build with all six artifact reproduction checks; ESLint; 1,160 forecast browser assertions; and 218 calibrated TA browser assertions. Screenshots were inspected at desktop and mobile widths. Independent GPT-6 Astra Extra High review reproduced all scores from a separate chronological replay, confirmed original method/value/color identity, and verified the unavailable-ranking fallback. Publication remains pending the parent review checkpoint.
