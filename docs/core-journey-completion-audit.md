# Core journey completion audit — 2026-10-06

Audited production-source main `1fbb4b313ed14614c38f158554433be4bf3d783f`, tree `94cdf7ee0fee92f004d2fd5b94b54ac6eefe67a1`, after PR154. No persistent product defect was reproduced. This change updates regression scripts to the accepted one-click attachment flow; it does not change application behavior.

## Verified current journey

- Discovery → exact goal Pin → prepared plans; optional guide never sends, pins or replaces an unsent draft implicitly.
- Natural-language count, target and named allowance edits stage a diff. Apply changes saves the selected draft only; wrong-plan, ambiguous, negated and stale edits remain local and cannot modify another goal or planning context.
- One Attach saves the applied revision. Repeated clicks create one attachment; repeating an unchanged revision is idempotent. Existing linked participants follow owned values; manual conflicts require explicit review and default to Preserve. Prior attachment snapshots remain immutable.
- Goal switches cancel pending edits/conflict review, preserve other workspaces and restore the applied plan. Reload restores saved drafts, links and history without generation.
- Source/planning changes disable stale attachment. Unordered evidence-row changes alone remain current. Quota failure publishes no attachment/receipt/destination subset. Explicit re-preparation retains saved history without applying old links.
- Decision Brief shows latest and previous snapshots, preserves owner/approval notes, and withholds corrupted/cross-goal records.
- Phone widths 320/360/390/430 plus 844×390 landscape: drawer navigation, filters, draft preservation, visible reply, one-click attachment, simulated keyboard and rotation. Desktop and 200%-equivalent reflow are also covered.

## Evidence

1,388 unit tests passed, including all 59 nested synthetic-workforce tests. 413 current browser assertions passed: guided example 63; panel 36; linked attachment 51; prefixed edit 63; context staleness 51; numbered edit 45; phone 80; Decision Brief 24. The phone suite passed a second full run (not added to the count). Full lint, standalone TypeScript and diff checks passed. Existing production build from the identical accepted application/dependency tree was reused; test-only edits do not alter its runtime.

Logs: `/tmp/core-audit-unit.log`, `/tmp/core-audit-*.log`. Attachment screenshots: `/tmp/home-linked-attachment-56t1dI`; phone screenshots: `/tmp/phone-workspace-*.png`. All browser API responses were synthetic interceptions, with external requests blocked. No live model/data calls, user desktop activity or production-route attempts occurred.

The phone script's fixed 100ms delay raced the scheduled reply scroll. It now waits for a nonempty visible reply above the composer. An initial polling run also timed out under concurrent activity; two subsequent complete runs passed. This is evidence of a timing-sensitive check, not proof that every possible scrolling race is eliminated.

## Limits and remaining work

This audit establishes local deterministic interaction and persistence, not live model wording/quality or hosted storage acceptance. Parent hosted QA already accepted the unchanged PR154 application tree. Previously denied status/production routes were not retried. Several historical browser scripts still describe retired editor/review controls; this pass updates the current core-journey suites rather than claiming the entire historical browser directory passes.

Held eNPS files, all existing branches, database/schema, security/access and model-input boundaries are unchanged. Performance and promotion analytics on Career Mobility are a separately authorized follow-on and are excluded from this audit change.
