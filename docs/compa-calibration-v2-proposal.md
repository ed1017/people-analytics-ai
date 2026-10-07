# COMPA calibration v2 — inactive local proposal

This proposal calibrates **invented underlying pay and matching ranges together**, then applies the existing COMPA arithmetic unchanged. It is not activated by any route, UI, environment flag or prebuild script. `activationAllowed`, `publicationApproved` and `cutoverReady` are false. It does not change `compensation-release-v1`, the separate `synthetic-pay-demo-v1`, existing fixtures, database records, grants or production defaults.

## What the current code establishes

The job COMPA release already computes the arithmetic mean of each eligible person's matched `100 × (annual contracted base / FTE) / range midpoint`. Matching includes job, level, country, currency, effective date and pay basis. The existing tests distinguish that method from a ratio of sums. There is no reason to change this formula.

The v1 range generator defines an arbitrary USD midpoint as `50,000 + (sum of job-code character values mod 11) × 2,500 + level rank × 10,000`, with an 80–120% band. Its country dimension changes the match key but not the monetary assumption. The numerator comes independently from the previously approved existing-snapshot base-pay convention. Those inputs were not calibrated jointly; high valid ratios can result from their scale difference. This source review does not establish the contribution of each assumption to every live job result or independently re-audit original salary semantics.

The three-job, eighteen-cell `synthetic-pay-demo-v1` is a separate demonstration with a ratio-of-sums definition. It is not the fifty-job frozen COMPA release and is not replaced here.

## New proposed contract

The complete versioned inputs are in `lib/simulation/compa-calibration-v2-protocol.json`. The aggregate review artifact is `lib/data/compa-calibration-v2-proposal.json`. Neither is a production release.

- **Population:** 6,000 newly constructed fictional salaried observations: fifty existing job codes × two clearly marked demonstration levels × three country/currency cases × twenty observations per matched cell. No existing employee IDs, salaries, membership or workforce totals are reused.
- **Job anchors:** fifty explicit authored amounts, from 80,000 to 150,000, replace the opaque character-code seed for this proposal. They are illustrative amounts, not market estimates or validated compensation policy.
- **Levels:** `DEMO-IC2` uses 1.00; `DEMO-IC4` uses 1.35. These are proposed demonstration categories, not verified mappings to production levels.
- **Country/currency cases:** US/USD uses a local monetary scale of 1.00, CA/CAD 1.20, GB/GBP 0.78. These are independent fictional local-money assumptions, **not FX rates or empirical geographic premiums**. No monetary values are summed across currencies.
- **Ranges:** midpoint = job anchor × level multiplier × local monetary scale, rounded to 500 local-currency units. Minimum and maximum are 80% and 120% of that midpoint. The illustrative effective window is 30 September 2026 through 29 September 2027; the snapshot is 30 September 2026.
- **Pay:** contracted annual base = matched midpoint × constructed COMPA ratio × the observation's FTE, rounded to cents. Each cell has twelve observations at 1.0 FTE, four at 0.8 and four at 0.5. Seed `20261007` gives a stable per-cell shuffle of ratios across those FTE positions.
- **Aggregation:** unchanged arithmetic mean of individually matched ratios, not an FTE-weighted payroll measure or ratio of sums. Missing/invalid pay, missing FTE, mismatched country/currency/level/date/basis and ambiguous bands stay ineligible. Small eligible or excluded cells withhold the job tuple; a lone withheld job receives a deterministic companion. Review rows expose no eligible/excluded counts.

The deterministic twenty-observation ratio grid contains tails at 76% and 124%, two exact midpoint values, and sixteen interior offsets from midpoint: `−14, −12, −10, −8, −6, −4, −2, −1, +1, +2, +4, +6, +8, +10, +12, +14`. Only those interior offsets receive a job shift of `−6, −3, 0, +3, +6` percentage points, cycling by sorted job code. This makes the shape transparent and reproducible; it is not a job-quality ranking, fitted salary distribution, normality assumption or estimate of real-world prevalence.

## Verified design distribution

| Measure | Constructed proposal result |
| --- | ---: |
| Within the 80–120% band, inclusive | 90% |
| Below band | 5% |
| Above band | 5% |
| Below midpoint | 44% |
| Exactly at midpoint | 12% |
| Above midpoint | 44% |
| Job means | 95.2%, 97.6%, 100%, 102.4%, 104.8% — ten jobs each |

These percentages describe the invented calibration design, not the live workforce. All fifty aggregate job means are inside the band; individual pay retains both tails. There is no post-aggregation clipping, centering or display normalization. A regression test triples one job's actual constructed pay and verifies the resulting mean exceeds 200%.

## Worked examples

These examples are invented arithmetic illustrations, not extracted person records.

| Job / demonstration level / country | Currency | FTE | Contracted annual base | Base at 1.0 FTE | Matching min / midpoint / max | COMPA |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| SWE-GEN / DEMO-IC2 / US | USD | 0.8 | 88,320 | 110,400 | 92,000 / 115,000 / 138,000 | 96% |
| HR-PA / DEMO-IC4 / CA | CAD | 0.5 | 85,000 | 170,000 | 136,000 / 170,000 / 204,000 | 100% |
| BI-ANA / DEMO-IC2 / GB | GBP | 1.0 | 75,600 | 75,600 | 56,000 / 70,000 / 84,000 | 108% |

For the first example: `100 × (88,320 / 0.8) / 115,000 = 96%`. The job mean is computed from all its individually matched ratios; a single level's monetary range must not be displayed as the denominator of a mixed-level job mean.

## Reproduction and validation

```sh
node tests/manual/generate-compa-calibration-v2.mjs --check
node --test --test-isolation=none tests/compa-calibration-v2.test.mjs tests/compensation-ranges.test.mjs tests/compensation-release.test.mjs tests/synthetic-pay-demo.test.mjs
```

`--write` writes only the new proposal JSON. The generator verifies ten protected v1 files against pinned SHA-256 hashes before producing a proposal. The artifact records source hashes for its protocol, generator, shared matched-ratio formula and deterministic random helper. Generated cohort records exist in memory only; the artifact includes fifty aggregate review rows, design-level distribution checks and the three independent worked examples.

Tests cover deterministic byte reproduction; every matched dimension and actual FTE; parity with the existing formula; sensitivity to underlying pay; absent/mismatched/ambiguous inputs; suppression and partial coverage; worked examples; protected v1 bytes; rejection by the current v1 wire validator; and absence of any route/UI/default activation.

## Before a reversible cutover

This is **not cutover-ready**. The new 6,000-observation population does not match the existing workforce population, and the demonstration levels/country-currency cases have not been reconciled to the live catalog. Decide whether the desired product is a separately labeled fictional showcase or a new version using the existing workforce membership. Do not silently present this cohort as a recalibration of existing people.

For an existing-membership version, verify the supported job/level/country/currency matrix and original pay/FTE semantics, then prepare a distinct immutable release identity with its reviewed range/pay assumptions, aggregate-only output and disclosure validation. Do not replace or edit v1 rows to make the screen look different. Any later activation must switch a complete matched pay/range release together and retain the v1 identity for rollback. No activation, replacement, schema change or data cutover is part of this proposal.
