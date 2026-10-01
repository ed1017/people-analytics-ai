import type { ChatMessage } from "./types";

export type ScopedChatHistory = { key: string; messages: ChatMessage[] };

// The visible transcript is separate. Only turns from the current evidence state
// may become model history; an old answer must not compete with new evidence.
export function getScopedChatHistory(previous: ScopedChatHistory, key: string): ChatMessage[] {
  return previous.key === key ? previous.messages.slice(-8) : [];
}

export function completeScopedChatTurn(
  key: string, history: ChatMessage[], question: string, answer: string,
): ScopedChatHistory {
  return { key, messages: [...history, { role: "user", content: question }, { role: "assistant", content: answer }].slice(-8) as ChatMessage[] };
}
