# Verified pricing without automatic expiry

User authorized non-expiring verified pricing on 2026-11-01 after reporting AI unavailable. This changes pricing validity, not spending authority. Paid assistant testing remains paused; no provider request is part of repair verification.

## Incident and timeline
The public capabilities endpoint returned HTTP200 with status unavailable. The live runtime was3486e56; the positions-left PR547 was staged only. The latest provider usage receipt is2026-10-30T03:08:51.814204Z (119 receipts); last admission2026-10-30T03:08:43.756659Z (177 reservations). A receipt establishes recorded provider usage, not a user satisfaction judgment. Successful pricing verifications at06:00 and12:00 on October30 preceded expiry at2026-10-31T12:00:09.991Z. No later receipt was found. These observations do not prove continuous availability all week or the exact first failed user request.

Fresh official documents changed full-file fingerprints: pricing adds a November1 FedRAMP uplift date and unrelated Rosalind/Astra-law entries; caching updates format/reasoning guidance. The app uses the standard Responses endpoint. Its selected models, rates, context, reserve amounts and explicit-cache billing rules are unchanged. New reviewed pricing SHA25656e3da9bb29246cad60003e01f3fdc6b536149a09f5effe5e79af020a4922cfc; cache8c672dafd6a332d4b9ad7464aefa3ca4f6b0fffa8bf66bb5ee087e1b39152711. Sol/Luna documents are unchanged. Original verified-at and source history remain immutable.

A failed scheduled document fetch or full-file fingerprint check does not itself revoke the last approved terms. It records a failed check and requires operator review; it cannot change rates or bypass explicit revocation. This is intentional under the user-authorized removal of time-based expiry.

## Contract
Explicit validUntil:null means no automatic expiry. Missing/undefined/invalid dates are rejected. Legacy finite records retain their original finite-window checks. Nonfuture verification, approved terms, model validity, enabled rollout and atomic budget admission remain mandatory. Latest negative verification revokes availability without falling back to an earlier approval; scheduled renewal cannot override explicit revocation. Settlement continues against the original reservation-bound record after expiry or revocation.

The guarded SQL changes only constraints and four existing function bodies. It checks exact live definitions and preserves every existing private-table row, owner, function ACL, search_path and RLS flag. It does not renew pricing, enable the rollout, change the cap or alter credentials. Renewal remains an authenticated server verifier operation using freshly checked public official documents. No fabricated distant date or direct rewrite of historical verification is allowed.

## Verification and rollout
Focused policy/round/verifier/renewal tests:41pass. Actual application routes with fake provider/accounting ports:27pass. PGlite migration tests:16pass, including cap denial, negative revocation, finite historical settlement and future-observation rejection. The first two PGlite fixture bootstrap checks reproduce an older historical cap migration only inside WASM; the new migration preserves the cap unchanged.

Independent review, exact-head CI, staged build, production migration, authenticated verification and public desktop/mobile configuration checks are release gates. Configuration checks are not a fresh paid-model answer-quality test. Release identifiers and final outcome will be appended after verification. PR547 must incorporate this repair before its existing staged layout build can be promoted; do not publish its older pricing code.

## Sources
- https://developers.openai.com/api/docs/pricing.md
- https://developers.openai.com/api/docs/models/gpt-6.1-sol.md
- https://developers.openai.com/api/docs/models/gpt-5.6-luna.md
- https://developers.openai.com/api/docs/guides/prompt-caching.md
- https://supabase.com/docs/guides/database/functions

## Published repair
PR548 merged as cfe12ede54165d72c809f917b9ae6698b7241c66. Runtime1d6d1415275aaf41d3deb16b407e3ed9fd6d4788 passed CI41357570631 and independent68 JS/16 PGlite checks. Archive SHA25626912d149cd6ee48a0feffa8abee76ca7a28ce28c9db4b94641f8268c5f860c1.

First stage GFy6FUNhjPht8WyAApLteN4e2fsb failed its organization identity guard and was never promoted. Corrected production stage6wzwpGYN8UZpKkA1ddqYZNyQ33iW supplied the existing organization ID as deployment-local runtime/build configuration, passed build/type checks and desktop/mobile rendering, and was promoted without rebuilding. No persistent environment or guard relaxation was made.

The guarded migration applied successfully. Post-checks preserve cap100000000 microUSD, gross reserved599310034,119 provider receipts and177 reservations; actual charges plus outstanding holds remain29765929 microUSD. Gross reservations are cumulative accounting, not current spend. Existing security advisor findings are unchanged; no new finding for the four pricing functions.

The existing authenticated Vercel cron was manually triggered once at2026-11-01T22:42:26.180Z. It fetched official documents and appended verification4bc6d7ae47ae451e58d753e1ea0bd3c64d39046169fa2653f4b4b5b7b0df74e3 at22:42:26.997Z, validUntil:null. Public endpoint returned configured for all five AI routes; desktop1440/mobile390 confirmed the actual GET and zero provider requests. Short-lived capability receipts still expire after30seconds and are refreshed normally; this is separate from pricing validity.

No new paid model answer was tested. The assistant testing-spend pause remains in force. The production cap was not changed by this request. The old layout stage must not be promoted; PR547 now incorporates the released repair and requires a new combined stage.
