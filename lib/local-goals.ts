// @ts-expect-error Native Node unit tests require the explicit TypeScript extension; Next resolves the same source.
import { normalizeGoalRequirements, type GoalRequirements } from "./goal-context.ts";
export const GOALS_STORAGE_KEY = "insights-to-action.goals.v1";
export const MAX_GOALS = 20;
export type LocalGoal = { id: string; statement: string; context?:GoalRequirements };
export type LocalGoals = { version: 1; activeId: string; goals: LocalGoal[] };
export const emptyLocalGoals = (): LocalGoals => ({version:1, activeId:"", goals:[]});
export function parseLocalGoals(raw: string | null): LocalGoals {
  if (raw === null) return emptyLocalGoals();
  if (raw.length > 524288) throw new Error("Saved goals exceed the supported size.");
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !Array.isArray(data.goals) || data.goals.length > MAX_GOALS || typeof data.activeId !== "string") throw new Error("Saved goals have an unsupported format.");
  const ids = new Set<string>();
  const goals: LocalGoal[] = data.goals.map((g: LocalGoal) => {
    if (!g || typeof g.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(g.id) || ids.has(g.id) || typeof g.statement !== "string" || !g.statement.trim() || g.statement.trim().length > 240) throw new Error("Saved goals are invalid.");
    ids.add(g.id); return {id:g.id, statement:g.statement.trim(), ...(g.context ? {context:normalizeGoalRequirements(g.context)} : {})};
  });
  if (data.activeId && !ids.has(data.activeId)) throw new Error("The selected saved goal is missing.");
  return {version:1, activeId:data.activeId, goals};
}
