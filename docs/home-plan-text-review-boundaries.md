# Action Plan text review boundaries

Two PR147 hosted cases reproduced locally on `d25506cce18d8ee28266a76f5bb3466fe26c720f`.

## Exact USD edit

The rejected request was:

> Change the Unallocated learning pilot one-time cash allowance in Action Plan #1 from USD 2,000 to USD 2,500. Keep other assumptions unchanged.

Both currency amounts already parse correctly. The transition parser included the final preservation sentence in the new value, causing the amount validator to reject it. The shorter reported request, `In Action Plan #1, set Unallocated learning pilot amount (USD) to $2500.`, already worked.

Only a final standalone `Keep other assumptions unchanged.` (optionally `all other`) is now recognized before parsing the changes. The complete original request remains in the review and is reparsed on Apply. Unrecognized trailing instructions, exceptions, ambiguous amounts, foreign currencies, wrong starting values and instructions following the preservation sentence still reject the whole request. Exact plan selection, stale checks and Apply remain required. Regression checks compare the entire resulting inputs object to verify only the named amount changes.

## Unfinished limitation

The reported ending `Delivery timing within the 90-day goal is` passes PR147's fresh-response guard. The display helper only substitutes exact component IDs with component names; it does not shorten this text. The component renders the supplied limitation followed by the standard owner disclaimer. There is no display clipping to repair or missing text that the application can safely reconstruct.

Fresh-response validation now rejects bare `is`/`are` endings, preserving common complete forms such as `as is`, `as they are`, bounded indirect review questions, uppercase codes and complete predicates. Existing dangling-conjunction and punctuation checks remain. Complete text at the schema character bound remains valid without terminal punctuation. This bounded heuristic is not a semantic guarantee for all prose.

Rejection requires an explicit retry and preserves previous proposals, drafts, calculations and attachments. Existing saved limitations are not deleted, rewritten or silently completed. To replace already-saved incomplete content, the user must explicitly review/edit or prepare another proposal; this change does not alter history or strip the limitation warning.

## Scope and validation

The evidence/source-availability staleness guard is unchanged. The reported post-reload source-availability change remains a separate hosted investigation; missing current evidence is not relabelled as fresh. No model setting, request boundary, calculation, database, auth or eNPS change is included. All model-facing tests are intercepted/offline.

Validation passed: 1,316 unit tests; production build, lint, standalone TypeScript and whitespace; 177 production-browser checks (exact prefixed/long edit63, incomplete-response recovery63, context staleness51). Browser flows cover desktop1366px, mobile390px and 200%-equivalent683px reflow, explicit Apply/calculation/attachment, reload and goal return. The long hosted edit is the one applied before attachment; the shorter hosted edit independently previews correctly. Exceptions reject locally without context mutation or extra requests. Runtime errors, external requests and horizontal overflow fail the harness. Held eNPS files are unchanged. All merges remain held for exact-preview hosted acceptance.
