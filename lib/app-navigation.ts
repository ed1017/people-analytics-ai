import type { AppPage } from "./types";

export type AppWorkspaceKey =
  | "analytics"
  | "talent"
  | "strategy";

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

export const appWorkspaceJourneys: Array<{
  key: AppWorkspaceKey;
  journeyLabel: string;
  subtitle: string;
  defaultPage: AppPage;
}> = [
  {
    key: "analytics",
    journeyLabel: "Workforce Analytics",
    subtitle: "“Understand Our Workforce”",
    defaultPage: "workforce",
  },
  {
    key: "talent",
    journeyLabel: "Talent Management",
    subtitle: "“Realize Our Potential”",
    defaultPage: "skills",
  },
  {
    key: "strategy",
    journeyLabel: "Workforce Planning",
    subtitle: "“Plan Our Future”",
    defaultPage: "planning-overview",
  },
];

export const appNavigationSections: AppNavigationSection[] = [
  {
    key: "analytics",
    title: "Workforce Analytics",
    pages: [
      "workforce",
      "attrition",
      "talent-acquisition",
      "survey-sentiment",
    ],
  },
  {
    key: "talent",
    title: "Talent Management",
    pages: [
      "skills",
      "learning-development",
      "career-mobility",
      "career-growth-mobility",
      "succession-planning",
    ],
  },  {
    key: "strategy",
    title: "Workforce Planning",
    pages: [
      "planning-overview",
      "scenario-modeling",
      "position-workforce-design",
      "workforce-response",
      "execution-feasibility",
      "finance",
    ],
  },
];

export const appPageMetadata: Record<
  AppPage,
  AppPageMetadata
> = {
  home: { label: "Home", section: "Workforce AI", description: "Explore key findings and ask questions across governed workforce evidence." },
  "guide-data": { label: "Guide & Data", section: "Workforce AI", description: "How to use the app, understand its data, and interpret its limits." },
  overview: {
    label: "Workforce",
    section: "Workforce Analytics",
    description:
      "Executive workforce health, trends, and business impact.",
  },
  workforce: {
    label: "Workforce",
    section: "Workforce Analytics",
    description:
      "Workforce size, structure, tenure, management layers, and mobility.",
  },
  attrition: {
    label: "Attrition",
    section: "Workforce Analytics",
    description:
      "Turnover patterns, regrettable loss, and separation drivers.",
  },  "talent-acquisition": {
    label: "Talent Acquisition",
    section: "Workforce Analytics",
    description:
      "Recruiting demand, funnel performance, hiring outcomes, and speed.",
  },
  "survey-sentiment": {
    label: "Survey & Sentiment",
    section: "Workforce Analytics",
    description:
      "Employee sentiment, participation, themes, and workforce signals.",
  },
  skills: {
    label: "Skills Intelligence",
    section: "Talent Management",
    description:
      "Workforce skills, proficiency gaps, demand, and external context.",
  },
  "learning-development": {
    label: "Learning & Development",
    section: "Talent Management",
    description:
      "Learning pathway coverage for current skill gaps and job-profile requirements.",
  },
  "career-mobility": {
    label: "Career Interests",
    section: "Talent Management",
    description:
      "Recorded career interests, desired destinations, relocation willingness, and preference coverage.",
  },
  "career-growth-mobility": {
    label: "Career Growth & Internal Mobility",
    section: "Talent Management",
    description:
      "Recorded promotions, lateral moves, transfers, monthly movement events, and supported job-level transitions.",
  },
  "succession-planning": {
    label: "Succession Planning",
    section: "Talent Management",
    description:
      "Company-wide recorded succession-plan coverage and source-assessment readiness signals.",
  },
  "planning-overview": {
    label: "Planning Overview",
    section: "Workforce Strategy & Planning",
    description:
      "Executive control room for the current workforce plan, response, risk, and feasibility.",
  },
  "scenario-modeling": {
    label: "Scenario Modeling",
    section: "Workforce Strategy & Planning",
    description:
      "Model enterprise and business-unit workforce demand and compare scenarios.",
  },
  "position-workforce-design": {
    label: "Position & Workforce Design",
    section: "Workforce Strategy & Planning",
    description:
      "Translate scenarios into authorized-position, recruiting, and skill-demand changes.",
  },
  "workforce-response": {
    label: "Workforce Response",
    section: "Workforce Strategy & Planning",
    description:
      "Plan Build, Move, and Buy responses against modeled role gaps.",
  },
  "execution-feasibility": {
    label: "Execution & Feasibility",
    section: "Workforce Strategy & Planning",
    description:
      "Schedule workforce responses, test constraints, and identify execution blockers.",
  },
  "workforce-planning": {
    label: "Workforce Planning",
    section: "Workforce Strategy & Planning",
    description:
      "Plan, design, respond, and execute against future workforce demand.",
  },  finance: {
    label: "Labor Cost Planning",
    section: "Workforce Strategy & Planning",
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
