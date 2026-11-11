import type {Metadata} from 'next';
import Link from 'next/link';
import {WorkforceCaseComparison} from '@/components/workforce-case-comparison';
import {workforceCaseSources} from '@/lib/workforce-case-study';

export const metadata: Metadata = {title: 'AI workforce transition case study | Workforce Intelligence', description: 'A sourced industry problem, clearly labeled fictional assumptions, and a hiring, redeployment and development comparison.'};
const linkStyle = 'inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function WorkforceCaseStudyPage() {
  return <main className="mx-auto max-w-6xl space-y-10 px-4 pb-12 pt-4 sm:px-6">
    <nav aria-label="Case study navigation" className="flex flex-wrap gap-2"><Link href="/" className={linkStyle}>Workforce Intelligence</Link><Link href="/about" className={linkStyle}>About this project</Link></nav>
    <header className="space-y-5 rounded-2xl bg-primary px-6 py-8 text-primary-foreground sm:px-9 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-widest">Workforce planning case study · Ed Om</p>
      <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Grow AI capability while other work contracts.</h1>
      <p className="max-w-3xl text-base leading-relaxed sm:text-lg">A services company needs a different workforce mix, not just more people. How should a manager balance external hiring, internal redeployment and development against a delivery deadline?</p>
      <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-current px-3 py-1">Published industry context</span><span className="rounded-full border border-current px-3 py-1">Fictional company scenario</span><span className="rounded-full border border-current px-3 py-1">Interactive comparison</span></div>
    </header>
    <section aria-labelledby="case-evidence" className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">01 / Published business problem</p>
      <h2 id="case-evidence" className="text-2xl font-semibold tracking-tight">The industry signal: Accenture&apos;s AI workforce transition</h2>
      <div className="grid gap-4 lg:grid-cols-3">{workforceCaseSources.map(source => <article key={source.id} className="space-y-3 rounded-xl border p-5"><p className="text-xs font-semibold text-muted-foreground">Published fact · {source.date}</p><p className="text-sm leading-relaxed">{source.fact}</p><a href={source.url} target="_blank" rel="noopener noreferrer" className={`${linkStyle} -ml-3`}>{source.title}<span className="sr-only"> (opens a new tab)</span></a></article>)}</div>
      <p className="text-sm leading-relaxed text-muted-foreground">These dated sources explain the business context. They do not establish an available internal talent pool, training effectiveness or the right staffing mix for this example. This is not Accenture employee data, an Accenture deployment, or a reproduction of its outcomes.</p>
    </section>
    <section aria-labelledby="case-brief" className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">02 / Adapt the problem to the demo</p>
      <h2 id="case-brief" className="text-2xl font-semibold tracking-tight">Ed Inc.: a fictional AI delivery team</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border p-5"><h3 className="font-semibold">The management question</h3><p className="text-sm leading-relaxed">Assume new AI implementation work needs 10 additional analysts, while a legacy managed-services workstream is contracting. Could some employees move or develop into the new work before the delivery deadline?</p><p className="text-sm leading-relaxed">The app keeps its existing fictional workforce dataset. This case adds a planning overlay only: no employee records are replaced, and no individual is identified as ready, surplus or selected.</p><p className="text-sm leading-relaxed">The growth requirement and contracting workstream are scenario assumptions, not findings from the workforce snapshot. Validate demand with delivery leaders before using a people-count target.</p></div>
        <div className="space-y-3 rounded-xl border bg-muted/30 p-5"><h3 className="font-semibold">Synthetic assumptions, not source facts</h3><ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed"><li>10 additional roles; six-month cost horizon; initial full-readiness target after three months.</li><li>Three people potentially ready to redeploy after one month; four different people potentially ready after four months of development.</li><li>External hires ready after three months. Internal pools are assumed distinct, suitable and releasable.</li><li>Initial USD 500,000 listed-cash budget. Existing internal payroll and unentered costs are excluded.</li></ul></div>
      </div>
      <details className="rounded-xl border px-5"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Inspect all cost and effort assumptions</summary><div className="space-y-3 pb-5 text-sm leading-relaxed"><p>Per person: external hire USD 60,000 for the whole six-month period; development USD 5,000 one-time cash and 80 training hours; redeployment USD 2,000 incremental cash; backfill USD 10,000 for each internally staffed role over the period. Each external hire has 16 entered training hours.</p><p>Listed cash = hires × 60,000 + trainees × 5,000 + redeployments × 2,000 + (trainees + redeployments) × 10,000. These are invented planning quotes, not market salary benchmarks. Whole-period quotes are not prorated by readiness dates.</p><p>Full readiness is the latest active route&apos;s assumed readiness. Training effort adds trainee and new-hire hours; it does not prove trainer capacity or proficiency. Existing payroll, management effort, productivity ramp, attrition and other unentered costs are not estimated. No uncovered-work hours are calculated because no workload or productive-hours denominator is supplied.</p></div></details>
    </section>
    <WorkforceCaseComparison/>
    <section aria-labelledby="case-reasoning" className="space-y-4 border-t pt-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">04 / Explain the decision</p>
      <h2 id="case-reasoning" className="text-2xl font-semibold tracking-tight">The constraint changes the recommendation.</h2>
      <ol className="grid gap-4 text-sm leading-relaxed md:grid-cols-3"><li><strong>1. Protect the deadline.</strong> At the initial three-month target, the development-heavy route is late even though its listed cash is lower. Redeployment plus hiring is the conditional shortlist.</li><li><strong>2. Test the premise.</strong> If the deadline moves to four months, development becomes a candidate. If internal release is unavailable, internal options are blocked rather than treated as free capacity.</li><li><strong>3. Validate before committing.</strong> Ask delivery leaders to verify work and timing, managers to confirm release and skills, and finance to review full costs. Then track observed readiness, spend and delivery against the plan.</li></ol>
      <p className="text-sm text-muted-foreground">The result demonstrates decision logic, not realized business impact. No staffing action has been executed and no ROI is claimed. Ed Om defined the product problem, requirements and acceptance criteria; AI assisted with implementation, design and testing.</p>
      <Link href="/" className={`${linkStyle} bg-primary text-primary-foreground`}>Explore the fictional workforce</Link>
      <p className="text-xs text-muted-foreground">In Overview, use Introduction → Start guided demo for the existing save-and-revisit workflow. That separate service-team example has its own assumptions; this case is not automatically imported or saved.</p>
    </section>
  </main>;
}
