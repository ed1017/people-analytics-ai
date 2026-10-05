# Guided Example: current Home Action Plan flow

Based on production main `8bfd70ddc79f5e4bb2f4e4d67ddd304012fc6fa6`; original local checkpoint `eb880324d2cdb1a19814a635135c7ac146d22196` remains preserved in history. PR130 source `0f26bae1411e837133acaedf3132fd04830e0460` is unchanged.

There is one Try a guided example entry in Intro & instructions. The competing AI-capability button is removed. Existing introduction paragraphs and previously approved copy are unchanged. Opening, exiting and restarting the guide do not overwrite chat or saved work. The explicit Use example prompt action requires General exploration, an empty composer, available saved storage and no pending request; it only fills the composer. Send and Pin remain separate user actions.

The bounded example adds three additional data-analyst roles over six months. Its exact text is accepted by the existing goal parser, and its role target is classified as user-entered rather than illustrative. Costs and availability still require review. Guidance follows the current controls: Send → Pin as goal → Action Plans/Details → Compare Action Plans and chat → Apply changes → Attach Action Plan → Review calculation → review and confirm attachment. Collapsed panels must be reopened. The guide is an explicitly labeled walkthrough, not an automatic completion tracker. Next and Restart never run business actions. No scenario-search volume, optimization result or fixed proposal count is claimed.

## Validation

- 1,190 unit tests passed, including the exact example through the real goal and capacity-assumption parsers.
- 69 new browser checks passed at desktop 1366px, mobile 390px and 200%-equivalent 683px reflow: keyboard focus, one entry, draft preservation, cancel/restart, pending-request guards, explicit Send/Pin, returned-plan comparison, chat diff/Apply, attachment cancellation and explicit confirmation, goal isolation, latest-panel restoration, ordinary questions and horizontal overflow.
- 378 current browser regression checks passed: plan panel 36, unified attachment 117, discovery-to-Pin 72, stale Pin boundaries 45, goal context 51 and compact layout 57. Total relevant browser pass count: **447**.
- Full lint, standalone TypeScript, optimized production build and whitespace checks passed. Production build uses inert API placeholders. Browser source/model requests use intercepted synthetic fixtures; no live model request, credential diagnostic or hosted mutation was made.
- One additional legacy recruiter-script attempt failed before reaching the guide: its seeded-goal flow waits for a Compare workforce options button at line30. That older script was left unchanged and is not counted as passing. The current panel/guide tests above exercise the actual controls through explicit attachment.

Logs: `/tmp/guided-example-{unit,lint,tsc,build,browser}.log`, `/tmp/guided-regression-browser-summary.json`, corresponding `/tmp/guided-regression-*.log`, and `/tmp/guided-example-recruiter.log`. Screenshots: `/tmp/guided-example-{desktop,mobile,zoom}.png`.

No database, held eNPS, auth/security, permissions, model-input boundary, palette or model complexity changes. Local checkpoint only; no publish or production merge is part of this slice.

## Bounded palette retry

Current Library resolved-reference instructions were read from `library/references/materialization.md`. For exact Library ID `libfile_5e226f06571081918b0b3f4153e182bf`, a fresh prepare_materialize request specified `/workspace/palette-reference-retry` as the consumer-local destination. The current bundled `scripts/library_file_transfer.py` was obtained from the same skill source and received the complete prepared transfer for `workforce-blue-hierarchy-proposal.png`.

The single authorized retry returned exactly `library file transfer failed: download failed`, exit1. No more specific cause was returned. No bytes were materialized or visually inspected. No guessed URL, generic downloader, alternate transfer route or further retry was used. Image-dependent palette work remains stopped.
