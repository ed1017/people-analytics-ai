# Dot Bootstrap Prompt

Copy/paste the prompt below into the first Dot session that takes over this project.

---

You are taking over development of my public Workforce AI project: a People Analytics + Talent Management + Strategic Workforce Planning application.

Repository: `ed1017/people-analytics-ai`
Production branch: `main`
Public app: `https://ed-workforce-ai.vercel.app`

Before changing anything, read the complete handoff package in:

`docs/dot-handoff/`

Read in this order:

1. `00_START_HERE.md`
2. `01_MASTER_BUILD_LOG.md`
3. `02_CURRENT_STATE.md`
4. `03_ARCHITECTURE.md`
5. `04_DATA_GOVERNANCE.md`
6. `05_DECISIONS_AND_SUPERSEDED.md`

Then inspect current `main` directly. The handoff snapshot was created from main HEAD `d128b456ee8a6e2e96d79fc21af2d943c85e4936`, which includes merged PR #67 (`Connect five Planning destinations to shared workspace state`). If `main` has moved since then, identify exactly what changed before continuing.

Treat current code/tests and merged PR history as more authoritative than older chat history or stale roadmap prose.

Important product principles:

- This is not meant to be a generic dashboard + chatbot.
- The broad journey is Observe → Investigate → Simulate → Decide → Monitor.
- Workforce Planning follows Plan → Design → Respond → Execute.
- The AI interprets questions, calls governed tools, and explains results.
- Deterministic engines own workforce calculations. Do not invent planning math.
- Keep selected business context separate from evidence scope.
- Do not fabricate unsupported BU/country/level Talent breakdowns.
- Do not introduce person rankings, employee recommendations, promotion/transfer decisioning, or identity-level Talent/Succession outputs.
- Preserve the narrow aggregate Succession contract and k=10 suppression rules.
- Do not change RLS, grants, credentials, auth, schema security boundaries, public exposure, billing, or domains without explicit approval.
- Do not silently change the current three-workspace information architecture.

Current workspaces:

Workforce Analytics — “Understand Our Workforce”
- Overview
- Workforce Composition
- Attrition
- Talent Acquisition
- Survey & Sentiment

Talent Management — “Realize Our Potential”
- Skills Intelligence
- Learning & Development
- Career Interests
- Career Growth & Internal Mobility
- Succession Planning

Workforce Planning — “Plan Our Future”
- Planning Overview
- Scenario Modeling
- Position & Workforce Design
- Workforce Response
- Execution & Feasibility
- Labor Cost Planning

Important superseded decisions:

- PRs #58–#59 top workspace toolbar were deliberately reverted by PR #60. Final design is grouped left navigation.
- Career Interests and Career Growth & Internal Mobility are separate pages with different meanings.
- Older docs may describe dedicated Planning destinations as future; they are now implemented.
- `docs/succession-summary-rollout.md` contains a historical pre-merge warning that was overtaken by PR #56's merged validation evidence.

Current operational constraint:

If I am actively using my PC, do not foreground, maximize, resize, click, type, send keys, close user windows, or otherwise manipulate my desktop. Use background/read-only Git, API, deployment, logs, or process inspection unless interactive testing is explicitly coordinated.

First task:

1. Inspect current `main` and compare it with the handoff snapshot.
2. Verify the deployed app is serving the current release.
3. Complete the release verification explicitly left open by PR #67: test all five Planning destinations against the deployed backend and real AI, confirm shared Planning state is preserved, confirm Skills handoff scope/freshness behavior, and confirm the AI does not invent scenario calculations.
4. Run the current focused tests and production build/TypeScript checks.
5. Report the verified current state, any discrepancies, and the exact next product milestone before modifying functionality.

Do not start by redesigning the UI, broadening access, changing security, or adding a new feature.

---