# Compact projection UI review

Base: remote main `48d1b006afd24e0ccf93386c2507ed103b2f392d`. Isolated branch `fix/projection-ui-compact-main`, draft PR189. Private September-data and conversation branches are not merged or enabled.

## Scope

Shared turnover, satisfaction and legacy hiring-cohort charts, their domain and Home wrappers, calibrated Talent Acquisition/Home requisition charts, the development-only TA preview, and the collapsed retrospective exit-count example. Current main already puts repeated provenance and caveats in native collapsed Details and removes DEMO headers and “Methods unselected.” Three methods are displayed; no selector was present. This patch reduces shared charts from 220/260px to 196/236px, requisition charts from 214px to 194px, summary row padding, gaps and panel margins. Chart fonts remain 12px; native Details targets remain at least 44px.

All values, eligibility, forecast methods, provenance, assumptions, method limitations, source links and missing-value meanings remain unchanged. Zero and null are distinct. No forms, dataset edits, flags, database, credentials, permissions, billing or domain changes.

## Hiring gaps

The screenshot describes the separate synthetic opening-cohort percentage chart. Current public TA/Home instead uses the calibrated active-requisition stock chart; both chart implementations are covered.

November 2025 is a released zero-opening cohort. The generated denominator is zero, so the history builder emits a null rate; the chart shows × with “zero openings; rate unavailable.” This is not a missing zero percentage.

At the frozen 30 September 2026 cutoff, fully reported history ends in June. Eligibility requires the full 90-day outcome window and up to three days of reporting lag. July’s window reaches 29 September but complete reporting reaches 2 October; August and September complete reporting reaches 2 November and 3 December. The artifact builder explicitly enumerates July–September as unreleased gaps before October projections. Chart mapping preserves those months with × and the reporting-cutoff explanation. No mapping defect was found; immature cohorts are not substituted or fabricated.

Relevant source: `lib/ml/synthetic-domain-demo.mjs`, the synthetic hiring generator/eligibility implementation, `lib/data/synthetic-domain-demo-v1.json`, and `components/synthetic-domain-chart.tsx`. No changes to any source/payload eligibility or dataset.

## Checks

- 108 focused Node tests: chart layout, projection backtests, synthetic hiring eligibility, Home forecast, forecast consumers, aggregate exit forecasts, synthetic TA v1/v2, calibrated TA extension, synthetic domain consumer and exit presentation.
- Shared chart browser suite: 1,160 assertions across 1844/1366/390/320/683px, light/slate-blue palettes. Exact source values/dates, null/zero, all methods and forecast legends, tooltip hover/tap/keyboard access, date-label readability, three repeated keyboard Details cycles, navigation reset, flat/singleton/unavailable observations and no overflow/network calls.
- Calibrated TA browser suite: 218 assertions across the same five widths, including Home chart-only, null/zero observations, method focus/hover and Details/navigation cycles.
- Development-only TA preview: 127 assertions across desktop/mobile/zoom. Production route intentionally remains unavailable.
- Retrospective forecast readiness display: 33 assertions, including unavailable evidence and no invented totals.
- Changed-component ESLint, production build with all six reproducible prebuild artifacts and TypeScript, and diff whitespace check passed.
- Independent review approved the bounded source diff and inspected current desktop/mobile render pixels; 53 independent focused tests passed.

Screenshots: `/tmp/forecast-chart-readability`, `/tmp/calibrated-ta`, `/tmp/synthetic-ta-preview`. Logs: `/tmp/projection-ui-{unit,unit-ta,lint,build-final,browser-final,ta,preview-dev,readiness}.log`.

## Publication blocker

Required original Library images `libfile_6aa47f7c78cc8191bf6634403183657d`, `libfile_782416d160a881918ee534275be13806` and `libfile_f083759d9c3c8191950b25decd65f474` did not materialize. The supported current consumer-local helper returned “download failed” for all three; a fresh bounded retry for the full chart also failed. No readable local image paths resulted. Library image reads returned image pointers and OCR metadata, not viewable pixels. Their actual pixels have not been inspected. Newly rendered application pixels were inspected, but cannot satisfy inspection of those references. PR stays draft pending this required step; no production deployment is claimed.

Integration handoff: this isolated UI branch can be incorporated after publication. It does not include or modify PR186/187 conversation work. Verification of those branches requires their own fresh review.
