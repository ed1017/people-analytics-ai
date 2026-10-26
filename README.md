# Workforce-planning portfolio prototype

Live app: https://www.ed-ai.app

A synthetic-data People Analytics and Strategic Workforce Planning prototype. The public app offers workforce evidence, deterministic staffing scenarios, a guided planning scenario, and an explicit-input headcount what-if. Provider-backed planning conversations were restored in the October 21 release, subject to verified pricing windows and cumulative budget admission. See the release evidence boundaries below.

Ed defined the workforce-planning problem, product requirements and acceptance criteria; AI assisted with implementation, design and testing.

## Try the public app

Start with Planning Scenario on Home, compare staffing options, and save a proposal in your browser. Saved proposals are browser-local planning records. They are not approved workforce actions or shared enterprise records.

The public workforce snapshot contains 9,037 synthetic people as of September 30, 2026. The company headcount what-if takes explicit monthly hires and exits for October 2026 through March 2027. It illustrates conditional arithmetic, not a validated prediction or a payroll forecast.

This is a portfolio prototype. No measured adoption, savings, business impact or predictive performance is claimed.

## Repository and deployment status

The versioned application source subset is published in [releases/2026-10-21](releases/2026-10-21/README.md), with a file-hash manifest and dependency-free verifier. Production is PR420, runtime `448612c1c980c9676ff3a8b44405d508a278f033`, deployment `dpl_4cdTdGdUbWUrjE8mtF5mHGeEAuka`. The product introduction is a pending PR421 preview. See the [active roadmap](docs/roadmap-status-2026-10-17.md) and [PR420 release record](https://github.com/ed1017/people-analytics-ai/pull/420) for current acceptance and remaining limits. Older dated release sections are historical.

The root development application remains distinct from that versioned snapshot. Private synthetic runtime inputs, credentials and release evidence are excluded. Publishing the source closes the missing-source record; it does not make this repository a self-contained reproduction of the hosted service. A [local public-fixture replay recipe](releases/2026-10-21/reproduction/README.md) now builds and serves the versioned UI without private inputs or credentials. It preserves recorded company-wide receipts; live AI, narrowed filters and unrecorded server calculations are deliberately unavailable.

Automatic Vercel deployments from main and this publication branch remain disabled. No production rebuild, configuration change or paid call accompanies this source publication. The release notes distinguish protected provider checks, captured-answer replay, local continuity tests and public configuration smoke; no fresh paid production browser journey through every step is claimed.
See [Product architecture and availability](docs/product-architecture.md) for the distinction between the live prototype, the repository and proposed capabilities.

See [Public portfolio MVP acceptance](docs/public-portfolio-mvp-acceptance.md) for completed evidence, operational dependencies and optional extensions.

## Technology

The application uses Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts and Vercel. This repository also contains Supabase/PostgreSQL and OpenAI integration code. The hosted release uses reviewed server-side provider and admission configuration; those credentials and services are not supplied by this repository.

Deterministic analytics and planning engines own the calculations. The public prototype does not require a visitor to make a paid AI call.

## Local development of this repository

These commands start the repository's application, not the exact deployed release. Individual integrations may require their own configuration; do not assume access to the live site's runtime inputs.

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. To build this source:

```powershell
npm.cmd run build
```

Historical pricing renewal PR379 (superseded; current recorded maintenance window is in the active roadmap): app, rollout, admission and settlement upper windows align at October 24 23:14 UTC. Round admission cutoff 23:12:30 UTC; new configuration receipts stop at 23:12:00 UTC. Independent review, 30 focused tests, CI, protected/public Home and capability checks passed. Rates, $50 cumulative cap, original reservations, receipts and uncertain holds are unchanged; accounting preservation verified. No paid provider call. This is configuration acceptance, not fresh-model answer acceptance.
