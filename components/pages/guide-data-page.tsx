"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";

export function GuideDataPage({ onBack }: { onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const card = "rounded-2xl border bg-card p-5 sm:p-7";
  return <article className="mx-auto max-w-5xl space-y-6 px-5 py-8 text-base leading-relaxed sm:px-10 sm:py-10">
    <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-md font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft size={18} /> Back to Home</button>
    <header>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary"><BookOpen size={18} /> Using Workforce AI</p>
      <h2 ref={heading} tabIndex={-1} className="rounded-sm text-3xl font-semibold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-4xl">Guide &amp; Data</h2>
      <p className="mt-3 text-lg text-muted-foreground">How to explore the app, understand its evidence, and interpret its limits.</p>
    </header>

    <section className={card} aria-labelledby="guide-purpose">
      <h3 id="guide-purpose" className="text-xl font-semibold">What this app is for</h3>
      <p className="mt-3">Workforce AI brings together People Analytics, Talent evidence and deterministic workforce planning. Use it to understand recorded patterns, explore questions and compare explicitly modeled scenarios. The data is synthetic.</p>
      <p className="mt-3">The overall overview is a conversational starting point. Existing Workforce, Talent and Planning pages provide the detailed views. An AI interpretation is not a proven cause, an approved plan or an individual employment recommendation.</p>
    </section>

    <section className={card} aria-labelledby="guide-use">
      <h3 id="guide-use" className="text-xl font-semibold">Start with a question</h3>
      <ol className="mt-3 list-decimal space-y-3 pl-5">
        <li>Read the short briefing. Open <strong>Sources, populations and limitations</strong> to inspect its evidence.</li>
        <li>Choose a guided question or describe the problem you want to understand. Ask follow-ups about dates, scope or missing evidence.</li>
        <li>Use the navigation groups to explore the underlying views. Returning to the overview preserves your conversation and unfinished question.</li>
        <li>Drag the composer’s lower edge to resize it. Refresh the briefing when you want to retrieve the sources again.</li>
      </ol>
      <p className="mt-4 text-muted-foreground">Visible messages stay available. Model history is isolated when the active page or evidence context changes, so an older answer is not treated as current evidence.</p>
    </section>

    <section className={card} aria-labelledby="guide-sources">
      <h3 id="guide-sources" className="text-xl font-semibold">Data, coverage and source references</h3>
      <div className="mt-4 space-y-5">
        <div><h4 className="font-semibold">[W1] Workforce overview</h4><p>Unfiltered enterprise workforce. Headcount counts people, FTE measures capacity, and open positions count positions. The returned snapshot and trend dates define the observation period. Snapshot headcount is not the denominator for every rate.</p></div>
        <div><h4 className="font-semibold">[T1] Skills Intelligence</h4><p>Enterprise skill requirements. Counts below attainment thresholds refer to skills with recorded role demand, not employee counts. The source supplies its own date and workforce population. Missing proficiency evidence is not proof of inability.</p></div>
        <div><h4 className="font-semibold">[P1] Stored Planning Baseline</h4><p>An enterprise model under stored assumptions. Horizon dates are model periods, not source refresh dates. The current response does not supply a refresh date. A stored scenario is not a new model run, an observed outcome or an approved decision.</p></div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">At the October 1, 2026 review, Workforce and Skills snapshots reported September 30, 2026. The Baseline horizon ran from October 2026 through December 2027. Always use the dates returned by the app; these review dates are not a promise of continuous freshness.</p>
    </section>

    <section className={card} aria-labelledby="guide-limits">
      <h3 id="guide-limits" className="text-xl font-semibold">Read the scope before comparing</h3>
      <ul className="mt-3 list-disc space-y-3 pl-5">
        <li>Country, business-unit and level filters elsewhere do not narrow the overall overview or enterprise Talent sources.</li>
        <li>Keep each source’s population, denominator and date separate. Growth percentages over unequal historical and modeled periods do not establish a faster or slower growth rate.</li>
        <li>A missing or failed source is <strong>unavailable, not zero</strong>. Other independent sources can still be shown.</li>
        <li>AI answers should cite supplied evidence. Investigative questions are not causal findings or priority rankings.</li>
        <li>This overview does not create arbitrary custom charts or unsupported country-level forecasts, hiring costs or readiness timelines.</li>
      </ul>
    </section>

    <section className={card} aria-labelledby="guide-planning">
      <h3 id="guide-planning" className="text-xl font-semibold">From evidence to Planning</h3>
      <p className="mt-3">Use <strong>Carry to Planning</strong> explicitly with a business goal. Carried Skills evidence is context, not an allocation or a scenario run. Check its freshness status.</p>
      <p className="mt-3">In Workforce Response, select a role, enter a goal and choose <strong>Compare evidence for this role</strong>. This reads existing aggregate sources without changing allocations or running a scenario. Matching existing role-plan results can be reused.</p>
      <ul className="mt-3 list-disc space-y-3 pl-5">
        <li><strong>Build:</strong> course coverage and hours do not establish completion, proficiency improvement or time to readiness.</li>
        <li><strong>Move:</strong> preference and proficiency thresholds do not establish eligibility, willingness or availability. Historical movement events are enterprise context, not a role-specific pool of movers.</li>
        <li><strong>Buy:</strong> completed requisitions and median time to fill are historical. The median’s contributing sample count is not supplied; it is not a hiring forecast.</li>
      </ul>
      <p className="mt-3">After editing a goal, compare again. Changing roles clears the old comparison. Costs and future readiness, availability and hiring times remain unavailable without supporting evidence. Planning assumptions and effective dates must be supplied explicitly for the relevant model.</p>
      <p className="mt-3 text-muted-foreground">The overall overview is read-only: it retrieves aggregates and generates explanations. Its chat cannot invoke workforce tools or alter source records. Separate Planning controls require explicit interaction. Do not use aggregate evidence to identify, rank or recommend employment decisions about individual employees.</p>
    </section>

    <section className={card} aria-labelledby="guide-changes">
      <h3 id="guide-changes" className="text-xl font-semibold">Recent changes</h3>
      <ul className="mt-3 space-y-3">
        <li><strong>This version:</strong> chat-first Home, cited source briefing, guided questions, Guide &amp; Data, compact desktop navigation and square Planning shortcuts alongside the existing tabs.</li>
        <li><strong>October 1, 2026 — released:</strong> AI model-history isolation preserves visible conversation while excluding obsolete page, role and goal context. Verified in production with 25 checks and six real AI turns. <a className="text-primary underline" href="https://github.com/ed1017/people-analytics-ai/pull/71" target="_blank" rel="noreferrer">PR71</a></li>
        <li><strong>October 1, 2026 — released:</strong> explicit role-and-goal Talent evidence comparison beside Build, Move and Buy. <a className="text-primary underline" href="https://github.com/ed1017/people-analytics-ai/pull/68" target="_blank" rel="noreferrer">PR68</a></li>
      </ul>
    </section>

    <section className={card} aria-labelledby="guide-roadmap">
      <h3 id="guide-roadmap" className="text-xl font-semibold">What is proposed next</h3>
      <p className="mt-3"><strong>V2 — proposed:</strong> machine learning and predictive analytics. This is a direction to explore, not an implemented capability or a dated release commitment.</p>
      <p className="mt-3"><strong>V3 — undefined:</strong> no scope, features or release date have been agreed.</p>
    </section>
  </article>;
}
