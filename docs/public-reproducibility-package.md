# Offline public reproducibility package

This additive package targets public repository `https://github.com/ed1017/people-analytics-ai` at **9d2d94230a4ccb00d322e380734e883756c35279**, verified from public `HEAD` and `refs/heads/main` on 2026-10-20. It changes no application routes, layout, production configuration, dependencies or engine source. The existing public `lib/position-action-engine.ts` and `lib/scenario-engine.ts` are byte-identical to the engines used in the reviewed calculator work.

## Capability matrix

| Capability | Evidence and claim | In this package |
| --- | --- | --- |
| Invented read-provider scaffold | Authored 10-to-12-person example; **no production parity** | Yes; [schema](public-fixture-provider.md) |
| Headcount and 33-month trend | Exact captured public data fields, independently compared again; no receipts/headers/query parity | Yes; [inventory](public-headcount-parity.md) |
| Position actions | Exact captured public GET data and three POST data examples; 81 generated arithmetic combinations; two captured invalid statuses | Yes; [contract](public-position-actions-calculator.md) |
| Company-only scenario | Eight company output fields match three captured public POST examples; 243 generated arithmetic combinations | Yes; [contract](public-company-scenario-calculator.md) |
| Nineteen company GET data projections | Captured data-only bodies and independently compared fields; omitted receipt/scope/release/provenance | No; separate isolated integration |
| Nineteen-response receipt compatibility | Fresh observed public response set reproduced the original source-ordered placeholder digest; **not** restored receipts in the data-only fixtures or new approval | No; separate verification evidence |
| Local Overview/headcount/position/company UI | Real browser-tested isolated application integration; distinct local fixture identity | No; requires separately reviewed application patch |
| Invented structural calculator contract | Separate invented inventory and conservation exercise; **no production parity** | No; separate work, not silently integrated |
| Full scenario/BU/structural/response/execution calculators | Complete canonical segment rows, weights, requisition partitions, skill/resource inputs and reconciliation not supplied | Unsupported |
| Full application or clean Next production build | Not established by these standalone tests | Unsupported |

Captured public evidence is historical fictional synthetic data, not current observed employee outcomes, forecast validation, approved actions or staffing feasibility. Generated arithmetic tests are invented test inputs against the captured public model, not additional production observations.

## Exact setup and offline tests

Use Node **24.21.0** (the verified version). Node's TypeScript stripping executes the unchanged engine `.ts` files; a module-type warning is expected. No npm install, credentials, environment configuration, private files, network calls or database are required for these tests.

```powershell
git clone --no-checkout https://github.com/ed1017/people-analytics-ai.git people-analytics-public-check
cd people-analytics-public-check
git checkout --detach 9d2d94230a4ccb00d322e380734e883756c35279
git -c core.autocrlf=false apply --check ..\public-reproducibility.patch
git -c core.autocrlf=false apply ..\public-reproducibility.patch
node --test tests/public-fixture-provider.test.mjs tests/published-read-provider.test.mjs tests/public-position-actions.test.mjs tests/public-company-scenario.test.mjs
git diff --check
```

On Windows, the command-scoped `core.autocrlf=false` is required when the patch first introduces `.gitattributes`; otherwise Git may convert fixture bytes before applying the new attributes. This does not change saved Git configuration.

Expected: **22 passing tests**. Clone is the only network step. Public captures are not refreshed by tests. The patch is an allowlisted working-tree diff; it contains no inherited commit history. Fixture JSON and SHA files retain LF bytes. Existing documentation is reused, with package notes clarifying that historical capture scripts are intentionally excluded.

## Company-field handoff

`createCompanyScenarioCalculator(manifestText, manifestPin)` returns `{contract, read(), calculate(body)}`. Call `calculate({assumptions:{...}})` with only the five bounded numeric assumptions described in its contract. The eight output fields are `as_of`, `source_scenario`, `defaults`, `assumptions`, `summary`, `points`, `methodology`, and `accounting`. No segment, metadata, transport or identity fields are synthesized.

A future caller must independently own HTTP parsing/limits/statuses, fixture identity/currentness, UI labeling and error/reset behavior. Do not mount the partial result as the full `/api/scenario-modeler` contract. The separately reviewed local integration used a distinct endpoint for this reason.

## Excluded application dependencies

Public base lacks `lib/public-9037-fields.json`, `lib/public-9037-projection.mjs`, and `lib/public-9037-contract.mjs`. These must receive their own public-source/artifact review before distributing the 19-route provider or receipt verifier. Their consumers are `lib/public-fixture/company-data-contract.mjs`, `company-data-provider.mjs`, and `receipt-compatibility.mjs`; their fixture/evidence files are intentionally excluded here.

Further application integration also requires review of `local-identity.mjs`, `local-mode.mjs`, `local-request-body.mjs`, `local-route.server.mjs`, `local-headcount-what-if.ts` under `lib/public-fixture/`, the three `local-*-workspace.tsx` components, the existing headcount input component export, `proxy.ts`, `app/layout.tsx`, `app/planning/headcount-demo/page.tsx`, the two headcount route wrappers/default-handler copies, and dataset identity transport registration. Those are not implicitly authorized by this standalone package.

There is no deploy, PR, push, automatic deployment, or publication step in these instructions. Distribution remains subject to independent review of this exact file allowlist and patch.
