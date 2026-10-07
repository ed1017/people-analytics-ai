import type { AppPage } from "./types";

const workforce = "I brought the workforce snapshot and company trends together so you can see where to look next. Use the filters for the selected snapshot, and check the scope labels before comparing it with company-wide figures.";
const planning = "I built this as a starting point for turning a question into a modeled plan. Follow the five Planning steps to compare demand, positions, responses and feasibility; you choose when to run each model.";

export const pageHelp: Record<AppPage, string> = {
  "decision-brief":"Keep observed evidence, calculations, assumptions, unknowns, proposals and explicitly recorded approvals separate. This brief is saved only in this browser and is not sent to AI automatically.",
  "assess-evaluate":"Coming soon. This placeholder does not track outcomes, estimate ROI or run a scorecard.",
  "occupational-references": "Search internal job profiles and inspect their stored occupation mappings and role requirements. O*NET tasks, skills and preparation describe occupations; they do not measure employee attainment. Public starter references remain available when a stored source cannot load.",
  "labor-market": "Compare published occupation employment and annual wages within the same May 2025 period. Read the separate U.S. 2025–2035 outlook as a national projection. Available coverage is three occupations and three geographies; neither employment nor projected openings measures available candidates.",
  "training-coaching": "Compare fictional simulated training/coaching examples or enter your own unverified quote. Select a quote and enter your goal before explicitly carrying it to Development Planning. Nothing enrolls employees or changes assumptions automatically.",
  "development-planning": "I kept this comparison separate from workforce modeling. Carry a selected development quote and your goal, then enter attendance and cost assumptions. Fictional quotes are simulated; blank costs remain unknown and nothing enrolls employees or changes staffing.",
  home: "A workforce decision-making tool that turns dashboard insights into practical Action Plans, helping you connect workforce decisions to business outcomes.",
  overview: workforce,
  workforce,
  attrition: "I brought the recorded separation measures together to help you explore turnover patterns. These are descriptive aggregates, so a difference between groups doesn't tell us why someone left or predict who will leave next.",
  compensation: "Explore assumed demo salary ranges for existing jobs. When available, job-average compa-ratios cover only USD pay with partial coverage; filtered pay breakdowns are not released. Read public US wage references and workforce-cost context within their separate scopes. An AI briefing is unavailable.",
  "talent-acquisition": "I organized the recruiting measures so you can explore demand, the hiring funnel and recorded outcomes. Read the dates and populations alongside each measure before comparing hiring speed or conversion.",
  "survey-sentiment": "I used synthetic structured survey responses to show participation and recorded scores. The original questionnaire framework and favorability threshold aren't verified, and comment counts don't represent an analysis of what people wrote.",
  skills: "I connected recorded skill requirements, job profiles and learning coverage to help you explore capability gaps. Stored O*NET mappings add context, not a verified live O*NET feed; choose an observation and add your goal if you want to carry evidence into Planning.",
  "learning-development": "I connected learning pathways with recorded skill gaps and job-profile requirements. Coverage shows where learning is mapped, not proof that someone completed training or gained proficiency.",
  "career-mobility": "I brought recorded career interests and destination preferences together to show what people have expressed. These aggregates describe preferences, not readiness assessments or recommendations about individual employees.",
  "career-growth-mobility": "Review demo data for the original workforce with the existing top filters. Ratings support company and business-unit selections only; country or level selections are unavailable. Promotion rate and median prior-level time remain unavailable until verified eligibility and dates exist. Recorded movement history is company-wide context, not a rate denominator.",
  "succession-planning": "I brought recorded succession coverage and source-assessment readiness signals into one view. These company-wide aggregates reflect the source records, not my assessment of individual employees or a decision about who should succeed someone.",
  "planning-overview": planning,
  "workforce-planning": planning,
  "scenario-modeling": "I built this step to compare workforce demand under the assumptions you enter. Run a supported scenario to see modeled differences, then check the assumptions and your goal before using the result in the next step.",
  "position-workforce-design": "I built this view to connect a modeled scenario with position and skill-demand implications. Explore the proposed design here; it doesn't authorize positions or change recruiting records.",
  "workforce-response": "I organized Build, Move and Buy options around modeled role gaps. Compare their assumptions and tradeoffs as planning options, not employee-level employment recommendations or actions already taken.",
  "execution-feasibility": "I built this step to explore timing, constraints and blockers in a proposed response. The result is a modeled feasibility check; it doesn't schedule or execute real workforce changes.",
  finance: "I brought labor-cost measures and scenario economics together to help you compare financial tradeoffs. Check the scope and assumptions: modeled costs are estimates, not actual spending or an approved budget.",
};
