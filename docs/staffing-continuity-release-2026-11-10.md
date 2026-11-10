# Staffing continuity release record - November 10, 2026

## Publication state

- **Current production:** [PR581](https://github.com/ed1017/people-analytics-ai/pull/581), budget-period continuity; [PR582](https://github.com/ed1017/people-analytics-ai/pull/582), post-demo turnover chat; and [PR583](https://github.com/ed1017/people-analytics-ai/pull/583), staffing deadline answers.
- Integrated runtime `b30b90c1ba70dc7c38850b2f92d3a276f28eab4f` and merge `aff92cad50a8a9b57164718c7d4020e16a18c600` have no file differences. The tested deployment `dpl_C9qmkdepL4Dksg98RhPsmxGKSV24` was promoted without rebuilding and verified READY on both `ed-ai.app` and `www.ed-ai.app`. Its aliases also include `ed-workforce-ai.vercel.app`; its deployment hostname is `people-analytics-9bu6kr7s3-ed-56dc.vercel.app`.
- The previous production deployment, `dpl_5cetXXQ1BWiAGFXw1MnAB3rF5zsV`, remains the rollback target. It contains PR581 runtime `05ecc2fd90607d17bac2f5c98ed1308dbb7e2ab3`, whose source tree matches merge `0a6573ba5fb08e04ae1248ee955285b87b7481b8`.
- Post-promotion HTTP/static/capability smoke passed. The public guided-demo save flow was inspected through Action plans and Track. Final direct-public browser POST journeys remain unrun.

This record supersedes the publication status in the earlier [budget-period candidate](staffing-budget-period-continuity-2026-11-10.md). Other dated records retain the status and scope of their own checkpoint.

## Behavior

**Budget period:** A retained positive or zero budget is not silently reinterpreted when a cost horizon is first supplied. It stays pending until explicitly confirmed or cleared for that period. Chat and typed/editor changes share the rule and record current-turn confirmation provenance. Currency changes cannot discard or reinterpret a retained quote.

**Post-demo chat:** A recognized independent business-unit turnover question uses an ephemeral evidence-only request. Only validated answer turns return to the original workspace. The saved guided plan, selected goal, catalog, constraints and evidence recipes remain unchanged. Actual plan follow-ups and mixed requests retain strict provenance checks. See [the defect and scope](post-demo-turnover-chat.md).

**Deadline answers:** Conversational summaries use the same delivery conflict as staffing cards. Late paths cannot become recommended merely because they have lower listed cash. Delivery deadlines and cost horizons remain separate. A mixed narrative question receives the checked comparison with an explicit partial-answer note; materially mixed planning outputs and hidden candidate changes are rejected atomically. See [the deadline contract](staffing-deadline-answer-2026-11-10.md).

## Verification completed

### PR581, previous production checkpoint

- Independent review and [exact-head CI 42736058290](https://github.com/ed1017/people-analytics-ai/actions/runs/42736058290) passed.
- Restored-runtime production build, full TypeScript, focused lint and a fresh 58-test affected run passed. The earlier 102-test affected suite is retained as earlier evidence, not another final-head run.
- Source verification covered 1,185 published files and 145 unchanged runtime-only inputs. Packaged source was rechecked after the build.
- Local, protected and direct-public desktop/phone journeys passed. Browser POSTs were intercepted through the actual local public route with provider dispatch denied. For public replay, only the handler URL was normalized to the verified stage hostname required by its runtime guard.
- Home, health, static assets and capability GETs returned 200 on both public domains. A capability request without the required dataset header returned 503 as expected.

### Integrated PR582/583, promoted

- Independent review cleared both fixes. [Exact-head CI 42755880716](https://github.com/ed1017/people-analytics-ai/actions/runs/42755880716), restored-runtime production build, full TypeScript, focused lint and 90 combined tests passed.
- Packaging verified 1,187 published files plus 145 unchanged runtime-only inputs. Archive SHA-256: `68c3cac611950fb32ed5c4d545dc76c3c880a6ed60e4b100da6295ab11248aab`.
- Local post-demo browser acceptance passed at 1440px and 390px: guided save, independent turnover question, repetition, investigation follow-up and reload/repetition. Eight deterministic intercepted POST round trips preserved the original plan, goal and evidence recipes. No provider request, page error, blocked request or horizontal overflow was observed.
- Deadline browser acceptance passed 28 local checks and 28 protected checks. Coverage included late prose/cards, separate delivery/cost horizons, edits and reload, numeric follow-up, corrected boundary timing and removed targets. Offline completion fixtures used the actual public route; live admission, accounting and provider execution were not exercised.

### Fresh cloud checks

- The source-only cloud run passed ten focused tests and verified all 1,187 published source hashes.
- Three actual-route repeat/follow-up requests passed strict grounding with current public GET evidence and zero provider attempts. This is local route execution using current public evidence, not a live production POST or end-to-end browser journey.
- Post-promotion smoke passed on both public domains: Home, About, dashboard, attrition and capability GETs returned 200. The missing dataset header returned the expected 503. All 15 referenced static assets per domain returned 200 with nonempty bytes.
- Shared Chrome completed the promoted public guided flow: demo, compare, choose three develop/two move/zero hire, review, save, Action plans and Track. The inspected result retained $26,800 listed cash, 1,280 uncovered hours, conditional readiness on February 1, 2027, and a five-role target on November 30, 2027. No realized outcomes were invented.
- The promoted deployment returned no error/fatal log groups for the 15-minute observation window. Before promotion, the prior deployment also returned none for the preceding hour. These bounded observations do not establish error-free operation.

## Limits and remaining gates

- Protected post-demo browser acceptance was **inconclusive**, with zero POSTs. Serialized protected GET transport exhausted capability readiness/receipt timing before submission. Local acceptance passed; this does not turn the protected attempt into a pass. Final direct-public browser POST journeys are still unrun for the promoted deployment.
- Automated browser replay on the cloud executor could not start because of socket permissions, including after approved escalation. Shared-browser public inspection covered the guided flow above; no intercepted browser chat POST or general-chat paid send was performed. Finish/reload and one tab-recovery attempt timed out, so fresh reload persistence was not verified.
- Protected reload screenshots include transient source loading. They do not establish a settled final screen. Public verification must wait for readiness before capturing the result.
- `tests/public-saved-evidence.test.mjs` has the same five failures on the complete PR581 baseline and integrated runtime: four stale public-grounding fixtures and an outdated 9,037-versus-9,092 headcount assertion. Baseline passed 14/19; the integrated run, including six added tests, passed 20/25. No additional failure was introduced, but the full suite is not green.
- No paid provider calls were made. These checks establish deterministic contracts and browser state handling, not fresh model-answer quality or universal language understanding. Cumulative spending headroom was not verified. Historical budget figures in earlier records are not current spending authority.
- The post-demo fix does not support every unrelated question or add business-unit level/tenure turnover denominators or cost joins. Those need separately verified evidence; contribution is not causality.
- Runtime-only inputs, deployment credentials and private receipts remain excluded from the public repository. The published source subset is not a complete deployable runtime. No database, provider, accounting, external-source, Future of Work/Lab or overlay change accompanies these fixes.

Documentation-only publication must keep its branch disabled in `vercel.json` Git deployment settings. It does not require rebuilding or redeploying the application.
