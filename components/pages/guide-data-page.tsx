"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";

const sections = [
  { title: "Why I built this", text: "I built this app to explore what we can learn about a workforce and how that can help us think through a plan. Start on Home with a workforce question, then explore Workforce, Talent or Planning. The company records are synthetic demonstration data, not records from a real employer." },
  { title: "Start with a question", text: "On Home, choose Find a problem worth investigating or Bring your own issue. Discuss the question and your goal, then choose Develop a full action plan to continue that conversation. The plan organizes available evidence, options, costs and unknown assumptions, next steps and suggested success measures. Essential missing context should be clarified; proposed actions are not approvals or promised outcomes. Explore the answer and check the source details. Keep each source’s date and population in mind. A recorded fact, a modeled result and your own assumption are different things. The AI can be wrong, so I’d check the underlying figures before using an answer. Dataset creation and import history, questionnaire provenance and favorable-response thresholds are not fully verified; survey comment counts are not a theme or sentiment analysis. Career movement records have missing origin details, and source assessments are not AI predictions about individuals." },
  { title: "Tools I used", text: "I work on the app in VS Code. GitHub keeps the code and its version history, and Vercel hosts the public website. Supabase stores and serves the demonstration data. Next.js is the framework behind the website, and OpenAI powers the chat explanations. These are the tools behind the app, separate from the data sources below." },
  { title: "Skills Intelligence and O*NET", text: "Skills Intelligence compares recorded proficiency with job-profile requirements. Missing evidence does not mean someone lacks a skill. Some summaries count skills rather than people. The app stores job-profile mappings to O*NET, an occupational reference that includes skills and work information. I’ve verified that the app counts those stored mappings. The imported release, import date and a live O*NET connection are not verified, so I’m not presenting it as a live feed. The Skills and Learning date of September 30, 2026 is set in the app, not a verified refresh timestamp. The origin of every skill scale is not verified; course coverage does not establish completion or proficiency improvement.", link: "https://www.onetcenter.org/database.html", linkLabel: "O*NET database reference" },
  { title: "External labor market context", text: "The app requests unemployment, labor-force participation and nonfarm employment observations from the U.S. Bureau of Labor Statistics. Current availability is shown in Skills Intelligence; an unavailable indicator is not a current observation. These are US-wide measures, not company figures or local hiring forecasts. On October 1, 2026, the app returned August 2026 observations. That historical retrieval does not establish current availability. Each measure keeps its observation date. Nonfarm employment is converted from thousands to millions for display.", link: "https://www.bls.gov/developers/", linkLabel: "BLS public data source" },
];

export function GuideDataPage({ onBack }: { onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const card = "rounded-xl border bg-card p-5 sm:p-6";
  return <article className="mx-auto max-w-6xl space-y-6 px-5 py-8 text-base leading-relaxed sm:px-8">
    <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-md font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft size={18} /> Back to Home</button>
    <header><p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary"><BookOpen size={18} /> Using Insights to Action</p>
      <h2 ref={heading} tabIndex={-1} className="rounded-sm text-3xl font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">Guide &amp; Data</h2>
      <p className="mt-3 text-lg text-muted-foreground">How I use the app, where the information comes from, and what it can and cannot tell us.</p>
    </header>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className={card}><h3 className="text-xl font-semibold">What this app is for</h3><p className="mt-2 text-sm text-muted-foreground">A project by Ed Om</p><p className="mt-3">{sections[0].text}</p></section>
      <section className={card}><h3 className="text-xl font-semibold">What&apos;s coming next</h3><p className="mt-3"><strong>V2:</strong> Compensation, location-based scenario modeling, and employee NPS (eNPS).</p><p className="mt-3"><strong>V3:</strong> Role-based user access and security, with chat agents tailored to each user or role. Authenticated, authorized HR users would have approved person-level detail; other roles would use aggregates. The current public demo remains aggregate-only.</p><p className="mt-3"><strong>V4:</strong> Machine learning and predictive analytics.</p><p className="mt-3 text-muted-foreground">These are planned future capabilities, not features available today. No release dates have been agreed.</p></section>
      {[sections[2], sections[4], sections[3]].map(section => <section key={section.title} className={card}><h3 className="text-xl font-semibold">{section.title}</h3><p className="mt-3">{section.text}</p>{section.link && <a className="mt-3 inline-block text-primary underline" href={section.link} target="_blank" rel="noreferrer">{section.linkLabel}</a>}</section>)}

    </div>

  </article>;
}
