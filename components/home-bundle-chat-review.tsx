"use client";
import {useSyncExternalStore} from 'react';
import type {BundleDiscussion} from '@/components/home-bundle-plans';
import type {BundleEditPreview} from '@/lib/home-bundle-chat-edit';
import {bundleAssumptionText} from '@/lib/home-bundle-display';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
export function HomeBundleChatReview({target,preview,text,busy,notice,onAccept,onClose}:{target:BundleDiscussion;preview:BundleEditPreview|null;text:string;busy:boolean;notice:string;onAccept:()=>void;onClose:()=>void}){
 const current=useSyncExternalStore(target.subscribe,target.isCurrent,()=>false),sameText=preview?.request===text.trim();
 return <section aria-label="Review chat changes" className="space-y-2 rounded border border-primary/50 p-3 text-sm">
  <h3 className="font-semibold">Adjust Plan #{target.option} · revision {target.revision}</h3><p>Goal: {target.goal}</p>
  {!preview&&<><p>Use the chat box to describe changes for this plan, then Send to review them here.</p><p className="text-xs">Try: Start in December 2026; make it three months; use 20 participants.</p><details className="text-xs"><summary className="min-h-11 cursor-pointer py-2">Supported changes</summary><p>Common phrases work for the shared start month, duration and a single participant group. If there are multiple groups, name the group. For an expense amount, use its displayed name and cost basis, or use a component name followed by start or finish for an exact date. Unknown clears a value; Illustrative keeps it hypothetical. Ambiguous budgets need clarification. Staffing, total budget limits and plan wording use Edit assumptions and plan. Shared date changes do not move component or funding dates automatically.</p></details></>}
  {!current&&<p role="status">The selected plan or context changed. Your text is kept. Choose Discuss changes on the current plan to begin a fresh review.</p>}
  {notice&&<p role="status">{notice}</p>}
  {preview&&<><ul className="list-disc space-y-2 pl-5">{preview.changes.map(change=><li key={change.field}><strong>{change.field}:</strong> {bundleAssumptionText(change.before)} → {bundleAssumptionText(change.after)}</li>)}</ul><p className="text-xs">Accept into the working draft, then Save and Calculate explicitly. Attached versions stay in history.</p>{!sameText&&<p role="status">Your text changed after this preview. Send it again to review the current request.</p>}<button type="button" className={button+' bg-primary text-primary-foreground'} disabled={busy||!current||!sameText} onClick={onAccept}>Accept changes into draft</button></>}
  <button type="button" className={button} onClick={onClose}>Return to general chat</button>
 </section>;
}
