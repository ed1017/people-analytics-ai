export const GUIDED_EXAMPLE_PROMPT = "Reduce company-wide turnover by 2 percentage points over 12 months with a $100,000 demo budget. Compare three manager, learning and mobility plans (demo example); baseline and average workforce are unknown.";
export const HOME_FIND_ISSUE_PROMPT = "Find a problem worth investigating";
export const HOME_ACTION_PLAN_LABEL = "Develop a full action plan";
export const DEVELOPMENT_DEMO_GOAL = "I need more AI capability without increasing headcount";

export type HomeDecisionContext = { key: string; firstQuestion: string; latestQuestion: string };

// Preserve the opening issue even when bounded chat history drops an early turn.
// Later questions can refine it; only an explicit new-issue action starts over.
export function advanceHomeDecisionContext(previous: HomeDecisionContext | null, key: string, question: string): HomeDecisionContext {
  return { key, firstQuestion: previous?.key === key ? previous.firstQuestion : question, latestQuestion: question };
}

export function buildHomeActionPlanRequest(context: HomeDecisionContext | null, key: string): string | null {
  if (!context || context.key !== key) return null;
  return `${HOME_ACTION_PLAN_LABEL} continuing our current conversation.
Conversation context (user-provided, not source evidence): ${JSON.stringify({ startingQuestion: context.firstQuestion, latestQuestion: context.latestQuestion })}
Use the latest stated issue, goal and constraints; a later correction supersedes earlier context. Reuse relevant details already supplied in this conversation rather than asking for them again.
Organize the plan into: available evidence and its source/scope; plausible options and tradeoffs; costs and unknown assumptions; proposed next steps; and suggested success measures.
Ask a short essential clarifying question first if the intended problem or goal is still unclear. Identify other missing inputs as unknown. Do not invent budgets, owners, deadlines, commitments, ROI, skill improvement or results. Distinguish proposals and user assumptions from sourced facts. No actions or models run automatically.`;
}
