# Keep numbered Action Plan edits local

## Reproduced cause

On PR145 `18601f8f5631683de957ea04745af025fc2deb90`, the exact AI-skills prompt generated two plans. The reported natural allowance change was rejected because its descriptor was not in the bounded field aliases. The from/to parser then treated the unrecognized field plus `from USD 2,000` as the field name.

A subsequent `In Action Plan #1, set Unallocated learning pilot amount (USD) to $2500.` bypassed local editing. The Home router required an edit verb at the beginning, while the edit parser already understood an initial numbered-plan reference. General chat appended this sentence through `recordGoalStatement`, changing the planning digest without Apply. Evidence and goal stayed unchanged. That is why the proposal became stale and Attach disabled. The AI's later general-chat answer was a consequence of that routing error, not a failed local Apply.

The exact consecutive sequence reproduced on the unchanged production build at desktop1366px, mobile390px and 200%-equivalent683px reflow: local field-name rejection, then an extra general-chat request, changed goal context and disabled Attach. The baseline fixture preserved the reported two-plan count. No live model or hosted session was touched. Reproduction log: `/tmp/pr145-edit-routing-reproduction.log` (21 checks).

## Corrections

- Use a shared, bounded routing classifier that recognizes mutation verbs after a numbered-plan prefix and optional courtesy wording. The unchanged original request still goes through the selected-plan parser and existing review/Apply validation.
- Named edits without a current selected plan ask for selection locally. Stale, ambiguous, cross-plan and out-of-range requests cannot fall through into general chat or append goal notes.
- Recognize expense-labelled cash allowance/amount wording. One-time allowance aliases exist only for a cash expense with one occurrence. Duplicate labels still require clarification; nothing uses fuzzy field matching or silently chooses a target.
- Parse explicit from/to boundaries independently of whether the field is recognized. The old value must match the current reviewed assumption. Unknown fields now report the field itself, not a field accidentally containing the old value. Budget ceilings remain distinct from expense amounts.
- Separate evidence freshness from overall plan freshness in the existing source-reference explanation. Planning-only changes retain known reference scope and say evidence is unchanged. Actual evidence changes still require review; an unavailable comparison is not labelled as a known change.

The fix prevents new accidental context writes. It does not silently delete an edit sentence already saved into the hosted goal's notes by PR145. That existing state is preserved for explicit context review, or acceptance can use a fresh goal on the exact new preview.

## Why two plans are valid

The exact AI-skills prompt does not ask for three plans. `homeBundleInstructions` requests one to three and explicitly permits fewer; the delivery-task instruction says not to force a method mix or three options. The schema sets `maxItems: 3` with no minimum. The parser preserves all accepted bundles, and the UI maps every bundle to a tab.

There is no semantic distinctness filter that removes a redundant third plan. Duplicate names/IDs, invalid references, invalid dependencies or a diagnostic-only bundle for a delivery goal reject the whole proposal. Offline checks with the exact goal verified one, two and three valid bundles survive parsing, preparation, saving and restoration with their count unchanged. Invalid third bundles reject the entire response. Two plans therefore conform to the current contract; no valid third was found to be dropped. The provider's internal reason for choosing two was not observed. No artificial third plan or stronger effectiveness claim was added.

## Verification

All 1,309 unit tests pass. New units cover both hosted sentences, prefixed routing, explanatory questions, wrong starting values, ambiguous labels and incompatible recurring expense basis. Production build, standalone TypeScript, lint and whitespace pass.

The new browser flow passes 60 checks with two plans. Consecutive rejected/valid edits preserve the exact goal context and preparation binding, make no model call and require Apply; selected-plan switching still invalidates review. The flow continues through participant editing, reviewed calculation/attachment, reload and goal restoration. Deliberate planning-only staleness tests accurate evidence wording and rejects stale/no-target edits locally. The total is 585 browser checks: new prefixed-edit60, numbered-edit45, unified attachment117, intent-matrix234, context-staleness51, incomplete-response recovery57 and linked-context staleness21, all against the same production build. All endpoints are intercepted; no app-origin error, network escape or horizontal overflow is accepted.

Existing branches, main, model settings/input boundaries and held eNPS files remain unchanged. Release stays held for exact-preview hosted acceptance.
