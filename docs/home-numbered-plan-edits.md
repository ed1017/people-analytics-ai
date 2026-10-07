# Numbered Action Plan edits

The previous parser rejected every numbered-plan reference, even when it named the selected tab. A single explicit reference to the active Action Plan is now resolved using its current displayed number and the actual proposal count. Other-plan references require selecting that tab and resending for review. Multiple, ambiguous, absent-selection and out-of-range references cannot create an edit. Existing selection-epoch, goal, evidence and input guards still reject stale Apply attempts.

For example, “Increase the unallocated learning pilot in Action Plan #1 from USD 2,000 to USD 2,500” previews one change when Plan 1 is selected and its current allowance is 2,000. An explicit starting value must match the current assumption. The original user request is retained and reparsed on Apply; no model request, calculation or attachment happens implicitly. The parser also accepts the reference before or after the change. It does not infer a total budget, create unknown fields or silently switch plans.

Validation: 17 chat-edit unit tests; 45 browser checks across desktop/mobile/200%-equivalent reflow, including selected-plan preview, tab-switch invalidation, other-plan rejection, explicit Apply, calculation/review/attachment, reload and goal return. Build with evidence precheck, lint, TypeScript and whitespace checks pass. Browser responses are intercepted synthetic fixtures, never live model calls.

## Post-PR175 recovery and saved-draft corrections

Recovered requests that do not name a plan require an explicit confirmation of the selected numbered plan before Send. Confirmation binds the goal, stable plan ID, revision, inputs, evidence context and exact request; changing any of these requires another confirmation. Recovery preserves the requirement across reloads. The conversation listens for other tabs' saved changes so an unsent request is journaled before a reload can discard it.

A conflicting direct Attach creates a recovery journal even when no chat draft exists. The journal contains the previously published local state, never the failed attachment or conflicting new alternative. Retry reviews the latest saved work; the user then repeats the intended action. Conflicting catalogs are not merged. A recovered edit creates the next available number after explicit resubmission, preserving the winning plan and all attachment history.

Active pre-fix illustrative pilot drafts with known generated defaults offer **Create corrected alternative**. This adds a numbered alternative using the original goal context; it does not migrate saved work on read. Original plans, attachments, dates, costs and explicit edits remain unchanged. Missing baselines and populations remain unknown. An edited target paired with a generated baseline instead receives a review note. The archived fixture in `tests/fixtures/home-saved-pilot-before-pr175.json` was produced by the old initializer, including the 15% → 12%, three-month and 100-person defaults.

The exact request “reduce turnover by 2 percentage points over 12 months with a $100,000 illustrative budget” carries the cash ceiling into calculation, regeneration, comparison, attachment and reopening. “Demo budget” remains supported. Employee time stays in hours; unknown costs do not create budget headroom. Quantified retention goals with no participant count leave it unknown.

The browser regressions use the production build and real controls with intercepted evidence/model transport. They cover desktop and 390px mobile, two-tab recovery and resubmission, direct Attach without prior typing, competing Plan #4 creation, and legacy/catalog draft correction. These checks do not establish hosted live-model behavior.

The storage guards are optimistic checks. They detect a saved envelope that has already changed, but localStorage provides no atomic compare-and-swap across tabs. The tests do not prove protection from truly simultaneous final-read/final-write interleaving; the implementation is not a serializable multi-tab database.
