# Conversation-first product contract

Home, Future of Work (FOW), and Strategic Workforce Planning (SWP) should support goals, options, scenarios and refinement through ordinary conversation. Reuse known context. Ask a focused question in chat only when essential. Missing inputs can stay unknown in a qualitative proposal. Mention an optional form if useful, but open it only in response to an explicit user action. Result cards, the chat composer and intentional plan selection remain appropriate.

## Implemented in this Home preview

- Goal and proposal review use readable text; the goal form is opt-in through `OptionalConversationForm`.
- Combination reviews preserve unknown participant and cash overlap by default. Optional overlap editors require an explicit Open overlap form action. Matching descriptions do not establish shared people or fees; budget ceilings and outcome targets are never added; effort stays in hours.
- Choosing a proposal explicitly acknowledges its displayed unknowns, saves the goal and attaches the proposal atomically. Discussion does not save a goal. Operational application remains separate.
- The enabled guide follows goal in chat → explore/refine → choose a proposal → automatic goal save/attachment → refine → choose the new version. Popup-only instructions, real-control arrows, Back/Exit and successful-action receipts remain. It does not force Plan 1 or a manual pin step.
- The default-off legacy guide remains available. Existing drafts, goal work and unpinned exploration are preserved through an isolated guided example.

`OptionalConversationForm` is reusable in other modules; `converseSolutions` separates the bounded read/calculation loop from the model and data adapters. These interfaces provide a starting point, not completed cross-module support.

## Remaining FOW and SWP integrations

1. Supply module-specific current goal, evidence scope/freshness and scenario context through a checked adapter. Preserve goal and source identities across navigation.
2. Expose existing FOW task, occupation and skill scenario calculations through typed, read-only conversation tools. Return assumptions, provenance and scoped limitations with each result.
3. Expose SWP capacity, hiring, internal movement, pay and scenario comparison tools through the same bounded conversation pattern. Preserve each module's cash, hours, stock-flow and overlap contracts.
4. Keep existing structured editors behind explicit requests; provide a brief optional-form reminder. No automatic modal or required field sequence.
5. Add multi-turn, correction, cancellation, storage-conflict and intentional-selection acceptance for each integration. No claim that FOW or all SWP is conversational in this slice.

## Durable goal lifecycle: future implementation

When a goal exists, its context and history should be available to the LLM throughout the app. Questions include “How am I doing?”, “Am I expected to hit my goal?”, and later “Am I on target?” or “What are some short-term targets?”. Persistent chat alone cannot answer them.

The future versioned goal record needs: stable goal identity; desired outcome; scoped baseline with as-of date and evidence reference; target and target date with user provenance; dated observations with units and source freshness; reviewed milestones/short-term targets; immutable plan versions and associations; trajectory assumptions and method; uncertainty/limitations; and last assessed date. Proposed milestones must be labelled proposals until accepted. Historical assessments must retain the evidence and assumptions used at that time.

A shared read-only goal-context adapter should supply only the relevant, checked slice to each module. Existing `goalContext`, typed scenario results and immutable plan associations remain extension points. No new lifecycle persistence or app-wide LLM integration is implemented here. A future assessment must distinguish observed progress, assumption-based trajectory and unknown status. Never claim on-track, achieved outcomes or causal effectiveness without supporting observations and an appropriate comparison.

## Acceptance boundary

Local scripted tests establish UI and calculation behavior only. The fixed real-model attempt at commit `4b7b2125bf6f14d4b938de700608727f728024ec` stopped on its first Responses generation with HTTP 401. Exact token counting worked, but no actual model conversation was assessed. Authentication cause and actual provider billing remain unconfirmed. The later UI/prompt revision requires a new, separately recorded real-model evaluation after the access blocker is resolved. Production and hosted flags remain unchanged.
