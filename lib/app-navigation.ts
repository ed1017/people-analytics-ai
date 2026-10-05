import type { AppPage } from "./types";

export type AppWorkspaceKey =
  | "analytics"
  | "talent"
  | "strategy"
  | "evaluate";

export type AppNavigationSection = {
  key: AppWorkspaceKey;
  title: string;
  pages: AppPage[];
};

export type AppPageMetadata = {
  label: string;
  section: string;
  description: string;
};

export const appWorkspaceJourneys: Array<{key: AppWorkspaceKey; journeyLabel: string; subtitle: string; defaultPage: AppPage}> = [
  {key:"analytics", journeyLabel:"Workforce", subtitle:"Understand Our Workforce", defaultPage:"workforce"},
  {key:"talent", journeyLabel:"Intelligence", subtitle:"Realize your potential", defaultPage:"occupational-references"},
  {key:"strategy", journeyLabel:"Planning", subtitle:"Plan Our Future", defaultPage:"planning-overview"},
  {key:"evaluate",journeyLabel:"Assess & Evaluate",subtitle:"Coming soon",defaultPage:"assess-evaluate"},
];
export const appNavigationSections: AppNavigationSection[] = [
  {key:"analytics", title:"Workforce", pages:["workforce","attrition","compensation","talent-acquisition","survey-sentiment","skills","learning-development","career-growth-mobility","succession-planning"]},
  {key:"talent", title:"Intelligence", pages:["occupational-references","labor-market","training-coaching"]},
  {key:"strategy", title:"Planning", pages:["planning-overview","scenario-modeling","position-workforce-design","workforce-response","execution-feasibility","finance","development-planning","decision-brief"]},
  {key:"evaluate",title:"Assess & Evaluate",pages:["assess-evaluate"]},
];

export const appPageMetadata: Record<
  AppPage,
  AppPageMetadata
> = {
  "decision-brief":{label:"Decision brief",section:"Planning",description:"Your browser-local evidence, assumptions, proposals and explicit approval notes."},
  "assess-evaluate":{label:"Coming soon",section:"Assess & Evaluate",description:"Placeholder only; no outcomes, scorecard or ROI calculation."},
  "occupational-references": {label:"Occupational References",section:"Intelligence",description:"O*NET reference and stored mapping provenance, not a live occupational feed."},
  "labor-market": {label:"Labor Market",section:"Intelligence",description:"Available US national BLS observations with dates and limitations."},
  "training-coaching": {label:"Training & Coaching",section:"Intelligence",description:"Fictional simulated provider examples and unverified user-provided quotes."},
  "development-planning": { label: "Development Planning", section: "Planning", description: "Compare explicitly selected development quotes and user-entered cost assumptions." },
  home: { label: "Home", section: "Insights to Action", description: "Explore key findings and ask questions across governed workforce evidence." },
  overview: {
    label: "Workforce",
    section: "Workforce",
    description:
      "Executive workforce health, trends, and business impact.",
  },
  workforce: {
    label: "Workforce",
    section: "Workforce",
    description:
      "Workforce size, structure, tenure, management layers, and mobility.",
  },
  compensation: { label: "Compensation", section: "Workforce", description: "Public US occupation wage references and synthetic workforce-cost context. Internal salary analysis is unavailable." },
  attrition: {
    label: "Attrition",
    section: "Workforce",
    description:
      "Turnover patterns, regrettable loss, and separation drivers.",
  },  "talent-acquisition": {
    label: "Talent Acquisition",
    section: "Workforce",
    description:
      "Recruiting demand, funnel performance, hiring outcomes, and speed.",
  },
  "survey-sentiment": {
    label: "Employee Listening",
    section: "Workforce",
    description:
      "Employee sentiment, participation, themes, and workforce signals.",
  },
  skills: {
    label: "Skills Intelligence",
    section: "Workforce",
    description:
      "Internal workforce skills, recorded proficiency gaps and role demand.",
  },
  "learning-development": {
    label: "Learning & Development",
    section: "Workforce",
    description:
      "Learning pathway coverage for current skill gaps and job-profile requirements.",
  },
  "career-mobility": {
    label: "Career Interests",
    section: "Workforce",
    description:
      "Recorded career interests, desired destinations, relocation willingness, and preference coverage.",
  },
  "career-growth-mobility": {
    label: "Career Growth & Internal Mobility",
    section: "Workforce",
    description:
      "Recorded promotions, lateral moves, transfers, monthly movement events, and supported job-level transitions.",
  },
  "succession-planning": {
    label: "Succession Planning",
    section: "Workforce",
    description:
      "Company-wide recorded succession-plan coverage and source-assessment readiness signals.",
  },
  "planning-overview": {
    label: "Planning Overview",
    section: "Planning",
    description:
      "Executive control room for the current workforce plan, response, risk, and feasibility.",
  },
  "scenario-modeling": {
    label: "Scenario Modeling",
    section: "Planning",
    description:
      "Model company and business-unit workforce demand and compare scenarios.",
  },
  "position-workforce-design": {
    label: "Position & Workforce Design",
    section: "Planning",
    description:
      "Translate scenarios into authorized-position, recruiting, and skill-demand changes.",
  },
  "workforce-response": {
    label: "Workforce Response",
    section: "Planning",
    description:
      "Plan Build, Move, and Buy responses against modeled role gaps.",
  },
  "execution-feasibility": {
    label: "Execution & Feasibility",
    section: "Planning",
    description:
      "Schedule workforce responses, test constraints, and identify execution blockers.",
  },
  "workforce-planning": {
    label: "Workforce Planning",
    section: "Planning",
    description:
      "Plan, design, respond, and execute against future workforce demand.",
  },  finance: {
    label: "Labor Cost Planning",
    section: "Planning",
    description:
      "Labor cost, workforce economics, vacancy exposure, and scenario impact.",
  },
};

export function getAppPageMetadata(
  page: AppPage
) {
  return appPageMetadata[page];
}

export function getWorkspaceForPage(
  page: AppPage
): AppWorkspaceKey {
  if (page === "workforce-planning") {
    return "strategy";
  }

  return (
    appNavigationSections.find((section) =>
      section.pages.includes(page)
    )?.key ?? "analytics"
  );
}

export function getDefaultPageForWorkspace(
  workspace: AppWorkspaceKey
): AppPage {
  return (
    appWorkspaceJourneys.find(
      (item) => item.key === workspace
    )?.defaultPage ?? "workforce"
  );
}
