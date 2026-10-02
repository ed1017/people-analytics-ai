"use client";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { boundSessionTranscript, rememberProblemQuestion, ProblemRequestGate } from "@/lib/problem-session";
import type { HomeDecisionContext } from "@/lib/home-decision-journey";
import type { ScopedChatHistory } from "@/lib/chat-context-history";
import type { ChatMessage } from "@/lib/types";

import { GOALS_STORAGE_KEY, MAX_GOALS, emptyLocalGoals, parseLocalGoals, type LocalGoals } from "@/lib/local-goals";

type GoalChat = { messages: ChatMessage[]; input: string; problem: HomeDecisionContext | null; questionUnanswered: boolean };
export function useProblemConversation() {
  const [localGoals, setLocalGoals] = useState(emptyLocalGoals);
  const goalsRef = useRef(localGoals);
  const [storageReady, setStorageReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const chats = useRef(new Map<string, GoalChat>());
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const persist = (next: LocalGoals, remove = false) => {
    goalsRef.current = next; setLocalGoals(next);
    try { if (remove) localStorage.removeItem(GOALS_STORAGE_KEY); else localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(next)); setStorageNotice(null); }
    catch { setStorageNotice("Browser storage unavailable. Changes last only in this tab; previously saved goals may remain. Retry Clear all saved goals when storage is available."); }
  };
  const [homeGoalChoiceKey, setHomeGoalChoiceKey] = useState<string | null>(null);
  const [focusedIssue, setFocusedIssue] = useState("");
  const [issueEditor, setIssueEditor] = useState<{draft:string; create?:boolean} | null>(null);
  const requestGate = useRef(new ProblemRequestGate());
  const [messages, setStoredMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<HomeDecisionContext | null>(null);
  const [questionUnanswered, setQuestionUnanswered] = useState(false);
  const history = useRef<ScopedChatHistory>({ key: "", messages: [] });
  useEffect(() => {
    // Restore browser-owned state after hydration; never write defaults over unread storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time hydration from browser storage, with SSR-safe initial state.
    try { const saved = parseLocalGoals(localStorage.getItem(GOALS_STORAGE_KEY)); goalsRef.current = saved; setLocalGoals(saved); setFocusedIssue(saved.goals.find(g=>g.id===saved.activeId)?.statement ?? ""); }
    catch { setStorageNotice("Saved goals could not be loaded. Continue in this tab or use Clear all saved goals to remove the saved copy."); }
    setStorageReady(true);
  }, []);
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = update => setStoredMessages(current => boundSessionTranscript(typeof update === "function" ? update(current) : update));
  const rememberQuestion = (key: string, question: string) => setProblem(current => rememberProblemQuestion(current, key, question));
  const cancelPending = () => { requestGate.current.invalidate(); setHomeGoalChoiceKey(null); setLoading(false); };
  const snapshot = () => { chats.current.set(goalsRef.current.activeId, {messages,input,problem,questionUnanswered}); };
  const activate = (next: LocalGoals, saveCurrent = true) => {
    cancelPending(); if (saveCurrent) snapshot();
    const chat = chats.current.get(next.activeId);
    setMessages(chat?.messages ?? []); setInput(chat?.input ?? ""); setProblem(chat?.problem ?? null); setQuestionUnanswered(false);
    history.current = {key:"", messages:[]}; setError(null); setIssueEditor(null);
    setFocusedIssue(next.goals.find(g=>g.id===next.activeId)?.statement ?? ""); persist(next);
  };
  const selectGoal = (id: string) => {
    const current = goalsRef.current;
    if (!storageReady || id === current.activeId || (id && !current.goals.some(g=>g.id===id))) return;
    activate({...current,activeId:id});
  };
  const startNewProblem = (draft = "") => {
    const current = goalsRef.current;
    if (current.activeId) activate({...current,activeId:""});
    else { cancelPending(); history.current={key:"",messages:[]}; setProblem(null); setError(null); setQuestionUnanswered(false); setMessages(previous=>previous.length ? [...previous,{role:"assistant",content:"Starting a new problem. Earlier messages remain for reference and will not be used as AI context."}] : previous); }
    setInput(draft);
  };
  const updateFocusedIssue = (value: string) => {
    if (!storageReady) return;
    const clean = value.trim(), current = goalsRef.current;
    if (!clean) { selectGoal(""); setProblem(null); setInput(""); setQuestionUnanswered(false); setIssueEditor(null); return; }
    if (clean.length > 240) return;
    if (!current.activeId || issueEditor?.create) {
      const duplicate = current.goals.find(g=>g.statement.toLocaleLowerCase() === clean.toLocaleLowerCase());
      if (duplicate) { selectGoal(duplicate.id); setIssueEditor(null); return; }
      if (current.goals.length >= MAX_GOALS) return;
      const id = crypto.randomUUID();
      const next = {...current,activeId:id,goals:[...current.goals,{id,statement:clean}]};
      // Pinning general exploration retains its visible transcript for reference, never model history.
      if (!current.activeId && !issueEditor?.create) chats.current.set(id,{messages,input:"",problem:null,questionUnanswered:false});
      activate(next); return;
    }
    cancelPending(); history.current={key:"",messages:[]}; setProblem(null); setQuestionUnanswered(false); setInput(""); setError(null);
    setFocusedIssue(clean); setIssueEditor(null);
    setMessages(previous=>previous.length ? [...previous,{role:"assistant",content:"Goal edited. Earlier messages remain for reference and will not be reused as AI context."}] : previous);
    persist({...current,goals:current.goals.map(g=>g.id===current.activeId ? {...g,statement:clean} : g)});
  };
  const removeGoal = () => {
    const current = goalsRef.current; if (!current.activeId) return;
    chats.current.delete(current.activeId);
    activate({...current,activeId:"",goals:current.goals.filter(g=>g.id!==current.activeId)},false);
  };
  const clearAllGoals = () => {
    cancelPending(); chats.current.clear(); history.current={key:"",messages:[]}; setMessages([]); setInput(""); setProblem(null); setQuestionUnanswered(false); setFocusedIssue(""); setIssueEditor(null); setError(null); setWorkspaceRevision(v=>v+1); persist(emptyLocalGoals(),true);
  };
  return { goals:localGoals.goals, activeGoalId:localGoals.activeId, workspaceKey:`${workspaceRevision}:${localGoals.activeId}`, storageReady, storageNotice, selectGoal, removeGoal, clearAllGoals, homeGoalChoiceKey, setHomeGoalChoiceKey, focusedIssue, issueEditor, setIssueEditor, updateFocusedIssue, cancelPending, beginRequest: () => { setHomeGoalChoiceKey(null); return requestGate.current.begin(); }, messages, setMessages, input, setInput, loading, setLoading, error, setError, problem, rememberQuestion, questionUnanswered, setQuestionUnanswered, history, startNewProblem };
}
export type ProblemConversation = ReturnType<typeof useProblemConversation>;

export function SessionProblemSummary({ conversation }: { conversation: ProblemConversation }) {
  if (!conversation.focusedIssue && !conversation.problem && !conversation.messages.length) return null;
  return <section aria-label="Session conversation context" className="mb-3 min-w-0 text-sm">
    <details><summary className="cursor-pointer rounded-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">{conversation.focusedIssue ? "Focused issue" : "Conversation context"}</summary>
    <p className="mt-1 break-words">{conversation.focusedIssue || conversation.problem?.firstQuestion || "No active problem. Ask a question to start."}</p>
    <p className="mt-2 text-xs text-muted-foreground">Earlier-page messages are context, not current-page evidence. Navigation does not run models or change assumptions. Switching goals starts fresh AI context. Conversations stay separate in this tab; reload clears them. Goal names are saved only in this browser.</p></details>
    <button type="button" onClick={() => conversation.startNewProblem()} className="mt-2 min-h-11 rounded border px-3 py-2 text-sm font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Start new problem</button>
  </section>;
}
