# PR277 historical coverage acceptance

Read-only public aggregate comparisons performed on 2026-10-16 against `https://www.ed-ai.app/api/`. No database changes, population activation, paid model calls, or external data uploads. These are deterministic source/packet/tool tests, not live AI end-to-end tests.

## Source inventory and results

| Type | Actual source coverage | Requested-window results | Supported breakdowns and limits |
| --- | --- | --- | --- |
| Workforce/headcount and FTE | `dashboard.trend` and `workforce.trend`: 33 month-end observations, Jan 2024–Sep 2026 | YTD 9; Jan–Jun 6; full available period 33; 2027 observed history 0. US-filtered YTD 9, ending at 5,000 people. | Dashboard country/BU/level receipt governs its own trend. Company composition separately exposes 8 BUs, 10 countries, 12 levels and tenure. Stocks are not summed across months. |
| Recruiting applications, interviews, offers, hires | `talent-acquisition.monthly`: 33 months, Jan 2024–Sep 2026 | YTD 9; Jan–Jun 6; full 33; future observed history 0. All values match recorded source fields. | Monthly history is company-wide. BU/source summaries are separate aggregate breakdowns, not monthly filtered cohorts; recruiting stages do not establish one conversion cohort. |
| Exits and turnover | `attrition.trend`: 33 months, Jan 2024–Sep 2026 | YTD 9; Jan–Jun 6; full 33; future observed history 0. Monthly counts and rates copied exactly; cumulative 8.4% YTD remains separate. | BU, level, tenure and reason summaries exist; they do not establish month-by-category rates. No invented denominator or sum of rates. |
| Survey/sentiment | `survey-sentiment.engagement_trend`: Oct 2024, Oct 2025, Jun 2026 survey events | YTD 1; Jan–Jun 1; full 3; 2027 0. Close-date window selection retains launch and denominator dates. | Survey dimensions and current BU summaries exist; pulse/manager/onboarding/exit summaries do not provide monthly history. Respondent populations remain separate. |
| Recorded mobility | `career-growth-mobility.monthly`: 30 months, Mar 2024–Aug 2026; latest recorded event Aug 17 | YTD 8; Jan–Jun 6; full 30; Sep 2026 and future observed history 0. | Monthly promotions, lateral moves and transfers retained; August partial flag retained. 600 recorded events, not a population rate or complete career history. Current-active linkage and missing origin positions limit interpretation. |
| Labor costs | `finance.current` plus eight BU rows; cost period/refresh unknown | No observed monthly cost series exists in this source. No history manufactured by date selection. | BU cost/headcount/FTE totals reconcile with current summary. Future scenario costs are modeled, not observed monthly labor costs or employee salaries. |
| Workforce planning and positions | Four modeled scenarios, Oct 2026–Dec 2027; position scenarios are terminal 2027 outcomes | Classified as modeled future series/current inventory, not historical observations. Existing Home compact scenario sampling remains explicit. | Page-specific planning context carries selected scenario series; monthly modeled hires/exits are flows, not cumulative values or observed hiring. |
| Skills, learning, career preferences, succession | Current snapshot/catalogue or recorded preference/readiness summaries | No observed time series supplied by these endpoints; no fabricated monthly history. | Existing skill/profile/preference and suppressed succession breakdowns remain governed by their source contracts. |
| Public labor market | Three latest national BLS observations dated Sep 2026 | Latest observations only; no historical series returned by the app endpoint. | Separate US national populations, units and dates; not company workforce data. |

## Chat path inventory

Home builds `buildHomePack` in the browser and normalizes it again on the server. W1/R1/S1 previously retained only three rows; A1 retained three monthly observations outside the initial YTD fix; T4 carried composition but omitted monthly history. This change selects explicit historical windows before sampling, preserves up to 36 allowlisted observations within 8,000 bytes for those historical sources, and retains the 48,000-byte total bound. Other categorical detail remains a labeled three-row sample.

Fresh grounding checks the selected rows against the complete allowlisted source pool, including mobility's historical pool. `read_evidence` returns the accepted packet unchanged. Deterministic tests verify expanded rows survive normalization, grounding, and tool output; forged values remain rejected.

Legacy page tools have distinct contracts: workforce composition and attrition return complete source trends; survey returns its engagement events. Workforce overview exposes endpoints, and legacy recruiting/finance tools expose summary/category evidence rather than arbitrary historical queries. Candidate tool dispatch uses dataset-bound API readers and remains inactive. No tool contract is relabeled as filtered or historical when it is not.

## Checks and safeguards

- Source comparisons covered YTD, inclusive named/ISO ranges, full actual coverage, genuinely unavailable future periods, and US-filtered headcount. No observed historical row/value was invented.
- Current workforce BU/country/level headcount and FTE each reconcile to 10,000 / 9,961.2. Attrition BU and level summaries each reconcile to 828 exits / 605 voluntary exits. Recruiting BU and source summaries each reconcile to 62,104 applications / 5,080 hires. Finance BU cost sums to the current USD 2,047,306,374.48 snapshot; that does not establish a monthly cost period.
- Survey events are not interpolated. Monthly buckets are not prorated to partial dates. Missing and suppressed values stay unknown. A record's period label does not establish a finer-grained event-date breakdown.
- Existing chat viewport checks from PR277 remain unchanged: desktop internal scrolling/in-flow composer; short/narrow document-flow fallback. No additional screenshots requested or produced.
- Windows CRLF-only pinned-evidence mismatch was separately established without rewriting evidence; hosted Linux CI must pass generated-artifact checks before merge.
