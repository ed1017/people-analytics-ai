# Fluid conversation: current recommendation acceptance specification

Source audit: released main `a04ff3d02c56adfe7e4962fbea41dae924ac8875`, tree `1ba638cb53da6001a7360658a47455947172c95d`, inspected 2026-10-15. This document supersedes the diagnosis against `48d1b006` previously stored here; that historical diagnosis remains in Git history. This is a documentation update, not a model, prompt, tool, feature-flag or persistence change. It adds no release gate.

## Current implementation and resolved historical gaps

Two request paths must be distinguished:

- Ordinary chat in [`app/api/chat/route.ts`](../app/api/chat/route.ts) retains `CHAT_MODEL` (`gpt-5.6-luna`, defined in [`lib/chat-model.ts`](../lib/chat-model.ts)). Some answer branches explicitly disable tools. Do not describe this entire route as the natural business-planning tool loop.
- The enabled Home solution conversation uses [`app/api/home-solution-conversation/route.ts`](../app/api/home-solution-conversation/route.ts). Its source policy is `gpt-6.1-sol`, medium reasoning, default service tier. The route returns 404 when `NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION` is not enabled. For a natural request without a fictional-mode header, it adds business-planning tools and instructions; normal rounds allow automatic tool selection, final-only rounds disable tools, and a required-staffing capability can force its specific calculator. Explicit fictional/demand modes have separate binding checks. These are inspected source rules, not a fresh production configuration or live-model observation.

[`lib/home-strategic-planning.ts`](../lib/home-strategic-planning.ts) now requires a grounded or conditional recommendation, decisive reason, meaningful tradeoff and concrete next move. It discourages questionnaires before useful guidance, unsupported faster/cheaper/best claims, forced mixes and implicit acceptance. Its bounded continuity logic now recognizes "Or how about both?", comparative follow-ups, partial agreement and corrections while clearing on topic changes. The old proposal's missing-instruction and dropped-follow-up diagnoses are therefore historical, not current defects.

The natural business-planning bridge is implemented in [`lib/home-business-planning.ts`](../lib/home-business-planning.ts), the solution service and [`lib/home-business-planning-save.ts`](../lib/home-business-planning-save.ts). It supports scoped demand review/correction, checked staffing comparisons and explicit reviewed selection. It does not require an exact starter or prebound demand fixture. Omitted values and provenance are retained; quoted corrections or withdrawals must pass existing guards. Saved selections preserve proposal snapshots and receipts. Code availability does not prove that a live model chooses the right tool or explains a useful recommendation.

Scope remains bounded: employee/profile counts are not uncommitted capacity, source snapshots are not measured throughput, and arithmetic under entered assumptions is not evidence of operational feasibility or causal training effects. The manual capacity workspace and its hosted save/reopen acceptance are separate from natural-language interpretation quality.

## Evidence and its limits

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| `tests/home-strategic-planning.test.mjs` and `tests/home-planning-continuation.test.mjs` | Instruction content, bounded context retention and topic-change behavior | Model adherence, usefulness or semantic quality |
| `tests/home-business-planning.test.mjs` | Checked arithmetic, provenance/unknown retention, quoted corrections/withdrawals, scope/reference guards and explicit selection contracts | Correct interpretation of arbitrary language |
| `tests/browser/home-natural-business-full-client.mjs` | Existing full-client harness for actual request transport, compiled route, provisional state, review/save and reload using synthetic provider/dataset transports | Live-provider acceptance; this audit does not claim a fresh browser run |
| PR268 pre/post-merge CI | 2,629 regression tests plus provenance, generated-artifact and TypeScript checks passed on the released application tree | A real-model semantic evaluation |
| Parent-reported hosted planner acceptance | Manual calculation, save/open/compare and narrow layout behavior within the recorded test scope | Natural conversation quality or all browsers/screen readers |

The historical full-client narrative in `home-natural-business-planning.md` describes its original candidate and local evidence. Its old publication status is not current release status. The frozen provider reference is unchanged and is not fresh acceptance for this source.

## Semantic acceptance cases


These examples describe acceptable reasoning and interaction, not exact required wording or canned recommendations. They must eventually be evaluated on real model responses separately from calculation/schema/save tests. No such evaluation is claimed here.

- **Conditional support workload:** "If the new contracts bring more support tickets, should we hire specialists or train people from another team?" A useful response might suggest checking whether the increase is short-lived or sustained, then conditionally favor training for repeatable work with adequate lead time and hiring for specialist coverage needed immediately. It should explain speed, training effort and source-team disruption, and propose reviewing work types and release constraints next. It must not claim an observed backlog, known spare team or numeric staffing requirement.
- **A justified combination:** Follow with "Or how about both?" The answer should stay with the same objective and consider, for example, specialist coverage plus training for repeatable work, if their responsibilities and timing are complementary. Explain the additional onboarding/training burden and prevent double-counting the same people or manager time. It must be equally able to reject a mix when that burden defeats the objective. No fixed ratio or mandatory three options.
- **Recruiting versus manager capacity:** "The product is due in six months, but managers are stretched. Should we recruit more engineers?" Recommend a phased or otherwise conditional hiring/onboarding approach if onboarding would consume the constrained resource; contrast it with reassignment or narrowing delivery scope. The next move should check manager/buddy time and the critical work before asserting a feasible hire count. Do not infer manager capacity from headcount or invent a hiring lead time.
- **Adapting after a constraint:** "We can't release people from other client work, and we need coverage next month." Revise the previous recommendation and explain why the new release/timing constraints change it. Do not keep recommending redeployment as though people were available. A reasonable answer can prefer external specialist coverage conditionally while acknowledging hiring lead time and cost remain unknown.
- **Use data and code where they apply:** If the user asks to compare a supported explicit planning scenario, use its existing input/review/calculation path and explain the returned result and scope. Cite available workforce/skills/recruiting facts at their supplied population and period. For unsupported operational throughput, state the boundary once and offer a qualitative or clearly assumed comparison; never label a proposed number as measured or imply a tool was run.
- **Review and save remain intentional:** "Use your assumptions for now" must not become source verification or silent save. "What if we split the work?" must not change the reviewed/saved plan without its existing checks. An explicit later calculation/review/save request continues through the current workflow.
- **No endless discovery:** An answer that only lists missing inputs or repeatedly asks exploratory questions fails, even if its schema and calculation contracts pass. A conditional recommendation with a reason and a useful next action can pass when measured inputs remain unknown. A single essential clarification can pass when different interpretations would materially change the recommendation.


## Verification of this documentation update

All 20 targeted tests across strategic planning, planning continuation and business planning passed on this source. The seven semantic case descriptions were preserved verbatim from the previous document; relative source links resolve and the whitespace diff check passes. No application files changed, so a new application build or browser run was not needed. These checks validate the specification against deterministic source evidence only.

## Next actionable increment

The remaining agreed gap is real-model interpretation and recommendation quality on the natural conversation path, not an established missing deterministic planning feature. Start with the cases above, record the actual route and source identity, and assess each response for recommendation, reason, next move, grounded comparative claims, adaptation, preserved unknowns and intentional save behavior. Report failed cases with exact observations before proposing a bounded behavior fix. Do not require a fixed recommendation, tool sequence, ratio, number of alternatives or exact wording.

The next executable development increment under the current restrictions is a provider-free evaluation manifest/report format for these cases: stable case IDs, user turns, semantic criteria, source/route identity, evidence origin (synthetic or real provider), usage when available, and explicit unrun/pass/fail outcomes. It should keep all real-provider outcomes unrun until actual responses exist and reuse the current route/harness rather than add another planner or canned response path. This is evaluation preparation, not a release requirement or evidence of model quality.

No paid evaluation is authorized in this increment. Population retries remain paused. A later real-provider run requires an available approved budget and an enforceable bound for the actual request journey, including instructions, schemas, history and tool returns. The route's 5,000 output-token limit per response, retry setting and deadline alone do not establish total cost; serialized byte counts are not a verified billable-token or dollar bound. No new credential, data-upload or access route is part of this work.

The earlier screenshot transfer failure and historical unexecuted proposal remain recorded in Git history; no screenshot pixels or real model responses were inspected for this documentation update.
