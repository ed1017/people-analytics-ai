export function ProjectCaseStudy({expanded=false}:{expanded?:boolean}={}){
 const content=<div className="space-y-4 text-sm leading-relaxed">
  <section className="space-y-1">
   <h3 className="text-base font-semibold">The planning problem</h3>
   <p>A workforce dashboard can show where people are today. A planning decision also needs the work to be done, the time available and the cost of different responses. This project brings those questions into one workflow.</p>
  </section>
  <section className="space-y-1">
   <h3 className="text-base font-semibold">Product and domain decisions</h3>
   <ul className="list-disc space-y-2 pl-5">
    <li><strong>Start with evidence.</strong> Keep the selected group, time period and source available alongside workforce findings.</li>
    <li><strong>Make the recommendation adjustable.</strong> Connect staffing inputs, calculated results and charts so a visitor can test a different approach.</li>
    <li><strong>Compare practical tradeoffs.</strong> Show developing people, moving people internally and hiring together with cost, readiness and uncovered work.</li>
    <li><strong>Keep the original plan.</strong> Save a proposal in the browser, reopen it and review revisions against its original assumptions.</li>
   </ul>
  </section>
  <section className="space-y-1">
   <h3 className="text-base font-semibold">Try the workflow</h3>
   <p>In Overview, choose Introduction, then Start guided demo. Use the 5-FTE service-team example, adjust the inputs, compare the options and save a proposal to revisit.</p>
  </section>
  <section className="space-y-1">
   <h3 className="text-base font-semibold">Ed&apos;s role</h3>
   <p>Ed Om defined the workforce-planning problem, product requirements and acceptance criteria. AI assisted with implementation, design and testing.</p>
  </section>
  <details className="border-t pt-2">
   <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Details</summary>
   <div className="space-y-2">
    <p>The workforce snapshot is dated September 30, 2026. Scenarios use explicit inputs; public references retain their own sources and dates.</p>
    <p>Workload and productive hours determine required effort and available capacity. Staffing comparisons use action, timing and cost assumptions. Headcount projections use opening people + external hires - exits.</p>
    <p>The app uses Next.js, React, TypeScript, Tailwind CSS and Recharts, hosted on Vercel. Workforce AI uses the OpenAI integration when available. Scenario controls recalculate through shared calculation code; saved proposals are stored in the visitor&apos;s browser.</p>
   </div>
  </details>
 </div>;
 return expanded?<section aria-labelledby="about-case-study" className="space-y-4"><h2 id="about-case-study" className="text-xl font-semibold">Case study: from evidence to a staffing decision</h2>{content}</section>:<details className="my-3 border-t pt-2"><summary className="min-h-11 cursor-pointer py-2 font-medium">Case study: from evidence to a staffing decision</summary>{content}</details>;
}
