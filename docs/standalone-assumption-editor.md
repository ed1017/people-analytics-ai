# Planning Calculator

Based on main `48d1b006afd24e0ccf93386c2507ed103b2f392d`. `/planning/assumptions` keeps its stable URL and now uses the visible name **Planning Calculator**. Planning Overview opens the calculator in a native modal on an explicit button click, with no navigation/new tab. The standalone page opens its input editor in the same controlled dialog. Cancel/Escape discard the local draft and return keyboard focus; repeated open requests preserve it. Explicit Review updates only page-local reviewed inputs; reopening retains them. Explicit Reset restores the fictional illustration. No goal, plan, conversation, dataset or storage format is changed.

Actuals are observed, source-supported values for a scope/period. Estimates/forecasts are projected values with a method and uncertainty. Assumptions are chosen scenario inputs. The existing provenance kinds remain unchanged: fictional example assumptions, model-proposed planning assumptions, unverified user-supplied inputs and unknown. Manual entry does not verify an actual. Calculated outputs are conditional estimates. Numeric rules, period conversion, untouched provenance and source keys remain unchanged.

## Behavior-lane integration contract

`PlanningCalculatorDialog` accepts `open`, the caller's exact current `review`, `disabled`, `onReview(draft)` and `onCancel`. It owns only the existing editor draft, never a duplicate authoritative review. The caller controls opening, currentness, context interruptions, review validation and acceptance/save state. Pass the current review to `reviewDemandEditor` in the intentional review callback; stale drafts are rejected. Close on conversation/navigation/context interruption. No assumption acceptance or plan saving occurs in the dialog.

The recommendation-first response and CTA placement belong to the behavior lane. Its requested offer is: “Have a rough idea of your available people, budget or timeline? Tell me in chat, or open the Planning Calculator.” This change supplies the popup primitive, not that response wiring. PR187 source `502a3df7f1596914beb0c9748a73c9dfa8814b4b` was inspected: leave its strict `planningCalculatorAvailable` hint omitted/false until a caller mounts a functioning popup bound to the current discussion. No such hint is enabled here. Current main has no live SWP demand-journey caller. The Overview popup is explicitly a fictional illustration; it does not convert current Planning scenario/employee data into verified actuals. The existing chat-first flow and frozen `6adf0a9` source are untouched.

## Finance readiness

| Area | Existing capability | Remaining gap |
| --- | --- | --- |
| Headcount | Calculator gives conditional additional FTE/rounded roles for one service-analyst slice | Verified availability/allocation and other operational role slices; not total workforce forecasting |
| Cost | Separate staffing engine distinguishes incremental hire/backfill payroll, recruiting, vendor/training cash and salary uplift from employee effort hours | This calculator performs no cash calculation; verified complete costs remain needed |
| Budget impact | Separate staffing engine compares complete incremental cash with budget; reconciliation can share cash/hour ledgers | Approved baseline/funding and actuals reconciliation; the calculator's cash-ceiling field does not calculate budget headroom |
| Timing | Calculator supports a start, 1–24 months and explicit rate denominators; staffing engines carry arrival/build/move/backfill schedules | Monthly peaks, service coverage and verified hiring/release/readiness dates |

No new Finance module is implemented. Entering a cash ceiling or horizon does not establish a feasible financed staffing plan.

## Focused verification

Nine unit tests cover explicit request/negation boundaries, source labels, unchanged provenance, repeated edits, period conversion, stale exact keys/context, numeric guards and unknown inputs. TypeScript and affected lint pass. The browser harness compiles actual components into a synthetic fixture and fulfills only exact top-frame GET navigation to `http://127.0.0.1:3100/`; every other request is aborted, with CSP/network guards active. No server, application route, provider or diagnostic is started.

108 browser assertions (54 per viewport) pass. Desktop 1280×900 and touch-enabled mobile 390×844 verify optional click opening, one popup/no new tab, current values, arithmetic, Cancel/Escape, focus entry/traversal/wrapping/return, repeated requests/reopening, explicit Reset, invalid values, unknown units, stale valid newer review, busy/interruption, preserved conversation text, untouched fields/provenance and reviewed inputs without assumption acceptance/save callbacks. Synthetic host acceptance/save controls are boundary probes; they are not full-app plan-save acceptance. Decision-history sentinel remains byte-identical, with zero network attempts/runtime errors. The final receipt binds assertions/artifact hash to committed HEAD/tree and clean status.

Never run: provider/model/token-count calls, paid probes, diagnostic harness, database/credential/billing access, production startup/deployment or user desktop. Full-app recommendation wiring, real AI, physical-device/screen-reader acceptance and target-host behavior are untested.

```sh
node --experimental-strip-types --test --test-isolation=none tests/swp-demand-editor.test.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs node --experimental-strip-types tests/browser/standalone-assumption-editor.mjs
```
