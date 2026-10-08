# Synthetic TA lifecycle v1 — local checkpoint

This is a separate constructed population, not a reconstruction of the loaded requisitions or applications. No existing counts are calibration targets. No real identities, database changes, frozen-release changes, private September candidate changes, source-selection changes, model-provider calls, pushes or deployments are part of this checkpoint.

## Local entry point and bounded changes

Run `npm run dev -- --port 3231`, then open `http://localhost:3231/local-preview/talent-acquisition`.

- `lib/synthetic-ta/v1.ts`: deterministic versioned requisition/application event generator, coverage, as-of summaries, count baselines, and a same-source AI context object.
- `components/synthetic-ta-preview.tsx`: compact month-end history/forecast chart, six-stage funnel with proportional boundary widths, separate current outcomes, accessible labels and collapsed native Details containing definitions, tables, provenance and limitations.
- `app/local-preview/talent-acquisition/page.tsx`: development-only route. Returns 404 in production. No API reads or writes. No link or source change in the published app.
- Unit and browser tests cover this population independently. Existing TA API/UI, Home, chat, planning and other modules remain unchanged.

## Declared construction and scope

Version `synthetic-ta-lifecycle-v1`, cutoff 2026-09-30. The population starts empty in January 2025. Each month from February 2025 to September 2026 opens `18 + monthIndex % 7` distinct requisitions on day 5 (monthIndex zero is January 2025). Each requisition models one vacancy; the displayed metric counts requisitions, not vacancies or inflow. All events are assumed available on their event dates; reporting lags and corrections are not modeled.

Six deterministic lifecycle templates alternate: filled after 60 days; filled after 80 days; cancelled at day 45, reopened at day 75 and filled at day 135; remaining open; held at day 20, resumed at day 50 and filled at day 90; or cancelled at day 40. Active includes open and held. Fill/cancellation on a month-end removes the req that day; reopen restores one req, never a new identity. Held requisitions do not accrue duplicate stock on resume. No 90-day maturity rule applies.

Each opening episode receives twelve wholly synthetic applications; reopening receives a new application cohort. Successful applications traverse Applied, Screening, Interview, Offer, Accepted, then Hired on the associated fill date. Others progress through a constructed prefix of these stages before rejection/withdrawal. Events occur only while the requisition is open, except the hire/fill event itself. These deliberately simple templates are testable modeling assumptions, not observed process rates or a calibrated forecast. High accepted-to-withdrawn/rejected attrition is part of the fixture, not a statement about the loaded organization.

Cumulative stage attainment includes later rejected/withdrawn applications. Separate current outcomes are mutually exclusive and exhaustive. All views and tables use the same application cohorts and cutoff. Generated future events are excluded from every as-of count and forecast input.

January 2025 is a complete true zero. March 2025 has a deliberately unavailable **active snapshot**, retained as null even though generated lifecycle truth exists. Application-event coverage is complete; its counts remain available for March. Later complete active snapshots restore coverage. Missing does not mean zero and the graph does not connect across it.

## Exact reconciliation at cutoff

| Quantity | Count |
| --- | ---: |
| Distinct opened requisitions | 423 |
| Active, including held | 112 |
| On hold (subset of active) | 4 |
| Filled | 248 |
| Cancelled | 63 |
| Applied | 5,844 |
| Screening attained | 4,666 |
| Interview attained | 3,201 |
| Offer attained | 2,203 |
| Accepted attained | 1,237 |
| Hired | 248 |
| Rejected current outcome | 2,890 |
| Withdrawn current outcome | 2,607 |
| In progress current outcome | 99 |

`423 = 112 + 248 + 63`; Hired = filled = 248. `5,844 = 2,890 + 2,607 + 248 + 99`. Every modeled month-end is tested for lifecycle balance, cumulative stage ordering, stage chronology, cohort/outcome reconciliation and monthly totals. March stock reconciliation uses generated truth only in tests, never substitutes it in the UI.

October/November/December projected active counts are respectively **112/112/112** (last count), **105/105/105** (three-month mean), and **115/117/118** (damped change). These are unvalidated stock baselines, not a modeled future event ledger. All require consecutive complete July–September snapshots and reject stale, invalid or missing inputs. Predictions are integers bounded below by zero. No winner, accuracy claim, interval, new opening forecast or causal effect is asserted.

## Validation

- `node --test tests/*.test.mjs`: 1,794 passed, including seven new model tests.
- `node --test tests/synthetic-ta-v1.test.mjs tests/synthetic-workforce/*.test.mjs`: 66 passed (seven repeated plus 59 existing workforce tests); combined distinct total 1,853.
- `npm run lint` and `npm run build`: passed, including frozen-artifact verification and TypeScript.
- `PLAYWRIGHT_MODULE=/tmp/projection-browser/node_modules/playwright/index.mjs node tests/browser/synthetic-ta-preview.mjs`: 127 checks passed at 1366, 390, 320 and 683px. Covers native Details with Enter/Space repeated three times, chart keyboard scrolling, history zero/null labels, every forecast method's focus/hover tooltip, funnel shape/stages, tables, navigation, page overflow and runtime errors. Screenshots under `/tmp/synthetic-ta-preview` were visually inspected at desktop and 320px.
- Local production `next start --port 3232`: preview URL returns **404**.
- Independent review verified 5,961 application/month invariants; its forecast input-validation issue was corrected and tested. Final independent review reran all seven model tests and found no remaining blocker for the local checkpoint. It did not independently rerun the browser, full suite or build checks above.

## Activation plan — not performed

1. Agree on the model version, scope and active definition (includes held), then retain this version unchanged or create v2 for revised modeling assumptions. Do not repurpose the frozen opening-cohort artifact.
2. Add an explicitly selected synthetic source response to `app/api/talent-acquisition/route.ts` (or a separate versioned endpoint) and a typed response union in `lib/types.ts`. Carry source/version/cutoff/coverage in every response. Avoid implicit fallback from failed loaded-source requests to synthetic data.
3. Adapt `TalentAcquisitionPage` to render the new model as a complete same-source TA experience. Its existing open-positions/aging/time-to-fill/business-unit/recruiter/source-effectiveness sections cannot be mixed with these totals. This v1 has no business-unit, recruiter, source or internal/external assignments; omit those sections explicitly or build and reconcile those dimensions in a new version. Do not map old counts into this version.
4. Pass this version's `aiContext` through the app's TA context assembly and server chat allowlist/prompt. Replace the opening-cohort percentage description only when this version is selected. The object is prepared locally; no chat request consumes it yet.
5. Home's hiring projection remains the frozen 90-day opening-cohort rate. Planning's hiring timing/arrival evidence and current TA demand/source cards also retain their previous populations. These are explicit cross-page differences, not reconciled counterparts of v1. Decide whether to show distinct source labels or separately adopt the new metric on those surfaces; do not change other modules merely to force numerical agreement. The new stock metric is not time-to-fill, capacity delivery or ROI evidence.
6. After approval of activation scope, make the source/UI/context switch in a separate reviewed PR, rerun reconciliation, unit/browser/accessibility and production isolation checks, and only then publish. Verify exact merged remote commit and deployment before reporting live. This local checkpoint does not authorize publication or database substitution.
