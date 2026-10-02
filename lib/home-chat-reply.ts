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
