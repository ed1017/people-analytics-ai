import type { AppPage } from "./types";
export const planningGuideSteps = [
  { page: "planning-overview", title: "Planning Overview", first: "Review the current plan and the evidence you have explicitly carried. Choose the next question to investigate; nothing runs when you open a page." },
  { page: "scenario-modeling", title: "Scenario Modeling", first: "Choose a stored scenario or enter supported assumptions, then explicitly run a comparison. Start with one change and inspect the result before adding another." },
  { page: "position-workforce-design", title: "Position & Workforce Design", first: "Choose the position change you want to model, review its assumptions, then explicitly run the structural scenario." },
  { page: "workforce-response", title: "Workforce Response", first: "Select a role and goal, compare its evidence, then enter any Build, Move and Buy assumptions. Check unknowns before choosing a response." },
  { page: "execution-feasibility", title: "Execution & Feasibility", first: "Supply the relevant timing and constraints, then explicitly run the supported checks. A feasible model is not an approved workforce decision." },
] as const;
const additional = [
  { page: "finance", title: "Labor Cost Planning", first: "Review the available aggregate labor-cost context and stored scenarios. Confirm the period, population and assumptions with Finance before using costs in a plan." },
  { page: "development-planning", title: "Development Planning", first: "Explicitly carry a quote and goal from Learning & Development. Enter participants, sessions, fees and hours; add a loaded hourly cost only if known. Compare like currencies and goals; unknown costs stay unknown." },
] as const;

export function getPlanningGuide(page: AppPage) { return [...planningGuideSteps, ...additional].find(step => step.page === (page === "workforce-planning" ? "planning-overview" : page)); }
