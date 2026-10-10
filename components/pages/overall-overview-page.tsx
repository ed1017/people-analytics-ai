"use client";
import {alternativeViewField} from '@/lib/home-plan-alternative-chat';
import {solutionDiscussionPresentations,solutionReviewPresentation} from '@/lib/home-plan-presentation';
import {ChatContent} from '@/components/chat-content';
import { datasetFetch } from "@/lib/dataset-client.mjs";

import {resolveTaResponseExtension} from "@/lib/synthetic-ta/extension";
import {localPlanDiscussion} from '@/lib/home-plan-alternative-chat';
import {structuredPlansEnabled} from '@/lib/home-plan-conversation';
import {solutionConversationEnabled} from '@/lib/home-solution-conversation';
import {useHomeSolutionConversation} from '@/components/use-home-solution-conversation';
import type {DemandIntakeControl} from '@/components/swp-demand-journey';
import type {DemandReview} from '@/lib/swp-demand';
import {SwpGuidedJourney} from '@/components/swp-guided-journey';
import {HomeSolutionConversationReview,HomeSolutionProposalLinks} from '@/components/home-solution-conversation-review';
import {GuidedDemo,GUIDED_EXAMPLE_PROMPT} from '@/components/guided-demo';
import {HomeGuidedActionsContext,GuidedActionRegistry} from '@/components/home-guided-actions';
import {homeExitReasonChartFromPacket,homeExitReasonChartMatches,type HomeExitReasonChart as ExitReasonChartData} from '@/lib/home-exit-reason-chart';
import {HomeExitReasonChart} from '@/components/home-exit-reason-chart';
import {homeTurnoverFocus} from '@/lib/home-turnover-focus';
import {homeTurnPurpose,homeEvidenceSelection} from '@/lib/home-conversation';
import {scopedPlanningObjective,completeHomePlanningTurn,planningConversationHistory} from '@/lib/home-strategic-planning';
import {homeStarterGoal,homeStarterForecast,type HomeStarterGoal} from '@/lib/home-starter-goals';
import {homeStarterExploration,buildHomeStarterExplorationPrompt,type HomeStarterExploration} from '@/lib/home-starter-exploration';
import {HomeStarterForecastChart} from '@/components/home-forecast-chart';
import {HomeForecastChart} from '@/components/home-forecast-chart';
import {homeForecastIntent} from '@/lib/home-forecast-intent';
import {assumptionsGoalFromStatements,assumptionsOnlyBundle,unavailableSourceLabels} from '@/lib/home-assumptions-fallback';
import {homePlanningNoteParts,resolveHomeUserGoal,workforceChoiceDiscoveryGoal} from '@/lib/home-planning-intent';
import {HomePinnedGoals} from "@/components/home-pinned-goals";
import {homeDemoField,readHomeDemo} from '@/lib/home-demo-catalog';
import type {LocalGoal} from "@/lib/local-goals";
import {HomeGettingStarted} from "@/components/home-getting-started";
import {HomeDataStatus} from '@/components/home-data-status';
import {DataLoadingStatus} from '@/components/data-loading-status';
import {readHomeFindingFollowups,buildHomeFindingPrompt,type HomeFindingFollowup} from "@/lib/home-finding-followups";
import {emptyOptionActions,isOptionActionLabel,type WorkforceOptionActions,type OptionAction} from "@/lib/workforce-option-actions";

import {HomeCapacityReview,type HomeCapacityRequest} from "@/components/home-capacity-review";
import {RetentionWhatIfPanel} from "@/components/retention-what-if-panel";
import {WorkforceSolutionPanel} from "@/components/workforce-solution-panel";
import {revealJourneyTarget} from "@/components/workforce-journey-continue";
import {decisionStore,recordDecisionEvidence,useDecisionStorage} from "@/components/decision-store";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUp, RefreshCw, Info } from "lucide-react";
import {queueHomeResponseReveal} from '@/components/home-response-reveal';
import {useHomeComposerDock} from '@/components/use-home-composer-dock';
import {HomeSolutionBundles} from '@/components/home-solution-bundles';
import type {BundleDiscussion} from '@/components/home-bundle-plans';
import {bundleInputKey} from '@/lib/home-bundle-reconciliation';
import {bundleChatEditIntent,type BundleEditPreview} from '@/lib/home-bundle-chat-edit';
import {HomeBundleChatReview} from '@/components/home-bundle-chat-review';
import {HomeActionOptions} from '@/components/home-action-options';
import {homeCandidateVerification} from '@/lib/home-candidate-verification';
import {isDifferentHomeIssue} from '@/lib/home-alternative-issue';
import {HomeCandidateOptions} from '@/components/home-candidate-options';
import {readHomeClarification,inspectHomeCandidateProposal,readHomePreparationDiagnostic,type HomePreparationDiagnostic,readHomeCandidateRecord,candidateSourceKey,candidateSelectionGoal,type HomeCandidateProposal} from '@/lib/home-candidate-options';
import {readWorkforceSolution,currentSolutionVersion,solutionResultIsCurrent} from '@/lib/workforce-solution';
import {readSavedWorkforceReview} from '@/lib/workforce-solution-review';
import { GoalConversationMessages, ConversationMessages } from "@/components/goal-conversation-messages";
import {HomeSourceRequests,sameHomeSourceResults} from '@/lib/home-source-client';
import { buildHomePack } from "@/lib/home-pack.mjs";
import type { DevelopmentSession } from "@/components/development-workspace";
import { PromptExamples } from "@/components/prompt-examples";
import { contextualPrompts, homeStarterGroups } from "@/lib/contextual-prompts";
import { HOME_ACTION_PLAN_LABEL, buildHomeActionPlanRequest } from "@/lib/home-decision-journey";
import { requestedHomeCountries, type CountryOption } from "@/lib/home-country-scope";
import { getHomeChatHistory, withProblemContext } from "@/lib/problem-session";
import type { ProblemConversation } from "@/components/problem-conversation";
import type { AppPage, ChatMessage, Persona } from "@/lib/types";

async function ask(sources: ReturnType<typeof buildHomePack>, persona: Persona, message: string, history: ChatMessage[], signal?: AbortSignal, hasFocusedIssue = false, goalContext:unknown = null, marketReference:unknown = null, planningCalculatorAvailable=false, planningObjective:string|null = null) {
  const response = await datasetFetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ page: "home", persona, message, history, planningObjective, goalContext, marketReference, hasFocusedIssue, overviewBriefingContext: sources, planningCalculatorAvailable }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The answer is unavailable. Please try again.");
  if (typeof data.answer !== "string") throw new Error("Answer unavailable. Please try again.");
  const inspected=inspectHomeCandidateProposal(data.candidateProposal,sources),proposal=inspected.proposal;
  const serverDiagnostic=readHomePreparationDiagnostic(data.candidateDiagnostic);
  const useServer=!data.candidateProposal&&serverDiagnostic&&serverDiagnostic.reason!=='ready';
  const diagnostic=useServer?serverDiagnostic:data.candidateProposal?inspected.diagnostic:{reason:'diagnostic_unavailable' as const,field:'none' as const,optionCount:0,missingFieldCount:0};
  return { clarification:readHomeClarification(data.clarification??proposal?.question), findingFollowups:readHomeFindingFollowups(data.findingFollowups,data.answer,sources), answer: data.answer, chooseGoal: !proposal&&data.nextStep === "choose_goal", proposal, diagnostic, diagnosticStage:useServer?'server' as const:'client' as const };
}

const noActionSubscription=()=>()=>{};
const noActionSnapshot=()=>emptyOptionActions;

export function OverallOverviewPage({ optionActions, onStartDemo, onCloseDemo=()=>{}, guidedExampleActive=false, active, persona, onNavigate, workforceQuery, workforceScope, conversation, developmentSession, countryOptions, onCountry, onEvidencePack, marketReference }: {
  optionActions?:WorkforceOptionActions;
  marketReference:unknown;
  onEvidencePack:(value:string)=>void;
  countryOptions: CountryOption[];
  onCountry: (country:string) => void;
  conversation: ProblemConversation;
  developmentSession: DevelopmentSession;
  onStartDemo: () => void;
  onCloseDemo?: () => void;
  guidedExampleActive?: boolean;
  workforceQuery: string; workforceScope: string;
  active: boolean; persona: Persona; onNavigate: (page: AppPage) => void;
}) {
  const storage=useDecisionStorage();
  const [guidedActions]=useState(()=>new GuidedActionRegistry());
  const swpCommand=useRef<((text:string)=>Promise<string|null>)|null>(null),swpModelContext=useRef<unknown>(null);
  const demandControl=useRef<DemandIntakeControl|null>(null),demandReview=useRef<((review:DemandReview)=>void)|null>(null),demandContext=useRef<unknown>(null);
  const [instructionsDismissed,setInstructionsDismissed]=useState(0);
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
  const sourceResultsRef=useRef<Record<string,unknown>>({});
  const [sourceRequests]=useState(()=>new HomeSourceRequests());
  const starterForecasts=useRef(new Map<ChatMessage,{context:string;forecast:NonNullable<ReturnType<typeof homeStarterForecast>>}>());
  const exitReasonCharts=useRef(new Map<ChatMessage,{context:string;source:unknown;chart:ExitReasonChartData}>());
  const [loadedScope, setLoadedScope] = useState("");
  const [settledEvidenceKey,setSettledEvidenceKey]=useState("");
  const [evidenceRevision, setEvidenceRevision] = useState(0);
  const pack = buildHomePack(sourceResults, workforceScope, conversation.focusedIssue || conversation.problem?.latestQuestion || "", developmentSession);
  const selectedPlanForChat=useRef<BundleDiscussion|null>(null);
  const [structuredMode,setStructuredMode]=useState(true),[structuredPending,setStructuredPending]=useState(false);
  type RecoveryPlanChoice={goalId:string;id:string;option:number;revision:number;inputKey:string};
  const [recoveryPlanChoice,setRecoveryPlanChoice]=useState<RecoveryPlanChoice|null>(null);
  const [recoveryConfirmation,setRecoveryConfirmation]=useState<{choice:RecoveryPlanChoice;request:string;context:string}|null>(null);
  function currentRecoveryChoice(target:BundleDiscussion|null):RecoveryPlanChoice|null{
    const draft=target?.snapshots?.().find(item=>item.id===target.id)?.draft;
    return target&&draft?{goalId:target.goalId,id:target.id,option:target.option,revision:target.revision,inputKey:bundleInputKey(draft)}:null;
  }
  function registerPlanForChat(target:BundleDiscussion){
    selectedPlanForChat.current=target;const choice=currentRecoveryChoice(target);
    setRecoveryPlanChoice(previous=>JSON.stringify(previous)===JSON.stringify(choice)?previous:choice);
    setRecoveryConfirmation(previous=>previous&&JSON.stringify(previous.choice)!==JSON.stringify(choice)?null:previous);
  }
  function confirmRecoveredPlan(){
    const target=selectedPlanForChat.current,choice=currentRecoveryChoice(target);
    if(!choice||!target?.isCurrent()||!conversation.saved||choice.goalId!==conversation.activeGoalId)return;
    setRecoveryConfirmation({choice,request:input.trim(),context:contextKey});setLocalAction(null);
  }
  function recoveredPlanNeedsConfirmation(message:string){
    return conversation.recoveredPlanSelectionRequired&&bundleChatEditIntent(message).edit&&!/(?:\b(?:action\s+)?plans?\s*#?\s*|#)\d+\b/i.test(message);
  }
  function recoveredPlanConfirmed(message:string,target:BundleDiscussion){
    return recoveryConfirmation?.request===message&&recoveryConfirmation.context===contextKey&&JSON.stringify(recoveryConfirmation.choice)===JSON.stringify(currentRecoveryChoice(target));
  }
  const [planEdit,setPlanEdit]=useState<BundleDiscussion|null>(null),[editPreview,setEditPreview]=useState<BundleEditPreview|null>(null),[editNotice,setEditNotice]=useState('');
  const editReview=useRef<HTMLDivElement>(null);
  const sources = pack.sources;
  const [candidate,setCandidate]=useState<{proposal:HomeCandidateProposal|null;selectionGoal:string;sourceKey:string;context:string;authoredContext:string;epoch:number;originGoalId:string;guidedGoalId?:string|null;rationale:ChatMessage;userGoal:string|null;planningChoice?:boolean;userStatements:string[];reviewRequired:boolean;starter?:HomeStarterGoal}|null>(null);
  const [candidateNotice,setCandidateNotice]=useState('');
  const [actionPin,setActionPin]=useState<{id:string;sequence:number}|null>(null);
  const [planOpen,setPlanOpen]=useState<{goalId:string;goal:string;sequence:number}|null>(null);
  const [clarification,setClarification]=useState<{context:string;question:string;statements:string[]}|null>(null);
  const [preparationUnavailable,setPreparationUnavailable]=useState<{context:string;diagnostic:HomePreparationDiagnostic;stage:'server'|'client'}|null>(null);
  const [fallbackSubmission,setFallbackSubmission]=useState<{context:string;statements:string[]}|null>(null);
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
  function resetHomeConversation(){
    conversation.resetConversation();requestAnimationFrame(()=>composer.current?.focus());
  }
  function changeQuestion(value:string){setRecoveryConfirmation(null);setLocalAction(null);setInput(value)}
  const loaded = useRef("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversationViewport = useRef<HTMLDivElement>(null);
  const responseReveal=useRef<ReturnType<typeof queueHomeResponseReveal>|null>(null);
  useLayoutEffect(()=>()=>responseReveal.current?.cancel(),[]);
  const composerSlot=useRef<HTMLDivElement>(null),composerDock=useRef<HTMLDivElement>(null);
  useHomeComposerDock(active,composerSlot,composerDock,composer);
  useLayoutEffect(()=>{
    const node=composer.current;if(!node||!active)return;
    const resize=()=>{node.style.height='auto';node.style.height=`${Math.min(320,Math.max(112,node.scrollHeight+2))}px`;};
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
  const previousPlanReset=useRef(conversation.resetEpoch);
  const clearResetState=useEffectEvent(()=>{
    if(previousPlanReset.current!==conversation.resetEpoch){selectedPlanForChat.current?.discard();previousPlanReset.current=conversation.resetEpoch;}
    promptEpoch.current++;queuedSuggestion.current=null;sending.current=null;setStructuredPending(false);recentSuggestions.current.clear();liveFindingTurn.current=null;pendingScopeRef.current=null;
    setCandidate(null);setCandidateNotice('');setClarification(null);setPreparationUnavailable(null);setFallbackSubmission(null);setFindingTurn(null);setScopeChoice(null);setPendingScope(null);setSuggestionPending(false);setLocalAction(null);setPlanningReview(null);setPlanEdit(null);setEditPreview(null);setEditNotice('');setActionPin(null);setPlanOpen(null);selectedPlanForChat.current=null;
  });
  // Home stays mounted during topic navigation; either Reset entry point must
  // discard its queued prompts, goal suggestions and unfinished chat edits.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize retained Home state with an explicit conversation reset from any page.
  useLayoutEffect(()=>{clearResetState();},[conversation.resetEpoch]);
  function applyCountry(option:CountryOption) {
    if (!visibleScopeChoice || pendingScopeRef.current) return;
    conversation.cancelPending();
    const query=new URLSearchParams(workforceQuery);query.set("country",option.value);
    const pending={message:visibleScopeChoice.message,query:"?"+query.toString(),identity:scopeIdentity};
    pendingScopeRef.current=pending;setPendingScope(pending);setScopeChoice(null);onCountry(option.value);
  }

  useEffect(() => {
    if (!active) return;
    const loadKey = JSON.stringify({workforceQuery, workforceScope, refresh, persona});
    const cached=sourceRequests.peek(workforceQuery);
    if (loaded.current===loadKey&&cached&&sameHomeSourceResults(sourceResultsRef.current,cached)) return;
    // An interrupted scope load must not leave an older cache key suppressing its reload.
    loaded.current = "";
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setEvidenceError(null);
      const next=await sourceRequests.read(workforceQuery,controller.signal);
      if (controller.signal.aborted) return;
      if(!sameHomeSourceResults(sourceResultsRef.current,next)){
        sourceResultsRef.current=next;setSourceResults(next);setEvidenceRevision(value=>value+1);
      }
      setLoadedScope(workforceQuery); setSettledEvidenceKey(loadKey);
      if (Object.values(next).every(source => (source as {status:string}).status !== "loaded")) setEvidenceError("Remote evidence unavailable. Session examples remain available; coverage is partial.");
      loaded.current = loadKey; setLoading(false);
    };
    void load();
    return () => controller.abort();
  }, [active, persona, refresh, workforceQuery, workforceScope,sourceRequests]);

  const contextKey = JSON.stringify({ resetEpoch:conversation.resetEpoch, goalId:conversation.activeGoalId, persona, workforceQuery, workforceScope, evidenceRevision, refresh, developmentSession, focusedIssue:conversation.focusedIssue });
  // User intent survives evidence-only refresh; source-backed proposals still require the exact evidence context.
  const authoredGoalKey = JSON.stringify([conversation.activeGoalId,persona,workforceQuery,workforceScope,conversation.focusedIssue,conversation.resetEpoch]);
  const fallbackContext=JSON.stringify([conversation.workspaceKey,authoredGoalKey]);
  const currentEvidenceKey = useRef(contextKey);
  const cancelPending = useRef(conversation.cancelPending);
  useLayoutEffect(() => { cancelPending.current = conversation.cancelPending; });
  useLayoutEffect(() => {
    if (currentEvidenceKey.current !== contextKey) { currentEvidenceKey.current = contextKey; liveFindingTurn.current=null; cancelPending.current();sending.current=null;
      setStructuredPending(false);
    }
  }, [contextKey]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Cancel the queued user action on explicit page exit; preserve its draft.
  useLayoutEffect(()=>{liveActive.current=active;if(!active){liveFindingTurn.current=null;queuedSuggestion.current=null;setSuggestionPending(false);sending.current=null;setStructuredPending(false);cancelPending.current();}return()=>{liveActive.current=false;queuedSuggestion.current=null;}},[active]);
  useEffect(()=>{const identity=()=>{const goals=decisionStore.getSnapshot().data.goals;return JSON.stringify([goals.activeId,goals.goals.find(goal=>goal.id===goals.activeId)?.statement])};let prior=identity();return decisionStore.subscribe(()=>{const next=identity();if(next!==prior){prior=next;promptEpoch.current++;liveFindingTurn.current=null;setCandidate(null);setClarification(null);setPreparationUnavailable(null);queuedSuggestion.current=null;setSuggestionPending(false);}})},[]);
  const planRequest = questionUnanswered ? null : buildHomeActionPlanRequest(conversation.focusedIssue ? {key:contextKey,firstQuestion:conversation.focusedIssue,latestQuestion:journey?.latestQuestion ?? conversation.focusedIssue} : journey, contextKey);

  function applyPlanChanges(){try{if(!active||chatLoading||!planEditReady||!conversation.saved||!planEdit||!editPreview||input.trim()!==editPreview.request||!planEdit.isCurrent())throw Error('The request or current context changed. Review it again.');planEdit.accept(editPreview);setInput('');setPlanEdit(null);setEditPreview(null);setEditNotice('');}catch(error){setEditNotice((error as Error).message);}}
  function focusQuestion() {
    window.requestAnimationFrame(() => { composer.current?.focus(); composer.current?.scrollIntoView({ block: "nearest" }); });
  }

  function submitQuestion(prompt:string){if(ready)queueSuggestion("question:"+prompt,()=>void send(prompt))}

  function submitStarterQuestion(prompt:string,purpose?:'swp-business'){
    if(conversation.issueEditor)return;
    const starter=!conversation.focusedIssue?homeStarterGoal(prompt):null;
    if(ready)queueSuggestion('starter:'+prompt,()=>{if(solutionConversationEnabled&&purpose==='swp-business')demandControl.current?.begin();void send(prompt,false,false,false,false,'default',starter??undefined,undefined,true);},true);
  }

  async function send(question = input, actionPlan = false, scopeConfirmed = false, preserveDraft=false, retainGoalContext=false, responseIntent:'default'|'explanation'|'alternative'='default',starter?:HomeStarterGoal,onAnswered?:()=>void, keepComposer=false) {
    if (actionPlan && (!planRequest || input.trim())) return;
    const message = (actionPlan ? planRequest! : question).trim();
    if(message)setInstructionsDismissed(value=>value+1);
    if(message&&active&&!chatLoading&&!sending.current&&swpCommand.current){
      try{const answer=await demandControl.current?.command(message)??await swpCommand.current(message);if(answer!==null){if(answer){setMessages(current=>[...current,{role:'user',content:message},{role:'assistant',content:answer}]);if(!keepComposer)setInput(current=>current.trim()===message?'':current);setChatError(null);}return;}}
      catch(error){setChatError((error as Error).message);return;}
    }
    if(!solutionConversationEnabled&&message&&(demandContext.current||swpModelContext.current)){
      setMessages(current=>[...current,{role:'user',content:message},{role:'assistant',content:'AI discussion of this scenario is unavailable in this mode. The local comparison, assumption edits, review and save work below. Use a displayed assumption name in chat to propose a change.'}]);if(!keepComposer)setInput(current=>current.trim()===message?'':current);return;
    }
    if(solutionConversationEnabled&&message){
      if(!solutions.canSend||solutions.pending||chatLoading||sending.current)return;
      const ticket=Symbol(),key=contextKey;sending.current=ticket;setChatError(null);
      responseReveal.current?.cancel();const reveal=guidedExampleActive?null:queueHomeResponseReveal(()=>conversationViewport.current,()=>liveActive.current&&currentEvidenceKey.current===key);responseReveal.current=reveal;
      try{const answer=await solutions.send(message);if(answer){setMessages(current=>[...current,{role:'user',content:message},{role:'assistant',content:answer}]);if(!keepComposer)setInput(current=>current.trim()===message?'':current);setQuestionUnanswered(false);}}
      catch(error){setChatError(error instanceof Error?error.message:'The conversation is unavailable. Your draft is kept.');}
      finally{if(sending.current===ticket)sending.current=null;if(liveActive.current&&currentEvidenceKey.current===key)reveal?.complete();else reveal?.cancel();}return;
    }
    const forecastQuestion = !actionPlan && Boolean(homeForecastIntent(message));
    if(forecastQuestion)responseIntent = 'explanation';
    if(!active||sending.current||currentEvidenceKey.current!==contextKey)return;
    const structuredTarget=selectedPlanForChat.current;
    if(structuredPlansEnabled&&structuredMode&&!actionPlan&&!preserveDraft&&!retainGoalContext&&!starter&&responseIntent==='default'&&!forecastQuestion&&!isOptionActionLabel(message)&&message!==GUIDED_EXAMPLE_PROMPT&&!/^(?:compare workforce options|review workforce numbers)[.!]?$/i.test(message)&&message&&structuredTarget?.structuredPropose&&structuredTarget.goalId===conversation.activeGoalId){
      if(chatLoading||!conversation.saved||!planEditReady)return;
      if(conversation.recoveredPlanSelectionRequired&&!recoveredPlanConfirmed(message,structuredTarget)){setLocalAction({goalId:conversation.activeGoalId,notice:'Confirm the intended Action Plan for this recovered request before sending. Nothing has changed.'});return;}
      const ticket=Symbol(),request=conversation.beginRequest(),key=contextKey;sending.current=ticket;setStructuredPending(true);setLocalAction(null);setChatError(null);
      try{
        const answer=await structuredTarget.structuredPropose(message,request.signal);
        if(!request.current()||currentEvidenceKey.current!==key)return;
        setMessages(current=>[...current,{role:'user',content:message},{role:'assistant',content:answer}]);if(!keepComposer)setInput(current=>current.trim()===message?'':current);
        requestAnimationFrame(()=>conversationViewport.current?.querySelector<HTMLElement>('[aria-label="Review saved-plan conversation"]')?.scrollIntoView({block:'nearest'}));
      }catch(error){if(request.current()&&currentEvidenceKey.current===key)setChatError(error instanceof Error?error.message:'The plan response is unavailable. Nothing was saved.');}
      finally{if(sending.current===ticket){sending.current=null;setStructuredPending(false);}}
      return;
    }
    const editIntent=bundleChatEditIntent(message),localEdit=editIntent.edit,localDiscussion=localPlanDiscussion(message);
    if(!actionPlan&&!preserveDraft&&(localEdit||localDiscussion)&&(selectedPlanForChat.current?.goalId===conversation.activeGoalId||editIntent.planReference||localDiscussion)){
      if(chatLoading||!conversation.saved||!planEditReady)return;
      const target=selectedPlanForChat.current;
      if(!target||target.goalId!==conversation.activeGoalId){setLocalAction({goalId:conversation.activeGoalId,notice:'Select the intended Action Plan tab, then send this change again for review. Your request is kept; nothing has changed.'});return;}
      if(recoveredPlanNeedsConfirmation(message)&&!recoveredPlanConfirmed(message,target)){setLocalAction({goalId:conversation.activeGoalId,notice:'Review the intended Action Plan tab and confirm it for this recovered request before sending. Nothing has changed.'});return;}
      setLocalAction(null);setPlanEdit(target);
      try{if(!target.isCurrent())throw Error('The selected plan or context changed. Select the intended Plan tab and send the change again.');const answer=target.propose(message);modelHistoryRef.current={...modelHistoryRef.current,planningObjective:null};setMessages(current=>[...current,{role:'user',content:message},{role:'assistant',content:answer}]);if(!keepComposer)setInput('');setPlanEdit(null);setEditPreview(null);setEditNotice('');setChatError(null);requestAnimationFrame(()=>{const panel=conversationViewport.current?.querySelector<HTMLElement>('[aria-label="Action Plans for your goal"]');panel?.scrollIntoView({block:'start'});});}
      catch(error){setEditPreview(null);setEditNotice((error as Error).message);setLocalAction({goalId:conversation.activeGoalId,notice:(error as Error).message});}
      requestAnimationFrame(()=>{editReview.current?.focus({preventScroll:true});editReview.current?.scrollIntoView({block:'nearest'});});return;
    }
    if(!localEdit&&planEdit){setPlanEdit(null);setEditPreview(null);setEditNotice('');}
    if(!actionPlan&&!preserveDraft&&activePinnedGoal&&/^(?:compare workforce options|review workforce numbers)[.!]?$/i.test(message)){compareWorkforceOptions();return;}
    if(!actionPlan&&optionActions&&isOptionActionLabel(message)){
      setLocalAction({goalId:conversation.activeGoalId,notice:'Choose the current option action button to open it. Typed or restored action text cannot select an option.'});return;
    }
    if (!message || !sources || loadedScope !== workforceQuery || chatLoading || loading || sources.every(source => !source.facts)) return;
    if (/^(?:please\s+|can you\s+)?(?:export|download)\b/i.test(message)) {
      modelHistoryRef.current={...modelHistoryRef.current,planningObjective:null};
      setMessages(current=>[...current,{role:"user",content:message},{role:"assistant",content:"CSV downloads are currently available on Workforce and Skills Intelligence. Open one of those pages and choose Export current data (CSV), then Send. Home exports, other modules and employee-name rosters are not available yet; no file was downloaded."}]);if(!preserveDraft&&!keepComposer)setInput("");return;
    }
    if (!actionPlan && !scopeConfirmed && !forecastQuestion) {
      const requested=requestedHomeCountries(message,countryOptions,selectedCountry);
      if(requested.kind!=="none") { if(preserveDraft||keepComposer){setCandidateNotice("This clarification requests different country evidence. Your drafts are kept. Change the workforce country filter before updating options.");return false;} setInput(message);setScopeChoice({message,query:workforceQuery,identity:scopeIdentity,...requested});return; }
    }
    setScopeChoice(null);setLocalAction(null);
    liveFindingTurn.current=null;setFindingTurn(null);
    const clarificationStatements=clarification?.context===contextKey?clarification.statements:[];
    const previousCandidate=responseIntent==='alternative'?candidate:null;
    const sendTicket=Symbol();sending.current=sendTicket;const candidateEpoch=promptEpoch.current;if(!previousCandidate)setCandidate(null);setCandidateNotice('');setPreparationUnavailable(null);
    const request = conversation.beginRequest();
    const key = contextKey;
    const history = getHomeChatHistory(modelHistoryRef.current, key);
    const planningObjective=scopedPlanningObjective(modelHistoryRef.current,key);
    const purpose=homeTurnPurpose(message,planningConversationHistory(history,planningObjective,true)),prepareGoal=!starter&&responseIntent!=='explanation'&&(purpose==='goal'||purpose==='discovery');
    if(!actionPlan)setFallbackSubmission(prepareGoal?{context:fallbackContext,statements:[...history.filter(item=>item.role==='user').map(item=>item.content),message].slice(-6)}:null);
    recordDecisionEvidence(conversation.activeGoalId,"home",pack);
    const goalContext=actionPlan||retainGoalContext||forecastQuestion||Boolean(selectedPlanForChat.current?.goalId===conversation.activeGoalId)?conversation.goalContext:conversation.recordGoalStatement(message,"home",workforceScope);
    setMessages(current => [...current, { role: "user", content: actionPlan ? HOME_ACTION_PLAN_LABEL : message }]);
    if(!preserveDraft&&!keepComposer)setInput(""); setChatLoading(true); setChatError(null);
    responseReveal.current?.cancel();
    const reveal=queueHomeResponseReveal(()=>conversationViewport.current,()=>liveActive.current&&request.current()&&currentEvidenceKey.current===key&&candidateEpoch===promptEpoch.current);
    responseReveal.current=reveal;
    if (!actionPlan) setQuestionUnanswered(true);
    try {
      const requestSelection=homeEvidenceSelection(message,history,conversation.focusedIssue),requestPack=buildHomePack(sourceResults,workforceScope,requestSelection,developmentSession);
      const reply = await ask(requestPack, persona, withProblemContext(message, journey, conversation.focusedIssue), history, request.signal, Boolean(conversation.focusedIssue),goalContext,marketReference,demandControl.current?.calculatorAvailable()===true,planningObjective);
      if (!request.current() || currentEvidenceKey.current !== key || candidateEpoch!==promptEpoch.current) return;
      const starterForecast=starter?homeStarterForecast(starter,requestPack,workforceQuery,undefined,decisionStore.getDatasetToken()):null;
      const answer = starterForecast?starterForecast.summary+'\n\n'+reply.answer:reply.answer;
      const assistantMessage:ChatMessage={role:"assistant",content:answer};
      if(starterForecast)starterForecasts.current.set(assistantMessage,{context:key,forecast:starterForecast});
      const chart=homeExitReasonChartFromPacket(requestPack);
      if(chart&&homeExitReasonChartMatches(answer,chart))exitReasonCharts.current.set(assistantMessage,{context:key,source:sourceResults['survey-sentiment'],chart});
      if(actionPlan)planRationale.current.set(assistantMessage,conversation.activeGoalId);
      const priorStatements=history.filter(item=>item.role==='user').map(item=>item.content);
      // Preserve chronological repetitions (including a restated goal after withdrawal).
      const userStatements=[...(clarificationStatements.length>priorStatements.length?clarificationStatements:priorStatements),message].slice(-6);
      setClarification(prepareGoal&&reply.clarification?{context:key,question:reply.clarification,statements:userStatements}:null);
      const planningGoal=prepareGoal?workforceChoiceDiscoveryGoal(message):null;
      const intent=resolveHomeUserGoal(responseIntent==='alternative'?[message]:userStatements),userGoal=guidedExampleActive&&message===GUIDED_EXAMPLE_PROMPT?GUIDED_EXAMPLE_PROMPT:starter&&!conversation.focusedIssue?starter.goal:!prepareGoal||conversation.focusedIssue||forecastQuestion?null:planningGoal??(intent.status==='explicit_outcome'?intent.goal:null);
      const reviewRequired=prepareGoal&&!planningGoal&&!forecastQuestion&&!conversation.focusedIssue&&intent.status==='needs_review';
      const proposal=!prepareGoal||planningGoal||reply.clarification||reviewRequired||!conversation.focusedIssue&&intent.reason==='withdrawn'?null:reply.proposal;
      const differentIssue=responseIntent!=='alternative'||Boolean(previousCandidate?.proposal&&proposal&&isDifferentHomeIssue(previousCandidate.proposal,proposal));
      if(differentIssue&&(userGoal||(proposal||reviewRequired)&&!reply.clarification)){
        const captured={proposal,selectionGoal:requestSelection,sourceKey:candidateSourceKey(requestPack),context:key,authoredContext:authoredGoalKey,epoch:candidateEpoch,originGoalId:conversation.activeGoalId,guidedGoalId:guidedExampleActive&&message===GUIDED_EXAMPLE_PROMPT?guidedActions.goalId:null,rationale:assistantMessage,userGoal,planningChoice:Boolean(planningGoal),userStatements:starter?[message]:userStatements.slice(intent.contextStart),reviewRequired,starter};
        if(conversation.activeGoalId&&proposal)decisionStore.setField(conversation.activeGoalId,'homeCandidateOptions',{version:2,goalId:conversation.activeGoalId,goal:conversation.focusedIssue,selectionGoal:requestSelection,sourceKey:captured.sourceKey,proposal});
        else setCandidate(captured);
      }
      if(responseIntent==='alternative'&&!differentIssue){setClarification(null);setCandidateNotice('No different supported issue could be verified from this reply. Your current suggested goal is kept.');}
      setPreparationUnavailable(!prepareGoal||planningGoal||reply.proposal||reply.clarification||responseIntent!=='default'?null:{context:key,diagnostic:reply.diagnostic,stage:reply.diagnosticStage});
      if(prepareGoal&&preserveDraft&&!reply.proposal&&responseIntent==='default')setCandidateNotice("No new candidate options could be verified from this reply. Your existing work and drafts are kept.");
      conversation.setHomeGoalChoiceKey(prepareGoal&&reply.chooseGoal && responseIntent!=='alternative' && !userGoal && !reviewRequired && !conversation.focusedIssue ? key : null);
      const capturedFinding:FindingTurn={message:assistantMessage,findings:reply.findingFollowups,context:key,epoch:candidateEpoch,goalId:conversation.activeGoalId,goal:conversation.focusedIssue,selectionGoal:requestSelection,sourceKey:candidateSourceKey(requestPack)};
      liveFindingTurn.current=capturedFinding;setFindingTurn(capturedFinding);
      setMessages(current => [...current, assistantMessage]);
      modelHistoryRef.current = completeHomePlanningTurn({key,messages:history,planningObjective},key,message,reply.clarification?answer+'\n\n'+reply.clarification:answer);
      if (!actionPlan) { conversation.rememberQuestion(key, message); setQuestionUnanswered(false); }
      onAnswered?.();
      if(guidedExampleActive&&message===GUIDED_EXAMPLE_PROMPT&&guidedActions.goalId)guidedActions.emit({type:'answered',goalId:guidedActions.goalId});
      return Boolean(reply.proposal&&!reply.clarification);
    } catch (error) { if (!request.current() || currentEvidenceKey.current !== key || candidateEpoch!==promptEpoch.current) return; setChatError(error instanceof Error ? error.message : "Answer unavailable. Please try again."); if (!actionPlan&&!preserveDraft) setInput(current=>current.trim()?current:message); }
    finally { if(sending.current===sendTicket)sending.current=null; if (request.current() && currentEvidenceKey.current === key) { setChatLoading(false); reveal.complete(); } else reveal.cancel(); }
  }

  const sourcesSettled=!loading&&loadedScope===workforceQuery&&settledEvidenceKey===JSON.stringify({workforceQuery,workforceScope,refresh,persona});
  function refreshHomeData(){liveFindingTurn.current=null;loaded.current='';sourceRequests.invalidate(workforceQuery);setRefresh(value=>value+1);}
  const ready = Boolean(sources?.some(source => source.facts)) && !loading && loadedScope === workforceQuery;
  const demoPlan=readHomeDemo(storage.data.workspaces[conversation.activeGoalId]?.fields[homeDemoField],conversation.activeGoalId);
  const solutions=useHomeSolutionConversation({enabled:solutionConversationEnabled,conversation,active,settled:sourcesSettled,evidence:pack,scope:workforceScope,query:workforceQuery,planningContext:()=>demandContext.current??swpModelContext.current,demandReviewRef:demandReview,planningCalculatorAvailable:()=>demandControl.current?.calculatorAvailable()===true,target:()=>selectedPlanForChat.current,guided:guidedExampleActive?guidedActions:null});
  const planEditReady=ready||Boolean(demoPlan&&demoPlan.example.goal===conversation.focusedIssue&&conversation.storageReady);
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
  function exploreStarterTopic(turn:FindingTurn,item:HomeStarterExploration){
    if(!findingCurrent(turn)||!candidateCurrent||candidate?.rationale!==turn.message||!candidate.starter||turn.findings.length||!conversation.canSubmitPrompt()||sending.current||queuedSuggestion.current||chatLoading)return;
    const verified=homeStarterExploration(candidate.starter,buildHomePack(sourceResults,workforceScope,turn.selectionGoal,developmentSession)).find(topic=>topic.id===item.id);
    if(!verified||JSON.stringify(verified)!==JSON.stringify(item))return;
    // The same response-bound guard as finding actions: one explicit explanatory request.
    liveFindingTurn.current=null;setFindingTurn(null);
    void send(buildHomeStarterExplorationPrompt(verified),false,false,true,true,'explanation');
  }
  function renderStarterForecast(message:ChatMessage){
    const snapshot=starterForecasts.current.get(message);
    return ready&&active&&snapshot?.context===contextKey?<HomeStarterForecastChart datasetContext={pack.datasetContext} datasetToken={decisionStore.getDatasetToken()} domain={snapshot.forecast.domain} taReady={ready && Boolean(resolveTaResponseExtension((sourceResults["talent-acquisition"] as {status?:string;data?:unknown}|undefined)?.status==='loaded'?(sourceResults["talent-acquisition"] as {data?:unknown}).data:null))}/>:null;
  }
  function renderExitReasonChart(message:ChatMessage){
    const snapshot=exitReasonCharts.current.get(message);
    return ready&&active&&snapshot&&snapshot.context===contextKey&&snapshot.source===sourceResults['survey-sentiment']?<HomeExitReasonChart chart={snapshot.chart}/>:null;
  }
  function renderFindingAction(message:ChatMessage,text:string){
    if(!findingTurn||findingTurn.message!==message||!findingCurrent(findingTurn))return null;
    if(candidateCurrent&&candidate?.rationale===message)return null;
    const item=findingTurn.findings.find(finding=>finding.text===text);if(!item)return null;
    return <span className="mt-1 flex flex-wrap items-center gap-x-2"><button type="button" disabled={chatLoading||suggestionPending||Boolean(input.trim())} aria-describedby={input.trim()?'home-finding-draft-note':undefined} onClick={()=>exploreFinding(findingTurn,item)} aria-label={`Explore this finding: ${item.text}`} className="min-h-11 rounded border px-2 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Explore this finding</button><span className="text-xs text-muted-foreground">Ask: {item.prompt}</span>{input.trim()&&item.id===findingTurn.findings[0].id&&<span id="home-finding-draft-note" role="status" className="basis-full text-xs text-muted-foreground">Your draft is kept. Send or clear it before exploring a finding.</span>}</span>;
  }
  function allowSuggestion(key:string,allowDraft=false){
    if(!active||!liveActive.current||renderedPromptEpoch!==promptEpoch.current||queuedSuggestion.current||chatLoading||sending.current||!conversation.canSubmitPrompt(allowDraft)||currentEvidenceKey.current!==contextKey)return false;
    if(recentSuggestions.current.has(key))return false;
    recentSuggestions.current.add(key);setTimeout(()=>recentSuggestions.current.delete(key),1000);return true;
  }
  function queueSuggestion(key:string,run:()=>void,allowDraft=false){
    if(!allowSuggestion(key,allowDraft))return;
    const ticket=Symbol();queuedSuggestion.current=ticket;setSuggestionPending(true);
    requestAnimationFrame(()=>{if(queuedSuggestion.current!==ticket)return;queuedSuggestion.current=null;setSuggestionPending(false);if(!liveActive.current||renderedPromptEpoch!==promptEpoch.current||!conversation.canSubmitPrompt(allowDraft)||currentEvidenceKey.current!==contextKey||sending.current)return;run()});
  }
  function submitOption(id:OptionAction){
    const command=optionActions?.stage(id);
    if(!command||command.generation!==optionSnapshot.generation||command.goalId!==conversation.activeGoalId)return;
    queueSuggestion('option:'+id,()=>{const error=optionActions!.execute(command,command.label,conversation.activeGoalId);
    setLocalAction({goalId:command.goalId,notice:error?'This action is no longer available for the current option. Review the options and choose again.':({compare:'Comparison opened using the existing calculated options.',adjust:'Selected option opened for adjustment. Review and save explicitly.',explore:'Local search controls opened. Review bounds and run the search explicitly.'}[id])});});
  }
  const candidateCurrent=!!candidate&&candidate.context===contextKey&&candidate.sourceKey===candidateSourceKey(buildHomePack(sourceResults,workforceScope,candidate.selectionGoal,developmentSession));
  const userGoalCurrent=!candidate?.starter&&!!candidate?.userGoal&&!candidate.reviewRequired&&candidate.authoredContext===authoredGoalKey;
  const reviewCandidateCurrent=candidateCurrent||userGoalCurrent;
  function findAnotherIssue(){
    if(!candidateCurrent||!candidate?.proposal||candidate.userGoal||input.trim()||!ready)return;
    const excluded=candidate.proposal.problem;
    queueSuggestion('another-issue',()=>void send(`Find one different workforce issue supported by the current supplied evidence. Exclude this existing suggested goal: “${excluded}”. Use a different focus and supporting metric; do not merely reword it. If none is supported, say so without inventing a problem or priority.`,false,false,true,true,'alternative'));
  }
  function reviewUserGoal(){
    if(!candidate?.reviewRequired||candidate.epoch!==promptEpoch.current||!candidateCurrent||currentEvidenceKey.current!==contextKey||chatLoading||!active||!ready||!conversation.saved||!conversation.storageReady||conversation.issueEditor||decisionStore.getSnapshot().data.goals.activeId!==candidate.originGoalId)return;
    conversation.openIssueEditor(false,{page:'home',scope:workforceScope});
  }
  function pinProblem(problem:string){
    if(!candidate||candidate.reviewRequired||candidate.epoch!==promptEpoch.current||!reviewCandidateCurrent||currentEvidenceKey.current!==contextKey||chatLoading||!active||!ready||!conversation.saved||!conversation.storageReady||conversation.issueEditor||decisionStore.getSnapshot().data.goals.activeId!==candidate.originGoalId)return;
    try{
      const guideId=guidedExampleActive&&candidate.guidedGoalId===guidedActions.goalId?candidate.guidedGoalId:undefined;
      const id=conversation.confirmWorkforceGoal(problem,guideId??undefined);
      if(guideId)conversation.selectGoal(id);
      for(const statement of candidate.userStatements.flatMap(homePlanningNoteParts))conversation.recordGoalStatement(statement,'home',workforceScope);
      if(!decisionStore.getSnapshot().saved)throw Error('Goal remains unsaved in this tab. Resolve browser storage before continuing.');
      if(candidateCurrent&&candidate.proposal&&problem===candidate.proposal.problem)decisionStore.setField(id,'homeCandidateOptions',{version:2,goalId:id,goal:problem,selectionGoal:candidate.selectionGoal,sourceKey:candidate.sourceKey,proposal:candidate.proposal});
      planRationale.current.set(candidate.rationale,id);
      setPreparationUnavailable(null);setCandidate(null);setActionPin(previous=>({id,sequence:(previous?.sequence??0)+1}));
      guidedActions.emit({type:'pinned',goalId:id,goal:problem});
    }catch(error){setCandidateNotice(error instanceof Error?error.message:'The goal could not be pinned. Your draft is kept.')}
  }
  const fallbackStatements=fallbackSubmission?.context===fallbackContext?fallbackSubmission.statements:[];
  const fallbackGoal=assumptionsGoalFromStatements(fallbackStatements);
  const showFallbackPin=!conversation.focusedIssue&&(!reviewCandidateCurrent||!ready)&&!clarification&&sourcesSettled&&unavailableSourceLabels(pack).length>0&&fallbackGoal&&assumptionsOnlyBundle(fallbackGoal);
  function pinAssumptionsGoal(){
    if(currentEvidenceKey.current!==contextKey||renderedPromptEpoch!==promptEpoch.current||decisionStore.getSnapshot().data.goals.activeId!==conversation.activeGoalId||!showFallbackPin||!fallbackGoal||chatLoading||!active||!conversation.saved||!conversation.storageReady||conversation.issueEditor)return;
    try{conversation.confirmWorkforceGoal(fallbackGoal);for(const statement of fallbackStatements.flatMap(homePlanningNoteParts))conversation.recordGoalStatement(statement,'home',workforceScope);if(!decisionStore.getSnapshot().saved)throw Error('The goal could not be saved. Your draft is kept.');setInput(current=>current.trim()===fallbackStatements.at(-1)?'':current);setCandidate(null);setActionPin(null);}catch(error){setCandidateNotice((error as Error).message);}
  }
  const candidateVerification=homeCandidateVerification(loading||settledEvidenceKey!==JSON.stringify({workforceQuery,workforceScope,refresh,persona}),storedCandidate,Boolean(savedCandidate),conversation.activeGoalId,conversation.focusedIssue,savedCandidatePack);
  const explorationTurn=candidateCurrent&&findingTurn?.message===candidate?.rationale&&findingTurn?.context===contextKey&&messages.at(-1)===findingTurn.message&&active&&ready&&conversation.storageReady&&conversation.saved&&!conversation.issueEditor?findingTurn:null;
  const starterTopics=explorationTurn&&!explorationTurn.findings.length?homeStarterExploration(candidate?.starter,buildHomePack(sourceResults,workforceScope,explorationTurn.selectionGoal,developmentSession)):[];
  const explorationItems=explorationTurn?[...explorationTurn.findings.map(item=>({id:item.id,label:[...new Set(item.evidence.map(reference=>reference.split(':')[0]))].map(id=>pack.sources.find(source=>source.id===id)?.label??id).join(' & '),prompt:item.prompt,kind:'finding',run:()=>exploreFinding(explorationTurn,item)})),...starterTopics.map(item=>({id:item.id,label:item.label,prompt:item.prompt,kind:'topic',run:()=>exploreStarterTopic(explorationTurn,item)}))]:[];
  const explorationChoices=explorationItems.length>0?<section aria-label="Explore further" className="space-y-1"><h3 className="text-sm font-medium">Explore further</h3><div className="flex flex-wrap items-center">{explorationItems.map((item,index)=><span key={item.id} className="inline-flex items-center">{index>0&&<span aria-hidden="true" className="mx-2 h-3 border-l"/>}<button type="button" aria-label={`Explore ${item.kind}: ${item.prompt}`} title={item.prompt} aria-describedby={input.trim()?'home-exploration-draft-note':undefined} disabled={chatLoading||suggestionPending||Boolean(input.trim())} onClick={item.run} className="min-h-11 rounded text-xs text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Explore {item.label}</button></span>)}</div>{input.trim()&&<p id="home-exploration-draft-note" role="status" className="text-xs text-muted-foreground">Your draft is kept. Send or clear it before exploring further.</p>}</section>:undefined;
  const showCandidatePin=!conversation.focusedIssue&&!hasCalculatedPlan&&reviewCandidateCurrent&&!showFallbackPin;
  const prioritizeGoal=!conversation.focusedIssue&&showCandidatePin&&userGoalCurrent;
  const responseStart=messages.findLast(message=>message.role==='user');
  const turnoverFocus=prioritizeGoal&&candidate?.userGoal?homeTurnoverFocus(candidate.userGoal,buildHomePack(sourceResults,workforceScope,candidate.selectionGoal,developmentSession),workforceQuery):null;
  const candidatePanel=showCandidatePin&&candidate?.reviewRequired?<button type="button" className="min-h-11 rounded border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring" disabled={chatLoading||!ready||!conversation.saved} onClick={reviewUserGoal}>Review goal</button>:!hasCalculatedPlan&&(conversation.focusedIssue||showCandidatePin)?<HomeCandidateOptions starterGoal={!conversation.focusedIssue?candidate?.starter:undefined} turnoverFocus={turnoverFocus} focusBlocked={Boolean(input.trim())} onFocusGoal={submitQuestion} onFindAnother={!conversation.focusedIssue&&candidateCurrent&&candidate?.proposal&&!candidate.userGoal?findAnotherIssue:undefined} anotherBlocked={Boolean(input.trim())} explorationChoices={!conversation.focusedIssue?explorationChoices:undefined} planningChoice={candidate?.planningChoice} proposedGoal={!conversation.focusedIssue&&reviewCandidateCurrent?candidate!.userGoal:undefined} goal={conversation.focusedIssue} proposal={conversation.focusedIssue?savedCandidate?.proposal??null:candidateCurrent?candidate!.proposal:null} pack={conversation.focusedIssue?savedCandidatePack:buildHomePack(sourceResults,workforceScope,candidate?.selectionGoal??'',developmentSession)} busy={chatLoading||suggestionPending||!conversation.saved} ready={ready&&active} verification={candidateVerification==='checking'||candidateVerification==='unavailable'?candidateVerification:null} stale={candidateVerification==='stale'} onPin={pinProblem} onGenerate={()=>void send('Generate qualitative candidate options for my pinned goal using the current supplied evidence. Keep unsupported costs, timing and staffing unknown.',false,false,true)} onRefine={answer=>send(`Refine investigation options: ${answer}`,false,false,true)} onQuantify={compareWorkforceOptions} onNavigate={onNavigate}/>:null;
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
  function openPinnedGoal(goal:LocalGoal,planId?:string){
    const current=decisionStore.getSnapshot();
    if(!active||!conversation.storageReady||!current.saved||conversation.issueEditor||current.data.goals.goals.find(item=>item.id===goal.id)?.statement!==goal.statement)return;
    // Selecting a saved goal is not a new Pin event and never prepares another response.
    setActionPin(previous=>previous?{...previous,id:""}:null);
    conversation.selectGoal(goal.id);
    if(decisionStore.getSnapshot().data.goals.activeId!==goal.id)return;
    if(planId)decisionStore.setField(goal.id,alternativeViewField,{version:1,selectedId:planId,collapsed:false});
    setPlanOpen(previous=>({goalId:goal.id,goal:goal.statement,sequence:(previous?.sequence??0)+1}));
  }
  const planDiscussions=solutionDiscussionPresentations(messages,solutions.state);
  const reviewPresentation=solutionReviewPresentation(solutions.state);
  const activePlans=[...(reviewPresentation.recommended?[reviewPresentation.recommended]:[]),...reviewPresentation.alternatives];
  const followUpMessage=messages.findLast(message=>planDiscussions.get(message)?.proposals.some(proposal=>activePlans.some(item=>item.id===proposal.id&&item.revision===proposal.revision)));
  const followUp=followUpMessage?planDiscussions.get(followUpMessage):undefined;
  const followUpQuestions=activePlans.length?solutions.state.questions.filter(question=>!(followUp?[followUp.discussion,followUp.furtherReading].join('\n'):messages.at(-1)?.content??'').replace(/\s+/g,' ').includes(question.replace(/\s+/g,' ').trim())):[];
  const conversationPanel=(
    <section hidden={messages.length===0&&!chatError&&!chatLoading} aria-label="Overview conversation" className="space-y-3">
      {/* Leaving Home does not start a new conversation or archive the visible reply. */}
      {solutionConversationEnabled?<ConversationMessages renderMessageContent={message=>{const presentation=planDiscussions.get(message);const reference=[presentation?.reference,message!==followUpMessage?[presentation?.planningNotes,presentation?.explanation].filter(Boolean).join('\n\n'):''].filter(Boolean).join('\n\n');return <><ChatContent compact={message.role==='assistant'} content={presentation?.discussion??message.content} onNavigate={message.role==='assistant'?onNavigate:undefined}/>{reference&&<details className="mt-3 text-sm text-muted-foreground" data-plan-discussion-reference><summary className="min-h-11 cursor-pointer py-2">Original wording</summary><ChatContent compact content={reference} onNavigate={onNavigate}/></details>}{message!==followUpMessage&&presentation?.furtherReading&&<ChatContent content={'### Further reading / investigation\n\n'+presentation.furtherReading} onNavigate={onNavigate}/>}</>;}} messages={messages} responseStart={responseStart} onNavigate={onNavigate} home/>:<GoalConversationMessages messages={messages} responseStart={responseStart} renderBeforeMessage={message=>prioritizeGoal&&candidate?.rationale===message?candidatePanel:null} hasGoal={Boolean(conversation.focusedIssue)} viewKey={JSON.stringify([conversation.workspaceKey,conversation.focusedIssue,workforceQuery,persona,conversation.resetEpoch,conversation.storageReady])} onNavigate={onNavigate} home hideHistory collapsedRationale={message=>activePinnedGoal&&(planRationale.current.get(message)===conversation.activeGoalId||messages[messages.indexOf(message)-1]?.content===HOME_ACTION_PLAN_LABEL)} renderBulletAction={renderFindingAction} renderMessageSupplement={message=><><HomeForecastChart datasetContext={pack.datasetContext} datasetToken={decisionStore.getDatasetToken()} taReady={ready && Boolean(resolveTaResponseExtension((sourceResults["talent-acquisition"] as {status?:string;data?:unknown}|undefined)?.status==='loaded'?(sourceResults["talent-acquisition"] as {data?:unknown}).data:null))} question={messages[messages.indexOf(message)-1]?.role==='user'?messages[messages.indexOf(message)-1].content:''} answer={message.content}/>{renderStarterForecast(message)}{renderExitReasonChart(message)}</>}/>}
      {conversation.homeGoalChoiceKey === contextKey && !conversation.focusedIssue && <div role="group" aria-label="Choose a goal" className="flex flex-wrap gap-2">
        <p className="w-full text-sm text-muted-foreground">State your goal in your own words.</p>
        <button type="button" disabled={chatLoading} onClick={() => { conversation.setHomeGoalChoiceKey(null); focusQuestion(); }} className="min-h-11 rounded-lg border px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">State my goal</button>
      </div>}
      {chatLoading && <DataLoadingStatus name="AI answer status" label="Preparing your answer…" detail="Using the available evidence and your question."/>}
      {chatError && <p role="alert" className="text-destructive">{chatError}</p>}
    </section>
  );
  const startingGuide=(
    <section aria-label="Starting guide" data-testid="overview-starting-guide" className="space-y-3 pt-0 pb-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-2xl font-semibold">What workforce decision will support your goal?</h3>
        <p className="text-sm text-muted-foreground">Ask your question or use a prompt. Compare proposed Action Plans, then refine your choice in chat.</p>
      </div>

      <div className="mt-3"><PromptExamples groups={conversation.focusedIssue?undefined:homeStarterGroups} prompts={[...contextualPrompts({page:"home",goal:conversation.focusedIssue,hasConversation:messages.some(message=>message.role==="user"),evidenceReady:ready,sources})]} draft={input} busy={suggestionPending||chatLoading||!ready||!active||Boolean(conversation.issueEditor)} onSend={submitStarterQuestion}/></div>

    </section>
  );
  return <HomeGuidedActionsContext.Provider value={guidedActions}><div style={{overflowAnchor:'none'}} className="home-workspace mx-auto grid w-full max-w-none items-start gap-3 px-5 pt-3 pb-2 sm:px-8 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]">
    {guidedExampleActive&&<GuidedDemo active={active} conversational={solutionConversationEnabled} registry={guidedActions} onClose={onCloseDemo} actions={{
      ready:active&&conversation.storageReady&&conversation.saved&&!conversation.loading&&!solutions.pending&&!solutions.saving&&!conversation.issueEditor&&ready,
      begin:id=>conversation.beginGuidedExploration(id),
      loading:chatLoading||solutions.pending,draft:input,fillDraft:text=>{if(input.trim())throw Error('Your draft is kept. Send or clear it before loading the suggested edit.');setInput(text);},
      cancel:()=>{const id=decisionStore.getSnapshot().data.goals.activeId;if(!id||id===guidedActions.goalId){solutions.cancel();conversation.cancelPending();}},leave:()=>conversation.endGuidedExploration(),
    }}/>}<section aria-labelledby="overall-overview-heading" className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="overall-overview-heading" className="text-2xl font-semibold leading-tight tracking-tight">Workforce AI</h2>
        <button type="button" onClick={resetHomeConversation} className="min-h-11 rounded px-2 text-xs font-medium text-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">Reset conversation</button>
        <HomeGettingStarted conversational={solutionConversationEnabled} active={active} ready={conversation.storageReady} autoOpen={conversation.firstHomeVisit&&!conversation.input.trim()&&!conversation.issueEditor} busy={chatLoading||guidedExampleActive} dismissKey={JSON.stringify([instructionsDismissed,conversation.workspaceKey,guidedExampleActive])} onNavigate={onNavigate} onStartDemo={onStartDemo} status={
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">In development</span>
          <button type="button" popoverTarget="home-data-details" aria-label="Open data details" title="Data, scope and conversation history" className="flex min-h-11 items-center gap-1 rounded px-2 text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><Info size={16}/><span>Data details</span>{!sourcesSettled&&<span role="status" aria-label="Evidence refresh status">Refreshing…</span>}</button>

        </div>
        }/>
      </header>
      <HomeDataStatus loading={!sourcesSettled}/>
      <div id="home-data-details" popover="auto" role="dialog" aria-label="Data details" className="fixed inset-0 m-auto max-h-[80dvh] w-[min(60rem,92vw)] overflow-y-auto rounded-xl border bg-background p-5 text-sm text-foreground shadow-xl">
        <button type="button" aria-label="Refresh overview evidence" disabled={loading||chatLoading} onClick={event=>{event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();refreshHomeData();}} className="mb-3 flex min-h-11 items-center gap-2 rounded border px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><RefreshCw size={18}/>Refresh evidence</button>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Data details</h2><button type="button" popoverTarget="home-data-details" popoverTargetAction="hide" className="min-h-11 rounded border px-3 focus-visible:ring-2 focus-visible:ring-ring">Close data details</button></div>
      {evidenceError&&<p className="mb-3 text-xs">{evidenceError}</p>}
      <section aria-label="How filters affect evidence" className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p><strong>Workforce snapshot [W1]:</strong> {sourcesSettled?pack.sources.find((source:{id:string})=>source.id==='W1')?.scope.replace(/^(?:Selected workforce snapshot:\s*)+/, ''):'Refreshing scope; previous figures are not current.'} Only this source follows Country, Business Unit and Level. If its effective scope cannot be verified, its figures stay unavailable.</p>
        <p>Other company evidence remains company-wide or survey-specific. A goal names planning intent; it does not filter sources or set a what-if population. Department scope is unknown: Home has no Department filter or department-scoped evidence.</p>
      </section>
        <section aria-label="Conversation history" className="my-4"><h3 className="font-semibold">Conversation history</h3><p className="mt-1 text-xs text-muted-foreground">Reference only. Current findings use current evidence and saved goal context.</p>{conversation.historyMessages.length?<ConversationMessages assistantBasis={solutionConversationEnabled?'Discussion · interpretations and hypotheses. Checked quantities appear in the result cards.':undefined} compactAssistant messages={conversation.historyMessages} onNavigate={page=>{document.getElementById("home-data-details")?.hidePopover();onNavigate(page);}}/>:<p className="mt-2 text-sm">No conversation yet.</p>}</section>
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
    {solutionConversationEnabled&&<HomeSolutionProposalLinks controller={solutions}/>}
    <div ref={conversationViewport} style={{overflowAnchor:"none"}} aria-label="Home chat workspace" role="region" tabIndex={0} className="min-h-0 max-h-[70dvh] space-y-3 overflow-y-auto pr-1">
    {storage.data.workspaces[conversation.activeGoalId]?.fields.homeActionDraftV1!==undefined&&<details><summary className="min-h-11 cursor-pointer py-2">Previous action drafts and their saved scenarios</summary><HomeActionOptions goalId={conversation.activeGoalId} goal={conversation.focusedIssue} pack={pack} persona={persona} goalContext={conversation.goalContext} marketReference={marketReference} active={active} ready={ready} busy={chatLoading||!conversation.saved} pin={null} hasPlanningWork={hasPlan||hasRetention} onResume={compareWorkforceOptions}/></details>}
    {!guidedExampleActive&&<SwpGuidedJourney discussionKey={JSON.stringify([workforceScope,workforceQuery,persona])} conversation={conversation} active={active} busy={chatLoading||solutions.pending||solutions.saving} commandRef={swpCommand} modelContextRef={swpModelContext} demandControlRef={demandControl} demandReviewRef={demandReview} demandContextRef={demandContext} sources={sources??[]} onNavigate={onNavigate}/>}
    {!guidedExampleActive&&!messages.length&&!conversation.focusedIssue&&startingGuide}
    {!solutionConversationEnabled&&showFallbackPin&&!chatLoading&&<section aria-label="Review your goal without evidence" className="space-y-2 rounded border p-3 text-sm"><h3 className="font-semibold">Keep your goal and review assumptions</h3><p>{fallbackGoal}</p><p>Some sources are unavailable. You can pin this user-authored goal and explicitly prepare a local assumptions-only proposal. This does not verify the goal against evidence or run a model or calculation.</p><button className="min-h-11 rounded border px-3 py-2 font-medium disabled:opacity-50" disabled={chatLoading||!active||!conversation.saved||!conversation.storageReady||Boolean(conversation.issueEditor)} onClick={pinAssumptionsGoal}>Pin goal for assumptions-only planning</button></section>}
    {!activePinnedGoal&&conversationPanel}

    <HomeSolutionBundles existingOnly={solutionConversationEnabled} settled={sourcesSettled} chatChange={planEdit&&editPreview?{goalId:planEdit.goalId,planId:planEdit.id,inputKey:editPreview.inputKey,ready:!chatLoading&&planEditReady&&conversation.saved&&input.trim()===editPreview.request,isCurrent:planEdit.isCurrent,apply:applyPlanChanges}:null} openRequest={planOpen} goalId={conversation.activeGoalId} goal={conversation.focusedIssue} pack={pack} projectEvidence={destination=>buildHomePack(sourceResults,workforceScope,conversation.focusedIssue||conversation.problem?.latestQuestion||'',destination.development??developmentSession)} persona={persona} goalContext={conversation.goalContext} marketReference={marketReference} active={active} ready={ready} busy={chatLoading||!conversation.saved} pin={actionPin} hasPlanningWork={hasPlan||hasRetention} onResume={compareWorkforceOptions} onDiscuss={registerPlanForChat}/>
    {activePinnedGoal&&conversationPanel}
    {solutionConversationEnabled&&<HomeSolutionConversationReview planningNotes={followUp?.planningNotes} capacityRisk={followUp?.capacityRisk} controller={solutions} goal={conversation.focusedIssue} pack={pack} showSaved={recoveryPlanChoice?.goalId!==conversation.activeGoalId}/>}
    {solutionConversationEnabled&&(followUp?.furtherReading||followUp?.explanation||followUpQuestions.length>0)&&<section aria-label="Further reading and investigation" className="space-y-3 text-base"><h3 className="text-lg font-semibold">Further reading / investigation</h3>{followUp?.explanation&&<details><summary className="min-h-11 cursor-pointer py-2">Capacity explanation</summary><ChatContent content={followUp.explanation} onNavigate={onNavigate}/></details>}<ChatContent content={followUp?.furtherReading??''} onNavigate={onNavigate}/>{followUpQuestions.length>0&&<ul className="list-disc space-y-1 pl-5">{followUpQuestions.map(question=><li key={question}>{question}</li>)}</ul>}</section>}
    {planEdit?.goalId===conversation.activeGoalId&&<div ref={editReview} tabIndex={-1}><HomeBundleChatReview target={planEdit} preview={editPreview} text={input} busy={chatLoading||!planEditReady||!conversation.saved} notice={editNotice} onClose={()=>{setPlanEdit(null);setEditPreview(null);setEditNotice('');focusQuestion();}}/></div>}

    {!solutionConversationEnabled&&!conversation.focusedIssue&&!prioritizeGoal&&candidatePanel}
    {clarification?.context===contextKey&&<section aria-label="Clarify your goal" className="space-y-2 rounded border border-primary/40 p-3 text-sm"><p className="font-semibold">{clarification.question}</p><p>{userGoalCurrent?'You can pin your stated goal above. This question can refine the plan; unresolved details still need review.':'Reply in the chat below. Your original goal and constraints are kept; nothing is pinned or calculated.'}</p><button type="button" className="min-h-11 rounded border px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring" onClick={focusQuestion}>Answer in chat</button></section>}
    {preparationUnavailable?.context===contextKey&&<section role="status" aria-label="Problem and options not prepared" className="space-y-1 rounded border p-3 text-sm"><p className="font-semibold">Problem and options not prepared</p><p>{showCandidatePin&&candidate?.userGoal&&!candidate.proposal?'No validated investigation options were prepared. You can still pin your own stated goal above to request Action Plan drafts.':'This answer has no validated problem and options to pin.'} Your work and drafts are kept; nothing was pinned or calculated. No retry runs automatically.</p><details><summary className="cursor-pointer py-1">Preparation details</summary><p>Stage: {preparationUnavailable.stage}. Reason: {preparationUnavailable.diagnostic.reason}. Field: {preparationUnavailable.diagnostic.field}. Candidate count (4 means 4 or more): {preparationUnavailable.diagnostic.optionCount}. Missing fields: {preparationUnavailable.diagnostic.missingFieldCount}.</p></details></section>}
    {candidateNotice&&<p role="status">{candidateNotice}</p>}
    </div>

    <form onSubmit={event => { event.preventDefault(); void send(); }} className="home-chat-form shrink-0">
      {visibleScopeChoice && <div aria-label="Requested country scope" className="mb-3 text-sm"><p>{visibleScopeChoice.kind==="ambiguous" ? "Which country should this workforce snapshot use?" : visibleScopeChoice.kind==="unsupported" ? "That country scope is not fully supported. Choose an available country or keep the current scope; missing evidence stays unavailable." : "Use country-specific workforce evidence for this question?"}</p><div className="mt-2 flex flex-wrap gap-2">{visibleScopeChoice.options.map(option=><button key={option.value} type="button" onClick={()=>applyCountry(option)} className="min-h-11 rounded border border-primary px-3 py-2 font-semibold text-primary">Apply {option.label} and answer</button>)}<button type="button" onClick={()=>void send(visibleScopeChoice.message,false,true)} className="min-h-11 px-2 text-primary underline">Answer with current scope</button></div><p className="mt-1 text-xs text-muted-foreground">Only the workforce snapshot changes. Other filters stay selected; company-wide sources retain their scope.</p></div>}
      {recoveredPlanNeedsConfirmation(input)&&<section aria-label="Confirm plan for recovered request" className="mb-3 space-y-2 rounded border p-3 text-sm">
        <p>Your recovered request does not name a plan. Another tab may have changed the selection. Select the intended Action Plan tab, then confirm it here before sending.</p>
        {recoveryPlanChoice?.goalId===conversation.activeGoalId&&<button type="button" className="min-h-11 rounded border px-3 py-2 font-medium" disabled={!conversation.saved||chatLoading||!planEditReady} onClick={confirmRecoveredPlan}>Use Action Plan #{recoveryPlanChoice.option} for this recovered request</button>}
        {recoveryConfirmation?.request===input.trim()&&recoveryConfirmation.context===contextKey&&JSON.stringify(recoveryConfirmation.choice)===JSON.stringify(recoveryPlanChoice)&&<p role="status">Action Plan #{recoveryPlanChoice?.option} confirmed for this request. Press Send to create a new alternative.</p>}
      </section>}
      {pendingScope && <p role="status" className="mb-3 text-sm">Refreshing the selected workforce evidence before answering. Edit your question to cancel.</p>}
      {localAction?.goalId===conversation.activeGoalId&&<p role="status" className="mb-3 text-sm">{localAction.notice}</p>}
      <div ref={composerSlot} className="home-composer-slot"><div ref={composerDock} className="home-composer-dock rounded-t-2xl border bg-card p-3 shadow-lg">
      {planEdit?.goalId===conversation.activeGoalId&&<p className="mb-1 text-xs font-medium">Editing Action Plan #{planEdit.option}. Send previews changes for your review.</p>}
      <label htmlFor="overview-question" className="sr-only">Ask Workforce AI</label>
      <textarea ref={composer} id="overview-question" aria-label="Ask Workforce AI" aria-describedby="overview-question-context-tip" value={input} onChange={event => changeQuestion(event.target.value)} rows={3}
        placeholder="Ask your question or use a prompt. Compare proposed Action Plans, then refine your choice in chat." className="max-h-80 min-h-28 w-full resize-y rounded-lg border bg-background/40 p-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="home-compose-actions mt-2 flex items-end justify-between gap-3">
        <p hidden={showCandidatePin||Boolean(activePinnedGoal)} id="overview-question-context-tip" className="min-w-0 text-sm leading-relaxed text-muted-foreground">Ask a question or follow up on an answer. To plan an action, include your desired outcome, timeline and constraints.</p>
        <button data-guide-target="submit" type="submit" aria-label="Send overview question" disabled={(solutionConversationEnabled?!solutions.canSend:(!localCandidate&&!ready&&!(demoPlan&&planEditReady&&(structuredPlansEnabled&&structuredMode||bundleChatEditIntent(input).edit||localPlanDiscussion(input))))) || chatLoading || structuredPending || solutions.pending || !input.trim()} className="ms-auto flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{structuredPending?'Reviewing…':'Send'} <ArrowUp size={17} /></button></div>
      </div></div>
    </form>
      {!solutionConversationEnabled&&structuredPlansEnabled&&recoveryPlanChoice?.goalId===conversation.activeGoalId&&<label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={structuredMode} onChange={event=>{selectedPlanForChat.current?.discard();setStructuredMode(event.target.checked);}}/>Discuss saved plans · turn off to use existing chat controls</label>}
      {actionOffers.length>0&&<details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm">Option action suggestions</summary><section aria-label="Workforce option actions" className="mt-3 space-y-2"><p className="text-sm text-muted-foreground">{input.trim()?'Your draft is kept. Clear it to choose an option action.':'Click to open the local action. Saving, calculation and search remain explicit.'}</p><div className="flex flex-wrap gap-2">{actionOffers.map(offer=><button key={offer.id} type="button" disabled={suggestionPending||chatLoading||Boolean(input.trim())} onClick={()=>submitOption(offer.id)} className="min-h-11 rounded-lg border px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{offer.label}</button>)}</div></section></details>}
  </section>
    <HomePinnedGoals goals={conversation.goals} activeGoalId={conversation.activeGoalId} ready={conversation.storageReady} disabled={!active||!conversation.storageReady||!conversation.saved||Boolean(conversation.issueEditor)} packet={pack} onSelect={openPinnedGoal}/>

  </div></HomeGuidedActionsContext.Provider>;
}
