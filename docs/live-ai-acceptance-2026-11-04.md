# Live AI acceptance — November 4, 2026

## Authorization and accounting

The user explicitly authorized up to USD50 additional API testing above existing charges and holds. At 22:40:13 UTC, the existing enabled USD100 application cap had USD20.726833 settled charges and USD9.600034 outstanding holds: USD30.326867 liability, USD69.673133 available. This test batch has its own USD50 incremental ceiling; the configured cap is not an additional authorization. Historical holds are preserved. Root alone dispatches paid tests and reconciles the ledger; other reviewers use local fixtures only. No budget, credential or pricing changes are required.

## Reproduced defect

On runtime 319f551c0b68acb2c283da0ead88db4061f63c52, start the guided fictional Service Operations example, calculate, select the all-hire reference, Continue this scenario in chat, then ask “What about backfill?”. A real provider response retained the selected scenario, zero-backfill assumption, missing donor permission/capacity and unknown costs. It used one round, no tools, and settled USD0.135124. Independent review found no substantive correctness issue.

Reload that isolated conversation, dismiss Introduction and ask “What if attrition increases?”. Request b665c8f6-bab5-4084-a64b-ffa470454a78 retained the full scenario receipt but returned the company-wide descriptive-turnover unsupported-view message. HTTP200 and zero model rounds demonstrate a server routing defect, not a provider failure or missing client context.

The fix lets a narrow hypothetical/backfill grammar bypass the descriptive turnover shortcut only when readScenarioChatDraft validates the complete receipt against the server-resolved dataset token. Historical periods, named subgroup questions, compound instructions, missing/reset context, foreign datasets, pending edits and tampered receipts retain their existing guards. This enables discussion, not a new attrition calculator or automatic assumption/save mutation.

## Verification and release gates

Focused routing, parity, annual and quarterly tests pass, including exact captured-request replay into mocked completion with its original input key. Paid output quality must be checked separately after the corrected runtime is staged. Existing historical source tests, saved user data, market source dates and private October inputs remain unchanged.

Browser harness startup failures sent no requests: intro/readiness and the accessible Send overview question control must be awaited. Those are not classified as app failures. Request/response/state and accounting receipts are retained under workspace integration-evidence/live-ai-20261104-*. Each paid harness has an exclusive start marker, one allowed POST, and a server-enforced two-round limit (maximum USD9.60 reservation). Never rerun an uncertain dispatch without ledger reconciliation.

Independent review, exact-commit CI, staged build, staged/public desktop/mobile checks and final ledger reconciliation are required before declaring the repair released. The previous October deployment dpl_4JiYtBmiQwn5yW9BNoRM1eCqFwJ9 is the rollback target. No database migration is involved.
