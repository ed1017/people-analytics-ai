"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, RefreshCw } from "lucide-react";
import { ChatContent } from "@/components/chat-content";
import { buildHomePack, homeDefinitions, readHomeSource } from "@/lib/home-pack.mjs";
import type { DevelopmentSession } from "@/components/development-workspace";
import { homeGoalReplies } from "@/lib/home-chat-reply";
import { buildHomeActionPlanRequest, DEVELOPMENT_DEMO_GOAL, HOME_ACTION_PLAN_LABEL, HOME_FIND_ISSUE_PROMPT } from "@/lib/home-decision-journey";
import { completeScopedChatTurn } from "@/lib/chat-context-history";
import { getProblemChatHistory, withProblemContext } from "@/lib/problem-session";
import type { ProblemConversation } from "@/components/problem-conversation";
import type { AppPage, ChatMessage, Persona } from "@/lib/types";

async function ask(sources: ReturnType<typeof buildHomePack>, persona: Persona, message: string, history: ChatMessage[], signal?: AbortSignal, hasFocusedIssue = false) {
  const response = await fetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ page: "home", persona, message, history, hasFocusedIssue, overviewBriefingContext: sources }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The answer is unavailable. Please try again.");
  if (typeof data.answer !== "string") throw new Error("Answer unavailable. Please try again.");
  return { answer: data.answer, chooseGoal: data.nextStep === "choose_goal" };
}

export function OverallOverviewPage({ onStartDemo, active, persona, onNavigate, workforceQuery, workforceScope, conversation, developmentSession }: {
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
  const [loading, setLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const { messages, setMessages, input, setInput, loading: chatLoading, setLoading: setChatLoading, error: chatError, setError: setChatError, problem: journey, questionUnanswered, setQuestionUnanswered, history: modelHistoryRef } = conversation;
  const loaded = useRef("");
  const loadedAt = useRef(0);
  const composer = useRef<HTMLTextAreaElement>(null);
  const goalChoiceSubmittedRef = useRef(false);
  const conversationViewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadKey = JSON.stringify({workforceQuery, workforceScope, refresh, persona});
    if (!active || (loaded.current === loadKey && Date.now() - loadedAt.current < 300000)) return;
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

  function startNewIssue(draft = "") {
    conversation.startNewProblem(draft);
    focusQuestion();
  }

  async function send(question = input, actionPlan = false) {
    if (actionPlan && (!planRequest || input.trim())) return;
    const message = (actionPlan ? planRequest! : question).trim();
    if (!message || !sources || loadedScope !== workforceQuery || chatLoading || loading || sources.every(source => !source.facts)) return;
    if (/^(?:please\s+|can you\s+)?(?:export|download)\b/i.test(message)) {
      setMessages(current=>[...current,{role:"user",content:message},{role:"assistant",content:"CSV downloads are currently available on Workforce and Skills Intelligence. Open one of those pages and choose Export current data (CSV). Home exports, other modules and employee-name rosters are not available yet; no file was downloaded."}]);setInput("");return;
    }
    const request = conversation.beginRequest();
    const key = contextKey;
    const history = getProblemChatHistory(modelHistoryRef.current, key);
    setMessages(current => [...current, { role: "user", content: actionPlan ? HOME_ACTION_PLAN_LABEL : message }]);
    setInput(""); setChatLoading(true); setChatError(null);
    if (!actionPlan) setQuestionUnanswered(true);
    try {
      const reply = await ask(buildHomePack(sourceResults, workforceScope, conversation.focusedIssue || message, developmentSession), persona, withProblemContext(message, journey, conversation.focusedIssue), history, request.signal, Boolean(conversation.focusedIssue));
      if (!request.current() || currentEvidenceKey.current !== key) return;
      const answer = reply.answer;
      goalChoiceSubmittedRef.current = false;
      conversation.setHomeGoalChoiceKey(reply.chooseGoal && !conversation.focusedIssue ? key : null);
      setMessages(current => [...current, { role: "assistant", content: answer }]);
      modelHistoryRef.current = completeScopedChatTurn(key, history, message, answer);
      if (!actionPlan) { conversation.rememberQuestion(key, message); setQuestionUnanswered(false); }
      window.requestAnimationFrame(() => { const viewport = conversationViewport.current; if (viewport) viewport.scrollTop = viewport.scrollHeight; });
    } catch (error) { if (!request.current() || currentEvidenceKey.current !== key) return; setChatError(error instanceof Error ? error.message : "Answer unavailable. Please try again."); if (!actionPlan) setInput(message); }
    finally { if (request.current() && currentEvidenceKey.current === key) setChatLoading(false); }
  }

  const ready = Boolean(sources?.some(source => source.facts)) && !loading && loadedScope === workforceQuery;
  return <div className="home-workspace mx-auto grid w-full max-w-none items-start gap-5 px-5 py-8 sm:px-8 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]"><section aria-labelledby="overall-overview-heading" className="flex min-w-0 flex-col gap-4 xl:h-[calc(100dvh-var(--app-header-height)-4rem)] xl:min-h-[42rem]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1"><h2 id="overall-overview-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl xl:text-2xl 2xl:text-3xl">From Insight to Action</h2><p className="w-full text-sm text-muted-foreground sm:w-auto">by Ed Om <span aria-hidden="true">·</span> <a className="text-primary underline" href="mailto:edwinom.nyc@gmail.com">edwinom.nyc@gmail.com</a></p></div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <button id="overall-guide-link" type="button" onClick={() => onNavigate("guide-data")} className="rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Guide &amp; Data</button>

        </div>
      <div className="basis-full"><p className="text-sm font-semibold text-primary">Interactive prototype · In development</p><p className="mt-1 text-sm text-muted-foreground">Explore with synthetic workforce data. Features are being refined.</p></div>
      </header>

    <div ref={conversationViewport} aria-label="Home chat workspace" role="region" className="min-h-[20rem] max-h-[70dvh] space-y-5 overflow-y-auto pr-1 xl:min-h-0 xl:max-h-none xl:flex-1">
    <details open={!journey && !conversation.focusedIssue}>
      <summary className="mb-3 cursor-pointer rounded-sm text-sm font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Start or explore a new question</summary>
    <section aria-label="Starting guide" data-testid="overview-starting-guide" className="py-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Start with an issue worth working on</h3>
        <button type="button" aria-label="Refresh overview evidence" disabled={loading || chatLoading}
          onClick={() => { loaded.current = ""; setRefresh(value => value + 1); }}
          className="rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><RefreshCw size={18} /></button>
      </div>
      <p className="text-base text-muted-foreground">Explore a signal in the available evidence, or tell me the business issue you already have.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Choose a starting point">
        <button type="button" disabled={!ready || chatLoading} onClick={() => void send(HOME_FIND_ISSUE_PROMPT)} className="min-h-11 rounded-lg border border-primary bg-secondary px-4 py-3 text-left text-base font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{HOME_FIND_ISSUE_PROMPT}</button>
        <button type="button" disabled={chatLoading} onClick={focusQuestion} className="min-h-11 rounded-lg border px-4 py-3 text-left text-base font-semibold hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Bring your own issue</button>
      </div>
      <p className="mt-4 text-sm">Discuss the issue, then review and pin a concise goal to keep the same focus across pages.</p>
      {loading && <p role="status" className="mt-3 text-sm text-muted-foreground">Loading available evidence for your questions.</p>}



    </section>

    <details className="mt-3">
      <summary className="cursor-pointer rounded-sm text-sm text-primary focus-visible:ring-2 focus-visible:ring-ring">More prompts</summary>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Additional Home prompts">
        {["Summarize my workforce", "Export current data (CSV)"].map(prompt => <button key={prompt} type="button" disabled={!ready || chatLoading} onClick={() => void send(prompt)} className="rounded-lg border bg-card px-4 py-3 text-base font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{prompt}</button>)}
      </div>
    </details>

    </details>


      {evidenceError && <p role="alert" className="mt-3 text-base text-destructive">{evidenceError}</p>}
      <details className="text-sm" aria-label="Data details">
        <summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">Data details</summary>
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
      </details>

    {messages.length > 0 && <section aria-label="Overview conversation" className="space-y-6">
      {messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-auto max-w-[90%] rounded-2xl bg-accent px-5 py-4 text-lg" : "text-lg"}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{message.role === "user" ? "You" : "Workforce AI"}</p><ChatContent content={message.content} onNavigate={message.role === "assistant" ? onNavigate : undefined} />
      </div>)}
      {conversation.homeGoalChoiceKey === contextKey && !conversation.focusedIssue && <div role="group" aria-label="Choose a goal" className="flex flex-wrap gap-2">
        {(Object.keys(homeGoalReplies) as Array<keyof typeof homeGoalReplies>).map(goal => <button key={goal} type="button" disabled={chatLoading || !ready || Boolean(input.trim())} onClick={() => { if (goalChoiceSubmittedRef.current) return; goalChoiceSubmittedRef.current = true; void send(homeGoalReplies[goal]); }} className="min-h-11 rounded-lg border border-primary px-4 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{goal}</button>)}
        <button type="button" disabled={chatLoading} onClick={() => { conversation.setHomeGoalChoiceKey(null); focusQuestion(); }} className="min-h-11 rounded-lg border px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Another goal</button>
      </div>}
      {chatLoading && <p role="status" className="text-base text-muted-foreground">Thinking with the available evidence…</p>}
      {chatError && <p role="alert" className="text-destructive">{chatError}</p>}
    </section>}

    </div>

    <form onSubmit={event => { event.preventDefault(); void send(); }} className="sticky bottom-3 shrink-0 rounded-2xl border bg-card p-4 shadow-lg">
      {conversation.focusedIssue && <div className="mb-3 border-b pb-3">
        <button type="button" disabled={!ready || chatLoading || !planRequest || Boolean(input.trim())} onClick={() => void send("", true)} className="min-h-11 w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{HOME_ACTION_PLAN_LABEL}</button>
        <p className="mt-2 text-xs text-muted-foreground">{questionUnanswered ? "Complete or retry your current question before developing a plan." : !planRequest ? "Evidence or perspective changed. Ask a question in the current scope before developing a plan." : input.trim() ? "Send your new question first so the plan uses the updated conversation." : "Continues this conversation with its current evidence and stated goal. Missing costs and assumptions stay explicit."}</p>
      </div>}
      {(messages.length > 0 || input) && <button type="button" onClick={() => startNewIssue()} className="mb-3 rounded-sm text-sm font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Start new problem</button>}
      {!conversation.focusedIssue && (journey || input.trim()) && <div className="mb-3"><button type="button" onClick={() => conversation.setIssueEditor({draft:input.trim().slice(0,240) || journey?.latestQuestion?.slice(0,240) || ""})} className="min-h-11 w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring">Pin as goal</button><p className="mt-2 text-xs text-muted-foreground">Keep this issue as the shared focus across every page and AI conversation. Review before pinning; data filters stay unchanged.</p></div>}
      <label htmlFor="overview-question" className="mb-2 block text-sm font-semibold">Describe a business issue, and I’ll help you explore the evidence, compare options, and build a plan.</label>
      <textarea ref={composer} id="overview-question" aria-label="Ask Workforce AI" value={input} onChange={event => setInput(event.target.value)} rows={2}
        placeholder="Type your business issue here…" className="max-h-80 min-h-20 w-full resize-y rounded-lg border bg-background/40 p-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Explore evidence here. Run calculations in Planning with explicit assumptions.</p>
        <button type="submit" aria-label="Send overview question" disabled={!ready || chatLoading || !input.trim()} className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Send <ArrowUp size={17} /></button></div>
    </form>
  </section>
    <aside className="p-5 text-sm leading-relaxed" aria-label="How to use this app">
      <h3 className="text-lg font-semibold">From question to plan</h3>
      <ol className="mt-4 list-decimal space-y-4 pl-4">
        <li><strong>Start with a question</strong><p>Ask AI to find an issue, or explore <button className="text-primary underline" onClick={()=>onNavigate("workforce")}>Workforce</button> to investigate your own.</p></li>
        <li><strong>Pin your goal</strong><p>Pin a goal to keep the app and AI focused as you explore and build a plan. You can pin multiple goals and switch between them at the top.</p></li>
        <li><strong>Plan and execute</strong><p>Bring HR, business leaders, and Finance together to compare options, agree on costs, and define next steps.</p></li>
        <li><strong>Evaluate <span className="font-normal text-muted-foreground">· Coming soon</span></strong><p>Track progress and assess whether the plan worked.</p></li>
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">Demo only. Real-world actions happen outside this app.</p>
      <details className="mt-5"><summary className="cursor-pointer rounded-sm font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">How it works</summary>
        <p className="mt-3">Review a concise issue before choosing Pin as goal. Your selected goal stays in focus across pages without changing filters. Goals are saved in this browser; conversations and carried evidence clear on reload. Use <button className="text-primary underline" onClick={()=>onNavigate("planning-overview")}>Planning</button> to compare scenarios and costs. Explore <button className="text-primary underline" onClick={()=>onNavigate("workforce")}>Workforce</button> evidence and <button className="text-primary underline" onClick={()=>onNavigate("occupational-references")}>Intelligence</button> references and simulated options. Carry evidence or quotes only when you explicitly choose to; navigation does not carry them or run models.</p>
        <button type="button" disabled={chatLoading} onClick={() => { startNewIssue(DEVELOPMENT_DEMO_GOAL); onStartDemo(); }} className="mt-3 min-h-11 rounded border px-4 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Try a guided example</button>
        <p className="mt-3">This is NOT a people analytics dashboard. It’s an AI-powered decision tool that helps you identify workforce challenges, explore solutions, and build actionable plans with clear costs, tradeoffs, and measurable goals.</p>
        <p className="mt-3">This platform is designed to help business leaders, HR, and Finance make decisions, own the outcomes, and measure the return on workforce investments.</p>
        <p className="mt-3">Home discusses available evidence and options. Course coverage is not proven skill improvement; provider quotes are fictional or unverified. Planning comparisons require explicit selections and assumptions. Missing costs and impacts remain unknown.</p>
        <button type="button" onClick={()=>onNavigate("guide-data")} className="mt-3 min-h-11 rounded-sm font-semibold text-primary underline focus-visible:ring-2 focus-visible:ring-ring">See Guide &amp; Data</button>
      </details>
    </aside>
  </div>;
}
