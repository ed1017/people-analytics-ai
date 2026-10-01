# Dot Handoff — Start Here

Snapshot date: 2026-10-01

## Purpose

This folder is the handoff package for the Public People Analytics / Workforce Planning AI project. It reconstructs the project history from prior project conversations and verifies the current technical state against GitHub.

Do not treat old chat history or an older roadmap statement as more authoritative than the current repository. When sources conflict, use this order:

1. current `main` code and tests;
2. merged PR history and PR validation notes;
3. the current-state and governance notes in this handoff;
4. older product discussions and superseded decisions.

## Current source of truth

- Repository: `ed1017/people-analytics-ai`
- Default/production branch: `main`
- Main HEAD at this snapshot: `d128b456ee8a6e2e96d79fc21af2d943c85e4936`
- Latest merged PR at this snapshot: `#67 — Connect five Planning destinations to shared workspace state`
- Public app URL: `https://ed-workforce-ai.vercel.app`
- Local Windows project path historically used: `C:\Users\edwin\Projects\people-analytics-project`
- Development shell convention: PowerShell with `npm.cmd`

PR #67 is merged to `main`. Its PR notes say focused navigation/handoff/accessibility/scope tests, TypeScript, and isolated browser checks passed on the release candidate. Its notes also say deployed-backend and real-AI checks still remained for release verification at PR creation. Do not assume those post-merge runtime checks happened unless you verify them.

## Product in one paragraph

Workforce AI is a public portfolio product combining governed People Analytics, Strategic Workforce Planning, Talent Management evidence, deterministic planning engines, and a cross-domain AI assistant. The product is deliberately not just a dashboard with a chatbot. The intended journey is: understand the workforce, model future demand, design positions and role demand, choose a workforce response, and test whether the plan is executable. The LLM interprets questions, calls governed tools, and explains results; deterministic engines own workforce calculations.

## Current workspace structure

### Workforce Analytics — “Understand Our Workforce”
- Overview
- Workforce Composition
- Attrition
- Talent Acquisition
- Survey & Sentiment

### Talent Management — “Realize Our Potential”
- Skills Intelligence
- Learning & Development
- Career Interests
- Career Growth & Internal Mobility
- Succession Planning

### Workforce Planning — “Plan Our Future”
- Planning Overview
- Scenario Modeling
- Position & Workforce Design
- Workforce Response
- Execution & Feasibility
- Labor Cost Planning

The five core Planning destinations now share the existing Planning workspace state so assumptions, actions, response allocations, and carried Skills evidence can persist while navigating among them.

## Non-negotiable product and safety constraints

- Do not invent workforce data or calculations.
- Keep workforce math deterministic and governed; the LLM must not silently substitute generated numbers.
- Do not introduce person rankings, promotion recommendations, suitability scoring, or individual employee decisioning.
- Preserve aggregate-only Talent/Succession behavior unless explicitly approved otherwise.
- Do not change RLS, grants, credentials, authentication, public exposure, schema security boundaries, billing, or domains without explicit approval.
- Preserve the distinction between selected business context and evidence scope. Enterprise-only Talent evidence must never be relabeled as if it were filtered to the selected BU/country/level.
- Succession is enterprise-only, fixed-contract, suppressed aggregate evidence. Do not expose identities, raw succession rows, arbitrary breakdowns, or reconstruct suppressed cells.
- Do not silently change the current product information architecture.
- Do not use interactive desktop/browser automation while the user is actively using the PC. Never foreground, maximize, resize, click, type, send keys, or close the user's windows without coordination. Background/read-only Git, deployment, process, and API checks are acceptable.

## Read these next

1. `01_MASTER_BUILD_LOG.md` — chronological build history and all merged PRs through #67.
2. `02_CURRENT_STATE.md` — exact current product/technical state and immediate verification gaps.
3. `03_ARCHITECTURE.md` — product and technical architecture.
4. `04_DATA_GOVERNANCE.md` — data provenance, Talent scope rules, Succession contract, and security boundaries.
5. `05_DECISIONS_AND_SUPERSEDED.md` — major decisions, reversals, and things not to accidentally reintroduce.
6. `06_DOT_BOOTSTRAP_PROMPT.md` — a copy/paste bootstrap prompt for a new Dot session.

## First action for Dot

Read this entire handoff, inspect current `main`, and verify the live production deployment corresponding to `d128b456…`. Pay particular attention to PR #67's remaining release-verification note: verify the five Planning destinations against the deployed backend and real AI grounding before treating the post-#67 release as fully runtime-verified.

Do not begin a redesign or security change as the first task.