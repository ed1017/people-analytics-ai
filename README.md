# Workforce-planning portfolio prototype

Live app: https://www.ed-ai.app

A synthetic-data People Analytics and Strategic Workforce Planning prototype. The public app offers workforce evidence, deterministic staffing scenarios, a guided three-minute demo, and an explicit-input headcount what-if. Live AI conversations are disabled in the public release. AI-assisted development does not mean that the site runs a live AI advisor.

Ed defined the workforce-planning problem, product requirements and acceptance criteria; AI assisted with implementation, design and testing.

## Try the public app

Start with the three-minute demo on Home, compare staffing options, and save a proposal in your browser. Saved proposals are browser-local planning records. They are not approved workforce actions or shared enterprise records.

The public workforce snapshot contains 9,037 synthetic people as of September 30, 2026. The company headcount what-if takes explicit monthly hires and exits for October 2026 through March 2027. It illustrates conditional arithmetic, not a validated prediction or a payroll forecast.

This is a portfolio prototype. No measured adoption, savings, business impact or predictive performance is claimed.

## Repository and deployment status

This repository's application baseline is the earlier public source at `f8c9304`. It is not an exact reproduction of the currently deployed 9,037-person release. The live application was released from a separately reviewed source snapshot; copying this repository or following its local setup does not reproduce that deployment.

The deployed runtime depends on inputs excluded from public source distribution. A separately reviewed, public-safe fixture layer and matching integration tests are needed before synchronizing a reproducible public application release. Those excluded inputs and private release materials must not be added merely to make this repository match the live site.

Documentation updates describe the current live experience while keeping that source gap explicit. Historical documentation, experiments and AI integration code in this repository are not evidence that their features are enabled publicly.

See [Product architecture and availability](docs/product-architecture.md) for the distinction between the live prototype, the repository and proposed capabilities.

## Technology

The application uses Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts and Vercel. This repository also contains Supabase/PostgreSQL and OpenAI integration code. Their presence does not establish an active company data connection or enabled live AI in the public release.

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
