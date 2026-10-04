# Home capacity intake

Fresh Home added-capacity plans reuse the exact confirmed goal as the temporary planning statement. Users can edit that statement before explicitly requesting clarification. The existing request remains `{ goal, statement, inputs }`; the server adds its existing synthetic role/BU catalog. Conversation history, owner notes and unrelated workspace data are not added. This is reuse of the confirmed statement, not extraction from the entire conversation.

A clarification proposal remains a proposal until the user opens it for review. The guided editor uses the existing input-readiness validator to show one required group at a time and omits already supplied fields. Users can review early, revisit assumptions, or open the full editor. Optional blanks remain unknown. Internal paths still require an explicit backfill count, including zero. The review shows supplied assumptions first and keeps unprovided optional groups available in a disclosure.

Saving creates the existing versioned record. Calculation remains a separate explicit action using the unchanged calculator and payload. Existing calculated-plan editing retains the full editor. Goal switches invalidate clarification work and proposals. Existing local option comparison, tailoring and staged chat actions remain intact.

Retention uses a separate model and is unchanged in this slice. No retention effects, new defaults, model-input expansion or backend changes are introduced. Clarification availability still depends on the existing service; manual input remains available. No live model request was used to validate this change.

## Validation

- 528 unit tests, lint, TypeScript and production build passed.
- 883 browser assertions across guided intake and existing Home capacity, retention, resume, journey, readiness, goal-copy, solution-review, option-card, composer, contextual-prompt, race and cleanup coverage passed.
- Guided intake explicitly covers request boundaries, proposal acceptance, only-missing fields, required corrections, optional unknowns, editing prior answers, separate save/calculation, exact calculator payload, stale goal changes, persistence and card focus.
- Desktop, mobile emulation and 200% reflow were checked with intercepted synthetic APIs. These are Chromium checks, not physical-device testing. Long reviews and answers can require scrolling.
- The option-composer suite had one initial asynchronous assertion failure during concurrent runs; its unchanged suite passed all 56 assertions on rerun. No application or test change was made for that failure.
