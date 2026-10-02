import type { AppPage } from "./types";

const workforce = "I brought the workforce snapshot and company trends together so you can see where to look next. Use the filters for the selected snapshot, and check the scope labels before comparing it with company-wide figures.";
const planning = "I built this as a starting point for turning a question into a modeled plan. Follow the five Planning steps to compare demand, positions, responses and feasibility; you choose when to run each model.";

export const pageHelp: Record<AppPage, string> = {
  "decision-brief":"Keep observed evidence, calculations, assumptions, unknowns, proposals and explicitly recorded approvals separate. This brief is saved only in this browser and is not sent to AI automatically.",
  "assess-evaluate":"Coming soon. This placeholder does not track outcomes, estimate ROI or run a scorecard.",
  "occupational-references": "O*NET is an external occupational reference. Stored company mapping counts are provenance, not a verified live feed, benchmark or capability assessment.",
  "labor-market": "Read the available US national BLS observations with their dates. Unavailable observations stay unknown; these are not company measures or local hiring forecasts.",
  "training-coaching": "Compare fictional simulated training/coaching examples or enter your own unverified quote. Select a quote and enter your goal before explicitly carrying it to Development Planning. Nothing enrolls employees or changes assumptions automatically.",
  "development-planning": "I kept this comparison separate from workforce modeling. Carry a selected development quote and your goal, then enter attendance and cost assumptions. Fictional quotes are simulated; blank costs remain unknown and nothing enrolls employees or changes staffing.",
  home: "I built this decision-making tool to connect workforce evidence with goals, modeled costs and tradeoffs. Start with a question, explore the supporting pages, then compare possible plans without changing the real workforce.",
  "guide-data": "I put the app's workflow, sources and limits here so you can see what sits behind the numbers. You'll also find the tools I used and ideas for later versions, clearly separated from what's available today.",
  overview: workforce,
  workforce,
  attrition: "I brought the recorded separation measures together to help you explore turnover patterns. These are descriptive aggregates, so a difference between groups doesn't tell us why someone left or predict who will leave next.",
  compensation: "I've reserved this page for a future compensation view. It's still TBD, so there isn't compensation analysis or an AI briefing here yet.",
  "talent-acquisition": "I organized the recruiting measures so you can explore demand, the hiring funnel and recorded outcomes. Read the dates and populations alongside each measure before comparing hiring speed or conversion.",
  "survey-sentiment": "I used synthetic structured survey responses to show participation and recorded scores. The original questionnaire framework and favorability threshold aren't verified, and comment counts don't represent an analysis of what people wrote.",
  skills: "I connected recorded skill requirements, job profiles and learning coverage to help you explore capability gaps. Stored O*NET mappings add context, not a verified live O*NET feed; choose an observation and add your goal if you want to carry evidence into Planning.",
  "learning-development": "I connected learning pathways with recorded skill gaps and job-profile requirements. Coverage shows where learning is mapped, not proof that someone completed training or gained proficiency.",
  "career-mobility": "I brought recorded career interests and destination preferences together to show what people have expressed. These aggregates describe preferences, not readiness assessments or recommendations about individual employees.",
  "career-growth-mobility": "I grouped recorded promotions, lateral moves and transfers so you can explore internal movement over time. Some origin-position details are missing, so I keep the view to supported aggregate counts and transitions.",
  "succession-planning": "I brought recorded succession coverage and source-assessment readiness signals into one view. These company-wide aggregates reflect the source records, not my assessment of individual employees or a decision about who should succeed someone.",
  "planning-overview": planning,
  "workforce-planning": planning,
  "scenario-modeling": "I built this step to compare workforce demand under the assumptions you enter. Run a supported scenario to see modeled differences, then check the assumptions and your goal before using the result in the next step.",
  "position-workforce-design": "I built this view to connect a modeled scenario with position and skill-demand implications. Explore the proposed design here; it doesn't authorize positions or change recruiting records.",
  "workforce-response": "I organized Build, Move and Buy options around modeled role gaps. Compare their assumptions and tradeoffs as planning options, not employee-level employment recommendations or actions already taken.",
  "execution-feasibility": "I built this step to explore timing, constraints and blockers in a proposed response. The result is a modeled feasibility check; it doesn't schedule or execute real workforce changes.",
  finance: "I brought labor-cost measures and scenario economics together to help you compare financial tradeoffs. Check the scope and assumptions: modeled costs are estimates, not actual spending or an approved budget.",
};
