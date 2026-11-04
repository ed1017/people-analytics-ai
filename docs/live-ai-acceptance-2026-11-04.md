# Live AI acceptance — November 4, 2026

## Authorization and accounting

The user explicitly authorized up to USD50 additional API testing above existing charges and holds. At 22:40:13 UTC, the existing enabled USD100 application cap had USD20.726833 settled charges and USD9.600034 outstanding holds: USD30.326867 liability, USD69.673133 available. This test batch has its own USD50 incremental ceiling; the configured cap is not an additional authorization. Historical holds are preserved. Root alone dispatches paid tests and reconciles the ledger; other reviewers use local fixtures only. No budget, credential or pricing changes are required.

## Reproduced defect

On runtime 319f551c0b68acb2c283da0ead88db4061f63c52, start the guided fictional Service Operations example, calculate, select the all-hire reference, Continue this scenario in chat, then ask “What about backfill?”. A real provider response retained the selected scenario, zero-backfill assumption, missing donor permission/capacity and unknown costs. It used one round, no tools, and settled USD0.135124. Independent review found no substantive correctness issue.

Reload that isolated conversation, dismiss Introduction and ask “What if attrition increases?”. Request b665c8f6-bab5-4084-a64b-ffa470454a78 retained the full scenario receipt but returned the company-wide descriptive-turnover unsupported-view message. HTTP 200 and zero model rounds demonstrate a server routing defect, not a provider failure or missing client context.

The fix lets a narrow hypothetical/backfill grammar bypass the descriptive turnover shortcut only when readScenarioChatDraft validates the complete receipt against the server-resolved dataset token. Historical periods, named subgroup questions, compound instructions, missing/reset context, foreign datasets, pending edits and tampered receipts retain their existing guards. This enables discussion, not a new attrition calculator or automatic assumption/save mutation.

## Verification and release gates

Focused routing, parity, annual and quarterly tests pass, including exact captured-request replay into mocked completion with its original input key. Paid output quality must be checked separately after the corrected runtime is staged. Existing historical source tests, saved user data, market source dates and private October inputs remain unchanged.

Browser harness startup failures sent no requests: intro/readiness and the accessible Send overview question control must be awaited. Those are not classified as app failures. Request/response/state and accounting receipts are retained under workspace integration-evidence/live-ai-20261104-*. Each paid harness has an exclusive start marker, one allowed POST, and a server-enforced two-round limit (maximum USD9.60 reservation). Never rerun an uncertain dispatch without ledger reconciliation.

Independent review, exact-commit CI, staged build, staged/public desktop/mobile checks and final ledger reconciliation are required before declaring the repair released. The previous October deployment dpl_4JiYtBmiQwn5yW9BNoRM1eCqFwJ9 is the rollback target. No database migration is involved.

## Completed release and live results

PR [562](https://github.com/ed1017/people-analytics-ai/pull/562) merged as `668ebd2b0f5470e6c86fa3f8f05a905c117ed128`. Runtime `a4f5effdcf4359ed16e61011bcada704e23e9611` passed independent review and every check in [CI 41929498942](https://github.com/ed1017/people-analytics-ai/actions/runs/41929498942), including historical contracts, generated artifacts and TypeScript. The verified production candidate `dpl_8HDScNWTA2eReKPfc8cJRkgBZ1HS` was promoted without rebuilding; Vercel inspection confirmed www.ed-ai.app resolves to that deployment. Source archive SHA256 is `e5b2440171efa91dad43664964ba7dd8f9ba37335e61f49fa38bd93ae59118c3`. All private October inputs remained byte-identical. No database, budget, credential or pricing configuration changed.

The candidate accepted the exact failing UI payload with fresh request/message identifiers through authenticated HTTP: HTTP 200, one real provider round, no tools. Protected-browser attempts sent zero POSTs; CLI latency and short-lived readiness complicated that harness, so candidate HTTP acceptance is explicitly distinguished from public browser acceptance. After promotion the actual mobile public chat submitted the question using Send and returned a grounded answer: departures are unmodeled, replacement hiring and donor backfills differ, and new departure assumptions require a user decision. Its company-wide 13.3% January-October total turnover reference is not presented as a Service Analyst rate or forecast. The answer does not calculate or save a new plan.

A real national market lookup also passed: BLS 15-2051 reports 275,600 base employment, 371,000 projected employment, 95,400/34.6% growth and 24,800 annual openings for 2025-2035, with appropriate geography and projection limits. The earlier question using company-role label Data Scientist correctly requested clarification because that label is not an approved US company-role mapping. The exact occupational code succeeds independently; no company mapping was broadened.

Public desktop 1440px and mobile 390px each passed eight workflow groups: visible October recruiting periods; retained scenario follow-ups; pending/canceled edits; accepted edits and recalculation; reload with unsent draft; reviewed save and exploration isolation; reset; separate position-plan preservation. Ten intercepted mock requests across those checks incurred no provider charges. Browser scripts must click the enabled Send overview question control after reload; premature Enter attempts sent no POST and are retained as harness failures, not passes. Screenshots were inspected. These checks supplement, rather than replace, the actual provider acceptance above.

## Final spending and boundaries

At 23:15:10 UTC, settled charges were USD21.814224, with historical holds unchanged at USD9.600034. Incremental settled test charges were **USD1.087391**, across seven provider receipts/five paid exchanges. There are no new unresolved holds. **USD48.912609 remains** of the additional USD50 authorization. The old application cap remains USD100; no allowance is inferred from that cap or ChatGPT usage. The zero-round reproduced attrition refusal and zero-POST harness attempts cost nothing. Machine-readable accounting, request IDs, artifact hashes and browser checks are in [the acceptance receipt](data/live-ai-acceptance-2026-11-04.json).

This closes the bounded scenario-follow-up/live-market acceptance and repair. It does not prove universal model-answer quality, add an attrition stress-test calculator, or authorize additional features. Suggested hypothetical departures remain discussion until explicitly supported and accepted. October source data, historical tests, saved records, external-source dates and user-owned Lab work remain intact. Rollback is promotion of the previous recorded deployment; no database rollback is needed.
