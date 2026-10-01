"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, RefreshCw, Sparkles } from "lucide-react";
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
  if (!response.ok) throw new Error(data.error || "The briefing is unavailable. Please try again.");
  return data.answer as string;
}

export function OverallOverviewPage({ active, persona, onNavigate }: {
  active: boolean; persona: Persona; onNavigate: (page: AppPage) => void;
}) {
  const [sources, setSources] = useState<BriefingSource[] | null>(null);
  const [briefing, setBriefing] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const loaded = useRef(false);
  const modelHistory = useRef<ScopedChatHistory>({ key: "", messages: [] });
  const composer = useRef<HTMLTextAreaElement>(null);
  const lastAnswer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || loaded.current) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setBriefingError(null); setBriefing("");
      const [workforce, skills, planning] = await Promise.all([
        readSource<DashboardResponse>("/api/dashboard", controller.signal),
        readSource<SkillsResponse>("/api/skills", controller.signal),
        readSource<WorkforcePlanningResponse>("/api/workforce-planning", controller.signal),
      ]);
      if (controller.signal.aborted) return;
      const next = buildOverviewSources(workforce, skills, planning);
      setSources(next);
      try {
        if (next.every(source => !source.facts)) throw new Error("The evidence sources are unavailable. Retry when the sources are reachable.");
        const answer = await ask(next, persona, "Give a short overall briefing with up to three key findings, each cited to its source ID. Keep observations separate from modeled outcomes. Include dates and distinct populations briefly; source details are shown below. End with one useful question to explore. Use at most 120 words.", [], controller.signal);
        if (!controller.signal.aborted) {
          setBriefing(answer);
          modelHistory.current = { key: JSON.stringify({ persona, sources: next }), messages: [{ role: "assistant", content: answer }] };
        }
      } catch (error) {
        if (!controller.signal.aborted) setBriefingError(error instanceof Error ? error.message : "Briefing unavailable.");
      } finally { if (!controller.signal.aborted) { loaded.current = true; setLoading(false); } }
    };
    void load();
    return () => controller.abort();
  }, [active, persona, refresh]);

  async function send(question = input) {
    const message = question.trim();
    if (!message || !sources || chatLoading || loading || sources.every(source => !source.facts)) return;
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
  return <section aria-labelledby="overall-overview-heading" className="mx-auto flex max-w-5xl flex-col gap-7 px-5 py-8 sm:px-10 sm:py-10">
    <header>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary"><Sparkles size={18} /> Workforce AI</p>
      <h2 id="overall-overview-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">Your workforce, in perspective.</h2>
      <button id="overall-guide-link" type="button" onClick={() => onNavigate("guide-data")} className="mt-3 rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Guide &amp; Data</button>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Start with the evidence. Explore what matters. Work through your next question.</p>
      <p className="mt-3 text-sm text-muted-foreground">Enterprise overview · Synthetic workforce data · Each source keeps its own date and population</p>
    </header>

    <section aria-label="Key findings" className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">A brief look across the business</h3>
        <button type="button" aria-label="Refresh overview evidence and briefing" disabled={loading || chatLoading}
          onClick={() => { loaded.current = false; setRefresh(value => value + 1); }}
          className="rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><RefreshCw size={18} /></button>
      </div>
      {loading && <p role="status" className="text-lg text-muted-foreground">Reading the available evidence and preparing your briefing…</p>}
      {briefingError && <p role="alert" className="text-base text-destructive">{briefingError}</p>}
      {briefing && <div className="text-lg" data-testid="overview-briefing"><ChatContent content={briefing} /></div>}
      <p className="mt-4 text-sm text-muted-foreground">AI summary of the sources below. Observations and stored scenarios are kept separate.</p>
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
      {["Where should I focus?", "Tell me something interesting", "Help me work through a problem"].map(prompt => <button key={prompt} type="button" disabled={!ready || chatLoading}
        onClick={() => void send(prompt)} className="rounded-full border bg-card px-4 py-3 text-base font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{prompt}</button>)}
    </div>

    {messages.length > 0 && <section aria-label="Overview conversation" className="space-y-6">
      {messages.map((message, index) => <div key={index} ref={index === messages.length - 1 ? lastAnswer : undefined} className={message.role === "user" ? "ml-auto max-w-[90%] rounded-2xl bg-accent px-5 py-4 text-lg" : "text-lg"}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{message.role === "user" ? "You" : "Workforce AI"}</p><ChatContent content={message.content} />
      </div>)}
      {chatLoading && <p role="status" className="text-base text-muted-foreground">Thinking with the available evidence…</p>}
      {chatError && <p role="alert" className="text-destructive">{chatError}</p>}
    </section>}

    <form onSubmit={event => { event.preventDefault(); void send(); }} className="sticky bottom-3 rounded-2xl border bg-card p-4 shadow-lg">
      <label htmlFor="overview-question" className="mb-2 block text-sm font-semibold">Ask Workforce AI</label>
      <textarea ref={composer} id="overview-question" value={input} onChange={event => setInput(event.target.value)} rows={3}
        placeholder="What would you like to explore?" className="max-h-80 min-h-24 w-full resize-y rounded-lg border bg-background/40 p-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Drag the lower edge to resize. Questions explore evidence; they do not run workforce actions.</p>
        <button type="submit" aria-label="Send overview question" disabled={!ready || chatLoading || !input.trim()} className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-3 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Send <ArrowUp size={17} /></button></div>
    </form>
  </section>;
}
