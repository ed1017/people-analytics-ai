"use client";
import {explicitHomeGoal} from "@/lib/home-explicit-goal";
import {HomePinnedGoals} from "@/components/home-pinned-goals";
import type {LocalGoal} from "@/lib/local-goals";
import {HomeGettingStarted} from "@/components/home-getting-started";
import {readHomeFindingFollowups,buildHomeFindingPrompt,type HomeFindingFollowup} from "@/lib/home-finding-followups";
import {emptyOptionActions,isOptionActionLabel,type WorkforceOptionActions,type OptionAction} from "@/lib/workforce-option-actions";

import {HomeCapacityReview,type HomeCapacityRequest} from "@/components/home-capacity-review";
import {RetentionWhatIfPanel} from "@/components/retention-what-if-panel";
import {WorkforceSolutionPanel} from "@/components/workforce-solution-panel";
import {revealJourneyTarget} from "@/components/workforce-journey-continue";
import {decisionStore,recordDecisionEvidence,useDecisionStorage} from "@/components/decision-store";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUp, RefreshCw, Info } from "lucide-react";
import {useHomeComposerDock} from '@/components/use-home-composer-dock';
import {HomeSolutionBundles} from '@/components/home-solution-bundles';
import type {BundleDiscussion} from '@/components/home-bundle-plans';
import type {BundleEditPreview} from '@/lib/home-bundle-chat-edit';
import {HomeBundleChatReview} from '@/components/home-bundle-chat-review';
import {bundlePreparationField,readBundlePreparation} from '@/lib/home-bundle-preparation';
import type {ActionBinding} from '@/lib/home-action-drafts';
import {HomeActionOptions} from '@/components/home-action-options';
import {homeCandidateVerification} from '@/lib/home-candidate-verification';
import {HomeCandidateOptions} from '@/components/home-candidate-options';
import {inspectHomeCandidateProposal,readHomePreparationDiagnostic,type HomePreparationDiagnostic,readHomeCandidateRecord,candidateSourceKey,candidateSelectionGoal,type HomeCandidateProposal} from '@/lib/home-candidate-options';
import {readWorkforceSolution,currentSolutionVersion,solutionResultIsCurrent} from '@/lib/workforce-solution';
import {readSavedWorkforceReview} from '@/lib/workforce-solution-review';
import { GoalConversationMessages, ConversationMessages } from "@/components/goal-conversation-messages";
import { buildHomePack, homeDefinitions, readHomeSource } from "@/lib/home-pack.mjs";
import type { DevelopmentSession } from "@/components/development-workspace";
import { PromptExamples } from "@/components/prompt-examples";
import { contextualPrompts } from "@/lib/contextual-prompts";
import { buildHomeActionPlanRequest, DEVELOPMENT_DEMO_GOAL, HOME_ACTION_PLAN_LABEL } from "@/lib/home-decision-journey";
import { completeScopedChatTurn } from "@/lib/chat-context-history";
import { requestedHomeCountries, type CountryOption } from "@/lib/home-country-scope";
import { getProblemChatHistory, withProblemContext } from "@/lib/problem-session";
import type { ProblemConversation } from "@/components/problem-conversation";
import type { AppPage, ChatMessage, Persona } from "@/lib/types";

async function ask(sources: ReturnType<typeof buildHomePack>, persona: Persona, message: string, history: ChatMessage[], signal?: AbortSignal, hasFocusedIssue = false, goalContext:unknown = null, marketReference:unknown = null) {
  const response = await fetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ page: "home", persona, message, history, goalContext, marketReference, hasFocusedIssue, overviewBriefingContext: sources }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The answer is unavailable. Please try again.");
  if (typeof data.answer !== "string") throw new Error("Answer unavailable. Please try again.");
  const inspected=inspectHomeCandidateProposal(data.candidateProposal,sources),proposal=inspected.proposal;
  const serverDiagnostic=readHomePreparationDiagnostic(data.candidateDiagnostic);
  const useServer=!data.candidateProposal&&serverDiagnostic&&serverDiagnostic.reason!=='ready';
  const diagnostic=useServer?serverDiagnostic:data.candidateProposal?inspected.diagnostic:{reason:'diagnostic_unavailable' as const,field:'none' as const,optionCount:0,missingFieldCount:0};
  return { findingFollowups:readHomeFindingFollowups(data.findingFollowups,data.answer,sources), answer: data.answer, chooseGoal: !proposal&&data.nextStep === "choose_goal", proposal, diagnostic, diagnosticStage:useServer?'server' as const:'client' as const };
}

const noActionSubscription=()=>()=>{};
const noActionSnapshot=()=>emptyOptionActions;

export function OverallOverviewPage({ optionActions, onStartDemo, active, persona, onNavigate, workforceQuery, workforceScope, conversation, developmentSession, countryOptions, onCountry, onEvidencePack, marketReference }: {
  optionActions?:WorkforceOptionActions;
  marketReference:unknown;
  onEvidencePack:(value:string)=>void;
  countryOptions: CountryOption[];
  onCountry: (country:string) => void;
  conversation: ProblemConversation;
  developmentSession: DevelopmentSession;
  onStartDemo: () => void;
  workforceQuery: string; workforceScope: string;
  active: boolean; persona: Persona; onNavigate: (page: AppPage) => void;
}) {
  const storage=useDecisionStorage();
  const planner=useRef<HTMLDivElement>(null);
  const [planningReview,setPlanningReview]=useState<HomeCapacityRequest|null>(null);
  const [retentionEntry,setRetentionEntry]=useState<{id:string;sequence:number}|null>(null);
  const activePinnedGoal=storage.data.goals.activeId===conversation.activeGoalId&&storage.data.goals.goals.some(goal=>goal.id===conversation.activeGoalId&&goal.statement===conversation.focusedIssue)&&Boolean(conversation.activeGoalId&&conversation.focusedIssue);
  const planRationale=useRef(new Map<ChatMessage,string>());
  const hasPlan=storage.data.workspaces[conversation.activeGoalId]?.fields.workforceSolution!==undefined;
  const hasRetention=Boolean(conversation.activeGoalId)&&(retentionEntry?.id===conversation.activeGoalId||storage.data.workspaces[conversation.activeGoalId]?.fields.retentionWhatIfV1!==undefined);
  const planningContext=JSON.stringify([conversation.workspaceKey,conversation.focusedIssue,workforceQuery,persona,active,conversation.input,conversation.messages.length]);
  function compareWorkforceOptions(){
    const saved=decisionStore.getSnapshot(),goals=saved.data.goals;
    if(!active||!activePinnedGoal||!saved.saved||goals.activeId!==conversation.activeGoalId||goals.goals.find(goal=>goal.id===conversation.activeGoalId)?.statement!==conversation.focusedIssue||conversation.loading||!conversation.storageReady||!conversation.saved||conversation.issueEditor)return;
    if(hasPlan){revealJourneyTarget(planner.current?.querySelector<HTMLElement>('[aria-label="Workforce solution calculation"]')??planner.current?.querySelector<HTMLElement>('[data-home-planner-heading]')??planner.current);return;}
    if(hasRetention){setRetentionEntry(previous=>({id:conversation.activeGoalId,sequence:(previous?.sequence??0)+1}));return;}
    setPlanningReview({context:planningContext,goalId:conversation.activeGoalId,goal:conversation.focusedIssue});
  }
  const [sourceResults, setSourceResults] = useState<Record<string, unknown>>({});
  const [loadedScope, setLoadedScope] = useState("");
  const [settledEvidenceKey,setSettledEvidenceKey]=useState("");
  const [evidenceRevision, setEvidenceRevision] = useState(0);
  const pack = buildHomePack(sourceResults, workforceScope, conversation.focusedIssue || conversation.problem?.latestQuestion || "", developmentSession);
  const storedPreparation=storage.data.workspaces[conversation.activeGoalId]?.fields[bundlePreparationField];
  const preparedPlan=storedPreparation&&typeof storedPreparation==='object'&&'binding' in storedPreparation?readBundlePreparation(storedPreparation,storedPreparation.binding as ActionBinding,pack):null;
  const hasPreparedPlan=preparedPlan?.binding.goalId===conversation.activeGoalId&&preparedPlan.binding.goal===conversation.focusedIssue&&preparedPlan.proposal.bundles.length>0;
  const [planEdit,setPlanEdit]=useState<BundleDiscussion|null>(null),[editPreview,setEditPreview]=useState<BundleEditPreview|null>(null),[editNotice,setEditNotice]=useState('');
  const editReview=useRef<HTMLDivElement>(null);
  const sources = pack.sources;
  const [candidate,setCandidate]=useState<{proposal:HomeCandidateProposal;selectionGoal:string;sourceKey:string;context:string;epoch:number;originGoalId:string;rationale:ChatMessage;userGoal:string|null}|null>(null);
  const [candidateNotice,setCandidateNotice]=useState('');
  const [actionPin,setActionPin]=useState<{id:string;sequence:number}|null>(null);
  const [planOpen,setPlanOpen]=useState<{goalId:string;goal:string;sequence:number}|null>(null);
  const [preparationUnavailable,setPreparationUnavailable]=useState<{context:string;diagnostic:HomePreparationDiagnostic;stage:'server'|'client'}|null>(null);
  const storedCandidate=storage.data.workspaces[conversation.activeGoalId]?.fields.homeCandidateOptions;
  const selectionGoal=candidateSelectionGoal(storedCandidate)??conversation.focusedIssue;
  const savedCandidatePack=buildHomePack(sourceResults,workforceScope,selectionGoal,developmentSession);
  const savedCandidate=readHomeCandidateRecord(storedCandidate,conversation.activeGoalId,conversation.focusedIssue,savedCandidatePack);
  const savedSolution=readWorkforceSolution(storage.data.workspaces[conversation.activeGoalId]?.fields.workforceSolution);
  const selectedResult=storage.data.workspaces[conversation.activeGoalId]?.fields.workforceInspection;
  const savedResult=savedSolution?.results.filter(item=>item.kind==='brief'&&item.calculator.name==='single-role-workforce-review').findLast(item=>!selectedResult||item.id===selectedResult);
  const hasCalculatedPlan=Boolean(savedSolution&&savedResult&&currentSolutionVersion(savedSolution).inputs.scope.goalStatement===conversation.focusedIssue&&solutionResultIsCurrent(savedSolution,savedResult)&&readSavedWorkforceReview(savedSolution,savedResult));
  const evidencePacket=JSON.stringify({goalKey:conversation.workspaceKey,goal:conversation.focusedIssue,pack});
  useEffect(()=>{onEvidencePack(evidencePacket);},[onEvidencePack,evidencePacket]);
  const [loading, setLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const { messages, setMessages, input, setInput, loading: chatLoading, setLoading: setChatLoading, error: chatError, setError: setChatError, problem: journey, questionUnanswered, setQuestionUnanswered, history: modelHistoryRef } = conversation;
  const hasAnswer=messages.some(message=>message.role==="assistant");
  const optionSnapshot=useSyncExternalStore(optionActions?.subscribe??noActionSubscription,optionActions?.getSnapshot??noActionSnapshot,noActionSnapshot);
  const [suggestionPending,setSuggestionPending]=useState(false);
  const [localAction,setLocalAction]=useState<{goalId:string;notice:string}|null>(null);
  const localCandidate=Boolean(optionActions&&isOptionActionLabel(input));
  const hasVerifiedOptions=Boolean(optionSnapshot.goalId&&optionSnapshot.goalId===conversation.activeGoalId);
  const actionOffers=hasVerifiedOptions?optionSnapshot.offers:[];
  const liveActive=useRef(active),promptEpoch=useRef(0),queuedSuggestion=useRef<symbol|null>(null);
  const renderedPromptEpoch=promptEpoch.current;
  const recentSuggestions=useRef(new Set<string>());
  const sending=useRef<symbol|null>(null);
  type FindingTurn={message:ChatMessage;findings:HomeFindingFollowup[];context:string;epoch:number;goalId:string;goal:string;selectionGoal:string;sourceKey:string};
  const [findingTurn,setFindingTurn]=useState<FindingTurn|null>(null);
  const liveFindingTurn=useRef<FindingTurn|null>(null);
  function changeQuestion(value:string){setLocalAction(null);setInput(value)}
  const loaded = useRef("");
  const loadedAt = useRef(0);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversationViewport = useRef<HTMLDivElement>(null);
  const composerSlot=useRef<HTMLDivElement>(null),composerDock=useRef<HTMLDivElement>(null);
  useHomeComposerDock(active,composerSlot,composerDock,composer);
  useLayoutEffect(()=>{
    const node=composer.current;if(!node||!active)return;
    const resize=()=>{node.style.height='auto';node.style.height=`${Math.min(320,Math.max(48,node.scrollHeight+2))}px`;};
    resize();let width=node.clientWidth;
    const observer=new ResizeObserver(()=>{if(node.clientWidth!==width){width=node.clientWidth;resize();}});
    observer.observe(node);return()=>observer.disconnect();
  },[input,active]);
  const selectedCountry = new URLSearchParams(workforceQuery).get("country") ?? "all";
  const scopeIdentity = JSON.stringify([conversation.workspaceKey,conversation.focusedIssue,persona]);
  useLayoutEffect(()=>{if(active&&conversationViewport.current)conversationViewport.current.scrollTop=0;},[active,scopeIdentity,workforceQuery]);
  type ScopeChoice = {message:string; query:string; identity:string; kind:"apply"|"ambiguous"|"unsupported"; options:CountryOption[]};
  type PendingScope = {message:string; query:string; identity:string};
  const [scopeChoice,setScopeChoice] = useState<ScopeChoice|null>(null);
  const [pendingScope,setPendingScope] = useState<PendingScope|null>(null);
  const pendingScopeRef = useRef<PendingScope|null>(null);
  const visibleScopeChoice = scopeChoice?.identity===scopeIdentity && scopeChoice.query===workforceQuery && scopeChoice.message===input.trim() ? scopeChoice : null;
  function applyCountry(option:CountryOption) {
    if (!visibleScopeChoice || pendingScopeRef.current) return;
    conversation.cancelPending();
    const query=new URLSearchParams(workforceQuery);query.set("country",option.value);
    const pending={message:visibleScopeChoice.message,query:"?"+query.toString(),identity:scopeIdentity};
    pendingScopeRef.current=pending;setPendingScope(pending);setScopeChoice(null);onCountry(option.value);
  }

  useEffect(() => {
    const loadKey = JSON.stringify({workforceQuery, workforceScope, refresh, persona});
    if (!active || (loaded.current === loadKey && Date.now() - loadedAt.current < 300000)) return;
    // An interrupted scope load must not leave an older cache key suppressing its reload.
    loaded.current = "";
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setEvidenceError(null);
      const keys = [...new Set(homeDefinitions.map(def => def[1]))].filter(key => !["catalogue","development"].includes(key));
      const entries = await Promise.all(keys.map(async key => [key, await readHomeSource("/api/" + key + (key === "dashboard" ? workforceQuery : ""), controller.signal)]));
      if (controller.signal.aborted) return;
      const next = Object.fromEntries(entries);
      setSourceResults(next); setLoadedScope(workforceQuery); setSettledEvidenceKey(loadKey); setEvidenceRevision(value => value + 1);
      if (Object.values(next).every(source => (source as {status:string}).status !== "loaded")) setEvidenceError("Remote evidence unavailable. Session examples remain available; coverage is partial.");
      loaded.current = loadKey; loadedAt.current = Date.now(); setLoading(false);
    };
    void load();
    return () => controller.abort();
  }, [active, persona, refresh, workforceQuery, workforceScope]);

  const contextKey = JSON.stringify({ goalId:conversation.activeGoalId, persona, workforceQuery, workforceScope, evidenceRevision, refresh, developmentSession, focusedIssue:conversation.focusedIssue });
  const currentEvidenceKey = useRef(contextKey);
  const cancelPending = useRef(conversation.cancelPending);
  useLayoutEffect(() => { cancelPending.current = conversation.cancelPending; });
  useLayoutEffect(() => {
    if (currentEvidenceKey.current !== contextKey) { currentEvidenceKey.current = contextKey; liveFindingTurn.current=null; cancelPending.current();sending.current=null; }
  }, [contextKey]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Cancel the queued user action on explicit page exit; preserve its draft.
  useLayoutEffect(()=>{liveActive.current=active;if(!active){liveFindingTurn.current=null;queuedSuggestion.current=null;setSuggestionPending(false);sending.current=null;cancelPending.current();}return()=>{liveActive.current=false;queuedSuggestion.current=null;}},[active]);
  useEffect(()=>{const identity=()=>{const goals=decisionStore.getSnapshot().data.goals;return JSON.stringify([goals.activeId,goals.goals.find(goal=>goal.id===goals.activeId)?.statement])};let prior=identity();return decisionStore.subscribe(()=>{const next=identity();if(next!==prior){prior=next;promptEpoch.current++;liveFindingTurn.current=null;setCandidate(null);setPreparationUnavailable(null);queuedSuggestion.current=null;setSuggestionPending(false);}})},[]);
  const planRequest = questionUnanswered ? null : buildHomeActionPlanRequest(conversation.focusedIssue ? {key:contextKey,firstQuestion:conversation.focusedIssue,latestQuestion:journey?.latestQuestion ?? conversation.focusedIssue} : journey, contextKey);

  function focusQuestion() {
    window.requestAnimationFrame(() => { composer.current?.focus(); composer.current?.scrollIntoView({ block: "nearest" }); });
  }

  function submitQuestion(prompt:string){if(ready)queueSuggestion("question:"+prompt,()=>void send(prompt))}

  function startNewIssue(draft = "") {
    conversation.startNewProblem(draft);
    focusQuestion();
  }

  async function send(question = input, actionPlan = false, scopeConfirmed = false, preserveDraft=false, retainGoalContext=false, responseIntent:'default'|'explanation'='default') {
    if (actionPlan && (!planRequest || input.trim())) return;
    const message = (actionPlan ? planRequest! : question).trim();
    if(!active||sending.current||currentEvidenceKey.current!==contextKey)return;
    if(!actionPlan&&!preserveDraft&&planEdit?.goalId===conversation.activeGoalId){
      if(chatLoading||!conversation.saved||!ready)return;
      try{if(!planEdit.isCurrent())throw Error('The selected plan or context changed. Choose Discuss changes on the current plan.');setEditPreview(planEdit.preview(message));setEditNotice('Review these changes before accepting. Nothing is saved or calculated.');}
      catch(error){setEditPreview(null);setEditNotice((error as Error).message);}
      requestAnimationFrame(()=>{editReview.current?.focus({preventScroll:true});editReview.current?.scrollIntoView({block:'nearest'});});return;
    }
    if(!actionPlan&&optionActions&&isOptionActionLabel(message)){
      setLocalAction({goalId:conversation.activeGoalId,notice:'Choose the current option action button to open it. Typed or restored action text cannot select an option.'});return;
    }
    if (!message || !sources || loadedScope !== workforceQuery || chatLoading || loading || sources.every(source => !source.facts)) return;
    if (/^(?:please\s+|can you\s+)?(?:export|download)\b/i.test(message)) {
      setMessages(current=>[...current,{role:"user",content:message},{role:"assistant",content:"CSV downloads are currently available on Workforce and Skills Intelligence. Open one of those pages and choose Export current data (CSV), then Send. Home exports, other modules and employee-name rosters are not available yet; no file was downloaded."}]);if(!preserveDraft)setInput("");return;
    }
    if (!actionPlan && !scopeConfirmed) {
      const requested=requestedHomeCountries(message,countryOptions,selectedCountry);
      if(requested.kind!=="none") { if(preserveDraft){setCandidateNotice("This clarification requests different country evidence. Your drafts are kept. Change the workforce country filter before updating options.");return false;} setInput(message);setScopeChoice({message,query:workforceQuery,identity:scopeIdentity,...requested});return; }
    }
    setScopeChoice(null);setLocalAction(null);
    liveFindingTurn.current=null;setFindingTurn(null);
    const sendTicket=Symbol();sending.current=sendTicket;const candidateEpoch=promptEpoch.current;setCandidate(null);setCandidateNotice('');setPreparationUnavailable(null);
    const request = conversation.beginRequest();
    const key = contextKey;
    const history = getProblemChatHistory(modelHistoryRef.current, key);
    recordDecisionEvidence(conversation.activeGoalId,"home",pack);
    const goalContext=actionPlan||retainGoalContext?conversation.goalContext:conversation.recordGoalStatement(message,"home",workforceScope);
    setMessages(current => [...current, { role: "user", content: actionPlan ? HOME_ACTION_PLAN_LABEL : message }]);
    if(!preserveDraft)setInput(""); setChatLoading(true); setChatError(null);
    if (!actionPlan) setQuestionUnanswered(true);
    try {
      const requestSelection=conversation.focusedIssue||message,requestPack=buildHomePack(sourceResults,workforceScope,requestSelection,developmentSession);
      const reply = await ask(requestPack, persona, withProblemContext(message, journey, conversation.focusedIssue), history, request.signal, Boolean(conversation.focusedIssue),goalContext,marketReference);
      if (!request.current() || currentEvidenceKey.current !== key || candidateEpoch!==promptEpoch.current) return;
      const answer = reply.answer;
      const assistantMessage:ChatMessage={role:"assistant",content:answer};
      if(actionPlan)planRationale.current.set(assistantMessage,conversation.activeGoalId);
      if(reply.proposal){
        const captured={proposal:reply.proposal,selectionGoal:requestSelection,sourceKey:candidateSourceKey(requestPack),context:key,epoch:candidateEpoch,originGoalId:conversation.activeGoalId,rationale:assistantMessage,userGoal:conversation.focusedIssue?null:explicitHomeGoal(message)};
        if(conversation.activeGoalId)decisionStore.setField(conversation.activeGoalId,'homeCandidateOptions',{version:2,goalId:conversation.activeGoalId,goal:conversation.focusedIssue,selectionGoal:requestSelection,sourceKey:captured.sourceKey,proposal:reply.proposal});
        else setCandidate(captured);
      }
      setPreparationUnavailable(reply.proposal||responseIntent==='explanation'?null:{context:key,diagnostic:reply.diagnostic,stage:reply.diagnosticStage});
      if(preserveDraft&&!reply.proposal&&responseIntent!=='explanation')setCandidateNotice("No new candidate options could be verified from this reply. Your existing work and drafts are kept.");
      conversation.setHomeGoalChoiceKey(reply.chooseGoal && !conversation.focusedIssue ? key : null);
      const capturedFinding:FindingTurn={message:assistantMessage,findings:reply.findingFollowups,context:key,epoch:candidateEpoch,goalId:conversation.activeGoalId,goal:conversation.focusedIssue,selectionGoal:requestSelection,sourceKey:candidateSourceKey(requestPack)};
      liveFindingTurn.current=capturedFinding;setFindingTurn(capturedFinding);
      setMessages(current => [...current, assistantMessage]);
      modelHistoryRef.current = completeScopedChatTurn(key, history, message, answer);
      if (!actionPlan) { conversation.rememberQuestion(key, message); setQuestionUnanswered(false); }
      window.requestAnimationFrame(() => { if(reply.proposal&&conversation.focusedIssue){const heading=conversationViewport.current?.querySelector<HTMLElement>('[aria-label="Investigation options for your goal"] h2');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'});return;} const viewport=conversationViewport.current,answers=viewport?.querySelectorAll<HTMLElement>('[data-chat-role="assistant"]'),answer=answers?.[answers.length-1]; if(viewport&&answer)viewport.scrollTop+=answer.getBoundingClientRect().top-viewport.getBoundingClientRect().top; });
      return Boolean(reply.proposal);
    } catch (error) { if (!request.current() || currentEvidenceKey.current !== key || candidateEpoch!==promptEpoch.current) return; setChatError(error instanceof Error ? error.message : "Answer unavailable. Please try again."); if (!actionPlan&&!preserveDraft) setInput(current=>current.trim()?current:message); }
    finally { if(sending.current===sendTicket)sending.current=null; if (request.current() && currentEvidenceKey.current === key) setChatLoading(false); }
  }

  const ready = Boolean(sources?.some(source => source.facts)) && !loading && loadedScope === workforceQuery;
  function findingCurrent(turn:FindingTurn){
    const goals=decisionStore.getSnapshot().data.goals;
    return liveFindingTurn.current===turn&&active&&liveActive.current&&ready&&conversation.storageReady&&conversation.saved&&!conversation.issueEditor&&turn.context===contextKey&&currentEvidenceKey.current===turn.context&&turn.epoch===promptEpoch.current&&goals.activeId===turn.goalId&&(goals.goals.find(goal=>goal.id===goals.activeId)?.statement??'')===turn.goal&&messages.at(-1)===turn.message&&turn.sourceKey===candidateSourceKey(buildHomePack(sourceResults,workforceScope,turn.selectionGoal,developmentSession));
  }
  function exploreFinding(turn:FindingTurn,item:HomeFindingFollowup){
    if(!findingCurrent(turn)||!conversation.canSubmitPrompt()||sending.current||queuedSuggestion.current||chatLoading)return;
    const verified=readHomeFindingFollowups(turn.findings,turn.message.content,buildHomePack(sourceResults,workforceScope,turn.selectionGoal,developmentSession)).find(finding=>finding.id===item.id);
    if(!verified||JSON.stringify(verified)!==JSON.stringify(item))return;
    // Consume this exact response synchronously. Double clicks and stale closures cannot send twice.
    liveFindingTurn.current=null;setFindingTurn(null);
    void send(buildHomeFindingPrompt(verified),false,false,true,true,'explanation');
  }
  function renderFindingAction(message:ChatMessage,text:string){
    if(!findingTurn||findingTurn.message!==message||!findingCurrent(findingTurn))return null;
    const item=findingTurn.findings.find(finding=>finding.text===text);if(!item)return null;
    return <span className="mt-1 flex flex-wrap items-center gap-x-2"><button type="button" disabled={chatLoading||suggestionPending||Boolean(input.trim())} aria-describedby={input.trim()?'home-finding-draft-note':undefined} onClick={()=>exploreFinding(findingTurn,item)} aria-label={`Explore this finding: ${item.text}`} className="min-h-11 rounded border px-2 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Explore this finding</button><span className="text-xs text-muted-foreground">Ask: {item.prompt}</span>{input.trim()&&item.id===findingTurn.findings[0].id&&<span id="home-finding-draft-note" role="status" className="basis-full text-xs text-muted-foreground">Your draft is kept. Send or clear it before exploring a finding.</span>}</span>;
  }
  function allowSuggestion(key:string){
    if(!active||!liveActive.current||renderedPromptEpoch!==promptEpoch.current||queuedSuggestion.current||chatLoading||sending.current||!conversation.canSubmitPrompt()||currentEvidenceKey.current!==contextKey)return false;
    if(recentSuggestions.current.has(key))return false;
    recentSuggestions.current.add(key);setTimeout(()=>recentSuggestions.current.delete(key),1000);return true;
  }
  function queueSuggestion(key:string,run:()=>void){
    if(!allowSuggestion(key))return;
    const ticket=Symbol();queuedSuggestion.current=ticket;setSuggestionPending(true);
    requestAnimationFrame(()=>{if(queuedSuggestion.current!==ticket)return;queuedSuggestion.current=null;setSuggestionPending(false);if(!liveActive.current||renderedPromptEpoch!==promptEpoch.current||!conversation.canSubmitPrompt()||currentEvidenceKey.current!==contextKey||sending.current)return;run()});
  }
  function submitOption(id:OptionAction){
    const command=optionActions?.stage(id);
    if(!command||command.generation!==optionSnapshot.generation||command.goalId!==conversation.activeGoalId)return;
    queueSuggestion('option:'+id,()=>{const error=optionActions!.execute(command,command.label,conversation.activeGoalId);
    setLocalAction({goalId:command.goalId,notice:error?'This action is no longer available for the current option. Review the options and choose again.':({compare:'Comparison opened using the existing calculated options.',adjust:'Selected option opened for adjustment. Review and save explicitly.',explore:'Local search controls opened. Review bounds and run the search explicitly.'}[id])});});
  }
  const candidateCurrent=!!candidate&&candidate.context===contextKey&&candidate.sourceKey===candidateSourceKey(buildHomePack(sourceResults,workforceScope,candidate.selectionGoal,developmentSession));
  function pinProblem(problem:string){
    if(!candidate||candidate.epoch!==promptEpoch.current||!candidateCurrent||chatLoading||!active||!conversation.saved||decisionStore.getSnapshot().data.goals.activeId!==candidate.originGoalId)return;
    try{
      const id=conversation.confirmWorkforceGoal(problem);
      if(!decisionStore.getSnapshot().saved)throw Error('Goal remains unsaved in this tab. Resolve browser storage before continuing.');
      if(problem===candidate.proposal.problem)decisionStore.setField(id,'homeCandidateOptions',{version:2,goalId:id,goal:problem,selectionGoal:candidate.selectionGoal,sourceKey:candidate.sourceKey,proposal:candidate.proposal});
      planRationale.current.set(candidate.rationale,id);
      setCandidate(null);setActionPin(previous=>({id,sequence:(previous?.sequence??0)+1}));
    }catch(error){setCandidateNotice(error instanceof Error?error.message:'The goal could not be pinned. Your draft is kept.')}
  }
  const candidateVerification=homeCandidateVerification(loading||settledEvidenceKey!==JSON.stringify({workforceQuery,workforceScope,refresh,persona}),storedCandidate,Boolean(savedCandidate),conversation.activeGoalId,conversation.focusedIssue,savedCandidatePack);
  const explorationChoices=candidateCurrent&&findingTurn?.message===candidate?.rationale&&findingTurn?.context===contextKey&&findingTurn.findings.length>0?<div className="flex flex-wrap items-center" aria-label="Optional finding exploration">{findingTurn.findings.map((item,index)=>{const sourceIds=[...new Set(item.evidence.map(reference=>reference.split(':')[0]))],label=sourceIds.map(id=>pack.sources.find(source=>source.id===id)?.label??id).join(' & ');return <span key={item.id} className="inline-flex items-center">{index>0&&<span aria-hidden="true" className="mx-2 h-3 border-l"/>}<button type="button" aria-label={`Explore finding: ${item.prompt}`} title={item.prompt} disabled={chatLoading||Boolean(input.trim())} onClick={()=>exploreFinding(findingTurn,item)} className="min-h-11 rounded text-xs text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Explore {label}</button></span>})}</div>:undefined;
  const candidatePanel=!hasCalculatedPlan&&(conversation.focusedIssue||candidateCurrent)?<HomeCandidateOptions explorationChoices={!conversation.focusedIssue?explorationChoices:undefined} proposedGoal={!conversation.focusedIssue&&candidateCurrent?candidate!.userGoal:undefined} supportingNarrative={!conversation.focusedIssue&&candidateCurrent?<ConversationMessages messages={[candidate!.rationale]} home onNavigate={onNavigate}/>:undefined} goal={conversation.focusedIssue} proposal={conversation.focusedIssue?savedCandidate?.proposal??null:candidateCurrent?candidate!.proposal:null} pack={conversation.focusedIssue?savedCandidatePack:buildHomePack(sourceResults,workforceScope,candidate?.selectionGoal??'',developmentSession)} busy={chatLoading||suggestionPending||!conversation.saved} ready={ready&&active} verification={candidateVerification==='checking'||candidateVerification==='unavailable'?candidateVerification:null} stale={candidateVerification==='stale'} onPin={pinProblem} onGenerate={()=>void send('Generate qualitative candidate options for my pinned goal using the current supplied evidence. Keep unsupported costs, timing and staffing unknown.',false,false,true)} onRefine={answer=>send(answer,false,false,true)} onQuantify={compareWorkforceOptions} onNavigate={onNavigate}/>:null;
  const finishScopeRequest = useEffectEvent((pending:PendingScope, cancel:boolean) => {
    if (pendingScopeRef.current!==pending) return;
    pendingScopeRef.current=null;setPendingScope(null);
    if(!cancel) void send(pending.message,false,true);
  });
  useEffect(()=>{
    if(!pendingScope) return;
    if(!active || pendingScope.identity!==scopeIdentity || pendingScope.query!==workforceQuery || input.trim()!==pendingScope.message) finishScopeRequest(pendingScope,true);
    else if(ready) finishScopeRequest(pendingScope,false);
  },[pendingScope,active,scopeIdentity,workforceQuery,input,ready]);
  function openPinnedGoal(goal:LocalGoal){
    const current=decisionStore.getSnapshot();
    if(!active||!conversation.storageReady||!current.saved||conversation.issueEditor||current.data.goals.goals.find(item=>item.id===goal.id)?.statement!==goal.statement)return;
    // Selecting a saved goal is not a new Pin event and never prepares another response.
    setActionPin(previous=>previous?{...previous,id:""}:null);
    conversation.selectGoal(goal.id);
    if(decisionStore.getSnapshot().data.goals.activeId!==goal.id)return;
    setPlanOpen(previous=>({goalId:goal.id,goal:goal.statement,sequence:(previous?.sequence??0)+1}));
  }
  const startingGuide=(
    <section aria-label="Starting guide" data-testid="overview-starting-guide" className="space-y-3 pt-0 pb-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-lg font-semibold">What do you want to achieve?</h3>
        <p className="text-sm text-muted-foreground">Describe a goal, compare options, build or adjust a plan, or ask a general workforce question.</p>
      </div>

      <div className="mt-3"><PromptExamples prompts={contextualPrompts({page:"home",goal:conversation.focusedIssue,hasConversation:messages.some(message=>message.role==="user"),evidenceReady:ready,sources})} draft={input} busy={suggestionPending||chatLoading||!ready||!active} onDraft={submitQuestion}/></div>

    </section>
  );
  return <div className="home-workspace mx-auto grid w-full max-w-none items-start gap-3 px-5 pt-3 pb-2 sm:px-8 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]"><section aria-labelledby="overall-overview-heading" className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="overall-overview-heading" className="sr-only">Home overview</h2>
        <HomeGettingStarted busy={chatLoading} onNavigate={onNavigate} onStartDemo={() => { startNewIssue(DEVELOPMENT_DEMO_GOAL); onStartDemo(); }} status={
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">In development</span>
          <button type="button" popoverTarget="home-data-details" aria-label="Open data details" title="Data, scope and conversation history" className="flex min-h-11 items-center gap-1 rounded px-2 text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><Info size={16}/><span>Data details</span></button>

        </div>
        }/>
      </header>
      <div id="home-data-details" popover="auto" role="dialog" aria-label="Data details" className="fixed inset-0 m-auto max-h-[80dvh] w-[min(60rem,92vw)] overflow-y-auto rounded-xl border bg-background p-5 text-sm text-foreground shadow-xl">
        <button type="button" aria-label="Refresh overview evidence" disabled={loading||chatLoading} onClick={event=>{event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();liveFindingTurn.current=null;loaded.current='';setRefresh(value=>value+1);}} className="mb-3 flex min-h-11 items-center gap-2 rounded border px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><RefreshCw size={18}/>Refresh evidence</button>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Data details</h2><button type="button" popoverTarget="home-data-details" popoverTargetAction="hide" className="min-h-11 rounded border px-3 focus-visible:ring-2 focus-visible:ring-ring">Close data details</button></div>
        <section aria-label="Conversation history" className="my-4"><h3 className="font-semibold">Conversation history</h3><p className="mt-1 text-xs text-muted-foreground">Reference only. Current findings use current evidence and saved goal context.</p>{messages.length?<ConversationMessages compactAssistant messages={messages} onNavigate={page=>{document.getElementById("home-data-details")?.hidePopover();onNavigate(page);}}/>:<p className="mt-2 text-sm">No conversation yet.</p>}</section>
      {Boolean(marketReference)&&<p className="mt-2 text-xs">An explicitly carried market reference [M1] is also available for this goal. Its selected geography and source period remain separate from workforce filters.</p>}
      <p role="status" className="text-xs text-muted-foreground" aria-label="Home evidence coverage">{pack.coverage.available} of {pack.coverage.total} source summaries available · detail rows are sampled. Open evidence sources for scope and unavailable data.</p>
        <p className="mt-3 text-xs">Demo only: company records are synthetic, not real employee data. AI can be wrong; plans are not approvals. Real-world actions happen outside this app.</p>
        <p className="mt-3 text-xs">Only the workforce snapshot follows shared filters; other company sources remain company-wide. BLS is US national. Quotes are fictional or unverified; comparisons use your assumptions.</p>
        <p className="mt-3 text-xs">Source creation/import history, survey provenance and scoring thresholds are not fully verified. Comment counts are not sentiment analysis; movement history has gaps. Course coverage is not proven skill improvement, and assessments are not individual predictions. Missing costs and impacts stay unknown.</p>
        <p className="mt-3 text-xs">{pack.coverage.selection}</p><p className="mt-2 text-xs">{pack.coverage.unavailable.join(". ")}</p><div className="mt-4 grid gap-4 md:grid-cols-3">
          {sources?.map(source => <article key={source.id} id={`overview-source-${source.id}`} className="min-w-0 text-sm">
            <h4 className="font-semibold">[{source.id}] {source.label}</h4>
            <p className="mt-2">{source.facts ? source.population : "Source unavailable; not zero."}</p>
            <p className="mt-1 text-muted-foreground">As of: {source.date || "not supplied"}. {source.scope}.</p>
            <p className="mt-2 text-muted-foreground">{source.limitation}</p><p className="mt-2 text-xs">{source.status}; {source.coverage.rowsIncluded} of {source.coverage.rowsAvailable ?? "unknown"} detail rows. {source.coverage.selection}</p>
            {source.id === "T3" ? <p className="mt-3 text-xs">Aggregate evidence retained; standalone page retired.</p> : <button type="button" onClick={() => onNavigate(source.page as AppPage)} className="mt-3 rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Open {source.label}</button>}
          </article>)}
        </div>
      </div>

    <div ref={planner} tabIndex={-1} className={hasCalculatedPlan?'min-w-0':'order-last min-w-0'}>
      {planningReview&&<HomeCapacityReview request={planningReview} context={planningContext} conversation={conversation} onClose={()=>{setPlanningReview(null);focusQuestion();}} onRetention={(id)=>{setPlanningReview(null);setRetentionEntry(previous=>({id,sequence:(previous?.sequence??0)+1}));}} onConfirmed={()=>{setPlanningReview(null);}}/>}
      {active&&hasRetention&&<RetentionWhatIfPanel key={conversation.activeGoalId} openSequence={retentionEntry?.sequence??0} initiallyOpen={retentionEntry?.id===conversation.activeGoalId}/>}
      {active&&<WorkforceSolutionPanel hideEntry optionActions={optionActions} page="home" onNavigate={onNavigate}/>}
    </div>
    <div ref={conversationViewport} style={{overflowAnchor:"none"}} aria-label="Home chat workspace" role="region" tabIndex={0} className="min-h-0 max-h-[70dvh] space-y-3 overflow-y-auto pr-1">
    <HomeSolutionBundles openRequest={planOpen} goalId={conversation.activeGoalId} goal={conversation.focusedIssue} pack={pack} persona={persona} goalContext={conversation.goalContext} marketReference={marketReference} active={active} ready={ready} busy={chatLoading||!conversation.saved} pin={actionPin} hasPlanningWork={hasPlan||hasRetention} onResume={compareWorkforceOptions} onDiscuss={request=>{if(request.isCurrent()){setPlanEdit(request);setEditPreview(null);setEditNotice('');focusQuestion();}}}/>
    {planEdit?.goalId===conversation.activeGoalId&&<div ref={editReview} tabIndex={-1}><HomeBundleChatReview target={planEdit} preview={editPreview} text={input} busy={chatLoading||!ready||!conversation.saved} notice={editNotice} onClose={()=>{setPlanEdit(null);setEditPreview(null);setEditNotice('');focusQuestion();}} onAccept={()=>{try{if(!active||chatLoading||!ready||!conversation.saved||!editPreview||input.trim()!==editPreview.request||!planEdit.isCurrent())throw Error('The request or current context changed. Review it again.');planEdit.accept(editPreview);setInput('');setPlanEdit(null);setEditPreview(null);setEditNotice('');}catch(error){setEditNotice((error as Error).message);}}}/></div>}
    {storage.data.workspaces[conversation.activeGoalId]?.fields.homeActionDraftV1!==undefined&&<details><summary className="min-h-11 cursor-pointer py-2">Previous action drafts and their saved scenarios</summary><HomeActionOptions goalId={conversation.activeGoalId} goal={conversation.focusedIssue} pack={pack} persona={persona} goalContext={conversation.goalContext} marketReference={marketReference} active={active} ready={ready} busy={chatLoading||!conversation.saved} pin={null} hasPlanningWork={hasPlan||hasRetention} onResume={compareWorkforceOptions}/></details>}
    {!hasAnswer&&!conversation.focusedIssue&&startingGuide}
    {loading && <p role="status" className="text-sm text-muted-foreground">Loading available evidence for your questions.</p>}

      {evidenceError && <p role="alert" className="mt-3 text-base text-destructive">{evidenceError}</p>}

    {!conversation.focusedIssue&&candidatePanel}
    {messages.length > 0 && <section aria-label="Overview conversation" className="space-y-3">
      <GoalConversationMessages messages={!conversation.focusedIssue&&candidateCurrent?messages.filter(message=>message!==candidate!.rationale):messages} hasGoal={Boolean(conversation.focusedIssue)} viewKey={JSON.stringify([conversation.workspaceKey,conversation.focusedIssue,active,workforceQuery,persona])} onNavigate={onNavigate} home hideHistory latestOnly collapsedRationale={message=>activePinnedGoal&&(planRationale.current.get(message)===conversation.activeGoalId||messages[messages.indexOf(message)-1]?.content===HOME_ACTION_PLAN_LABEL)} renderBulletAction={renderFindingAction}/>
      {conversation.homeGoalChoiceKey === contextKey && !conversation.focusedIssue && <div role="group" aria-label="Choose a goal" className="flex flex-wrap gap-2">
        <p className="w-full text-sm text-muted-foreground">State your goal in your own words.</p>
        <button type="button" disabled={chatLoading} onClick={() => { conversation.setHomeGoalChoiceKey(null); focusQuestion(); }} className="min-h-11 rounded-lg border px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">State my goal</button>
      </div>}
      {chatLoading && <p role="status" className="text-base text-muted-foreground">Thinking with the available evidence…</p>}
      {chatError && <p role="alert" className="text-destructive">{chatError}</p>}
    </section>}

    {preparationUnavailable?.context===contextKey&&<section role="status" aria-label="Problem and options not prepared" className="space-y-1 rounded border p-3 text-sm"><p className="font-semibold">Problem and options not prepared</p><p>This answer has no validated problem and options to pin. Your work and drafts are kept; nothing was pinned or calculated. No retry runs automatically.</p><details><summary className="cursor-pointer py-1">Preparation details</summary><p>Stage: {preparationUnavailable.stage}. Reason: {preparationUnavailable.diagnostic.reason}. Field: {preparationUnavailable.diagnostic.field}. Candidate count (4 means 4 or more): {preparationUnavailable.diagnostic.optionCount}. Missing fields: {preparationUnavailable.diagnostic.missingFieldCount}.</p></details></section>}
    {candidateNotice&&<p role="status">{candidateNotice}</p>}
    </div>

    <form onSubmit={event => { event.preventDefault(); void send(); }} className="home-chat-form shrink-0">
      {activePinnedGoal&&<div className="mb-2">
        <button type="button" disabled={chatLoading||!conversation.storageReady||!conversation.saved||Boolean(conversation.issueEditor)||Boolean(planningReview)} onClick={compareWorkforceOptions} className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{hasPlan?'Continue workforce options':hasRetention?'Continue retention what-if':'Compare workforce options'}</button>
        <p className="mt-1 text-xs text-muted-foreground">{hasPlan?'Continue reviewing your saved assumptions and options. Your chat draft is kept.':hasRetention?'Return to your retention assumptions. Your drafts are kept; Calculate and Save remain separate actions.':'Review your goal and choose additional role capacity or a retention what-if.'}</p>
      </div>}
      {conversation.focusedIssue&&!hasPreparedPlan&&!hasPlan&&!hasRetention && <div className="mb-2">
        <button type="button" disabled={!ready || chatLoading || !planRequest || Boolean(input.trim())} onClick={() => void send("", true)} className="min-h-11 rounded px-2 py-2 text-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{hasVerifiedOptions?"Draft a goal action plan":HOME_ACTION_PLAN_LABEL}</button>
        {(questionUnanswered || !planRequest || Boolean(input.trim())) && <p className="mt-2 text-xs text-muted-foreground">{questionUnanswered ? "Complete or retry your current question before developing a plan." : !planRequest ? "Evidence or perspective changed. Ask a question in the current scope before developing a plan." : input.trim() ? "Send your new question first so the plan uses the updated conversation." : ""}</p>}
      </div>}

      {visibleScopeChoice && <div aria-label="Requested country scope" className="mb-3 text-sm"><p>{visibleScopeChoice.kind==="ambiguous" ? "Which country should this workforce snapshot use?" : visibleScopeChoice.kind==="unsupported" ? "That country scope is not fully supported. Choose an available country or keep the current scope; missing evidence stays unavailable." : "Use country-specific workforce evidence for this question?"}</p><div className="mt-2 flex flex-wrap gap-2">{visibleScopeChoice.options.map(option=><button key={option.value} type="button" onClick={()=>applyCountry(option)} className="min-h-11 rounded border border-primary px-3 py-2 font-semibold text-primary">Apply {option.label} and answer</button>)}<button type="button" onClick={()=>void send(visibleScopeChoice.message,false,true)} className="min-h-11 px-2 text-primary underline">Answer with current scope</button></div><p className="mt-1 text-xs text-muted-foreground">Only the workforce snapshot changes. Other filters stay selected; company-wide sources retain their scope.</p></div>}
      {pendingScope && <p role="status" className="mb-3 text-sm">Refreshing the selected workforce evidence before answering. Edit your question to cancel.</p>}
      {localAction?.goalId===conversation.activeGoalId&&<p role="status" className="mb-3 text-sm">{localAction.notice}</p>}
      <div ref={composerSlot} className="home-composer-slot"><div ref={composerDock} className="home-composer-dock rounded-t-2xl border bg-card p-2 shadow-lg">
      {planEdit?.goalId===conversation.activeGoalId&&<p className="mb-1 text-xs font-medium">Editing Plan #{planEdit.option}. Send previews changes for your review.</p>}
      <label htmlFor="overview-question" className="sr-only">Ask Workforce AI</label>
      <textarea ref={composer} id="overview-question" aria-label="Ask Workforce AI" aria-describedby="overview-question-context-tip" value={input} onChange={event => changeQuestion(event.target.value)} rows={1}
        placeholder="Describe a goal, compare options, build or adjust a plan, or ask a general workforce question." className="max-h-80 min-h-12 w-full resize-y rounded-lg border bg-background/40 p-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="mt-2 flex items-end justify-between gap-3">
        <p hidden={!conversation.focusedIssue&&candidateCurrent} id="overview-question-context-tip" className="min-w-0 text-xs leading-4 text-muted-foreground">Best practice: Add context like your timeline, budget, stakeholders and relevant sources to help shape a more precise goal.</p>
        <button type="submit" aria-label="Send overview question" disabled={(!localCandidate&&!ready) || chatLoading || !input.trim()} className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Send <ArrowUp size={17} /></button></div>
      </div></div>
    </form>
      {actionOffers.length>0&&<details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm">Option action suggestions</summary><section aria-label="Workforce option actions" className="mt-3 space-y-2"><p className="text-sm text-muted-foreground">{input.trim()?'Your draft is kept. Clear it to choose an option action.':'Click to open the local action. Saving, calculation and search remain explicit.'}</p><div className="flex flex-wrap gap-2">{actionOffers.map(offer=><button key={offer.id} type="button" disabled={suggestionPending||chatLoading||Boolean(input.trim())} onClick={()=>submitOption(offer.id)} className="min-h-11 rounded-lg border px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{offer.label}</button>)}</div></section></details>}
  </section>
    <HomePinnedGoals goals={conversation.goals} activeGoalId={conversation.activeGoalId} ready={conversation.storageReady} disabled={!active||!conversation.storageReady||!conversation.saved||Boolean(conversation.issueEditor)} packet={pack} onSelect={openPinnedGoal}/>

  </div>;
}
