"use client";
import { useEffect, useRef, useState } from "react";
import type { ProblemConversation } from "@/components/problem-conversation";
import { MAX_GOALS } from "@/lib/local-goals";
import { validateFocusedIssue } from "@/lib/problem-session";

export function FocusedIssue({ conversation }: { conversation: ProblemConversation }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const editor = conversation.issueEditor;
  useEffect(() => { if (editor && !dialog.current?.open) dialog.current?.showModal(); if (!editor && dialog.current?.open) dialog.current.close(); }, [editor]);
  const close = () => { conversation.setIssueEditor(null); setError(null); trigger.current?.focus(); };
  return <><div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Goal controls">
    <label className="min-w-0 flex-1 text-xs font-semibold">Goal<select aria-label="Selected goal" disabled={!conversation.storageReady} value={conversation.activeGoalId} onChange={e=>conversation.selectGoal(e.target.value)} className="ml-1 max-w-full rounded border bg-card px-2 py-1 text-sm lg:max-w-64"><option value="">General exploration</option>{conversation.goals.map(g=><option key={g.id} value={g.id}>{g.statement}</option>)}</select></label>
    {conversation.focusedIssue && <button type="button" disabled={!conversation.storageReady || conversation.goals.length>=MAX_GOALS} onClick={()=>{setError(null);conversation.setIssueEditor({draft:"",create:true});}} className="min-h-8 rounded border px-2 text-sm disabled:opacity-50">New goal</button>}
    <button ref={trigger} disabled={!conversation.storageReady || (!conversation.focusedIssue && conversation.goals.length>=MAX_GOALS)} type="button" aria-haspopup="dialog" aria-label={conversation.focusedIssue ? `Read or edit Focused issue: ${conversation.focusedIssue}` : "New goal"} onClick={() => {setError(null);conversation.setIssueEditor({draft:conversation.focusedIssue});}} className="min-h-8 shrink-0 rounded border px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent">
      <span>{conversation.focusedIssue ? "Edit goal" : "New goal"}</span>
    </button></div>
    <details className="text-xs"><summary className="cursor-pointer">Saved in this browser</summary><p className="my-2">Up to 20 goals and your selection are saved on this device, without an account or sync. Avoid sensitive information on shared devices. Conversations and carried quotes/evidence stay separate per goal in this tab and clear on reload. Workforce filters and core Planning scenarios remain shared. Other tabs are not synchronized.</p><button type="button" disabled={!conversation.storageReady} onClick={()=>{if(window.confirm("Delete all goals saved by this app in this browser, and clear this tab's goal conversations and carried evidence?"))conversation.clearAllGoals();}} className="mb-2 rounded border px-2 py-1">Clear all saved goals</button></details>
    {conversation.storageNotice && <p role="alert" className="text-xs text-destructive">{conversation.storageNotice}</p>}
    <dialog ref={dialog} aria-labelledby="focused-issue-title" onCancel={close} onClose={close} className="m-auto max-h-[80dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto rounded-xl border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/60">
      <form onSubmit={e=>{e.preventDefault();const validation=validateFocusedIssue(editor?.draft ?? "");setError(validation);if(!validation)conversation.updateFocusedIssue(editor!.draft);}}>
        <div className="flex items-start justify-between gap-3"><h2 id="focused-issue-title" className="text-xl font-semibold">Focused issue</h2><button type="button" aria-label="Close Focused issue" onClick={close} className="rounded border px-3 py-2">Close</button></div>
        <p className="my-3 text-sm text-muted-foreground">State the problem or decision you want help with, who it concerns, and the desired outcome. Add a timeframe if known. This focuses AI across pages; it does not filter data, change assumptions, or run actions.</p>
        <label htmlFor="focused-issue-statement" className="text-sm font-semibold">Problem statement</label>
        <textarea autoFocus id="focused-issue-statement" value={editor?.draft ?? ""} onChange={e=>conversation.setIssueEditor({...editor,draft:e.target.value})} maxLength={240} rows={4} className="mt-2 w-full rounded border bg-background p-3" placeholder="For example: How can our managers improve feedback by Q3?" />
        <p className="text-xs text-muted-foreground">{editor?.draft.length ?? 0}/240 · Goal saved in this browser. Editing starts fresh AI context; the goal conversation stays visible for reference. Switching never changes data filters.</p>
        {(editor?.create || !conversation.activeGoalId) && conversation.goals.length >= MAX_GOALS && <p role="alert" className="mt-2 text-sm">The 20-goal limit is reached. Remove a goal before adding another.</p>}
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-3"><button type="submit" disabled={(editor?.create || !conversation.activeGoalId) && conversation.goals.length >= MAX_GOALS} className="rounded bg-primary px-4 py-2 font-semibold text-primary-foreground">{conversation.focusedIssue && !editor?.create ? "Save Focused issue" : "Pin Focused issue"}</button>{conversation.focusedIssue && !editor?.create && <><button type="button" onClick={()=>conversation.updateFocusedIssue("")} className="rounded border px-4 py-2">Clear Focused issue</button><button type="button" onClick={()=>{if(window.confirm("Remove this goal and its conversation and carried evidence from this tab and saved goal list?"))conversation.removeGoal();}} className="rounded border px-4 py-2">Remove goal</button></>}</div>
      </form>
    </dialog>
  </>;
}
