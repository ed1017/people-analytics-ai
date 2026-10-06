# Theme contrast audit and bounded corrections

Based on main `0f1005cb994f424a7f87a46ccede664bf4c1bd93`. All data requests were intercepted with synthetic fixtures; no model request, live database query or external data write was made.

## Confirmed defects: before and after

| Surface | Theme | Before fix | After fix |
| --- | --- | --- | --- |
| Career Growth chart legend: Lateral moves | Light | 4.01:1 | 10.28:1 |
| Career Growth chart legend: Transfers | Light | 4.27:1 | 10.28:1 |
| Development Planning total, including Unknown | Light | 3.78:1 | 5.53:1 minimum |
| Enabled Carry selected quote and goal button | Dark | 1.15:1 | 11.12:1 normal; 13.38:1 hover |
| Development goal input focus outline against its card | Light | 1.09:1 | 6.02:1 |

The first four rows are normal text and exceed 4.5:1 after correction. Focus indication exceeds 3:1. Light's carry button remains 6.59:1 normal and 8.40:1 hover. Disabled controls retain their disabled behavior and 0.5 opacity; disabled text is not incorrectly held to the enabled-text contrast threshold.

Four bounded stylesheet edits: Light legend text uses the foreground token while bars and colored markers remain unchanged; Light development total uses the existing darker teal `#075A49`; the quote-carry button gets its intended `--development-teal: #82D9C7` token (previously absent from the catalog), restoring Dark without changing Light's more specific blue style; inputs join the existing Light focus rule. No calculation, evidence, label, unit, selection or layout change.

## Coverage and results

The audit checks Home, Workforce, Attrition, Talent Acquisition, Employee Listening, Career Growth & Internal Mobility, Training & Coaching (expanded custom form and selected quote) and Development Planning with an explicitly carried synthetic quote. Widths 1366, 390 and 320 are tested in Light and Dark. Nonempty line/bar charts exercise axis labels, legends and hovered tooltips. Form values/placeholders, disabled controls, enabled hover, keyboard focus and Enter activation are covered; carrying preserves the synthetic goal and quoted fee.

102 page/state/tooltip samples contain 11,794 rendered text/control/focus samples. No failures remain in either theme in these states: normal text is at least 4.5:1, applicable large text at least 3:1, and audited focus outlines at least 3:1. This is a bounded rendered-style audit, not a full accessibility certification or coverage of every destination/condition.

Additional suites pass 333 checks: palette selector 117, retained planning-input/editor/disclosure contrast 56, Dark/source rollback 43, and the unified Home adjustment/attachment flow 117. All 1,265 unit tests, production build with mandatory evidence guard, TypeScript, ESLint and whitespace checks pass. No runtime errors, overflow, model requests or network escape occurred.

Original failure evidence: `/tmp/light-theme-audit-before.json`; corrected report: `/tmp/light-theme-audit.json`. Screenshot examples: `/tmp/theme-audit-legend-1366-light.png`, `/tmp/theme-audit-legend-390-light.png`, `/tmp/theme-audit-development-1366-light.png`. These are local synthetic supporting artifacts.

The Dark button defect was originally reported separately at checkpoint `4ff10bd`; its repair was subsequently explicitly authorized and is included here. Draft publication is authorized; main merge remains gated on exact-head hosted QA.
