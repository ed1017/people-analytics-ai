"use client";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {guidedReturnKey,readGuidedReturn,type GuidedReturn} from '@/lib/home-guided-return';
import {isFirstHomeVisit} from '@/lib/home-onboarding';
import {conversationBoundary,resetConversationMarks} from "@/lib/conversation-reset";
import {createHomeDemoGoals,hasSavedUserGoal} from "@/lib/home-demo-goals";
import { rememberProblemQuestion, ProblemRequestGate } from "@/lib/problem-session";
import type { HomeDecisionContext } from "@/lib/home-decision-journey";
import type { ScopedChatHistory } from "@/lib/chat-context-history";
import type { ChatMessage } from "@/lib/types";

import { addGoalNote, emptyGoalRequirements, normalizeGoalRequirements, type GoalRequirements } from "@/lib/goal-context";
import {openGoalContextEditor,changeGoalEditorStatement,goalContextEditorCurrent,recordExplorationGoalContext,type GoalContextEditor,type GoalEditorSource} from '@/lib/goal-context-editor';
import { MAX_GOALS, emptyLocalGoals, type LocalGoals } from "@/lib/local-goals";

import {solutionConversationEnabled} from '@/lib/home-solution-conversation';
import {DECISIONS_STORAGE_KEY,type Json} from '@/lib/local-decisions';
import {decisionStore,useDecisionStorage} from "@/components/decision-store";

type GoalChat = { messages: ChatMessage[]; input: string; problem: HomeDecisionContext | null; questionUnanswered: boolean; resetMarks?:Record<string,number>; recoveredPlanSelectionRequired?:boolean };
export function useProblemConversation(scope = "home") {
  const [localGoals, setLocalGoals] = useState(emptyLocalGoals);
  const goalsRef = useRef(localGoals);
  const [storageReady, setStorageReady] = useState(false);
  const firstVisitSnapshot=useRef<boolean|null>(null);
  const [firstHomeVisit,setFirstHomeVisit]=useState(false);
  const decisionStorage=useDecisionStorage();
  const storageNotice=decisionStorage.notice;
  const chats = useRef(new Map<string, GoalChat>());
  const guidedIsolation=useRef<GuidedReturn|null>(null);
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
  const [storedMessages, setStoredMessagesState] = useState<ChatMessage[]>([]);
  const storedMessagesRef=useRef(storedMessages);
  const setStoredMessages=(next:ChatMessage[])=>{storedMessagesRef.current=next;setStoredMessagesState(next)};
  const [resetMarks,setResetMarksState]=useState<Record<string,number>>({});
  const resetMarksRef=useRef(resetMarks);
  const setResetMarks=(next:Record<string,number>)=>{resetMarksRef.current=next;setResetMarksState(next)};
  const [resetEpoch,setResetEpoch]=useState(0);
  const boundary=conversationBoundary(resetMarks,scope,storedMessages.length);
  const messages=storedMessages.slice(boundary);
  const [input, setInputState] = useState("");
  const inputRef=useRef("");
  const [recoveredPlanSelectionRequired,setRecoveredPlanSelectionRequired]=useState(false);
  const setInput:Dispatch<SetStateAction<string>>=update=>{const next=typeof update==='function'?update(inputRef.current):update;inputRef.current=next;setInputState(next);if(!next.trim())setRecoveredPlanSelectionRequired(false)};
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
    // Capture before initialization creates demo records; existing empty or
    // unreadable records are still existing use. Preserve this across StrictMode.
    if(firstVisitSnapshot.current===null)firstVisitSnapshot.current=isFirstHomeVisit({getItem:key=>localStorage.getItem(key)},{getItem:key=>sessionStorage.getItem(key)});
    setFirstHomeVisit(firstVisitSnapshot.current);
    // Restore browser-owned state after hydration; never write defaults over unread storage.
    let saved=decisionStore.initialize({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)},createHomeDemoGoals,{getItem:key=>sessionStorage.getItem(key),setItem:(key,value)=>sessionStorage.setItem(key,value),removeItem:key=>sessionStorage.removeItem(key)}).goals;
    let returned:GuidedReturn|null=null;
    try{returned=readGuidedReturn(sessionStorage.getItem(guidedReturnKey));sessionStorage.removeItem(guidedReturnKey);}catch{/* Normal browser storage recovery remains available. */}
    if(returned){
      if(returned.general)chats.current.set('',returned.general);
      if(saved.activeId===''||saved.activeId===returned.id){
        const activeId=saved.goals.some(goal=>goal.id===returned.originId)?returned.originId:'';
        saved={...saved,activeId};decisionStore.saveGoals(saved);explorationContext.current=returned.requirements;
      }
    }
    goalsRef.current=saved;setLocalGoals(saved);setFocusedIssue(saved.goals.find(g=>g.id===saved.activeId)?.statement??"");
    const chat=chats.current.get(saved.activeId)??decisionStore.getField<GoalChat|null>(saved.activeId,"chat",null);
    if(chat){setResetMarks(chat.resetMarks??{});setStoredMessages(chat.messages);setInput(chat.input);setRecoveredPlanSelectionRequired(chat.recoveredPlanSelectionRequired===true);setProblem(chat.problem);}
    setStorageReady(true);
    // Keep this tab's request recoverable as soon as another tab changes saved
    // decisions, including when no attachment dialog is open and before reload.
    const changed=(event:StorageEvent)=>{
      if(event.storageArea===localStorage&&(event.key===null||event.key===DECISIONS_STORAGE_KEY))decisionStore.invalidateExternalChange();
    };
    window.addEventListener('storage',changed);
    return()=>window.removeEventListener('storage',changed);
  }, []);
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = update => {const current=storedMessagesRef.current,start=conversationBoundary(resetMarksRef.current,scope,current.length);setStoredMessages([...current.slice(0,start),...(typeof update === "function" ? update(current.slice(start)) : update)]);};
  useEffect(()=>{
    if(storageReady&&(localGoals.activeId||solutionConversationEnabled))decisionStore.setField(localGoals.activeId,"chat",{messages:storedMessages,input,problem,questionUnanswered:false,resetMarks,...(recoveredPlanSelectionRequired?{recoveredPlanSelectionRequired:true}:{})});
  },[storageReady,localGoals.activeId,storedMessages,input,problem,resetMarks,recoveredPlanSelectionRequired]);
  const rememberQuestion = (key: string, question: string) => setProblem(current => rememberProblemQuestion(current, key, question));
  const cancelPending = () => { requestGate.current.invalidate(); setHomeGoalChoiceKey(null); setLoading(false); };
  const snapshot = () => { chats.current.set(goalsRef.current.activeId, {messages:storedMessagesRef.current,input:inputRef.current,problem,questionUnanswered,resetMarks:resetMarksRef.current,recoveredPlanSelectionRequired}); };
  const activate = (next: LocalGoals, saveCurrent = true) => {
    cancelPending(); if(next.activeId!==goalsRef.current.activeId)explorationContext.current=emptyGoalRequirements(); if (saveCurrent) snapshot();
    const chat = chats.current.get(next.activeId) ?? decisionStore.getField<GoalChat|null>(next.activeId,"chat",null);
    setStoredMessages(chat?.messages ?? []);setResetMarks(chat?.resetMarks??{}); setInput(chat?.input ?? ""); setRecoveredPlanSelectionRequired(chat?.recoveredPlanSelectionRequired===true); setProblem(chat?.problem ?? null); setQuestionUnanswered(false);
    history.current = {key:"", messages:[]}; setError(null); setIssueEditor(null);
    setFocusedIssue(next.goals.find(g=>g.id===next.activeId)?.statement ?? ""); persist(next);
  };
  const recoverStorage=(keepSaved=false)=>{
    const wasRecovery=!!decisionStore.getSnapshot().recovery;
    if(keepSaved)decisionStore.recoverDraft(true);else decisionStore.retry();
    const state=decisionStore.getSnapshot();
    if(!wasRecovery||!state.saved)return;
    // Replace React's cached transcript and goal selection with the reviewed merge.
    // Reusing a stale chat cache here would write this tab's old history over the merge.
    cancelPending();chats.current.clear();history.current={key:'',messages:[]};
    const next=state.data.goals,chat=decisionStore.getField<GoalChat|null>(next.activeId,'chat',null);
    goalsRef.current=next;setLocalGoals(next);setFocusedIssue(next.goals.find(g=>g.id===next.activeId)?.statement??'');
    setStoredMessages(chat?.messages??[]);setResetMarks(chat?.resetMarks??{});setInput(chat?.input??'');setRecoveredPlanSelectionRequired(chat?.recoveredPlanSelectionRequired===true);setProblem(chat?.problem??null);setQuestionUnanswered(false);
    setIssueEditor(null);setError(null);setWorkspaceRevision(value=>value+1);
  };
  const beginGuidedExploration=(id:string)=>{
    if(guidedIsolation.current?.id===id)return;
    if(guidedIsolation.current||!storageReady||!decisionStore.getSnapshot().saved||loading||issueEditor)throw Error("Finish the current request or edit before starting the example.");
    snapshot();const originId=goalsRef.current.activeId,general=chats.current.get("")??null;
    const isolated={id,originId,general,requirements:explorationContext.current};
    try{sessionStorage.setItem(guidedReturnKey,JSON.stringify(isolated));}catch{throw Error('The original draft could not be kept for reload. Resolve browser storage before starting the example.');}
    guidedIsolation.current=isolated;
    activate({...goalsRef.current,activeId:""});
    if(!decisionStore.getSnapshot().saved)throw Error('The example workspace could not be saved. Your original draft is kept; resolve browser storage before retrying.');
    setStoredMessages([]);setResetMarks({});setInput("");setProblem(null);setQuestionUnanswered(false);explorationContext.current=emptyGoalRequirements();
  };
  const endGuidedExploration=()=>{
    const isolated=guidedIsolation.current;if(!isolated)return;
    guidedIsolation.current=null;
    try{sessionStorage.removeItem(guidedReturnKey);}catch{/* The checked return address cannot replay actions. */}
    if(goalsRef.current.activeId===isolated.id)snapshot();
    if(isolated.general)chats.current.set("",isolated.general);else chats.current.delete("");
    // Respect a user's manual selection outside the walkthrough.
    if(goalsRef.current.activeId!==""&&goalsRef.current.activeId!==isolated.id)return;
    const activeId=goalsRef.current.goals.some(goal=>goal.id===isolated.originId)?isolated.originId:"";
    activate({...goalsRef.current,activeId},false);
    if(!activeId)explorationContext.current=isolated.requirements;
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
  const confirmWorkforceGoal = (statement: string, guidedId?:string): string => {
    const clean = statement.trim(), current = goalsRef.current;
    if (!storageReady || !decisionStore.getSnapshot().saved || loading || issueEditor) throw Error("Finish the current edit or request and make sure browser storage is available.");
    if (!clean || clean.length > 240) throw Error("Review a goal between 1 and 240 characters; nothing has been shortened automatically.");
    if(guidedId){
      // The active isolation and source-bound Pin receipt own this goal. Its
      // editable label need not retain the example's literal display marker.
      if(guidedIsolation.current?.id!==guidedId||current.activeId)throw Error('This example conversation changed. Exit and start the guide again.');
      const prior=current.goals.find(goal=>goal.id===guidedId);
      if(prior){if(prior.statement!==clean)throw Error('The example goal changed. Exit to review it.');return guidedId;}
      if(decisionStore.getSnapshot().data.removedGoalIds?.includes(guidedId))throw Error('This example was removed. It will not be restored. Exit the guide to continue.');
      if(current.goals.length>=MAX_GOALS)throw Error('Your saved goals are full. Free a slot before pinning the example.');
      const chat={messages:storedMessagesRef.current,input:'',problem,questionUnanswered:false,resetMarks:resetMarksRef.current};
      chats.current.set(guidedId,chat);
      persist({...current,goals:[...current.goals,{id:guidedId,statement:clean}]});
      if(!decisionStore.getSnapshot().saved)throw Error('The example goal could not be saved. Resolve browser storage before retrying.');
      decisionStore.setField(guidedId,'chat',chat);
      if(!decisionStore.getSnapshot().saved)throw Error('The example conversation could not be saved. Resolve browser storage before retrying.');
      return guidedId;
    }
    if (current.activeId) {
      if (current.goals.find(goal=>goal.id===current.activeId)?.statement !== clean) throw Error("The saved goal changed. Reopen the scope review.");
      return current.activeId;
    }
    if (hasSavedUserGoal({goals:current,workspaces:decisionStore.getSnapshot().data.workspaces},clean)) throw Error("This goal is already saved. Select it from your goals to continue; your draft is retained.");
    if (current.goals.length >= MAX_GOALS) throw Error("Your saved goals are full. Select an existing goal to continue; your draft is retained.");
    const id = crypto.randomUUID();
    chats.current.set(id,{messages:storedMessages,input:inputRef.current,problem,questionUnanswered,resetMarks});
    activate({...current,activeId:id,goals:[...current.goals,{id,statement:clean}]});
    return id;
  };
  // Selection publishes the goal, proposal association and transcript together.
  // Adopt the checked receipt without a second goal write or cached-chat overwrite.
  const selectProposalGoal=(goal:{id:string;statement:string},revision:number,fields:Record<string,Json>)=>{
    if(!storageReady||loading||issueEditorRef.current)throw Error('Finish the current edit or request before choosing a proposal.');
    if(!goalsRef.current.activeId&&hasSavedUserGoal(decisionStore.getSnapshot().data,goal.statement))throw Error('This goal is already saved. Select it to continue; your exploration is kept.');
    const chat={messages:storedMessagesRef.current,input:inputRef.current,problem,questionUnanswered:false,resetMarks:resetMarksRef.current};
    decisionStore.commitGoalSelection(goal.id,goal.statement,revision,new Date().toISOString(),()=>({...fields,chat:chat as unknown as Json}));
    const next=decisionStore.getSnapshot().data.goals;
    cancelPending();chats.current.delete('');chats.current.set(goal.id,chat);
    goalsRef.current=next;setLocalGoals(next);setFocusedIssue(goal.statement);
    history.current={key:'',messages:[]};setError(null);setWorkspaceRevision(value=>value+1);
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
    if(!storageReady)return;
    const current=goalsRef.current;
    explorationContext.current=emptyGoalRequirements();
    cancelPending();history.current={key:"",messages:[]};setInput("");setProblem(null);setQuestionUnanswered(false);setError(null);setIssueEditor(null);
    const resetChat=(chat:Pick<GoalChat,'messages'|'resetMarks'>):GoalChat=>({messages:chat.messages,input:"",problem:null,questionUnanswered:false,resetMarks:resetConversationMarks(chat.resetMarks??{},scope,chat.messages.length)});
    const archived=resetChat({messages:storedMessagesRef.current,resetMarks:resetMarksRef.current});
    chats.current.set(current.activeId,archived);
    // Preserve the saved goal and its plan, but leave its active context. This
    // also invalidates goal-owned preparation requests through the store guards.
    if(current.activeId)decisionStore.setField(current.activeId,"chat",archived);
    const exploration=current.activeId?resetChat(chats.current.get("")??{messages:[]}):archived;
    chats.current.set("",exploration);setStoredMessages(exploration.messages);setResetMarks(exploration.resetMarks??{});setFocusedIssue("");
    if(current.activeId)persist({...current,activeId:""});
    setResetEpoch(value=>value+1);
  };
  return { firstHomeVisit,recoveredPlanSelectionRequired,beginGuidedExploration,endGuidedExploration,resetConversation,resetEpoch,wasReset:Object.hasOwn(resetMarks,'*')||Object.hasOwn(resetMarks,scope),historyMessages:storedMessages, canSubmitPrompt, confirmWorkforceGoal, selectProposalGoal, saved:decisionStorage.saved, retrySave:()=>recoverStorage(),recovery:decisionStorage.recovery,recoverSaved:()=>recoverStorage(true), goalContext, goalRequirements, recordGoalStatement, updateGoalRequirements, goals:localGoals.goals, activeGoalId:localGoals.activeId, workspaceKey:`${workspaceRevision}:${localGoals.activeId}`, storageReady, storageNotice, selectGoal, removeGoal, clearAllGoals, homeGoalChoiceKey, setHomeGoalChoiceKey, focusedIssue, issueEditor, setIssueEditor, closeIssueEditor, openIssueEditor, updateIssueDraft, updateIssueContext, updateFocusedIssue, cancelPending, beginRequest: () => { setHomeGoalChoiceKey(null); return requestGate.current.begin(); }, messages, setMessages, input, setInput, draftExample, loading, setLoading, error, setError, problem, rememberQuestion, questionUnanswered, setQuestionUnanswered, history, startNewProblem };
}
export type ProblemConversation = ReturnType<typeof useProblemConversation>;

export function SessionProblemSummary({ conversation }: { conversation: ProblemConversation }) {
  if (!conversation.focusedIssue && !conversation.problem && !conversation.messages.length) return null;
  return <section aria-label="Session conversation context" className="mb-3 min-w-0 text-sm">
    <details><summary className="cursor-pointer rounded-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">{conversation.focusedIssue ? "Focused issue" : "Conversation context"}</summary>
    <p className="mt-1 break-words">{conversation.focusedIssue || conversation.problem?.firstQuestion || "No active problem. Ask a question to start."}</p>
    <p className="mt-2 text-xs text-muted-foreground">Earlier-page messages are context, not current-page evidence. Navigation does not run models or change assumptions. Selected goals receive a fresh page takeaway using saved requirements and current evidence. Saved-goal conversations and decision inputs stay separate and are saved only in this browser. {solutionConversationEnabled?'General exploration is also saved in this browser until a plan is selected.':'General exploration remains in this tab.'} Reload starts fresh AI transport context.</p></details>
    <button type="button" onClick={() => conversation.startNewProblem()} className="mt-2 min-h-11 rounded border px-3 py-2 text-sm font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Start new problem</button>
  </section>;
}
