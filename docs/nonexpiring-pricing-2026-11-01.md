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
