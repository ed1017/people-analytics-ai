# Workforce Intelligence

[Open the app](https://www.ed-ai.app) · [About the project](https://www.ed-ai.app/about)

Workforce Intelligence helps a planning conversation move from “What is happening in our workforce?” to “How could we cover the work?” It brings workforce evidence, adjustable staffing assumptions and calculated comparisons into one workspace for recruiters, hiring managers and workforce planners.

The portfolio prototype uses a fictional company with 9,037 people as of September 30, 2026. Visitors can explore its workforce, test a workload or headcount scenario, and compare developing people, moving people internally and hiring.

## Try a planning decision

1. **Open the example.** On Overview, choose **Introduction**, then **Start guided demo** and **Use example assumptions** to start the existing service-team example with a 5-FTE gap.
2. **Test a different approach.** Review the role, timing and budget; adjust the available inputs and compare cost, readiness and uncovered work alongside the charts.
3. **Keep a proposal.** Save the reviewed plan in your browser, reopen it, and compare a revision while retaining the original assumptions.

Prefer to start with workload? Open [Scenarios](https://www.ed-ai.app/scenarios) and choose **Open worked example**, or enter your own work and team inputs.

**Live AI status, October 27, 2026:** automatic pricing verification is installed and public readiness checks report configured. Readiness is not proof that every answer succeeds; recent visitor-reported answer failures remain under investigation. The worked example and local scenario calculations do not require a paid model call.

## Product decisions and tradeoffs

Ed Om defined the workforce-planning problem, product requirements and acceptance criteria. AI assisted with implementation, design and testing. The work emphasizes four product decisions:

- **Evidence beside decisions.** Keep group, period and source context accessible while moving from a workforce question into planning.
- **An adjustable recommendation.** Use shared calculations for controls, results and charts, so changing an input changes the corresponding result.
- **Distinct planning measures.** Keep people, FTE, workload, incremental cash and employee time separate; leave missing inputs unknown instead of assigning zero.
- **Reversible exploration.** Preserve drafts and original saved assumptions while visitors edit, compare, cancel or reopen a plan. Browser-local saving keeps the prototype simple; it is not a shared enterprise workflow.

The application demonstrates the planning workflow and its software behavior. Adoption, savings and business impact have not been measured.

## Next steps

Chart-first position management, editable workload risk and sourced workforce references are delivered. The next work is targeted acceptance and resolving the remaining model-failure evidence and external-data gaps, as tracked in the [active roadmap](docs/roadmap-status-2026-10-17.md). Fresh paid model testing is outside current acceptance checks.

## Repository and deployment status

The versioned application source subset is published in [releases/2026-10-21](releases/2026-10-21/README.md), with a file-hash manifest and dependency-free verifier. [PR434](https://github.com/ed1017/people-analytics-ai/pull/434) is verified live, runtime `568b064e59ad2001f5137fe4cc8e793893d3d887`. The manifest pins that deployed source, including goal-bound external references, source attribution and native-unit preservation. The [active roadmap](docs/roadmap-status-2026-10-17.md) separates live work, candidates, remaining evidence and deferred scope. Older dated sections are historical.

The root development application remains distinct from that versioned snapshot. Private synthetic runtime inputs, credentials and release evidence are excluded. Publishing the source closes the missing-source record; it does not make this repository a self-contained reproduction of the hosted service. A [local public-fixture replay recipe](releases/2026-10-21/reproduction/README.md) now builds and serves the versioned UI without private inputs or credentials. It preserves recorded company-wide receipts; live AI, narrowed filters and unrecorded server calculations are deliberately unavailable.

Automatic Vercel deployments from main and this publication branch remain disabled. Releases use separately checked builds and explicit promotion. The release notes distinguish protected provider checks, captured-answer replay, local continuity tests and public configuration smoke; no fresh paid production browser journey through every step is claimed.
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

## Historical maintenance record

Historical pricing renewal PR379 (superseded; current recorded maintenance window is in the active roadmap): app, rollout, admission and settlement upper windows align at October 24 23:14 UTC. Round admission cutoff 23:12:30 UTC; new configuration receipts stop at 23:12:00 UTC. Independent review, 30 focused tests, CI, protected/public Home and capability checks passed. Rates, $50 cumulative cap, original reservations, receipts and uncertain holds are unchanged; accounting preservation verified. No paid provider call. This is configuration acceptance, not fresh-model answer acceptance.
