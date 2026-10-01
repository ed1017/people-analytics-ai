# Decisions, Reversals, and Superseded Directions

This file exists so a new agent does not accidentally resurrect an older design simply because it appears in chat history or an older document.

## 1. Dashboard-first was the starting point, not the destination

**Earlier:** People Insights Copilot / dashboard-first analytics with contextual AI.

**Current:** Workforce AI is a governed decision-support product that moves from analytics into planning, workforce design, response, and execution.

Do not reduce the product back to KPI grids + a generic chatbot.

## 2. Product north star

Established direction:

**Observe → Investigate → Simulate → Decide → Monitor**

Planning-specific flow:

**Plan → Design → Respond → Execute**

The second flow is already implemented deeply; the first is the broader product design direction.

## 3. People Analytics became Workforce Analytics

The workspace naming evolved so the measurement layer is now **Workforce Analytics**. This better accommodates Overview, Workforce Composition, Attrition, Talent Acquisition, Survey/Sentiment, and related workforce evidence.

Do not revert the top-level category to a generic 'People Analytics' label without a deliberate product decision.

## 4. Talent Acquisition belongs under Workforce Analytics

Talent Acquisition was explicitly placed in Workforce Analytics rather than Talent Management because it is treated as a workforce-demand/hiring analytics surface.

## 5. Talent Management is a separate workspace

Talent Management exists to hold talent-supply/capability surfaces such as Skills, L&D, Career Interests, Career Growth/Internal Mobility, and Succession.

Do not dump all Talent pages back into Workforce Analytics.

## 6. Labor Cost belongs in Workforce Planning

Labor Cost / workforce finance was moved conceptually into the Planning workspace because it supports workforce economics, plan-vs-budget, vacancy cost, and scenario impact rather than general analytics alone.

Current navigation labels the page **Labor Cost Planning**.

## 7. Giant Workforce Planning page was intentionally decomposed

**Earlier:** one very large mounted Workforce Planning page containing most planning intelligence.

**Current:** dedicated destinations for Planning Overview, Scenario Modeling, Position & Workforce Design, Workforce Response, and Execution & Feasibility, all backed by shared Planning session state.

The old four-step work was not discarded; it became the logic underneath the final destination architecture.

## 8. Top workspace toolbar was an experiment and was reverted

**PR #58:** introduced a top-level workspace journey toolbar.

**PR #59:** changed wording/hierarchy.

**PR #60:** deliberately restored grouped left navigation while preserving the useful state-retention improvements.

Final workspace labels/journey subtitles:
- Workforce Analytics — “Understand Our Workforce”
- Talent Management — “Realize Our Potential”
- Workforce Planning — “Plan Our Future”

Do not reintroduce the top toolbar as if it were unfinished work.

## 9. Navigation sizing/typography was deliberately enlarged

The user explicitly wanted the left workspace typography substantially larger without widening the sidebar.

Current design intent:
- 252px expanded sidebar;
- 72px collapsed/mobile sidebar;
- approximately 20px category headings;
- approximately 14px journey subtitles;
- later 17px page labels.

A redesign that makes these tiny again would reverse a deliberate preference.

## 10. AI panel should feel primary, not bolted on

The user repeatedly wanted the AI area 'WAY bigger'. PRs #48 and #55 moved the product toward a larger, more central AI experience.

The AI can remain resizable/collapsible and preserve side/state preferences, but it should not return to a narrow accessory panel.

## 11. Career Interests and Career Growth are different products

**PR #54:** first Career & Mobility MVP centered on recorded preferences.

**PR #57:** renamed that page to **Career Interests** because 'mobility' overstated what the data represented.

**PR #65:** later added **Career Growth & Internal Mobility** as a separate descriptive analytics surface for observed movement history.

Do not merge these two pages conceptually just because the internal route name `career-mobility` remains for Career Interests.

## 12. Talent enterprise scope must not inherit global filters

Before PR #62, selected dashboard context could mislabel enterprise-only Talent evidence.

Current decision: selected business context and evidence population are separate concepts. If a Talent tool/page does not support a BU/country/level cut, the AI must say so.

This is a correctness rule, not optional UX copy.

## 13. Skills → Planning handoff is explicit, not automatic

The user approved a narrow cross-journey evidence handoff.

Carry means carry evidence/context. It does not mean:
- auto-run a scenario;
- auto-select Build/Move/Buy;
- approve a plan;
- make source writes;
- reinterpret enterprise evidence as business-unit evidence.

Future handoffs should follow the same explicit/context-preserving pattern unless intentionally redesigned.

## 14. Workforce calculations stay deterministic

Repeated architectural decision: use AI to understand, route, explain, and compare; use deterministic engines for the actual numbers.

This is one of the strongest differentiators from a generic LLM demo and should not be weakened for convenience.

## 15. Build / Move / Buy is evidence-informed, not automatically optimized

The system provides evidence and lets users set response allocations. It does not automatically claim a 'best' workforce strategy.

Historical reasons:
- evidence can overlap;
- internal readiness is not guaranteed movement;
- L&D pathways do not guarantee proficiency gain;
- recruiting history does not guarantee future fill capacity;
- Borrow/Automate lacked governed evidence.

## 16. Internal Talent evidence stays aggregate

Readiness and mobility supply were intentionally implemented without individual identities/rankings.

Do not turn the portfolio app into automated employee selection.

## 17. Succession was approved only as a narrow aggregate product

The approved direction is enterprise-only, fixed-contract, suppressed, descriptive succession coverage/readiness.

It is not a candidate slate UI, named succession database browser, or arbitrary dimension explorer.

## 18. Slate Mist + Blue is the current visual direction

The user selected a mid-light Slate Mist + Blue theme, then asked for less white / slightly darker background.

PR #66 finalized the latest change by moving the background to `#ACBAC9` while preserving contrast.

Do not interpret an older screenshot/theme experiment as the current target.

## 19. Mobile behavior is part of the release bar

390px overflow and layout problems were found earlier and fixed repeatedly. Mobile is not an optional later cleanup.

Any meaningful shell/navigation/table/composer change should include a 390px regression check.

## 20. Build success and lint cleanliness are different claims

The project has carried historical lint debt.

Allowed statement after build only: build/TypeScript passed.

Do not say 'everything is clean' or 'lint clean' unless lint was separately run and passed.

## 21. Interactive desktop testing is not allowed while the user is actively using the PC

This was learned the hard way during PR #65 testing when automation repeatedly manipulated foreground windows.

Background verification is fine. Interactive GUI automation requires coordination.

## 22. README and architecture docs can lag code

Current code + merged PR history outrank older prose.

Known examples:
- product architecture doc still describes some now-completed Planning promotions as future;
- Succession rollout doc still contains a pre-merge blocker that PR #56 later resolved/validated.

A new agent must reconcile documents before treating warnings/roadmaps as live truth.