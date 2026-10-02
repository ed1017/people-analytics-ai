"use client";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ChatContent } from "@/components/chat-content";
import { boundSessionTranscript, rememberProblemQuestion, ProblemRequestGate } from "@/lib/problem-session";
import type { HomeDecisionContext } from "@/lib/home-decision-journey";
import type { ScopedChatHistory } from "@/lib/chat-context-history";
import type { AppPage, ChatMessage } from "@/lib/types";

export function useProblemConversation() {
  const [focusedIssue, setFocusedIssue] = useState("");
  const [issueEditor, setIssueEditor] = useState<{draft:string} | null>(null);
  const requestGate = useRef(new ProblemRequestGate());
  const [messages, setStoredMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<HomeDecisionContext | null>(null);
  const [questionUnanswered, setQuestionUnanswered] = useState(false);
  const history = useRef<ScopedChatHistory>({ key: "", messages: [] });
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = update => setStoredMessages(current => boundSessionTranscript(typeof update === "function" ? update(current) : update));
  const rememberQuestion = (key: string, question: string) => setProblem(current => rememberProblemQuestion(current, key, question));
  const startNewProblem = (draft = "") => {
    requestGate.current.invalidate(); setLoading(false); setFocusedIssue("");
    history.current = { key: "", messages: [] };
    setProblem(null); setQuestionUnanswered(false); setInput(draft); setError(null);
    setMessages(current => current.length ? [...current, { role: "assistant", content: "Starting a new problem. Earlier messages remain for reference; they will not be used for this new conversation. Existing Planning inputs and carried evidence are unchanged." }] : current);
  };
  const cancelPending = () => { requestGate.current.invalidate(); setLoading(false); };
  const updateFocusedIssue = (value: string) => {
    const clean = value.trim();
    if (clean !== focusedIssue) {
      cancelPending(); history.current = {key:"",messages:[]}; setProblem(null); setQuestionUnanswered(false); setInput(""); setError(null); setFocusedIssue(clean);
      setMessages(current => current.length ? [...current, {role:"assistant",content:clean ? "Focused issue updated. Earlier conversation remains for reference and will not be reused for this focus." : "Focused issue cleared. General exploration starts with fresh AI context; earlier conversation remains for reference."}] : current);
    }
    setIssueEditor(null);
  };
  return { focusedIssue, issueEditor, setIssueEditor, updateFocusedIssue, cancelPending, beginRequest: () => requestGate.current.begin(), messages, setMessages, input, setInput, loading, setLoading, error, setError, problem, rememberQuestion, questionUnanswered, setQuestionUnanswered, history, startNewProblem };
}
export type ProblemConversation = ReturnType<typeof useProblemConversation>;

export function SessionProblemSummary({ conversation, onNavigate }: { conversation: ProblemConversation; onNavigate: (page: AppPage) => void }) {
  if (!conversation.problem && !conversation.messages.length) return null;
  return <section aria-label="Session problem" className="m-4 min-w-0 rounded-lg border border-primary/40 bg-card p-3 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="font-semibold text-primary">{conversation.focusedIssue ? "Focused issue" : "Conversation context"}</p><p className="mt-1 break-words">{conversation.focusedIssue || conversation.problem?.firstQuestion || "No active problem. Ask a question to start."}</p></div><button type="button" onClick={() => conversation.startNewProblem()} className="min-h-11 rounded border px-3 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Start new problem</button></div>
    <details className="mt-2"><summary className="cursor-pointer rounded-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">Session conversation</summary><p className="my-2 text-xs text-muted-foreground">Earlier messages are conversation context, not current-page evidence. Navigation does not run models or change assumptions. Session only: up to 40 visible messages and 8 model-history messages; reload clears this conversation.</p><div className="max-h-[40dvh] space-y-3 overflow-y-auto pr-2">{conversation.messages.map((message,index)=><div key={index} className="rounded border p-3"><p className="mb-1 text-xs font-semibold text-primary">{message.role === "user" ? "You" : "AI · earlier conversation"}</p><ChatContent content={message.content} onNavigate={onNavigate} /></div>)}</div></details>
  </section>;
}
