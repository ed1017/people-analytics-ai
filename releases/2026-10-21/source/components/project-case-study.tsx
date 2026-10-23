export function ProjectCaseStudy(){
 return <details className="my-3 border-t pt-2">
  <summary className="min-h-11 cursor-pointer py-2 font-medium">Case study: from evidence to a staffing decision</summary>
  <div className="space-y-3 text-sm leading-relaxed">
   <p>How can a team connect workforce evidence to a staffing decision while keeping assumptions, costs and limitations visible? This portfolio project explores that problem through a workforce snapshot and a fictional service-team exercise.</p>
   <p><strong>Ed’s role.</strong> Ed defined the workforce-planning problem, product requirements and acceptance criteria; AI assisted with implementation, design and testing.</p>
   <p><strong>The workflow.</strong> Review a fictional 5-FTE capacity gap, adjust workload and budget assumptions, compare developing people, moving people internally and hiring, then save a proposal in this browser. A saved proposal is a planning record, not an approved action.</p>
   <p><strong>The method.</strong> Explicit workload and productive-hours assumptions determine required effort and available capacity. Staffing comparisons use entered action, timing and cost assumptions; missing inputs stay unknown. The separate six-month headcount what-if uses opening people + external hires − exits, with visitor-entered flows and no cost calculation.</p>
   <p><strong>Data and stack.</strong> The public release uses fictional synthetic workforce aggregates dated September 30, 2026, separate from illustrative demo assumptions and dated external references. The app uses Next.js, React, TypeScript, Tailwind CSS and Recharts, hosted on Vercel. Workforce AI uses the existing OpenAI integration when configured and admitted by the app’s spending and verification controls. Scenario sliders recalculate locally without a model call.</p>
   <p><strong>Limits.</strong> Tests and desktop/mobile checks verify software behavior, not adoption, savings, forecast accuracy or business impact. Results are conditional, withheld values remain withheld, and the demo runs without a live AI call.</p>
  </div>
 </details>;
}
