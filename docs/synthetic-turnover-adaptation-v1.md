# Volatility adaptation and abstention: synthetic follow-up

This isolated experiment extends `ea37df4437d5d62153287a237ad9a1c937e0d2e4`. It preserves all published generator/model artifacts and the existing consumer identity. It changes no UI, database, source adapter, operational gate or production behavior.

The protocol was frozen in commit `02f5dd9f0b76644d99e25b74672f18461c97293b` before generating any new evaluation history. Seeds2001–2100 are disjoint from the earlier 17/29/43 examples and 1001–1100 validation set. All five known generator families and four groups are retained: 500 histories and 2,000 group cases. This is a fresh seed evaluation of visible scenario assumptions, not blinded scenarios or real-world validation. The older results are openly used as diagnostic evidence.

## Why the original checks failed

The original reversal begins in July, after the June 30 information cutoff. In each large group, all 100 old assessment outcomes exceed the upper range. Mean actual quarter totals are 218.13/209.26 against predictions 86.98/82.11, with widths 66.16/67.14. The historical residual distribution does not contain the new jump. A detector that sees only the pre-change prefix cannot identify an unannounced future shock.

Reporting stress supplies only 7 of the required 11 complete calibration quarters. Its range is unavailable because of incomplete historical information; increasing a multiplier would not repair that qualification failure. Small-group histories remain suppressed. All original misses in stationary/improving families lie below the lower bound, consistent with a recent-level point forecast that overpredicts the later seasonal quarter. Increasing variance need not correct this directional bias.

## Fixed comparison

All methods retain the existing recent-three-month mean point forecast and original 11 calibration quarters. The baseline reproduces the existing range. The adaptive candidate multiplies the square-root count scale by `sqrt(max(1,variance(last12)/max(1,mean(last12))))`; sample variance uses `n-1`. Each calibration error is renormalized with the scale available at that historical origin, with outcome revisions available by June 30. The quantile remains the maximum of all 11 valid normalized errors; no incomplete fold disappears.

The third candidate uses the same adaptive range but abstains when the last-three-month mean differs from the preceding-nine-month mean by more than three fixed standard-error units. This is a past-change heuristic, not a calibrated significance test or prediction of a future change. It controls assessment issuance only; it does not filter calibration residuals. No scenario/family label is a forecast feature. Numeric rules were not changed after evaluating the new seeds.

Report conditional coverage among issued-and-scored cases separately from issuance and issuance-and-coverage rate (`covered / all 100 intended histories`). Mean width, relative width and interval score also use **issued-and-scored cases**; their denominator is explicitly reported. Paired differences use only the same seeds with scored ranges from both methods. Interval scores penalize width and misses after clipping/rounding. Missing-data failures and detector abstentions have separate counts. No group, month, method or fold is treated as another independent seed.

The unchanged conservative diagnostic gate requires all 100 cases plus a Wilson lower bound of at least 90%. Any abstention fails that gate; conditional coverage alone cannot promote a method. Every publication field remains null regardless of diagnostic pass status. October–December remains unscored and unused for selection.

## Fresh-seed results and decision

**Do not promote either heuristic as a general remedy. Keep unavailable intervals unavailable.** Adaptive volatility scaling makes small, mixed changes in the stable families and does not cover the reversal. The past-change detector does not selectively protect against an unseen future jump.

The table reports covered / issued-and-scored ranges. Every family/group has 100 intended histories. Width is mean quarter-total width in exits on that same issued-and-scored support; a parenthesized number is detector abstentions. “Unavailable” is not zero coverage.

| Family / group | Baseline covered; width | Adaptive covered; width | Adaptive + abstention covered; width (abstentions) |
| --- | --- | --- | --- |
| Stationary A | 91/100; 80.40 | 92/100; 82.96 | 85/92; 81.50 (8) |
| Stationary B | 91/100; 82.18 | 89/100; 85.54 | 81/89; 84.94 (11) |
| Improvement A | 94/100; 59.56 | 93/100; 59.38 | 91/98; 58.92 (2) |
| Improvement B | 93/100; 60.32 | 94/100; 61.04 | 91/97; 60.72 (3) |
| Reversal A | 0/100; 67.16 | 0/100; 68.10 | 0/93; 66.52 (7) |
| Reversal B | 0/100; 63.16 | 2/100; 63.58 | 1/92; 62.24 (8) |
| Reporting stress A/B | Unavailable | Unavailable | Unavailable (0) |
| Survey-break A | 92/100; 82.66 | 92/100; 83.44 | 85/89; 83.30 (11) |
| Survey-break B | 96/100; 76.80 | 97/100; 77.94 | 89/91; 76.66 (9) |

Both small groups remain unavailable across all methods/families. Reporting stress still has only 7/11 usable calibration quarters; all 100 ranges per large group remain unavailable rather than being widened or imputed. For reversal A, all 93 issued detector-conditioned ranges miss above their upper bound; reversal B misses above 91 of 92. The detector abstains in 8–11 stationary histories versus 7–8 reversal histories, providing no useful selectivity against the post-origin change in this experiment.

Across the eight large-group comparisons with complete calibration, adaptive conditional coverage changes by −2 to +2 percentage points, and mean width changes by −0.18 to +3.36 exits. These are paired descriptive differences, not significance claims. Interval score shows the coverage/width tradeoff: stationary B gets wider but worse (91.78 → 96.14); survey-break B covers one more outcome but its score also worsens (79.40 → 81.54). Adaptive reversal scores remain roughly 1,949–2,008 despite the scale adjustment; small score reductions do not make near-zero coverage acceptable.

Only survey-break B passes the conservative diagnostic gate for baseline and adaptive methods; no abstention-method gate passes. Thus 2/60 method/family/group diagnostic checks pass, both in the same family/group. The previously passing baseline checks for stationary B and survey-break A **do not replicate** on the new seeds (91/100 and 92/100, respectively). Original published artifacts remain unchanged historical records of their own seed experiment; this follow-up does not justify interpreting them as robust general validation.

Conditional coverage must not hide refusal to issue. For example, survey-break B's abstention variant covers 89/91 issued cases (97.80%), but its issuance-and-coverage rate is only 89/100 and its original all-100 gate fails. The report also gives paired comparisons on common support so dropping harder cases cannot masquerade as interval improvement.

No parameter, seed, calibration fold, threshold or target was changed after this run. A future point-model or interval study needs another frozen protocol and separate evaluation set. These results support continued abstention where qualification fails; they do not support scenario-aware widening, use of unavailable future labels, or relaxation of the frozen diagnostic gate.

## Reproduction

```sh
node --test tests/synthetic-workforce/turnover-adaptation*.test.mjs
node tests/manual/generate-turnover-adaptation.mjs --check
node tests/manual/generate-group-turnover-consumer.mjs --check
```

The runner's `--write` affects only `docs/evidence/synthetic-turnover-adaptation-v1/`. Its report pins the protocol, implementation, prior consumer identity and 500 release/truth hashes. The compressed validation audit retains all 2,000 cases, 11 calibration folds each, three method outcomes, reasons, scales and issuance decisions. These are offline experimental candidate ranges, not a consumer projection or published interval. Full regeneration may take several minutes. No external data/model call is made.

Tests independently check variance/scale arithmetic, baseline parity, clipping and interval scores, strict seed denominators, common issued support, incomplete calibration, suppression and future-label invariance. Altering later outcomes cannot alter point forecasts, scales, calibration, range bounds or abstention decisions. Original evidence verification must still pass before the experiment runs.

Validation: 1,261 repository tests pass, including ten new adaptation/evidence tests. Targeted ESLint, TypeScript and whitespace checks pass. Full regeneration reproduces both new evidence artifacts byte-for-byte across all 500 histories and 2,000 group cases. Independent read-only review recomputed every summary count and denominator from the audit rows and approved the negative interpretation. Original consumer verification retains identity `6f76782c3da5b1c326f4a6b55e04792c1f5258e2f8712aa26205439a098265e8`.
