# Home proposed action options

Pin explicitly saves the exact goal, then authorizes one coordinated preparation request. Existing goals show **Prepare action options** until the user requests preparation. Up to three action pilots share one response. Selecting a card, reloading, navigating back, or opening scope review does not call the model. Failed or stale requests do not retry automatically or overwrite a saved proposal.

The existing Home request envelope is reused: the fixed preparation message selects a different output contract, history is empty, and the existing normalized evidence, goal context, persona and explicitly carried market reference remain the available context. Local planning inputs only participate in a local cache digest. They are not sent to the model. The preparation transport disables SDK retries, uses no tools and caps output at 1,800 tokens; decoding is limited to 16 KiB. Error responses contain fixed text and do not log model content.

`homeActionDraftV1` is a separate, bounded browser-storage field. Existing goals, conversations, investigation records and calculator plans/results retain their identities. Cache identity binds the exact goal, normalized evidence and local planning/request context. Goal transitions invalidate late responses, including switching away and back. Stored drafts are revalidated before reuse. Unverifiable records remain saved; stale references are not relabeled with current evidence provenance.

Each card contains a proposed first step, evidence references and a limitation. Cost, timing, staffing and effect start **Unknown**. **Tailor assumptions** opens a compatible scope review and progressive input groups. **Calculate proposal** uses the existing local calculator; **Save proposal** explicitly persists that action’s inputs, provenance and calculation. Confirmed planning records remain separate.

## Semantic release gate

Strict parsing establishes shape, bounds and reference availability, not factual truth or semantic relevance. Adversarial fixtures intentionally demonstrate that a structurally valid first step may still assert an unsupported percentage, monetary saving or guarantee. Prompt instructions forbid those assertions; the UI labels all options **AI-proposed pilots — not validated** and keeps numerical results unknown. Neither safeguard proves the prose is correct. If realistic QA observes unsupported estimates or guarantees, hold release and investigate the output/prompt/evaluation behavior. No live model evaluation was run for this change.

## Validation

- `node --test tests/*.test.mjs`
- `npm run lint`; `npx tsc --noEmit`; `npm run build`
- `PLAYWRIGHT_MODULE=/tmp/people-browser-tools/node_modules/playwright/index.mjs node tests/browser/home-action-options.mjs`
- Same browser command with `HOME_BUILT=1`, against the local production server on port 3100.

The action browser suite replaces the old investigation-only post-Pin assertions in `home-pin-options.mjs` and `home-candidate-reload.mjs`. It checks discovery/edit cancellation, double Pin, exact envelope, storage isolation, reload, scope mismatch, failed stale replacement, explicit old-goal preparation, late-response rejection, no automatic retry, mobile/desktop/200% equivalent layout, and runtime errors. All requests are intercepted. Production quality of generated prose remains unverified.

## Per-action assumptions and provisional calculations

`homeActionScenariosV1` stores up to twelve bounded proposal records per goal. Each is bound to the exact action signature, goal, evidence/planning snapshot and input revision. Unsaved edits survive card switches in the current tab; only explicit Save proposal persists them. Edits retain an earlier calculation as stale and remove its numbers from the current summary. Reload verifies stored calculation snapshots against the existing pure calculator. Conflicting saves cannot overwrite a newer revision or downgrade its calculation.

Scope, staffing/baseline, and cost/timing groups progressively expose relevant inputs. One prioritized missing input links to its field. Empty values remain Unknown; zero is an explicit assumption. User-entered and illustrative assumptions retain distinct editable provenance. Observed aggregate evidence does not automatically supply population, staffing availability, costs or effects. The model output contract has no numeric assumption fields and is unchanged.

Compatible saved planning inputs are offered with their values for explicit adoption into the named action. Confirmation is bound to the exact source snapshot. Inputs must match the current goal and compatible scope; confirmed source plans/results remain unchanged. Adoption copies assumptions with their unverified basis, never a saved result. No quote or benchmark automatic-prefill adapter is implemented.

Capacity proposals use `calculateWorkforceIncrement` for additional capacity only. Partial costs remain Unknown. Historical-median timing is not calculated in this local slice: an explicit arrival assumption is required. Retention proposals use the existing `calculateRetentionWhatIf`, preserving no-intervention and program-with-no-effect cases. Effect ranges are entered what-if assumptions, never forecasts or defaults. No cross-action ranking or arbitrary efficacy is supplied.

All editing, adoption and calculation is local, without model or calculator API calls. Opening capacity assumptions reads the existing role catalogue endpoint. Invalid stored records are retained with saving blocked. No confirmed plan, model input boundary, database, or authorization change is included.

Additional validation: `HOME_BUILT=1 HOME_BASE_URL=http://127.0.0.1:3101 PLAYWRIGHT_MODULE=/tmp/people-browser-tools/node_modules/playwright/index.mjs node tests/browser/home-action-calculations.mjs`. Synthetic network-intercepted browser tests cover partial/full arithmetic, scope mismatch, draft separation, stale edits, explicit adoption, reload, storage isolation and responsive layouts. Hosted generated prose still needs independent acceptance.

## First-step readability release hold

Hosted QA reported incomplete first-step sentences. Source inspection found no CSS clamp, substring truncation or storage clipping. The separately approved narrow completeness correction below is integrated from PR110, including a 360-character bound, rewrite instruction and rejection of bare dangling separators/ellipses. Other grammatical failures can still pass; hosted prose acceptance remains required. No live model evaluation was performed in the executor.

## Discovery reference correction after hosted QA

Problem references and each candidate's references are independently validated against available metrics; candidate operations must still match their metrics. Candidates need not duplicate their sources into `problem_evidence`. Problem references support the provisional problem; candidate references support the investigation, not causal proof or effectiveness. The whole normalized packet remains bound to the exact goal, so changes to either reference set's underlying evidence invalidate the preparation. v2 shapes and field meanings are unchanged, valid saved records are not migrated or rewritten, and the legacy `problem_source_mismatch` diagnostic remains readable but is no longer emitted for this redundant relationship.

## First-step completeness correction

First steps now request one complete concise sentence, normally under 240 characters, with a 360-character allowance for grammatical completion. The prompt explicitly requires rewriting rather than cutting words or sentences to fit the schema. The parser rejects only obvious bare trailing hyphens/dashes or ellipses; it does not require terminal punctuation or attempt broad grammar validation. Internal punctuation and quoted punctuation remain valid. Full bounded text is stored and rendered unchanged; overflow is rejected, never clipped. Invalid older drafts are retained without automatic migration or model retries. This narrow guard does not prove grammatical or factual correctness; hosted prose acceptance is still required.
