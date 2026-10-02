"use client";
import { useEffect, useRef, useState } from "react";
import type { ProblemConversation } from "@/components/problem-conversation";
import { validateFocusedIssue } from "@/lib/problem-session";

export function FocusedIssue({ conversation }: { conversation: ProblemConversation }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const editor = conversation.issueEditor;
  useEffect(() => { if (editor && !dialog.current?.open) dialog.current?.showModal(); if (!editor && dialog.current?.open) dialog.current.close(); }, [editor]);
  const close = () => { conversation.setIssueEditor(null); setError(null); trigger.current?.focus(); };
  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-label={conversation.focusedIssue ? `Read or edit Focused issue: ${conversation.focusedIssue}` : "Pin a Focused issue"} onClick={() => {setError(null);conversation.setIssueEditor({draft:conversation.focusedIssue});}} className="flex min-h-8 w-full min-w-0 items-center gap-1 rounded px-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent">
      <span className="shrink-0 font-semibold text-primary">Focused issue:</span><span className="truncate">{conversation.focusedIssue || "General exploration — pin an issue"}</span>
    </button>
    <dialog ref={dialog} aria-labelledby="focused-issue-title" onCancel={close} onClose={close} className="m-auto max-h-[80dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto rounded-xl border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/60">
      <form onSubmit={e=>{e.preventDefault();const validation=validateFocusedIssue(editor?.draft ?? "");setError(validation);if(!validation)conversation.updateFocusedIssue(editor!.draft);}}>
        <div className="flex items-start justify-between gap-3"><h2 id="focused-issue-title" className="text-xl font-semibold">Focused issue</h2><button type="button" aria-label="Close Focused issue" onClick={close} className="rounded border px-3 py-2">Close</button></div>
        <p className="my-3 text-sm text-muted-foreground">State the problem or decision you want help with, who it concerns, and the desired outcome. Add a timeframe if known. This focuses AI across pages; it does not filter data, change assumptions, or run actions.</p>
        <label htmlFor="focused-issue-statement" className="text-sm font-semibold">Problem statement</label>
        <textarea autoFocus id="focused-issue-statement" value={editor?.draft ?? ""} onChange={e=>conversation.setIssueEditor({draft:e.target.value})} maxLength={240} rows={4} className="mt-2 w-full rounded border bg-background p-3" placeholder="For example: How can our managers improve feedback by Q3?" />
        <p className="text-xs text-muted-foreground">{editor?.draft.length ?? 0}/240 · Session only. Editing or clearing starts fresh AI context; visible conversation stays for reference.</p>
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-3"><button type="submit" className="rounded bg-primary px-4 py-2 font-semibold text-primary-foreground">{conversation.focusedIssue ? "Save Focused issue" : "Pin Focused issue"}</button>{conversation.focusedIssue && <button type="button" onClick={()=>conversation.updateFocusedIssue("")} className="rounded border px-4 py-2">Clear Focused issue</button>}</div>
      </form>
    </dialog>
  </>;
}
