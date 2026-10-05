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
  {!preview&&<><p>Use the chat box to describe exact assumption changes, then Send to review them here.</p><p className="text-xs">Try: Set pilot participants to 12; Set shared horizon to 6 months.</p><details className="text-xs"><summary className="min-h-11 cursor-pointer py-2">Supported changes</summary><p>Use an existing expense name for an amount, or a component name followed by start or finish for a date. Unknown clears a value; Illustrative keeps it hypothetical. Staffing, budget limits and plan wording use Edit assumptions and plan.</p></details></>}
  {!current&&<p role="status">The selected plan or context changed. Your text is kept. Choose Discuss changes on the current plan to begin a fresh review.</p>}
  {notice&&<p role="status">{notice}</p>}
  {preview&&<><ul className="list-disc space-y-2 pl-5">{preview.changes.map(change=><li key={change.field}><strong>{change.field}:</strong> {bundleAssumptionText(change.before)} → {bundleAssumptionText(change.after)}</li>)}</ul><p className="text-xs">Accept into the working draft, then Save and Calculate explicitly. Attached versions stay in history.</p>{!sameText&&<p role="status">Your text changed after this preview. Send it again to review the current request.</p>}<button type="button" className={button+' bg-primary text-primary-foreground'} disabled={busy||!current||!sameText} onClick={onAccept}>Accept changes into draft</button></>}
  <button type="button" className={button} onClick={onClose}>Return to general chat</button>
 </section>;
}
