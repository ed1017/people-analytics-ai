# Home prompt actions

Home question examples submit through the existing chat handler with one click or keyboard activation. The helper says clicking sends. Contextual examples remain selected from available evidence and the user's existing goal. Other pages retain their editable-example behavior.

The model's existing `answer` / `next_step` output contract is unchanged. When a goal is missing, the model instruction asks one open question about the desired business outcome. The fixed Retention / Capability building reply chips and the instruction that named those choices are removed. “State my goal” focuses the composer without sending empty text. It does not claim to select, pin or support a calculator for every possible goal.

Home offers Compare all N options, Adjust this option and Explore more options only when current verified local handlers are available. A click captures the current action generation and dispatches through the existing bridge after rechecking context. Compare opens the calculated table; Adjust opens the current option's temporary editor; Explore opens the existing search bounds. Assumption acceptance, search, saving, calculation and operational approval remain explicit separate actions. Local actions do not call the model or alter its envelope.

## Drafts and request ownership

Suggestions are disabled while the composer contains text, with a concise explanation. A synchronous draft reference also protects queued input updates before React renders. Failed requests restore their prompt only if the user has not already typed a new draft. Goal switching snapshots the latest draft.

Queued suggestions recheck active page, goal identity, evidence context and draft state before dispatch. Goal transitions invalidate queued clicks even for a batched A-to-B-to-A change. The local action bridge also checks result/option generation. Repeated clicks within one second are suppressed; a synchronous in-flight guard blocks duplicate chat requests. Navigation cancels pending work and returning does not resend. No automatic retry is introduced.

Typed or restored exact local-action labels cannot select an option or silently fall through to the model; the user must choose the current action button. Ordinary typed questions retain the existing chat path.

## Validation scope

Synthetic intercepted browser tests cover click/keyboard submission, repeated clicks, busy requests, failure restoration, newer drafts, queued drafts, back/return, goal and result changes, custom-goal entry, local actions without saving or search, and desktop/mobile/200% reflow. Existing non-Home example behavior remains covered. No live model request, production diagnostics, data-schema change or model-input expansion is part of this work. Hosted acceptance is required before release.

Local validation: 534 unit tests and 959 browser assertions passed, including 42 new auto-send assertions and 69 immediate local-action assertions. Lint, TypeScript, production build and whitespace checks passed. Desktop, mobile emulation and 200% reflow were exercised; mobile custom-goal entry and local-action screenshots were inspected. Tests isolate the pre-existing automatic takeaway before counting requests caused by a local action. This is mocked service validation, not live-model acceptance.
