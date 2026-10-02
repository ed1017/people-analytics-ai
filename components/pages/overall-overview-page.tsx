"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, RefreshCw } from "lucide-react";
import { ChatContent } from "@/components/chat-content";
import { buildOverviewSources, type BriefingSource } from "@/lib/overview-briefing";
import { completeScopedChatTurn, getScopedChatHistory, type ScopedChatHistory } from "@/lib/chat-context-history";
import type { AppPage, ChatMessage, DashboardResponse, Persona, SkillsResponse, WorkforcePlanningResponse } from "@/lib/types";

async function readSource<T>(url: string, signal: AbortSignal): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store", signal });
    return response.ok ? await response.json() as T : null;
  } catch { return null; }
}

async function ask(sources: BriefingSource[], persona: Persona, message: string, history: ChatMessage[], signal?: AbortSignal) {
  const response = await fetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ page: "home", persona, message, history, overviewBriefingContext: sources }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The answer is unavailable. Please try again.");
  return data.answer as string;
}

export function OverallOverviewPage({ onStartDemo, active, persona, onNavigate, workforceQuery, workforceScope }: {
  onStartDemo: () => void;
  workforceQuery: string; workforceScope: string;
  active: boolean; persona: Persona; onNavigate: (page: AppPage) => void;
}) {
  const [sources, setSources] = useState<BriefingSource[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const loaded = useRef("");
  const loadedAt = useRef(0);
  const modelHistory = useRef<ScopedChatHistory>({ key: "", messages: [] });
  const composer = useRef<HTMLTextAreaElement>(null);
  const lastAnswer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadKey = JSON.stringify({workforceQuery, workforceScope, refresh, persona});
    if (!active || (loaded.current === loadKey && Date.now() - loadedAt.current < 300000)) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setEvidenceError(null);
      const [workforce, skills, planning] = await Promise.all([
        readSource<DashboardResponse>("/api/dashboard" + workforceQuery, controller.signal),
        readSource<SkillsResponse>("/api/skills", controller.signal),
        readSource<WorkforcePlanningResponse>("/api/workforce-planning", controller.signal),
      ]);
      if (controller.signal.aborted) return;
      const next = buildOverviewSources(workforce, skills, planning, workforceScope);
      setSources(next);
      if (next.every(source => !source.facts)) setEvidenceError("The evidence sources are unavailable. Refresh when the sources are reachable.");
      loaded.current = loadKey; loadedAt.current = Date.now(); setLoading(false);
    };
    void load();
    return () => controller.abort();
  }, [active, persona, refresh, workforceQuery, workforceScope]);

  async function send(question = input) {
    const message = question.trim();
    if (!message || !sources || chatLoading || loading || sources.every(source => !source.facts)) return;
    if (/^(?:please\s+|can you\s+)?(?:export|download)\b/i.test(message)) {
      setMessages(current=>[...current,{role:"user",content:message},{role:"assistant",content:"CSV downloads are currently available on Workforce and Skills Intelligence. Open one of those pages and choose Export current data (CSV). Home exports, other modules and employee-name rosters are not available yet; no file was downloaded."}]);setInput("");return;
    }
    const key = JSON.stringify({ persona, sources });
    const history = getScopedChatHistory(modelHistory.current, key);
    setMessages(current => [...current, { role: "user", content: message }]);
    setInput(""); setChatLoading(true); setChatError(null);
    try {
      const answer = await ask(sources, persona, message, history);
      setMessages(current => [...current, { role: "assistant", content: answer }]);
      modelHistory.current = completeScopedChatTurn(key, history, message, answer);
      window.requestAnimationFrame(() => lastAnswer.current?.scrollIntoView({ block: "nearest" }));
    } catch (error) { setChatError(error instanceof Error ? error.message : "Answer unavailable. Please try again."); }
    finally { setChatLoading(false); }
  }

  const ready = Boolean(sources?.some(source => source.facts)) && !loading;
  return <div className="mx-auto grid w-full max-w-none items-start gap-5 px-5 py-8 sm:px-8 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]"><section aria-labelledby="overall-overview-heading" className="flex min-w-0 flex-col gap-4 xl:h-[calc(100dvh-var(--app-header-height)-4rem)] xl:min-h-[34rem]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="overall-overview-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl xl:text-2xl 2xl:text-3xl">Your workforce, in perspective.</h2>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <button id="overall-guide-link" type="button" onClick={() => onNavigate("guide-data")} className="rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Guide &amp; Data</button>
          <details className="relative">
            <summary className="cursor-pointer rounded border px-2 py-1 font-medium focus-visible:ring-2 focus-visible:ring-ring">Synthetic data &amp; scope</summary>
            <p className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-8rem))] rounded-lg border bg-card p-3 text-sm shadow-lg">Synthetic workforce data. The Workforce snapshot follows selected filters; Skills and Planning remain company-wide. Source dates and limitations are available in the evidence cards and Guide &amp; Data.</p>
          </details>
        </div>
      </header>

    <div aria-label="Home chat workspace" role="region" className="min-h-[20rem] max-h-[70dvh] space-y-5 overflow-y-auto pr-1 xl:min-h-0 xl:max-h-none xl:flex-1">
      <div className="flex flex-wrap items-center gap-2 text-sm"><span>Bring your own question, or</span><button type="button" onClick={onStartDemo} className="rounded border px-3 py-2 font-semibold text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">Try a guided example</button></div>
    <details open={messages.length === 0}>
      <summary className="mb-3 cursor-pointer rounded-sm text-sm font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring">Starting guide and suggested questions</summary>
    <section aria-label="Starting guide" data-testid="overview-starting-guide" className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Start with a workforce question</h3>
        <button type="button" aria-label="Refresh overview evidence" disabled={loading || chatLoading}
          onClick={() => { loaded.current = ""; setRefresh(value => value + 1); }}
          className="rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><RefreshCw size={18} /></button>
      </div>
      <ul className="space-y-3 text-base">
        <li><button type="button" onClick={() => onNavigate("workforce")} className="rounded-sm font-semibold text-primary underline focus-visible:ring-2 focus-visible:ring-ring">Workforce</button>: identify a problem and define a goal using the data.</li>
        <li><button type="button" onClick={() => onNavigate("skills")} className="rounded-sm font-semibold text-primary underline focus-visible:ring-2 focus-visible:ring-ring">Talent</button>: explore capabilities, gaps, and possible responses.</li>
        <li><button type="button" onClick={() => onNavigate("planning-overview")} className="rounded-sm font-semibold text-primary underline focus-visible:ring-2 focus-visible:ring-ring">Planning</button>: compare options, costs, and tradeoffs to build a plan.</li>
      </ul>
      <p className="mt-4 text-lg font-medium">What workforce challenge would you like to work on?</p>
      {loading && <p role="status" className="mt-3 text-sm text-muted-foreground">Loading available evidence for your questions.</p>}
      {evidenceError && <p role="alert" className="mt-3 text-base text-destructive">{evidenceError}</p>}
      <details className="mt-4 border-t pt-4">
        <summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">Sources, populations and limitations</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {sources?.map(source => <article key={source.id} id={`overview-source-${source.id}`} className="min-w-0 text-sm">
            <h4 className="font-semibold">[{source.id}] {source.label}</h4>
            <p className="mt-2">{source.facts ? source.population : "Source unavailable; not zero."}</p>
            <p className="mt-1 text-muted-foreground">As of: {source.date || "not supplied"}. {source.scope}.</p>
            <p className="mt-2 text-muted-foreground">{source.limitation}</p>
            <button type="button" onClick={() => onNavigate(source.page)} className="mt-3 rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Open {source.label}</button>
          </article>)}
        </div>
      </details>
    </section>

    <div className="flex flex-wrap gap-2" aria-label="Guided overview questions">
      {["Find a workforce issue worth investigating", "Summarize my workforce", "Develop an action plan from the current data, with priorities, next steps, costs where supported, and measures of success.", "Export current data (CSV)"].map(prompt => <button key={prompt} type="button" disabled={!ready || chatLoading}
        onClick={() => void send(prompt)} className="rounded-full border bg-card px-4 py-3 text-base font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{prompt}</button>)}
    </div>

    </details>

    {messages.length > 0 && <section aria-label="Overview conversation" className="space-y-6">
      {messages.map((message, index) => <div key={index} ref={index === messages.length - 1 ? lastAnswer : undefined} className={message.role === "user" ? "ml-auto max-w-[90%] rounded-2xl bg-accent px-5 py-4 text-lg" : "text-lg"}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{message.role === "user" ? "You" : "Workforce AI"}</p><ChatContent content={message.content} onNavigate={message.role === "assistant" ? onNavigate : undefined} />
      </div>)}
      {chatLoading && <p role="status" className="text-base text-muted-foreground">Thinking with the available evidence…</p>}
      {chatError && <p role="alert" className="text-destructive">{chatError}</p>}
    </section>}

    </div>

    <form onSubmit={event => { event.preventDefault(); void send(); }} className="sticky bottom-3 shrink-0 rounded-2xl border bg-card p-4 shadow-lg">
      <label htmlFor="overview-question" className="mb-2 block text-sm font-semibold">Describe a business issue, and I’ll help you explore the evidence, compare options, and build a plan.</label>
      <textarea ref={composer} id="overview-question" aria-label="Ask Workforce AI" value={input} onChange={event => setInput(event.target.value)} rows={2}
        placeholder="Type your business issue here…" className="max-h-80 min-h-20 w-full resize-y rounded-lg border bg-background/40 p-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Explore evidence here. Run calculations in Planning with explicit assumptions.</p>
        <button type="submit" aria-label="Send overview question" disabled={!ready || chatLoading || !input.trim()} className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Send <ArrowUp size={17} /></button></div>
    </form>
  </section>
    <aside className="rounded-xl border bg-card p-5 text-sm leading-relaxed" aria-label="How to use this app">
      <h3 className="text-lg font-semibold">How to use this app</h3>
      <p className="mt-3">This is NOT a typical people analytics dashboard. It’s an AI-powered decision tool that helps you identify workforce challenges, explore solutions, and build actionable plans with clear costs, tradeoffs, and measurable goals.</p>
      <p className="mt-3">It brings HR, business leaders, and Finance together to turn workforce insights into practical decisions and coordinated action.</p>
      <ol className="mt-3 list-decimal space-y-4 pl-4">
        <li><button className="text-left font-semibold text-primary underline" onClick={()=>onNavigate("workforce")}>Workforce: find the problem and goal</button><p>HR and business leaders use Workforce evidence to identify the problem, sharpen the question, and agree on a goal.</p></li>
        <li><button className="text-left font-semibold text-primary underline" onClick={()=>onNavigate("skills")}>Talent: explore potential and actions</button><p>HR and business leaders explore <button className="text-primary underline" onClick={()=>onNavigate("skills")}>Skills Intelligence</button> and <button className="text-primary underline" onClick={()=>onNavigate("learning-development")}>Learning &amp; Development</button> to compare possible talent responses. To bring Skills evidence into Planning, choose an Observed skill gap, enter your Business goal, then click Carry to Planning. Review the carried evidence before modeling; opening a page does not carry it automatically.</p></li>
        <li><button className="text-left font-semibold text-primary underline" onClick={()=>onNavigate("planning-overview")}>Planning: compare options and develop a plan</button><p>HR partners with Finance to compare costs, tradeoffs, and feasibility. In Planning Overview, use Scenario Modeling to enter assumptions and run a supported comparison. Work through Position &amp; Workforce Design, Workforce Response and Execution &amp; Feasibility. Check Labor Cost Planning for financial context and build a plan against your goal.</p></li>
      </ol>
      <p className="mt-4 text-muted-foreground">Navigation does not carry evidence or run models. Scenarios do not make real workforce changes.</p>
      <button type="button" onClick={()=>onNavigate("guide-data")} className="mt-4 min-h-11 w-full rounded-lg border px-4 py-3 text-left text-base font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">See Guide &amp; Data for more details</button>
      <p className="mt-2 text-sm text-muted-foreground">by Ed Om <span aria-hidden="true">·</span> <a className="text-primary underline" href="mailto:edwinom.nyc@gmail.com">edwinom.nyc@gmail.com</a></p>
    </aside>
  </div>;
}
