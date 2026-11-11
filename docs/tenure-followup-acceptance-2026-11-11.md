# Tenure metric follow-ups and release acceptance

## Confirmed defect and bounded correction

After a company-wide voluntary-exit tenure answer, “What about total exits?” was refused as an apparent mixed-metric request. “What about overall exits?” silently kept the voluntary metric. The parser now inherits the prior metric only when the new question does not explicitly name total, overall or voluntary. A request naming both total/overall and voluntary asks the reader to choose one metric.

The source regression failed before the correction. Actual-route fixtures now verify voluntary → total/overall → repeat → voluntary → shares, including serialization between requests. The answer header and company counts must match the requested metric. Saved planning state, goals, catalog selections and filters remain unchanged; the completion factory is hard-denied and provider attempts remain zero. Unsupported periods and named scopes, causal claims, and planning changes retain their existing boundaries.

This changes intent selection only. It does not add tenure turnover-rate denominators, cost estimates, narrower tenure scopes, data or provider capabilities.

## Verification

- Independent review passed the final parser/test diff. All 26 focused tenure, level-turnover and independent-question tests passed.
- The full root regression suite passed all 3,194 tests, with no skips.
- Changed-file ESLint, root TypeScript and generated-artifact checks passed. The source manifest verifies all 1,195 published files.
- The related grounding, saved-evidence, evidence-recovery and projection tests passed 55 checks, with two existing private-runtime integration checks skipped. A skipped check is not a pass.
- Complete production-runtime build and publication remain pending. The available public checkout excludes runtime-only inputs. It is not a deployable substitute for the complete prior release source.

## Current public UI acceptance

Separate cloud-browser checks on the published PR586/587 release exercised all eighteen case-study deadline/budget/release combinations. Costs remained USD600,000 / USD456,000 / USD276,000, training effort 160 / 112 / 368 hours and readiness three / three / four months. The conditional shortlist and blockers matched every combination; Reset restored the three-month, USD500,000, release-available case.

Keyboard checks covered select changes, control tab order, disclosure Enter behavior and visible focus. Home introduction checks covered initial display, close, keyboard/click reopen, Escape, focus restoration and forward/reverse modal focus wrap. Desktop screenshots of the case, controls, results and introduction were inspected without visible overflow. Source-link destinations and accessible new-tab warnings were inspected; external destinations were not opened.

Mobile viewport, 200% reflow and opt-out persistence remain unverified. The available browser did not expose viewport/emulation or isolated-context controls; attempted browser zoom shortcuts did not change the measured viewport. No chat Send or guided-demo start was activated. Network-request auditing was unavailable, so the browser check alone is not proof of zero network/provider activity. No paid AI call was made by the test code, and cumulative spending headroom was not verified.
