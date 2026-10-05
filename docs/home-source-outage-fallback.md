# Local Home source-outage fallback

Separate local checkpoint after the accepted-context fix `d3f8f9d`. Not published with that fix.

When Home source reads have settled and at least one source is unavailable, timed out or invalid, an explicit user-authored turnover or additional-capacity goal can be pinned without a verified model candidate. The original user statements remain in existing goal notes. Pinning this path does not request a model response or calculate anything. Replacement-only, mixed turnover/capacity and other unsupported goals have no fallback.

A second explicit **Prepare assumptions-only draft** action creates one deterministic local template. It is plainly labeled assumptions-only, lists unavailable sources, preserves the missing-source snapshot and uses existing accepted-context initialization. Numeric starting values are user-entered or visibly illustrative, never adopted from missing evidence. Missing accepted workforce denominators remain unknown. No fabricated reference IDs, causal effect, effectiveness ranking or third alternative is added.

The draft uses existing assumption review, explicit calculation, attachment and local history. Its context has a separate local-origin planning digest, so it cannot be restored as a model-proposed option with the same A identifier. Source recovery or changed goal/planning context makes it stale without modifying an attachment. The saved context notes are frozen for initialization. Saved origin labels survive reload and attachment.

Model response schemas and model-response evidence validation are unchanged. A local origin marker permits empty evidence arrays only for either exact immutable local template; adding fake references, changing its proposal text, removing its origin or injecting it into a model response fails validation. This is a local storage extension, not a relaxed model input or output boundary.

## Limits

- One generic starting template per supported goal kind, not evidence-based prioritization or a tailored intervention recommendation. For retention, the user must choose and review the actual intervention before execution; for capacity, they must confirm role/BU need and staffing inputs.
- Uses the existing conditional turnover/capacity arithmetic, not retention-effect forecasting or a new model. Default pilot counts, dates and allowances are illustrative and may be unsuitable; they require review.
- No automatic retry, fallback model call, source recovery loop, calculation, attachment or execution. The normal evidence-based preparation action remains separate and explicit.
- No new cross-page linked-attachment handoff is enabled for the local template. Existing local review/attachment remains available. The fixed proposal wording/dependency template cannot be edited under its local-origin marker; numeric planning assumptions remain editable.
- Preserves old drafts and snapshots. A recovered evidence context does not promote a local assumption into an observed fact. If sources fully recover, use normal explicit preparation; the old local draft remains historical.
- Does not diagnose upstream outage causes or change the 12-second source reader. Does not touch database/auth/access, eNPS, credentials or live API configuration.

## Checks

Unit tests cover both lifecycle paths, strict local origin validation, model-boundary rejection, unsupported scopes and saved-context shape. Browser tests intercept every API request and exercise partial failures, all remote sources unavailable, explicit goal pin, local preparation, accepted inputs, unknown denominator, reviewed attachment, reload, source recovery and responsive overflow at desktop/mobile/200%-equivalent reflow. Existing accepted-context and normal planning/browser regressions also run. No live model request is used for this validation.

Final checkpoint validation: 1,082 unit tests and 348 browser checks passed (51 outage fallback, 21 accepted context, 48 conditional scenarios, 117 unified attachment, 18 clarification, 36 composer, 57 compact layout). Lint, standalone TypeScript, production build and whitespace checks passed. Held eNPS files are unchanged. PR129 stays at the published accepted-context fix; this local checkpoint requires separate review/integration.
