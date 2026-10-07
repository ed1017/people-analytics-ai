'use client';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import {savedPilotCorrection,savedPilotReviewNotes} from '@/lib/home-saved-pilot-correction';

export function SavedPilotCorrectionOffer({draft,planningContext,disabled,onCreate}:{draft:BundleDraft;planningContext?:unknown;disabled:boolean;onCreate:()=>void}){
 const correction=savedPilotCorrection(draft,planningContext),reviewNotes=savedPilotReviewNotes(draft,planningContext);if(!correction&&!reviewNotes.length)return null;
 return <section aria-label="Review saved plan defaults" className="space-y-2 rounded border border-amber-700/40 bg-amber-50/60 p-3 text-sm dark:bg-amber-950/20">
 <h3 className="font-semibold">This saved plan still has earlier starting defaults</h3>
 <p>Compare these corrections with your original goal. Creating a corrected alternative keeps this plan, its edits and attachment history unchanged.</p>
 <ul className="list-disc space-y-1 pl-5">{[...(correction?.changes??[]),...reviewNotes].map(change=><li key={change}>{change}</li>)}</ul>
 <p>Missing baseline and workforce counts remain unknown. Existing activity dates and cost assumptions stay available for review.</p>
 {correction&&<button className="min-h-11 rounded border px-3 py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" disabled={disabled} onClick={onCreate}>Create corrected alternative</button>}
 </section>;
}
