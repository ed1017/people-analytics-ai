# Action-options browser coverage reconciliation

PR127's first release audit ran the browser recipe in `home-action-options.md` and found two real harness failures. Both modes remain required and are repaired, not skipped. Product code is unchanged by this reconciliation.

- Isolated fixture: captured page error `Cannot read properties of null (reading 'useState')` before the composer mounted. Its webpack fixture resolved multiple React copies. Pinning fixture React resolution to the installed root copy (the existing local-search harness approach) restores mounting. No dependency, runtime alias or application code changed.
- Built app: the script waited for retired `Edit problem` text. Updating it to current `Edit` exposed further historical assumptions: new Pin prepares coordinated bundles, not a new per-action draft. The script now mocks the actual bundle request/response and asserts `homeBundlePreparationV1`. It does not change the product request contract.

| Prior requirement | Current coverage in both modes |
| --- | --- |
| Cancel edit preserves discovered goal; double Pin sends once | Current Edit/Pin interaction, exact goal and two total requests |
| No expanded model envelope or local planning payload | Exact request keys, empty preparation history and no planning digest |
| Preserve occupied composer and complete long first step | Exact text in UI and stored component, wrapped without clipping |
| Three proposals with unknown costs/effects | Current Plan tabs with unassessed complete cost/impact; previous per-action records additionally retain four Unknown outcomes and unvalidated label |
| Retention action rejects capacity scope; unmodeled action cannot calculate | Explicitly seeded valid previous per-action record, opened through the supported history disclosure; original rejection assertions retained |
| Capacity review is local, no copied results | Both current bundle scope choice and retained per-action confirmation preserve absent workforce/retention results; previous draft remains byte-identical |
| Reload, stale evidence and failed refresh retain records | Exact stored preparation comparison, explicit refresh, failed replacement preserves original and goal |
| Existing goals require explicit preparation; late responses cannot switch goal | Current Create Action Plan action, delayed reply with goal switch, both destination records remain absent |
| Failure does not retry; responsive/runtime safety | Explicit failure followed by no retry; desktop/mobile/200% reflow, viewport containment and zero page errors |

New ordinary Home uses coordinated plans. Previous per-action cards still exist behind “Previous action drafts and their saved scenarios”; that functionality has not been declared obsolete or removed from browser coverage. Supported additional-role scope gating (including retention-only/replacement-only rejection), required-input guidance and the visible Save/Calculate regression also run in the affected `home-capacity-flow`, `home-retention-recruiter-acceptance` and `home-action-plan-pilot` suites.

Run both modes against a built local server, with intercepted synthetic API responses:

```sh
HOME_BASE_URL=http://127.0.0.1:3140 HOME_BUILT=0 PLAYWRIGHT_MODULE=/tmp/people-browser-tools/node_modules/playwright/index.mjs node tests/browser/home-action-options.mjs
HOME_BASE_URL=http://127.0.0.1:3140 HOME_BUILT=1 PLAYWRIGHT_MODULE=/tmp/people-browser-tools/node_modules/playwright/index.mjs node tests/browser/home-action-options.mjs
```

Release boundary: the prior automatic merge denial is preserved. No merge retry, denied hosted Attach action, or reroute of forbidden branch-rule/protection/status reads is authorized by this test repair. The authoritative required-check/review inventory and head-specific hosted evidence remain separate release evidence needs.

Validation of this repair: 66 assertions in each browser mode plus 201 affected browser assertions (39 pilot, 90 retention/edit, 72 capacity), all passing. Lint and diff checks pass. The previously completed 938-unit suite, TypeScript/build and 478 current-browser assertions remain applicable to the identical product/unit source; this follow-up modifies only this browser script and documentation. No full-suite rerun is represented as a new run.
