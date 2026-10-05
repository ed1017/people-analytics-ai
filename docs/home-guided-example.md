# Guided Example: current Home Action Plan flow

Based on production main `8bfd70ddc79f5e4bb2f4e4d67ddd304012fc6fa6`; original local checkpoint `eb880324d2cdb1a19814a635135c7ac146d22196` remains preserved in history. PR130 source `0f26bae1411e837133acaedf3132fd04830e0460` is unchanged.

There is one Try a guided example entry in Intro & instructions. The competing AI-capability button is removed. Existing introduction paragraphs and previously approved copy are unchanged. Opening, exiting and restarting the guide do not overwrite chat or saved work. The explicit Use example prompt action requires General exploration, an empty composer, available saved storage and no pending request; it only fills the composer. Send and Pin remain separate user actions.

The bounded example adds three additional data-analyst roles over six months. Its exact text is accepted by the existing goal parser, and its role target is classified as user-entered rather than illustrative. Costs and availability still require review. Guidance follows the current controls: Send → Pin as goal → Action Plans/Details → Compare Action Plans and chat → Apply changes → Attach Action Plan → Review calculation → review and confirm attachment. Collapsed panels must be reopened. The guide is an explicitly labeled walkthrough, not an automatic completion tracker. Next and Restart never run business actions. No scenario-search volume, optimization result or fixed proposal count is claimed.

## Validation

- 1,190 unit tests passed, including the exact example through the real goal and capacity-assumption parsers.
- 69 new browser checks passed at desktop 1366px, mobile 390px and 200%-equivalent 683px reflow: keyboard focus, one entry, draft preservation, cancel/restart, pending-request guards, explicit Send/Pin, returned-plan comparison, chat diff/Apply, attachment cancellation and explicit confirmation, goal isolation, latest-panel restoration, ordinary questions and horizontal overflow.
- 378 current browser regression checks passed: plan panel 36, unified attachment 117, discovery-to-Pin 72, stale Pin boundaries 45, goal context 51 and compact layout 57. These checks plus the 69-check Guided Example suite originally totaled 447; the repaired recruiter suite adds 90 checks below.
- Full lint, standalone TypeScript, optimized production build and whitespace checks passed. Production build uses inert API placeholders. Browser source/model requests use intercepted synthetic fixtures; no live model request, credential diagnostic or hosted mutation was made.
- The recruiter browser script was updated to the current interaction contracts and all **90 checks** passed across the same three viewports. The Guided Example suite was rerun after this test repair and all 69 checks passed again. Together with the unchanged 378 current regression checks, browser coverage totals **537 checks**; the rerun is not counted twice. See the assertion mapping below.

Logs: `/tmp/guided-example-{unit,lint,tsc,build,browser}.log`, `/tmp/guided-regression-browser-summary.json`, corresponding `/tmp/guided-regression-*.log`, and `/tmp/guided-example-recruiter.log`. Screenshots: `/tmp/guided-example-{desktop,mobile,zoom}.png`.

No database, held eNPS, auth/security, permissions, model-input boundary, palette or model complexity changes. Local checkpoint only; no publish or production merge is part of this slice.

## Bounded palette retry

Current Library resolved-reference instructions were read from `library/references/materialization.md`. For exact Library ID `libfile_5e226f06571081918b0b3f4153e182bf`, a fresh prepare_materialize request specified `/workspace/palette-reference-retry` as the consumer-local destination. The current bundled `scripts/library_file_transfer.py` was obtained from the same skill source and received the complete prepared transfer for `workforce-blue-hierarchy-proposal.png`.

The single authorized retry returned exactly `library file transfer failed: download failed`, exit1. No more specific cause was returned. No bytes were materialized or visually inspected. No guessed URL, generic downloader, alternate transfer route or further retry was used. Image-dependent palette work remains stopped.

## Recruiter script repair and coverage mapping

The original failure was not a permissions or data issue: the script waited for a standalone Compare workforce options button after selecting a saved goal. Current Home instead recognizes the exact phrase through explicit Send and calls the same local scope-review handler without a model request. The script now uses this real entry and still verifies exact active goal, read-only carried statement, preserved composer text, zero added requests, stale confirmation after a goal switch, and the newly selected goal on reopen. It additionally checks that selecting the saved goal first restores its original unsent draft; typing a new command is an explicit edit. The second goal's original draft is restored explicitly after testing its command, so later isolation assertions retain their original meaning.

| Old expectation | Current assertion preserving its purpose |
| --- | --- |
| Standalone capacity-comparison button | Explicit chat command/Send opens scope review; unchanged request count, exact carried goal and stale-confirmation checks remain. General exploration and deletion still expose no standalone comparison action. |
| Opening guide fills AI-capability prompt; collapsed Example steps | Opening preserves draft and sends nothing; Next shows explicit Pin-before-plans guidance. The dedicated 69-check guide suite also verifies bounded prompt loading, real capacity Pin, cancel/restart, Apply and explicit attachment. |
| Plan #1 / Plan #2 compact tabs | Action Plan #1 / Action Plan #2 in the existing Suggested plans tablist; same-row, bounded-width, keyboard ArrowRight/Home, focus and no-request checks remain. |
| Always-visible Assumptions heading and unknown cost | Show assumptions is available; real conditional amount and uncalculated full-budget state are visible. Explicit expansion retains assumption/provenance checks. All seven summary dimensions remain asserted. |
| First details element describes no search | The named Why these plans disclosure remains initially collapsed, separates one preparation response from executed local staffing combinations, and preserves the observed-context qualification. No fabricated scenario volume is allowed. |
| Disabled Attach plan to goal button | Attach Action Plan is available while Apply changes is disabled with no pending diff. Opening attachment review saves/attaches nothing; Review calculation is present and Continue to attachment stays disabled. Cancel returns safely. |

The script retains navigation labels, starter choices/draft protection, ordinary chat, source-linked exploration, evidence disclosure, original goal/draft preservation, diagnostic meaning, seven summary fields, keyboard plan selection, hidden redundant prose CTA, responsive layout and request/runtime boundaries. No assertion group was discarded and no product code changed to accommodate the test. Logs: `/tmp/guided-recruiter-fixed.log` and `/tmp/guided-example-final-browser.log`.
