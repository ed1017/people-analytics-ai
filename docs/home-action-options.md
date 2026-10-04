# Home proposed action options

Pin explicitly saves the exact goal, then authorizes one coordinated preparation request. Existing goals show **Prepare action options** until the user requests preparation. Up to three action pilots share one response. Selecting a card, reloading, navigating back, or opening scope review does not call the model. Failed or stale requests do not retry automatically or overwrite a saved proposal.

The existing Home request envelope is reused: the fixed preparation message selects a different output contract, history is empty, and the existing normalized evidence, goal context, persona and explicitly carried market reference remain the available context. Local planning inputs only participate in a local cache digest. They are not sent to the model. The preparation transport disables SDK retries, uses no tools and caps output at 1,800 tokens; decoding is limited to 16 KiB. Error responses contain fixed text and do not log model content.

`homeActionDraftV1` is a separate, bounded browser-storage field. Existing goals, conversations, investigation records and calculator plans/results retain their identities. Cache identity binds the exact goal, normalized evidence and local planning/request context. Goal transitions invalidate late responses, including switching away and back. Stored drafts are revalidated before reuse. Unverifiable records remain saved; stale references are not relabeled with current evidence provenance.

Each card contains a proposed first step, evidence references and a limitation. Cost, timing, staffing and effect are app-owned **Unknown** values. No existing calculation is automatically attached to a proposal. Scope selection must match the proposed route before opening a planner; the user must explicitly review its assumptions and use the existing Save/Calculate workflow. Existing planner results remain separate, so program A's result is never displayed as program B's effect. No action-specific numeric result attachment is implemented in this slice.

## Semantic release gate

Strict parsing establishes shape, bounds and reference availability, not factual truth or semantic relevance. Adversarial fixtures intentionally demonstrate that a structurally valid first step may still assert an unsupported percentage, monetary saving or guarantee. Prompt instructions forbid those assertions; the UI labels all options **AI-proposed pilots — not validated** and keeps numerical results unknown. Neither safeguard proves the prose is correct. If realistic QA observes unsupported estimates or guarantees, hold release and investigate the output/prompt/evaluation behavior. No live model evaluation was run for this change.

## Validation

- `node --test tests/*.test.mjs`
- `npm run lint`; `npx tsc --noEmit`; `npm run build`
- `PLAYWRIGHT_MODULE=/tmp/people-browser-tools/node_modules/playwright/index.mjs node tests/browser/home-action-options.mjs`
- Same browser command with `HOME_BUILT=1`, against the local production server on port 3100.

The action browser suite replaces the old investigation-only post-Pin assertions in `home-pin-options.mjs` and `home-candidate-reload.mjs`. It checks discovery/edit cancellation, double Pin, exact envelope, storage isolation, reload, scope mismatch, failed stale replacement, explicit old-goal preparation, late-response rejection, no automatic retry, mobile/desktop/200% equivalent layout, and runtime errors. All requests are intercepted. Production quality of generated prose remains unverified.
