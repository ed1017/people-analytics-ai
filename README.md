# Workforce Intelligence

[Open the app](https://www.ed-ai.app) | [About the project](https://www.ed-ai.app/about)

Workforce Intelligence connects workforce evidence with staffing decisions. Recruiters, hiring managers and workforce planners can identify a gap, compare developing people, moving people internally and hiring, then adjust the plan and see its cost, timing and uncovered work change.

The demo uses a fictional company with 9,037 people as of September 30, 2026.

## Try a planning decision

1. **Start with a worked example.** Open [Scenarios](https://www.ed-ai.app/scenarios) and choose **Open worked example**. In Overview, the same guided example is available through **Introduction > Start guided demo**.
2. **Compare responses.** Use the example assumptions, review the 5-FTE gap, then change the budget or staffing mix to compare cost, readiness and uncovered work.
3. **Keep a proposal.** Save the reviewed plan in your browser. Reopen it and compare a revision with its original assumptions.

## Product decisions and tradeoffs

Ed Om defined the workforce-planning problem, product requirements and acceptance criteria. AI assisted with implementation, design and testing.

- **Evidence beside decisions.** Group, period and source context remain accessible as a workforce finding becomes a plan.
- **Adjustable recommendations.** Shared calculations connect controls, results and charts.
- **Practical tradeoffs.** Compare staffing choices using cost, timing and uncovered work; keep people, FTE, workload, cash and employee time distinct.
- **Reversible exploration.** Preserve drafts and saved revisions while visitors edit, compare or cancel. Proposals are stored in the visitor's browser.

## Explore the product

- **Workforce:** headcount, turnover, skills and recruiting evidence.
- **Scenario planning:** workload, staffing options and headcount projections.
- **Position management:** budgeted, filled and vacant positions, with a current-versus-proposed comparison.
- **Workforce references:** dated external labor-market evidence alongside planning assumptions.

[Read the case study](https://www.ed-ai.app/about) for the problem, product decisions and creator's role.

## Next steps

The [active roadmap](docs/roadmap-status-2026-10-17.md) tracks answer-quality improvements, end-to-end acceptance and additional external recruitment evidence. [Acceptance records](docs/public-portfolio-mvp-acceptance.md) document tested behavior and remaining evidence gaps.

## Source and local development

The hosted release's versioned source is in [releases/2026-10-21](releases/2026-10-21/README.md). Use the [public-fixture replay recipe](releases/2026-10-21/reproduction/README.md) to run that UI with recorded demo data. The repository's root development app can be started with:

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. Run `npm.cmd run build` to build it. Server integrations require their own configuration; private runtime inputs and credentials are excluded.

Built with Next.js, React, TypeScript, Tailwind CSS, shadcn/ui and Recharts, with Vercel hosting and Supabase/PostgreSQL and OpenAI integrations. Shared analytics and planning engines calculate the results.

[Architecture and availability](docs/product-architecture.md) | [Release and operational records](docs/readme-operational-record-2026-10-27.md)
