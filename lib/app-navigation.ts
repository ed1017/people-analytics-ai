import type { AppPage } from "./types";

export type AppNavigationSection = {
  key:
    | "analytics"
    | "talent"
    | "strategy";
  title: string;
  pages: AppPage[];
};

export type AppPageMetadata = {
  label: string;
  section: string;
  description: string;
};

export const appNavigationSections: AppNavigationSection[] = [
  {
    key: "analytics",
    title: "Workforce Analytics",
    pages: [
      "overview",
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
    ],
  },  {
    key: "strategy",
    title: "Workforce Strategy & Planning",
    pages: [
      "workforce-planning",
      "finance",
    ],
  },
];

export const appPageMetadata: Record<
  AppPage,
  AppPageMetadata
> = {
  overview: {
    label: "Overview",
    section: "Workforce Analytics",
    description:
      "Executive workforce health, trends, and business impact.",
  },
  workforce: {
    label: "Workforce Composition",
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
    label: "Career & Mobility",
    section: "Talent Management",
    description:
      "Aggregate recorded career interests, desired destinations, and preference coverage.",
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
