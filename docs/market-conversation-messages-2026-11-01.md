# Market insights in conversation messages

## Requested behavior

The reader requested removal of the market card Close and Reset controls, plain-language interface labels, and real conversation messages instead of a separately mounted panel.

## Scope and contracts

- Local market interactions use the existing conversation message model. Each message owns its country, role and source result snapshot; later cards do not overwrite earlier ones.
- Opening and showing market insights do not call a model or modify saved planning records. Country changes clear an incompatible role and results.
- A scoped follow-up identifies the chosen message's country and role through the existing market lookup path. It does not attach sources to a position scenario or imply Finance approval.
- Source attribution, reference dates, synthetic distinctions, occupation/geography limits and required consent remain intact. Visible navigation, risk and planning labels use data, sources, assumptions and review details where those terms are accurate.
- Existing country and occupation coverage is unchanged. No source values, calculations, budgets, credentials or access settings change.

## Validation status

Implementation passed independent review: 23 unique focused checks. The complete focused set passed 33 tests; a separate risk/editorial regression set passed 32. The final Overview TypeScript graph has zero diagnostics. Exact CI and staged/public browser acceptance have now passed; PR523 is live. No paid model-answer acceptance is claimed.

Follow-up is limited to general chat without a saved plan, demand/task model, position planner or active scenario context. An explicitly selected card is checked before routing and after readiness. If its scope changes, submission is blocked and the draft is preserved; it cannot fall through to a planning command. Selecting a card does not itself send a question.

The supplied screenshot was resolved through Library metadata/text. Its supported image download failed; no claim of inspecting those pixels is made. Browser screenshots of the implemented interface provide visual acceptance separately.

## Release identity

- [PR523](https://github.com/ed1017/people-analytics-ai/pull/523); reviewed runtime `f3befbf46df84fc0b1a985000a990a939ffdb6b3`.
- Merge `7a4d48f09371526aece3cc7fe4a9bf3a6a19b71a`.
- Production deployment `dpl_ALoUwWjZZMQfq2oDstoQpLALxnC6`; isolated host `people-analytics-gwfwbhufp-ed-56dc.vercel.app`.
- Archive SHA256 `5cb038191f69962f7175afb81ac59d73ebb658e299c1b7ef967355b83cfdfd75`; 1,223 runtime inputs, 1,078 manifest entries. Private inputs and dependencies unchanged.
- Exact CI run 41262211751 passed, including 3,095 historical tests, the feature checks, generated artifacts and TypeScript. Full staged production build passed.
- Staged desktop 1440/mobile 390 each passed 10 workflow groups with HTTP 200, zero functional/mock/provider-request errors and four intercepted local reply fixtures. The protected transport cleanup timed out after 15 seconds with four late route errors per width; all assertions and pre-cleanup error checks were clean.
- Exact tested deployment promoted and public-domain deployment identity confirmed. Direct public desktop 1440/mobile 390 each passed 10 workflow groups: HTTP 200, four intercepted fixture replies per width, no browser/blocked/mock/bridge errors, clean drained teardown. No protected asset replay was used on the public site.

The browser checks cover actual saved-work backup restoration, two independent cards with an ordinary chat turn between them, selected-card follow-up payloads, stale-intent blocking with draft preservation, reload, workspace isolation and conversation reset. Mocked replies verify transport and state contracts, not fresh model answer quality. No paid provider calls occurred.

## Copy boundaries

Plain-language changes cover navigation, AI data scope, risk retry, saved baseline/source labels and planning assumptions/review controls. Attribution, modeled/synthetic distinctions, missing-data states, safeguards and internal schemas remain. This is not a claim that every technical term in legacy/deep methodology pages was removed; user-owned Lab methodology was not changed.
