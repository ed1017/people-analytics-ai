# PR442 verification — turnover scope and worked-example consistency

Status: merged, promoted and verified on public desktop and mobile.

## Candidate identity

- Runtime: `8600d5053e0cd5c09430f08c06c3e676ae29d9f9`
- Public source: `4de833ee2e9376f5044ab8378e9e7ef18374f4bc`
- Promoted deployment: `dpl_HqHsGQ6qUMKCZEqCE1ibDdtgvAH8`
- Preview: https://people-analytics-de70jlvm0-ed-56dc.vercel.app
- Exact-head CI: `40557803942` — successful.
- Merge commit: `6206b03a4c90d226b376904e2a2fef848f78ce65`.
- Canonical production host: https://www.ed-ai.app — resolves to the promoted deployment above.
- Public desktop/mobile acceptance: passed at 1440px and 390px. Both `ed-ai.app` and `www.ed-ai.app` resolve to the promoted deployment.

The earlier checkpoint for runtime `57b0a76093a74d2a2e8850b43a4933846fdd1986` and preview `qw8fy2b5s` is superseded by this final candidate. It is not evidence of final production identity.

## Implemented scope

- Business-unit turnover questions preserve the requested group and supported period. Unsupported or incompatible date requests do not silently substitute current figures. Ranking and investigation guidance remain distinct from causal findings.
- New worked examples consistently use the canonical 5-FTE gap. Existing saved legacy 4-FTE scenarios retain their original assumptions and values; there is no destructive migration.
- Attrition hides low-value zero regrettable-exit KPI/table emphasis while retaining exact source counts in Details. Positive counts restore the metric and column. Null remains unavailable.
- Constructed voluntary/involuntary classifications use concise labels, with their construction and interpretation in Details. Counts are unchanged.
- Entirely unavailable exit-survey evidence becomes a closed optional disclosure. Populated responses, loading, errors, suppression and missing-versus-zero distinctions remain supported.
- Homepage findings and scope presentation are corrected; example risk remains restricted to its supported scope.

## Verification completed before promotion

- Exact-head root regression: 3,092 tests passed, zero failures or skips (CI job `122378440114`).

- Runtime release suite: 921 tests passed, zero failures (`turnover-demo-release-tests.log`).
- Final findings/Attrition checks: 17 passed (`turnover-demo-key-findings-tests.log`).
- Source history/date checks: eight passed (`turnover-demo-source-focused.log`).
- Capacity compatibility checks: 14 passed (`turnover-demo-final-capacity-tests.log`).
- Attrition presentation verification independently exercised recorded zero, null, positive restoration, constructed classifications, closed empty survey and populated survey responses. Related stale-loading/error/suppression rendering tests passed.
- Local public-binding reads returned recorded regrettable exits of zero, zero across all 11 career levels, and a zero classification share. Exit respondents were null with empty reason/dimension arrays. These are different states and remain different in presentation.
- Final package record confirms unchanged private inputs, no included secrets, and archive SHA-256 `8ace9f464b185d8940fcca53ff22c1e3d41b745c1c02eef0a3831c3d9998d48f` (`TURNOVER-DEMO-FINAL-PACKAGE.json`).

## Public acceptance

On the canonical public host, 1440px and 390px checks passed for the visible canonical 5-FTE gap, global-only example-risk scope and filter return, unchanged $325,000 guided recommendation, zero regrettable counts retained in Details and collapsed unavailable exit-survey evidence. The controlled three-turn flow requested last-year BU turnover, explicitly accepted the offered January–September 2026 comparison, then received investigation guidance with the matching chart. Each viewport completed three controlled POST replays against the actual local source binding, with zero page or bridge errors. These POST responses were replayed, not fresh provider calls (`turnover-defaults-public-summary.json`).

Separate public legacy checks reopened both seeded original saved records at both widths and verified their saved fields were unchanged, with zero page/bridge errors and no paid calls (`legacy-only-public442-summary.json`). These checks confirm compatibility with seeded historical records, not inspection of a visitor's private saved work. Public readiness used direct browser GETs; a configured receipt is not provider-answer acceptance.

## Failed-check disposition

Initial source CI encountered a stale presentation assertion after an intentional wording change. The assertion was corrected to the intended presentation; this was not a calculation defect. The corrected final source passed exact-head CI `40557803942`.

Earlier hosted QA runs encountered selector and request-header/fixture setup problems. These are harness failures, not evidence that the corresponding product behavior failed. In particular, the retained desktop record timed out waiting for the exact Voluntary column selector after successful data requests. Keep the original failure records and the corrected acceptance records together. Do not count an aborted run as completed desktop/mobile acceptance.

Protected-preview submission also failed readiness verification before any answer POST. Its original timing was not captured, so the exact cause remains unproven. Controlled rendering used an unmodified, still-valid receipt from the same stage. Direct public checks then succeeded without that transport fixture (readiness GETs took 426-849 ms).

## Limits and remaining acceptance

- The reported loading delay was not reproduced in the bounded check. Its original trigger remains unresolved; this does not establish that delays cannot occur.
- Deterministic calculations, source reads and controlled fixtures do not prove fresh provider interpretation or availability. No paid model test calls were made.
- No causal attrition drivers or FTE movement decomposition were fabricated.
- No pricing, accounting, access or renewal changes are included.
- Public acceptance covers the named flows and controlled responses above; it does not establish arbitrary fresh-model reliability.
