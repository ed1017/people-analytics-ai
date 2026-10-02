import type { ScopedChatHistory } from "./chat-context-history";
import type { ChatMessage } from "./types";
import type { HomeDecisionContext } from "./home-decision-journey";

const historical = "Earlier-page assistant response (conversation context only; not verified current-page evidence):\n";
export function getProblemChatHistory(previous: ScopedChatHistory, key: string): ChatMessage[] {
  if (previous.key === key) return previous.messages.slice(-8);
  return previous.messages.slice(-8).map(message => message.role === "assistant" && !message.content.startsWith(historical)
    ? { ...message, content: historical + message.content } : { ...message });
}
export function rememberProblemQuestion(previous: HomeDecisionContext | null, key: string, question: string): HomeDecisionContext {
  return { key, firstQuestion: previous?.firstQuestion ?? question, latestQuestion: question };
}
export function withProblemContext(message: string, problem: HomeDecisionContext | null, focusedIssue = ""): string {
  if (focusedIssue) return `${message}\n\nFocused issue (explicit user-selected AI goal, not evidence or a data filter): ${JSON.stringify(focusedIssue)}\nInterpret this request alongside that goal using only the current page evidence and scope. Ask essential questions when context is missing. Do not alter filters, assumptions, scenarios or execute actions because an issue is pinned.`;
  if (!problem) return message;
  return `${message}\n\nSession problem context (user statements, not source evidence): ${JSON.stringify({ openingQuestion: problem.firstQuestion, previousQuestion: problem.latestQuestion })}\nThe question above is current; newer corrections supersede earlier goals. Use only this page's supplied evidence for factual claims. Earlier conversation does not change filters, carry evidence, approve assumptions or run scenarios.`;
}
export function boundSessionTranscript(messages: ChatMessage[]): ChatMessage[] { return messages.slice(-40); }

export class ProblemRequestGate {
  private revision = 0;
  private controller: AbortController | null = null;
  invalidate() { this.revision += 1; this.controller?.abort(); this.controller = null; }
  begin() { this.invalidate(); const revision = this.revision; const controller = new AbortController(); this.controller = controller; return { signal: controller.signal, current: () => this.revision === revision && !controller.signal.aborted }; }
}
export function validateFocusedIssue(value: string): string | null {
  const clean = value.trim();
  return !clean ? "Enter a concise problem statement." : clean.length > 240 ? "Use 240 characters or fewer." : null;
}
