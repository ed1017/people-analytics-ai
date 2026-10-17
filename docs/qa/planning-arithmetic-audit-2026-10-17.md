# Focused planning arithmetic audit — 2026-10-17

Base: `91e09ed078eab18b41ce1d6dd636e7d404cc993a` (PR #289). Scope: deterministic planning arithmetic and saved projections. No new UI pass, paid model calls, database/population/access changes, or server writes.

## Contract and regression inventory

| Contract | Source | Existing relevant coverage |
| --- | --- | --- |
| Workload hours; contracted, allocated and qualified FTE; whole-role rounding | `guided-workload.ts`, `swp-demand.ts` | `guided-workload` (4 tests), `swp-demand-period-contract` (10): allocation/proficiency, unknown/zero, coupled demand, month/year/horizon rates |
| Conditional end-of-month role counts and dependency readiness | `workforce-increment.ts`, `home-bundle-reconciliation.ts` | `workforce-increment` (13), `home-bundle-foundation` (28): arrival dates, dependencies, cohorts, overlap, shared costs |
| Full-month productive capacity; sum of positive monthly shortages | `guided-plan-summary.ts`, `swp-demo.ts` | `monthly-workload-shortfall` (4): PR #289 default/fractional demand, horizons, readiness, unknown coverage and service rate conversions |
| Incremental payroll, backfill, uplift, fees and training; separate time valuation | `workforce-increment.ts`, `home-mix-search.ts` | `workforce-increment`, `home-mix` (18), `home-capacity-cash-coverage` (12): day proration, shared-source accounting, budget/unknown gates |
| Reviewed choice, saved draft, reopened summary and Track target | `swp-demo.ts`, `guided-plan-summary.ts`, `goal-progress-summary.ts` | `guided-demo-release` (3): persistence, stale inputs, targets/cash; PR #289 eight fixture-free desktop/mobile live flows reused |
| Separate manual monthly planner: stock movements, allocation, productivity and signed gap | `swp-monthly-workload.ts` | `swp-monthly-workload` (19): stock conservation, fixed precision, zero/unknown, units and movement rules |

Counts describe test declarations, not proof of correctness. Some existing assertions compare two paths through shared implementation. The new `planning-independent-arithmetic.test.mjs` uses literal expected answers derived below, plus persistence checks against those answers.

## Independent expected answers

Guided baseline: 10 people × 1 contracted FTE × 50% allocation × 60% proficiency = 3 qualified allocated FTE. At 160 productive hours/FTE/month this is 480 hours/month or 5,760 hours/year. Monthly demand 1,200 hours requires 7.5 FTE, leaving 4.5 FTE, rounded up to 5 whole roles.

| Nov 2026–Oct 2027 | Develop 3 in January, move 2 in December | Hire 3 in November, move 2 in December |
| --- | ---: | ---: |
| Shortages by month | November 720h; December 400h | November 240h |
| Total shortage | 1,120h | 240h |
| Additional role-months | 3×10 + 2×11 = 52 | 3×12 + 2×11 = 58 |
| Additional productive hours | 8,320 | 9,280 |
| Total productive hours including baseline | 14,080 | 15,040 |
| Total annual internal-cohort uplift $24,000 | December $800 + 10×$2,000 = $20,800 | 11×$2,000 = $22,000 |
| Training cash | $6,000 | $0 |
| Hire payroll / fees | $0 / $0 | 3×$96,000 = $288,000 / 3×$3,000 = $9,000 |
| Incremental cash | $26,800 | $319,000 |

Later surplus is not applied to earlier work. At monthly demand 1,281, the 5.00625 additional FTE gap rounds to 6 roles. Another independent case uses 960 units × 1.5 hours, 8 people × .5 FTE × .75 allocation × .5 proficiency: 1.5 available FTE, 2,160 annual capacity hours, 15,120 gap hours, 10.5 additional FTE and 11 roles. Zero demand and demand below baseline produce zero staffing gap; zero allocation/proficiency/people produce zero capacity. Zero productive hours or FTE per person is an unavailable denominator under the current contract, not a calculated zero-capacity plan.

For the mixed option, moving hire arrival to November 30 yields payroll $800 + 11×$24,000, fees $9,000 and uplift $22,000 = **$295,800** cash; shortage **720h**. December 1 yields **$295,000 / 720h**. December 15 yields payroll $24,000×17/31 rounded to $13,161.29 plus $240,000, fees $9,000 and uplift $22,000 = **$284,161.29 / 1,120h**. A December 15 prerequisite on hires paid from November 1 yields **$319,000 / 1,120h**: readiness must not silently change paid payroll.

Leap-year cost fixture: one $120,000/year hire arrives February 29, 2028; one $60,000/year backfill starts March 1; one internal move in February and one development in March share $12,000/year uplift. February–April cash rows are **$5,844.83, $17,000, $16,000** including fees $2,000/$1,000 and one-time training $3,000. Total **$38,844.83**; 20 training hours × $50 = **$1,000** separate employee-time value, not cash. Unknown required payroll makes total cash/budget unknown.

Manual monthly planner fixture: opening 10 people/8 FTE; hires +2 people/+1 FTE, exits −1/−.5, transfers in +1/+.75, transfers out −2/−1.5 gives **10 people/7.75 FTE**. At .5 allocation and 160 hours, capacity is **620h** against 600h demand: signed gap **−20h/−.125 FTE**. Next month .4 allocation and 25% throughput uplift gives 3.1 allocated FTE × 200h = **620h** against 960h demand: **340h/1.7 FTE** shortage. This signed monthly gap is intentionally different from the guided total of positive shortages.

## Findings and limits

No additional confirmed arithmetic defect was found in this matrix. The independently derived outputs pass, including both options through comparison, review, local decision-store save/reinitialization, reopened draft and Track projection. Actual baseline/outcome remain unknown; saved targets do not create measurements. An independent reviewer separately derived the two default-option totals and checked November 16 hire proration ($307,000 cash, 720h shortage), zero workload/capacity and zero denominators.

Boundaries, not established defects: productive capacity excludes the entire partial readiness month while payroll uses paid calendar days; costs round monthly to cents; role rounding has a 1e-10 floating-point tolerance; annual/horizon service hours distribute uniformly across months; the standalone planner supports signed monthly surplus while guided totals do not recover backlog. These conventions need explicit changes if the product is intended to model partial-month service delivery or backlog recovery.

Not exhaustively audited: all search combinations and objective ties, fractional inputs at rounding-tolerance boundaries, every currency/maximum-value combination, retention/ROI/attrition models, or real-world proficiency, productive-hours and hiring assumptions. No claim is made about those areas. The parent reported that the independent HR reviewer passed all eight fixture-free live PR #289 desktop/mobile flows through review, local save, reload, reopen and Track with unchanged cash/scope/targets and unknown actuals. This audit reused that report and did not duplicate its browser pass.

## Validation

The five new audit tests plus the existing four monthly-shortfall and ten service-period contract tests pass (19/19). Scoped ESLint and `git diff --check` pass. Runtime source is unchanged from PR #289, so its successful build/type checks and production browser evidence are reused; no redundant build or UI pass was run for these tests/documentation additions.
