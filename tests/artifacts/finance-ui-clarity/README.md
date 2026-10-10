# Finance scope, formula and layout review

Source findings:
- `app/api/finance/route.ts` reads company-wide `finance_current_summary` rows without dashboard filter arguments. Its headline vacancy exposure is the sum of each returned business-unit `estimated_vacancy_cost_exposure_usd`; enterprise cost/FTE is separately computed as total labor cost divided by total FTE. Multiplying that enterprise average by total vacancies is not this headline calculation.
- The former Finance explanation described the enterprise-average multiplication, which can disagree with the actual summed headline. The new optional calculation disclosure shows source business-unit amounts, their sum and the unchanged reported total. Material discrepancies remain explicit.
- Finance previously used viewport-based four-column breakpoints, even when the adjacent AI panel made the metric pane narrow. Container breakpoints now track pane width.
- AI suggested prompts previously stayed open after submit and loading status lived inside the scrollback. Prompts now collapse for each submitted turn and status is outside scrollback beside the composer.

Validation: 4 offline reconciliation tests; 20 desktop/phone component-browser assertions; 40 full-client plan revision/save/reload assertions; TypeScript, scoped ESLint and production webpack build. The Finance screenshots use explicitly synthetic business-unit fixtures reproducing the reported sum-versus-average discrepancy. No production observations are fabricated or changed.

Scope labels distinguish selected Workforce snapshot data from unfiltered Finance and company composition. No source/provider/calculator/auth/database files changed. Existing Finance numeric normalization and source refresh metadata are unchanged; this presentation does not independently certify the underlying view estimates.

Plans gain one short request to confirm owner, baseline, target and review date, plus optional retention-pilot participation/workload check-in guidance. No owner, target or date is assigned or saved automatically.

Integration with main `a3dbbb1` (PR200): the sole conflict was adjacent imports in `home-solution-conversation-review.tsx`; both the hiring-budget review and plan check-in imports are retained. Calculator, chart, route and conversation hook files match main. Post-integration checks passed: 41 calculator/chart/Finance contract tests, 28 offline desktop/mobile hiring-budget and checked-plan assertions, TypeScript and scoped lint. `main-integration-checks.json` records the browser assertions. No live provider calls or deployment.
