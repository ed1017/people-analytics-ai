"use client";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {conversationBoundary,resetConversationMarks} from "@/lib/conversation-reset";
import { rememberProblemQuestion, ProblemRequestGate } from "@/lib/problem-session";
import type { HomeDecisionContext } from "@/lib/home-decision-journey";
import type { ScopedChatHistory } from "@/lib/chat-context-history";
import type { ChatMessage } from "@/lib/types";

import { addGoalNote, emptyGoalRequirements, normalizeGoalRequirements, type GoalRequirements } from "@/lib/goal-context";
import {openGoalContextEditor,changeGoalEditorStatement,goalContextEditorCurrent,recordExplorationGoalContext,type GoalContextEditor,type GoalEditorSource} from '@/lib/goal-context-editor';
import { MAX_GOALS, emptyLocalGoals, type LocalGoals } from "@/lib/local-goals";

import {decisionStore,useDecisionStorage} from "@/components/decision-store";

type GoalChat = { messages: ChatMessage[]; input: string; problem: HomeDecisionContext | null; questionUnanswered: boolean; resetMarks?:Record<string,number> };
export function useProblemConversation(scope = "home") {
  const [localGoals, setLocalGoals] = useState(emptyLocalGoals);
  const goalsRef = useRef(localGoals);
  const [storageReady, setStorageReady] = useState(false);
  const decisionStorage=useDecisionStorage();
  const storageNotice=decisionStorage.notice;
  const chats = useRef(new Map<string, GoalChat>());
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const persist = (next: LocalGoals, remove = false) => {
    goalsRef.current = next; setLocalGoals(next);
    if(remove)decisionStore.clearAll();else decisionStore.saveGoals(next);
  };
  const [homeGoalChoiceKey, setHomeGoalChoiceKey] = useState<string | null>(null);
  const [focusedIssue, setFocusedIssue] = useState("");
  const [issueEditor, setIssueEditorState] = useState<GoalContextEditor | null>(null);
  const issueEditorRef=useRef<GoalContextEditor|null>(null);
  const setIssueEditor:Dispatch<SetStateAction<GoalContextEditor|null>>=update=>{const next=typeof update==='function'?update(issueEditorRef.current):update;issueEditorRef.current=next;setIssueEditorState(next)};
  const explorationContext=useRef(emptyGoalRequirements());
  const requestGate = useRef(new ProblemRequestGate());
  const [storedMessages, setStoredMessages] = useState<ChatMessage[]>([]);
  const [resetMarks,setResetMarks]=useState<Record<string,number>>({});
  const [resetEpoch,setResetEpoch]=useState(0);
  const boundary=conversationBoundary(resetMarks,scope,storedMessages.length);
  const messages=storedMessages.slice(boundary);
  const [input, setInputState] = useState("");
  const inputRef=useRef("");
  const setInput:Dispatch<SetStateAction<string>>=update=>{const next=typeof update==='function'?update(inputRef.current):update;inputRef.current=next;setInputState(next)};
  const canSubmitPrompt=()=>{const current=decisionStore.getSnapshot().data.goals;return storageReady&&!inputRef.current.trim()&&goalsRef.current.activeId===localGoals.activeId&&current.activeId===localGoals.activeId&&(current.goals.find(goal=>goal.id===current.activeId)?.statement??"")===focusedIssue};
  const draftExample = (prompt:string) => {
    const currentGoalMatches = () => goalsRef.current.activeId===localGoals.activeId &&
      (goalsRef.current.goals.find(goal=>goal.id===goalsRef.current.activeId)?.statement??"")===focusedIssue;
    if(!storageReady||!currentGoalMatches())return false;
    // Recheck the actual queued state, not the empty draft from an earlier render.
    setInput(current=>currentGoalMatches()&&!current.trim()?prompt:current);
    return true;
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<HomeDecisionContext | null>(null);
  const [questionUnanswered, setQuestionUnanswered] = useState(false);
  const history = useRef<ScopedChatHistory>({ key: "", messages: [] });
  useEffect(() => {
    // Restore browser-owned state after hydration; never write defaults over unread storage.
    const saved=decisionStore.initialize({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)}).goals;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time hydration from browser storage, with SSR-safe initial state.
    goalsRef.current=saved;setLocalGoals(saved);setFocusedIssue(saved.goals.find(g=>g.id===saved.activeId)?.statement??"");
    const chat=decisionStore.getField<GoalChat|null>(saved.activeId,"chat",null);
    if(chat){setResetMarks(chat.resetMarks??{});setStoredMessages(chat.messages);setInput(chat.input);setProblem(chat.problem);}
    setStorageReady(true);
  }, []);
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = update => setStoredMessages(current => {const start=conversationBoundary(resetMarks,scope,current.length);return [...current.slice(0,start),...(typeof update === "function" ? update(current.slice(start)) : update)];});
  useEffect(()=>{
    if(storageReady&&localGoals.activeId)decisionStore.setField(localGoals.activeId,"chat",{messages:storedMessages,input,problem,questionUnanswered:false,resetMarks});
  },[storageReady,localGoals.activeId,storedMessages,input,problem,resetMarks]);
  const rememberQuestion = (key: string, question: string) => setProblem(current => rememberProblemQuestion(current, key, question));
  const cancelPending = () => { requestGate.current.invalidate(); setHomeGoalChoiceKey(null); setLoading(false); };
  const snapshot = () => { chats.current.set(goalsRef.current.activeId, {messages:storedMessages,input:inputRef.current,problem,questionUnanswered,resetMarks}); };
  const activate = (next: LocalGoals, saveCurrent = true) => {
    cancelPending(); if(next.activeId!==goalsRef.current.activeId)explorationContext.current=emptyGoalRequirements(); if (saveCurrent) snapshot();
    const chat = chats.current.get(next.activeId) ?? decisionStore.getField<GoalChat|null>(next.activeId,"chat",null);
    setStoredMessages(chat?.messages ?? []);setResetMarks(chat?.resetMarks??{}); setInput(chat?.input ?? ""); setProblem(chat?.problem ?? null); setQuestionUnanswered(false);
    history.current = {key:"", messages:[]}; setError(null); setIssueEditor(null);
    setFocusedIssue(next.goals.find(g=>g.id===next.activeId)?.statement ?? ""); persist(next);
  };
  const selectGoal = (id: string) => {
    const current = goalsRef.current;
    if (!storageReady || id === current.activeId || (id && !current.goals.some(g=>g.id===id))) return;
    activate({...current,activeId:id});
  };
  const startNewProblem = (draft = "") => {
    explorationContext.current=emptyGoalRequirements();setIssueEditor(null);
    const current = goalsRef.current;
    if (current.activeId) activate({...current,activeId:""});
    else { cancelPending(); history.current={key:"",messages:[]}; setProblem(null); setError(null); setQuestionUnanswered(false); setMessages(previous=>previous.length ? [...previous,{role:"assistant",content:"Starting a new problem. Earlier messages remain for reference and will not be used as AI context."}] : previous); }
    setInput(draft);
  };
  const openIssueEditor=(create=false,source:GoalEditorSource={page:'',scope:''})=>{
    if(!storageReady||!decisionStore.getSnapshot().saved)return;
    cancelPending();const editor=openGoalContextEditor(goalsRef.current,create,explorationContext.current,source,crypto.randomUUID());setIssueEditor(editor);return editor.id;
  };
  const editorCurrent=(id:string)=>{const editor=issueEditorRef.current;return !!editor&&editor.id===id&&goalContextEditorCurrent(editor,goalsRef.current)&&goalContextEditorCurrent(editor,decisionStore.getSnapshot().data.goals)};
  const closeIssueEditor=(id:string)=>{if(issueEditorRef.current?.id===id)setIssueEditor(null)};
  const updateIssueDraft=(draft:string,id:string)=>{if(editorCurrent(id))setIssueEditor(current=>current?changeGoalEditorStatement(current,draft):null)};
  const updateIssueContext=(requirements:GoalRequirements,id:string)=>{if(editorCurrent(id))setIssueEditor(current=>current?{...current,requirements:normalizeGoalRequirements(requirements),contextEdited:current.contextEdited||requirements.constraints!==current.requirements.constraints}:null)};
  const updateFocusedIssue = (value: string,editorId:string):string|null => {
    if (!storageReady||!decisionStore.getSnapshot().saved) return 'Browser storage must be available before saving.';
    if(!editorCurrent(editorId))return 'The goal or editor changed. Close and reopen this editor before saving.';
    const editor=issueEditorRef.current!;
    const clean = value.trim(), current = goalsRef.current;
    if (!clean) { selectGoal(""); setProblem(null); setInput(""); setQuestionUnanswered(false); setIssueEditor(null); return null; }
    if (clean.length > 240) return 'Use 240 characters or fewer.';
    if (!current.activeId || editor.create) {
      const duplicate = current.goals.find(g=>g.statement.toLocaleLowerCase() === clean.toLocaleLowerCase());
      if (duplicate) return 'A goal with this statement already exists. Select it to review its saved context; this draft has not changed it.';
      if (current.goals.length >= MAX_GOALS) return 'The 20-goal limit is reached.';
      const id = crypto.randomUUID();
      const next = {...current,activeId:id,goals:[...current.goals,{id,statement:clean,...(editor?{context:normalizeGoalRequirements(editor.requirements)}:{})}]};
      // Pinning general exploration retains its visible transcript for reference, never model history.
      if (!current.activeId) chats.current.set(id,{messages:storedMessages,input:"",problem:null,questionUnanswered:false,resetMarks});
      activate(next); return null;
    }
    cancelPending(); history.current={key:"",messages:[]}; setProblem(null); setQuestionUnanswered(false); setInput(""); setError(null);
    setFocusedIssue(clean); setIssueEditor(null);
    setMessages(previous=>previous.length ? [...previous,{role:"assistant",content:"Goal edited. Earlier messages remain for reference and will not be reused as AI context."}] : previous);
    persist({...current,goals:current.goals.map(g=>g.id===current.activeId ? {...g,statement:clean,...(editor?{context:normalizeGoalRequirements(editor.requirements)}:{})} : g)});
    return null;
  };
  // Explicit local planner handoff: retain the entire transcript and unfinished draft.
  const confirmWorkforceGoal = (statement: string): string => {
    const clean = statement.trim(), current = goalsRef.current;
    if (!storageReady || !decisionStore.getSnapshot().saved || loading || issueEditor) throw Error("Finish the current edit or request and make sure browser storage is available.");
    if (!clean || clean.length > 240) throw Error("Review a goal between 1 and 240 characters; nothing has been shortened automatically.");
    if (current.activeId) {
      if (current.goals.find(goal=>goal.id===current.activeId)?.statement !== clean) throw Error("The saved goal changed. Reopen the scope review.");
      return current.activeId;
    }
    if (current.goals.some(goal=>goal.statement.toLocaleLowerCase()===clean.toLocaleLowerCase())) throw Error("This goal is already saved. Select it from your goals to continue; your draft is retained.");
    if (current.goals.length >= MAX_GOALS) throw Error("Your saved goals are full. Select an existing goal to continue; your draft is retained.");
    const id = crypto.randomUUID();
    chats.current.set(id,{messages:storedMessages,input:inputRef.current,problem,questionUnanswered,resetMarks});
    activate({...current,activeId:id,goals:[...current.goals,{id,statement:clean}]});
    return id;
  };
  const removeGoal = (editorId?:string) => {
    if(editorId&&!editorCurrent(editorId))return;
    const current = goalsRef.current; if (!current.activeId) return;
    chats.current.delete(current.activeId);
    activate({...current,activeId:"",goals:current.goals.filter(g=>g.id!==current.activeId)},false);
  };
  const recordGoalStatement = (text:string,page:string,scope:string) => {
    const current=goalsRef.current, goal=current.goals.find(g=>g.id===current.activeId);
    if(!goal){explorationContext.current=recordExplorationGoalContext(explorationContext.current,text,page,scope);return null;}
    const context=addGoalNote(normalizeGoalRequirements(goal.context),text,page,scope);
    persist({...current,goals:current.goals.map(g=>g.id===goal.id?{...g,context}:g)});
    return {goal:goal.statement,...context,currentScope:scope};
  };
  const updateGoalRequirements = (context:GoalRequirements) => {
    const current=goalsRef.current;
    persist({...current,goals:current.goals.map(g=>g.id===current.activeId?{...g,context:normalizeGoalRequirements(context)}:g)});
    cancelPending();
  };
  const activeGoal=localGoals.goals.find(g=>g.id===localGoals.activeId);
  const goalRequirements=activeGoal?.context ?? emptyGoalRequirements();
  const goalContext=activeGoal?{goal:activeGoal.statement,...goalRequirements}:null;
  const clearAllGoals = () => {
    explorationContext.current=emptyGoalRequirements();cancelPending(); chats.current.clear(); history.current={key:"",messages:[]}; setStoredMessages([]);setResetMarks({}); setInput(""); setProblem(null); setQuestionUnanswered(false); setFocusedIssue(""); setIssueEditor(null); setError(null); setWorkspaceRevision(v=>v+1); persist(emptyLocalGoals(),true);
  };
  const resetConversation=()=>{
    if(!goalsRef.current.activeId)explorationContext.current=emptyGoalRequirements();
    cancelPending();history.current={key:"",messages:[]};setInput("");setProblem(null);setQuestionUnanswered(false);setError(null);
    setResetMarks(current=>resetConversationMarks(current,scope,storedMessages.length));setResetEpoch(value=>value+1);
  };
  return { resetConversation,resetEpoch,wasReset:Object.hasOwn(resetMarks,scope),historyMessages:storedMessages, canSubmitPrompt, confirmWorkforceGoal, saved:decisionStorage.saved, retrySave:()=>decisionStore.retry(), goalContext, goalRequirements, recordGoalStatement, updateGoalRequirements, goals:localGoals.goals, activeGoalId:localGoals.activeId, workspaceKey:`${workspaceRevision}:${localGoals.activeId}`, storageReady, storageNotice, selectGoal, removeGoal, clearAllGoals, homeGoalChoiceKey, setHomeGoalChoiceKey, focusedIssue, issueEditor, setIssueEditor, closeIssueEditor, openIssueEditor, updateIssueDraft, updateIssueContext, updateFocusedIssue, cancelPending, beginRequest: () => { setHomeGoalChoiceKey(null); return requestGate.current.begin(); }, messages, setMessages, input, setInput, draftExample, loading, setLoading, error, setError, problem, rememberQuestion, questionUnanswered, setQuestionUnanswered, history, startNewProblem };
}
export type ProblemConversation = ReturnType<typeof useProblemConversation>;

export function SessionProblemSummary({ conversation }: { conversation: ProblemConversation }) {
  if (!conversation.focusedIssue && !conversation.problem && !conversation.messages.length) return null;
  return <section aria-label="Session conversation context" className="mb-3 min-w-0 text-sm">
    <details><summary className="cursor-pointer rounded-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">{conversation.focusedIssue ? "Focused issue" : "Conversation context"}</summary>
    <p className="mt-1 break-words">{conversation.focusedIssue || conversation.problem?.firstQuestion || "No active problem. Ask a question to start."}</p>
    <p className="mt-2 text-xs text-muted-foreground">Earlier-page messages are context, not current-page evidence. Navigation does not run models or change assumptions. Selected goals receive a fresh page takeaway using saved requirements and current evidence. Saved-goal conversations and decision inputs stay separate and are saved only in this browser. General exploration remains in this tab. Reload starts fresh AI transport context.</p></details>
    <button type="button" onClick={() => conversation.startNewProblem()} className="mt-2 min-h-11 rounded border px-3 py-2 text-sm font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Start new problem</button>
  </section>;
}
