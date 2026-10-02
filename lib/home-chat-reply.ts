export const homeReplyFormat = {
  type: "json_schema" as const,
  name: "home_reply",
  strict: true,
  schema: {
    type: "object",
    properties: {
      answer: { type: "string" },
      next_step: { type: "string", enum: ["none", "choose_goal"] },
    },
    required: ["answer", "next_step"],
    additionalProperties: false,
  },
};
export const homeGoalChoiceInstructions = `Return the Home answer and a structured next_step. Use choose_goal only when the current business goal is missing and your answer explicitly asks the user which goal should guide the investigation or action plan, with Retention, Capability building, or Another goal as appropriate broad choices. These are questions, not findings or recommended priorities. Use none for summaries, answers with an already stated goal, pinned goals, specific clarification about an existing goal, and completed plans. Never force these choices when they do not fit the user's question. Do not invent a chosen goal or claim it was pinned.`;
export function decodeHomeModelReply(text: string, hasFocusedIssue: boolean) {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || !("answer" in value) || typeof value.answer !== "string" || !value.answer.trim() || !("next_step" in value) || !["none", "choose_goal"].includes(String(value.next_step))) throw new Error("Home answer was incomplete. Please try again.");
  return { answer: value.answer, nextStep: !hasFocusedIssue && value.next_step === "choose_goal" ? "choose_goal" : "none" };
}
export const homeGoalReplies = {
  Retention: "My goal is retention. Continue our current investigation with that goal; identify missing scope and assumptions without inventing them.",
  "Capability building": "My goal is capability building. Continue our current investigation with that goal; identify missing scope and assumptions without inventing them.",
} as const;

export function homeResponseStyle(message:string) {
  const current=message.split(/\n\n(?:Focused issue|Session problem context)/)[0];
  const expanded=/\b(full action plan|full plan|detailed|in detail|step.by.step|comprehensive)\b/i.test(current);
  return {expanded,maxOutputTokens:expanded?2400:1400,instructions:expanded
    ? "The user explicitly requested detail or a full plan. Finish the requested plan in concise sections/bullets. Target250-300words and stay below350words including headings and link labels. Keep each of the five required sections to1-3short bullets; combine repeated constraints/caveats and omit closing recaps. Preserve essential evidence, uncertainty and all required sections; never cut off an unfinished answer. For a full action plan retain Evidence and scope; Options and tradeoffs; Costs and unknown assumptions; Proposed next steps; Suggested success measures. Reuse known goal, scope and constraints. State missing inputs as unknown, not a questionnaire; ask at most one essential question. Keep citations accurate, costs unverified when absent, and proposals distinct from approved actions."
    : "DEFAULT HOME ANSWER FORMAT: one short takeaway sentence, then3-4brief Markdown bullets, then one next step OR one essential question. Target80-120words; do not exceed140unless the user explicitly asks for detail. Each bullet makes one point; use only relevant supplied evidence, not extra metrics to fill space. No long preamble, repeated known goal/scope, multiple-question questionnaire or repeated boilerplate caveats. Keep material source scope/date/uncertainty beside the affected claim and accurate source-ID citations. A missing business goal needs only one short question; do not re-ask an already supplied goal. Do not call this model fine-tuning."};
}
