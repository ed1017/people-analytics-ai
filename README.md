# Workforce-planning portfolio prototype

Live app: https://www.ed-ai.app

A synthetic-data People Analytics and Strategic Workforce Planning prototype. The public app offers workforce evidence, deterministic staffing scenarios, a guided planning scenario, and an explicit-input headcount what-if. Provider-backed planning conversations were restored in the October 21 release, subject to verified pricing windows and cumulative budget admission. See the release evidence boundaries below.

Ed defined the workforce-planning problem, product requirements and acceptance criteria; AI assisted with implementation, design and testing.

## Try the public app

Start with Try a planning scenario on Home, compare staffing options, and save a proposal in your browser. Saved proposals are browser-local planning records. They are not approved workforce actions or shared enterprise records.

The public workforce snapshot contains 9,037 synthetic people as of September 30, 2026. The company headcount what-if takes explicit monthly hires and exits for October 2026 through March 2027. It illustrates conditional arithmetic, not a validated prediction or a payroll forecast.

This is a portfolio prototype. No measured adoption, savings, business impact or predictive performance is claimed.

## Repository and deployment status

The versioned application source subset, updated through the October 23 coordinated synthetic realism release, is published in [releases/2026-10-21](releases/2026-10-21/README.md), with a file-hash manifest and dependency-free verifier. That snapshot maps to deployment `dpl_2n3Ey5BtR4xJQwCWNrXgDzx7jBwA` and local source identity `7ea8bc36e814396530c70d5889ebd1f5aa24da3d`.

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
