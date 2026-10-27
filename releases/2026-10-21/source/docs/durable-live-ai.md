# Durable Live AI pricing verification

The authorized lifetime cap is $100, including all prior charges and outstanding holds. It is not a new allowance per release. Model limits, reservation amounts, receipt checks and emergency shutoff remain unchanged.

Vercel checks the four official OpenAI pricing/model/cache documents at 00:00, 06:00, 12:00 and 18:00 UTC. The existing Pro plan supports this cadence. The authenticated server route verifies complete reviewed terms and document hashes, then calls one restricted renewal RPC. The database derives an expiry no later than 24 hours after the observation. Changed, incomplete or unavailable documents never renew. Even cosmetic document changes require review; this intentionally favors stopping over accepting unreviewed pricing.

`CRON_SECRET` authenticates the scheduler. A separate `PRICING_RENEWAL_TOKEN` is checked against a database hash. Neither token is public. The scheduler receives no database administrator credential. The existing server database credential can invoke the narrowly scoped RPC; public database roles cannot. Renewal cannot alter the cap, prices, spending, receipts, holds or kill switch.

Each reservation atomically records its immutable verification and pricing version. Settlement uses that admitted version, including after a later renewal or expiry. Historical reservations are not reinterpreted or released. Every app request reads current verified dates; it never falls back to expired compiled dates.

## Operation and recovery

- Check Vercel cron execution status and `get_public_ai_pricing()` after deployment. A successful configuration receipt is not a paid-model acceptance test.
- A failed verification leaves the last expiry unchanged. Investigate the official-source change; review new terms before deploying any revised approval.
- If a renewal response is uncertain, inspect its immutable event first. Do not blindly repeat the write.
- To stop renewal, disable the scheduled credential/job. To stop new model admission immediately, use the existing emergency shutoff. Keep all historical verification, reservation and receipt records for settlement.
- Roll back the application only with the matching reviewed policy compatibility. Do not delete appended versions, reset spending, reduce holds or replay old date-only renewal SQL.

The migration includes exact baseline guards and conservation assertions. Isolated PostgreSQL tests cover permissions, cap, expiry, replay, kill switch and settlement against admitted terms. They do not replace independent-session load testing or fresh paid-model validation. No paid model requests are part of installation.
