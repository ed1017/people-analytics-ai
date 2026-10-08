import type { AppPage } from "./types";

// Navigation only: no routes, URLs, tool names, assumptions or handoff payloads.
export const chatNavigationTargets = {
  "occupational-references": "Occupational References",
  "labor-market": "Labor Market",
  "training-coaching": "Training & Coaching",
  workforce: "Workforce",
  attrition: "Attrition",
  "survey-sentiment": "Employee Listening",
  skills: "Skills Intelligence",
  "learning-development": "Learning & Development",
  "development-planning": "Development Planning",
  "career-growth-mobility": "Career Growth & Internal Mobility",
  "succession-planning": "Succession Planning",
  "talent-acquisition": "Talent Acquisition",
  "workload-capacity": "Workload & Capacity Planning",
  "planning-overview": "Planning Overview",
  "scenario-modeling": "Scenario Modeling",
  "position-workforce-design": "Position & Workforce Design",
  "workforce-response": "Workforce Response",
  "execution-feasibility": "Execution & Feasibility",
  finance: "Labor Cost Planning",
} as const satisfies Partial<Record<AppPage, string>>;

export function getChatNavigationAction(href: string) {
  if (href === "app:career-mobility") return {page:"workforce" as const,label:"Workforce"};
  if (!href.startsWith("app:")) return null;
  const page = href.slice(4);
  if (!Object.prototype.hasOwnProperty.call(chatNavigationTargets, page)) return null;
  const destination = page as keyof typeof chatNavigationTargets;
  return { page: destination, label: chatNavigationTargets[destination] };
}

export function chatNavigationInstructions() {
  return `For manual problem-solving and finding an issue, offer a few evidence-backed response options as hypotheses, state missing goals/assumptions and unsupported costs, then link only relevant existing destinations using these exact Markdown tokens:
${Object.entries(chatNavigationTargets).map(([page, label]) => `[${label}](app:${page})`).join("; ")}
These tokens render as navigation buttons only. Choose at most three relevant destinations per answer, not a tour of the app. Do not invent URLs, append parameters, wrap links in bold markup, or imply a link runs a calculation or carries evidence. Explain the next deliberate step on the destination. For Skills evidence, the user must choose an Observed skill gap, enter a Business goal and explicitly click Carry to Planning. For development quotes, the user selects a catalog quote and enters a Development goal before clicking Carry selected quote and goal to Development Planning; no automatic carry. For any other source, do not invent a handoff. Workforce Response currently compares Build, Move and Buy; do not claim it supports Borrow or Automate calculations. Learning & Development under Workforce shows internal recorded pathway coverage. Intelligence contains Occupational References, Labor Market and Training & Coaching; its provider catalogue has explicitly fictional simulated quotes and unverified user-provided custom quotes. Occupational References shows stored job mappings, role requirements and available occupation reference content with source status; it is not employee attainment or a verified live O*NET feed. Labor Market compares versioned BLS occupation wage/employment estimates within their selected geography and period, separate from national projections and national macro indicators. Development Planning compares user-entered attendance, fees and employee time deterministically; blank costs are unknown, with no ROI or training-outcome prediction. These quotes are not live vendor prices. Only Training & Coaching supplies catalogue quotes to AI; other pages must not infer quote details from navigation alone. Planning calculations require explicit supported assumptions and a user run. A possible response is not a proven solution or an approved recommendation.
For a normal options comparison, use at most 180 words: one line acknowledging the stated goal/horizon; two option bullets, each with a relevant cited fact, the main missing evidence/assumption, and a useful destination; then one next-step question. State unsupported costs once as unknown. Do not add a stored-baseline recap or unrelated evidence unless necessary to answer the question. Preserve critical scope distinctions. Use longer answers only when the user explicitly requests a detailed plan.`;
}

/** Link syntax only: brief openings must not inherit the full analytical format. */
export function chatOpeningNavigationInstructions() {
  return `If the next action benefits from navigation, use at most one exact Markdown token from this existing allowlist:
${Object.entries(chatNavigationTargets).map(([page,label])=>`[${label}](app:${page})`).join("; ")}
For Skills use [Skills Intelligence](app:skills), never /skills. Do not invent paths, URLs, parameters or new destinations. These links only open an existing page; they never carry evidence, change filters, run calculations or approve actions. If none applies, give the action in plain text.`;
}
