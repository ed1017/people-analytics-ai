# Expanded Light theme regression audit

Bounded local audit based on production main `0f1005cb994f424a7f87a46ccede664bf4c1bd93`. All data requests were intercepted with synthetic fixtures; no model request, live database query or external write was made.

## Reproduced Light defects and fixes

| Surface | Before | Correction |
| --- | --- | --- |
| Career Growth & Internal Mobility chart legend | Lateral moves 4.01:1 and Transfers 4.27:1, below the 4.5:1 requirement for normal text | Light legend text uses the foreground token; series bars and colored legend markers stay unchanged |
| Development Planning total, including Unknown | Teal total text 3.78:1 against its secondary surface | Light total text uses the existing darker teal `#075A49` |

Production diff is exactly two CSS declarations, both inside the existing Light-only scope. No calculation, source, label, unit, selection, layout or Dark palette change. The audit first recorded the failures in `/tmp/light-theme-audit-before.json`; the corrected report is `/tmp/light-theme-audit.json`.

## Coverage and results

The audit checks Home, Workforce, Attrition, Talent Acquisition, Employee Listening, Career Growth & Internal Mobility, Training & Coaching (expanded custom quote form and selected quote) and Development Planning with a carried synthetic quote. Desktop 1366px and mobile 390px are tested in Light and Dark. Nonempty line/bar charts exercise axis labels, legends and hovered tooltips. Native form inputs and placeholders are inspected, and disabled quote-carry controls remain disabled and dimmed before explicit selection. Disabled text is not incorrectly held to the enabled-text WCAG threshold.

60 page/state/tooltip samples contain 7,204 rendered text/control samples. No Light text-contrast failures remain in these states. This is a bounded rendered-style contrast audit, not a complete accessibility certification or coverage of every destination/condition. Additional existing suites pass 216 checks: palette selector 117, retained planning inputs/goal editor/disclosures 56, Dark/source rollback 43. They include 320px phones and 683px reflow. All 1,265 unit tests, build with mandatory evidence verification, TypeScript, ESLint and whitespace checks pass.

Screenshot examples: `/tmp/theme-audit-legend-1366-light.png`, `/tmp/theme-audit-legend-390-light.png`, `/tmp/theme-audit-development-1366-light.png`. Audit outputs and screenshots are local supporting evidence, not production data.

## Separate pre-existing Dark finding

The enabled Training & Coaching **Carry selected quote and goal to Development Planning** button measures 1.15:1 in Dark. Its catalog does not inherit `--development-teal`, so the existing button rule retains dark text without the intended teal background. This was discovered only when adding the selected-quote state. The two new Light-only rules cannot affect it. It remains explicitly reported, not presented as a passing Dark state and not bundled into this Light-only correction. Other audited Dark text states show no failures; existing Dark palette regression checks still pass.

No push, PR or production release is part of this local review checkpoint.
