"use client";

import {recordDecisionEvidence} from "@/components/decision-store";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, RefreshCw, Info } from "lucide-react";
import { GoalTakeaway } from "@/components/goal-takeaway";
import { GoalConversationMessages, ConversationMessages } from "@/components/goal-conversation-messages";
import { buildHomePack, homeDefinitions, readHomeSource } from "@/lib/home-pack.mjs";
import type { DevelopmentSession } from "@/components/development-workspace";
import { PromptExamples } from "@/components/prompt-examples";
import { contextualPrompts } from "@/lib/contextual-prompts";
import { homeGoalReplies } from "@/lib/home-chat-reply";
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
  return { answer: data.answer, chooseGoal: data.nextStep === "choose_goal" };
}

export function OverallOverviewPage({ onStartDemo, active, persona, onNavigate, workforceQuery, workforceScope, conversation, developmentSession, countryOptions, onCountry, onEvidencePack, marketReference }: {
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
  const [sourceResults, setSourceResults] = useState<Record<string, unknown>>({});
  const [loadedScope, setLoadedScope] = useState("");
  const [evidenceRevision, setEvidenceRevision] = useState(0);
  const pack = buildHomePack(sourceResults, workforceScope, conversation.focusedIssue || conversation.problem?.latestQuestion || "", developmentSession);
  const sources = pack.sources;
  const evidencePacket=JSON.stringify({goalKey:conversation.workspaceKey,goal:conversation.focusedIssue,pack});
  useEffect(()=>{onEvidencePack(evidencePacket);},[onEvidencePack,evidencePacket]);
  const [loading, setLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const { messages, setMessages, input, setInput, loading: chatLoading, setLoading: setChatLoading, error: chatError, setError: setChatError, problem: journey, questionUnanswered, setQuestionUnanswered, history: modelHistoryRef } = conversation;
  const loaded = useRef("");
  const loadedAt = useRef(0);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversationViewport = useRef<HTMLDivElement>(null);
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
      setSourceResults(next); setLoadedScope(workforceQuery); setEvidenceRevision(value => value + 1);
      if (Object.values(next).every(source => (source as {status:string}).status !== "loaded")) setEvidenceError("Remote evidence unavailable. Session examples remain available; coverage is partial.");
      loaded.current = loadKey; loadedAt.current = Date.now(); setLoading(false);
    };
    void load();
    return () => controller.abort();
  }, [active, persona, refresh, workforceQuery, workforceScope]);

  const contextKey = JSON.stringify({ goalId:conversation.activeGoalId, persona, workforceQuery, workforceScope, evidenceRevision, developmentSession, focusedIssue:conversation.focusedIssue });
  const currentEvidenceKey = useRef(contextKey);
  const cancelPending = useRef(conversation.cancelPending);
  useLayoutEffect(() => { cancelPending.current = conversation.cancelPending; });
  useLayoutEffect(() => {
    if (currentEvidenceKey.current !== contextKey) { currentEvidenceKey.current = contextKey; cancelPending.current(); }
  }, [contextKey]);
  const planRequest = questionUnanswered ? null : buildHomeActionPlanRequest(conversation.focusedIssue ? {key:contextKey,firstQuestion:conversation.focusedIssue,latestQuestion:journey?.latestQuestion ?? conversation.focusedIssue} : journey, contextKey);

  function focusQuestion() {
    window.requestAnimationFrame(() => { composer.current?.focus(); composer.current?.scrollIntoView({ block: "nearest" }); });
  }

  function draftQuestion(prompt: string) {
    if (chatLoading || input.trim()) return;
    if(conversation.draftExample(prompt))focusQuestion();
  }

  function startNewIssue(draft = "") {
    conversation.startNewProblem(draft);
    focusQuestion();
  }

  async function send(question = input, actionPlan = false, scopeConfirmed = false) {
    if (actionPlan && (!planRequest || input.trim())) return;
    const message = (actionPlan ? planRequest! : question).trim();
    if (!message || !sources || loadedScope !== workforceQuery || chatLoading || loading || sources.every(source => !source.facts)) return;
    if (/^(?:please\s+|can you\s+)?(?:export|download)\b/i.test(message)) {
      setMessages(current=>[...current,{role:"user",content:message},{role:"assistant",content:"CSV downloads are currently available on Workforce and Skills Intelligence. Open one of those pages and choose Export current data (CSV), then Send. Home exports, other modules and employee-name rosters are not available yet; no file was downloaded."}]);setInput("");return;
    }
    if (!actionPlan && !scopeConfirmed) {
      const requested=requestedHomeCountries(message,countryOptions,selectedCountry);
      if(requested.kind!=="none") { setInput(message);setScopeChoice({message,query:workforceQuery,identity:scopeIdentity,...requested});return; }
    }
    setScopeChoice(null);
    const request = conversation.beginRequest();
    const key = contextKey;
    const history = getProblemChatHistory(modelHistoryRef.current, key);
    recordDecisionEvidence(conversation.activeGoalId,"home",pack);
    const goalContext=actionPlan?conversation.goalContext:conversation.recordGoalStatement(message,"home",workforceScope);
    setMessages(current => [...current, { role: "user", content: actionPlan ? HOME_ACTION_PLAN_LABEL : message }]);
    setInput(""); setChatLoading(true); setChatError(null);
    if (!actionPlan) setQuestionUnanswered(true);
    try {
      const reply = await ask(buildHomePack(sourceResults, workforceScope, conversation.focusedIssue || message, developmentSession), persona, withProblemContext(message, journey, conversation.focusedIssue), history, request.signal, Boolean(conversation.focusedIssue),goalContext,marketReference);
      if (!request.current() || currentEvidenceKey.current !== key) return;
      const answer = reply.answer;
      conversation.setHomeGoalChoiceKey(reply.chooseGoal && !conversation.focusedIssue ? key : null);
      setMessages(current => [...current, { role: "assistant", content: answer }]);
      modelHistoryRef.current = completeScopedChatTurn(key, history, message, answer);
      if (!actionPlan) { conversation.rememberQuestion(key, message); setQuestionUnanswered(false); }
      window.requestAnimationFrame(() => { const viewport = conversationViewport.current; if (viewport) viewport.scrollTop = viewport.scrollHeight; });
    } catch (error) { if (!request.current() || currentEvidenceKey.current !== key) return; setChatError(error instanceof Error ? error.message : "Answer unavailable. Please try again."); if (!actionPlan) setInput(message); }
    finally { if (request.current() && currentEvidenceKey.current === key) setChatLoading(false); }
  }

  const ready = Boolean(sources?.some(source => source.facts)) && !loading && loadedScope === workforceQuery;
  const finishScopeRequest = useEffectEvent((pending:PendingScope, cancel:boolean) => {
    if (pendingScopeRef.current!==pending) return;
    pendingScopeRef.current=null;setPendingScope(null);
    if(!cancel) void send(pending.message,false,true);
  });
  useEffect(()=>{
    if(!pendingScope) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Finish or cancel one explicit user-requested asynchronous scope transition.
    if(!active || pendingScope.identity!==scopeIdentity || pendingScope.query!==workforceQuery || input.trim()!==pendingScope.message) finishScopeRequest(pendingScope,true);
    else if(ready) finishScopeRequest(pendingScope,false);
  },[pendingScope,active,scopeIdentity,workforceQuery,input,ready]);
  return <div className="home-workspace mx-auto grid w-full max-w-none items-start gap-5 px-5 pt-6 pb-2 sm:px-8 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]"><section aria-labelledby="overall-overview-heading" className="flex min-w-0 flex-col gap-4 xl:min-h-[calc(100dvh-var(--app-header-height)-2rem)]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1"><h2 id="overall-overview-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl xl:text-2xl 2xl:text-3xl">From Insight to Action</h2><p className="w-full text-sm text-muted-foreground sm:w-auto">by Ed Om <span aria-hidden="true">·</span> <a className="text-primary underline" href="mailto:edwinom.nyc@gmail.com">edwinom.nyc@gmail.com</a></p></div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">In development</span>
          <button type="button" popoverTarget="home-data-details" aria-label="Open data details" title="Data, scope and conversation history" className="flex min-h-11 items-center gap-1 rounded px-2 text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><Info size={16}/><span>Data details</span></button>
          <button id="overall-guide-link" type="button" onClick={() => onNavigate("guide-data")} className="rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Guide &amp; Data</button>

        </div>
      </header>
      <div id="home-data-details" popover="auto" role="dialog" aria-label="Data details" className="fixed inset-0 m-auto max-h-[80dvh] w-[min(60rem,92vw)] overflow-y-auto rounded-xl border bg-background p-5 text-sm text-foreground shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Data details</h2><button type="button" popoverTarget="home-data-details" popoverTargetAction="hide" className="min-h-11 rounded border px-3 focus-visible:ring-2 focus-visible:ring-ring">Close data details</button></div>
        <section aria-label="Conversation history" className="my-4"><h3 className="font-semibold">Conversation history</h3><p className="mt-1 text-xs text-muted-foreground">Reference only. Current findings use current evidence and saved goal context.</p>{messages.length?<ConversationMessages messages={messages} onNavigate={page=>{document.getElementById("home-data-details")?.hidePopover();onNavigate(page);}}/>:<p className="mt-2 text-sm">No conversation yet.</p>}</section>
      {Boolean(marketReference)&&<p className="mt-2 text-xs">An explicitly carried market reference [M1] is also available for this goal. Its selected geography and source period remain separate from workforce filters.</p>}
      <p role="status" className="text-xs text-muted-foreground" aria-label="Home evidence coverage">{pack.coverage.available} of {pack.coverage.total} source summaries available · detail rows are sampled. Open evidence sources for scope and unavailable data.</p>
        <p className="mt-3 text-xs">Synthetic workforce evidence. Only the workforce snapshot follows shared filters; other company sources remain company-wide. BLS is US national. Quotes are fictional or unverified; comparisons use your assumptions.</p>
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

    <div ref={conversationViewport} style={{overflowAnchor:"none"}} aria-label="Home chat workspace" role="region" className="min-h-[20rem] max-h-[70dvh] space-y-5 overflow-y-auto pr-1 xl:flex-1">
    <GoalTakeaway goalId={conversation.activeGoalId} goalContext={{...conversation.goalContext,currentScope:workforceScope}} payload={{page:"home",persona,overviewBriefingContext:pack,marketReference}} active={active} ready={ready} paused={chatLoading||Boolean(input.trim())||Boolean(pendingScope)||Boolean(conversation.issueEditor)} validGoalIds={conversation.goals.map(g=>g.id)} onNavigate={onNavigate}/>
    <section aria-label="Starting guide" data-testid="overview-starting-guide" className="py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-lg font-semibold">Questions to explore</h3>
        <p className="text-sm text-muted-foreground">Use an example or write your own question.</p>
        <button type="button" aria-label="Refresh overview evidence" disabled={loading || chatLoading}
          onClick={() => { loaded.current = ""; setRefresh(value => value + 1); }}
          className="ml-auto rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><RefreshCw size={18} /></button>
      </div>
      <div className="mt-3"><PromptExamples prompts={contextualPrompts({page:"home",goal:conversation.focusedIssue,hasConversation:messages.some(message=>message.role==="user"),evidenceReady:ready,sources})} draft={input} busy={chatLoading} onDraft={draftQuestion}/></div>
      {loading && <p role="status" className="mt-3 text-sm text-muted-foreground">Loading available evidence for your questions.</p>}



    </section>




      {evidenceError && <p role="alert" className="mt-3 text-base text-destructive">{evidenceError}</p>}


    {messages.length > 0 && <section aria-label="Overview conversation" className="space-y-6">
      <GoalConversationMessages messages={messages} hasGoal={Boolean(conversation.focusedIssue)} viewKey={JSON.stringify([conversation.workspaceKey,conversation.focusedIssue,active,workforceQuery,persona])} onNavigate={onNavigate} home hideHistory/>
      {conversation.homeGoalChoiceKey === contextKey && !conversation.focusedIssue && <div role="group" aria-label="Choose a goal" className="flex flex-wrap gap-2">
        {(Object.keys(homeGoalReplies) as Array<keyof typeof homeGoalReplies>).map(goal => <button key={goal} type="button" disabled={chatLoading || !ready || Boolean(input.trim())} onClick={() => draftQuestion(homeGoalReplies[goal])} className="min-h-11 rounded-lg border border-primary px-4 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{goal}</button>)}
        <button type="button" disabled={chatLoading} onClick={() => { conversation.setHomeGoalChoiceKey(null); focusQuestion(); }} className="min-h-11 rounded-lg border px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Another goal</button>
      </div>}
      {chatLoading && <p role="status" className="text-base text-muted-foreground">Thinking with the available evidence…</p>}
      {chatError && <p role="alert" className="text-destructive">{chatError}</p>}
    </section>}

    </div>

    <form onSubmit={event => { event.preventDefault(); void send(); }} className="mt-auto shrink-0 rounded-2xl border bg-card p-3 shadow-lg">
      {conversation.focusedIssue && <div className="mb-2">
        <button type="button" disabled={!ready || chatLoading || !planRequest || Boolean(input.trim())} onClick={() => void send("", true)} className="min-h-11 w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{HOME_ACTION_PLAN_LABEL}</button>
        {(questionUnanswered || !planRequest || Boolean(input.trim())) && <p className="mt-2 text-xs text-muted-foreground">{questionUnanswered ? "Complete or retry your current question before developing a plan." : !planRequest ? "Evidence or perspective changed. Ask a question in the current scope before developing a plan." : input.trim() ? "Send your new question first so the plan uses the updated conversation." : ""}</p>}
      </div>}
      {!conversation.focusedIssue && (journey || input.trim()) && <div className="mb-3"><button type="button" onClick={() => conversation.setIssueEditor({draft:input.trim().slice(0,240) || journey?.latestQuestion?.slice(0,240) || ""})} className="min-h-11 w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring">Pin as goal</button></div>}
      {visibleScopeChoice && <div aria-label="Requested country scope" className="mb-3 text-sm"><p>{visibleScopeChoice.kind==="ambiguous" ? "Which country should this workforce snapshot use?" : visibleScopeChoice.kind==="unsupported" ? "That country scope is not fully supported. Choose an available country or keep the current scope; missing evidence stays unavailable." : "Use country-specific workforce evidence for this question?"}</p><div className="mt-2 flex flex-wrap gap-2">{visibleScopeChoice.options.map(option=><button key={option.value} type="button" onClick={()=>applyCountry(option)} className="min-h-11 rounded border border-primary px-3 py-2 font-semibold text-primary">Apply {option.label} and answer</button>)}<button type="button" onClick={()=>void send(visibleScopeChoice.message,false,true)} className="min-h-11 px-2 text-primary underline">Answer with current scope</button></div><p className="mt-1 text-xs text-muted-foreground">Only the workforce snapshot changes. Other filters stay selected; company-wide sources retain their scope.</p></div>}
      {pendingScope && <p role="status" className="mb-3 text-sm">Refreshing the selected workforce evidence before answering. Edit your question to cancel.</p>}
      <label htmlFor="overview-question" className="sr-only">Ask Workforce AI</label>
      <textarea ref={composer} id="overview-question" aria-label="Ask Workforce AI" value={input} onChange={event => setInput(event.target.value)} rows={2}
        placeholder="Describe a business issue, and I’ll help you explore the evidence, compare options, and build or adjust a plan." className="max-h-80 min-h-[calc(4lh+1.5rem+2px)] w-full resize-y sm:min-h-20 rounded-lg border bg-background/40 p-3 text-lg placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="mt-2 flex items-center justify-end gap-3">
        <button type="submit" aria-label="Send overview question" disabled={!ready || chatLoading || !input.trim()} className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Send <ArrowUp size={17} /></button></div>
    </form>
  </section>
    <aside className="p-5 text-sm leading-relaxed" aria-label="How to use this app">
      <h3 className="text-lg font-semibold">From question to plan</h3>
      <ol className="mt-4 list-decimal space-y-4 pl-4">
        <li><strong>Start with a question</strong><p>Ask AI to find an issue, or explore <button className="text-primary underline" onClick={()=>onNavigate("workforce")}>Workforce</button> to investigate your own.</p></li>
        <li><strong>Pin your goal</strong><p>Pin a goal to keep the app and AI focused as you explore and build a plan. You can pin multiple goals and switch between them at the top.</p></li>
        <li><strong>Plan and execute</strong><p>Bring HR, business leaders, and Finance together to compare options, agree on costs, and define next steps.</p></li>
        <li><strong>Assess &amp; Evaluate <span className="font-normal text-muted-foreground">· Coming soon</span></strong><p>Track progress and assess whether the plan worked.</p></li>
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">Demo only. Real-world actions happen outside this app.</p>
      <details className="mt-5"><summary className="cursor-pointer rounded-sm font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">How it works</summary>
        <p className="mt-3">Review a concise issue before choosing Pin as goal. Your selected goal stays in focus across pages without changing filters. Goals, their conversations, carried evidence and independent Planning inputs are saved in this browser within the limits shown in Browser storage details. Use <button className="text-primary underline" onClick={()=>onNavigate("planning-overview")}>Planning</button> to compare scenarios and costs. Explore <button className="text-primary underline" onClick={()=>onNavigate("workforce")}>Workforce</button> evidence and <button className="text-primary underline" onClick={()=>onNavigate("occupational-references")}>Intelligence</button> references and simulated options. Carry evidence or quotes only when you explicitly choose to; navigation does not carry them or run models.</p>
        <button type="button" disabled={chatLoading} onClick={() => { startNewIssue(DEVELOPMENT_DEMO_GOAL); onStartDemo(); }} className="mt-3 min-h-11 rounded border px-4 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Try a guided example</button>
        <button type="button" onClick={()=>onNavigate("decision-brief")} className="ml-2 mt-3 min-h-11 rounded border px-4 py-2 font-semibold text-primary">Build AI capability without net headcount</button>
        <p className="mt-3">This is NOT a people analytics dashboard. It’s an AI-powered decision tool that helps you identify workforce challenges, explore solutions, and build actionable plans with clear costs, tradeoffs, and measurable goals.</p>
        <p className="mt-3">This platform is designed to help business leaders, HR, and Finance make decisions, own the outcomes, and measure the return on workforce investments.</p>
        <p className="mt-3">Home discusses available evidence and options. Course coverage is not proven skill improvement; provider quotes are fictional or unverified. Planning comparisons require explicit selections and assumptions. Missing costs and impacts remain unknown.</p>
        <button type="button" onClick={()=>onNavigate("guide-data")} className="mt-3 min-h-11 rounded-sm font-semibold text-primary underline focus-visible:ring-2 focus-visible:ring-ring">See Guide &amp; Data</button>
      </details>
    </aside>
  </div>;
}
