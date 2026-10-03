"use client";
import type {RefObject} from 'react';
import type {JourneyState,JourneyStep} from '@/lib/workforce-journey-state';
const guidance:Record<JourneyStep,string>={
 loading:'Loading this decision.', 'choose-goal':'Choose a saved goal to continue.', unavailable:'Review the retained record notice before continuing.',
 'storage-blocked':'Resolve browser storage before making changes.', 'start-inputs':'Start the guided assumptions for this goal.',
 'align-goal':'Review inputs against the changed goal, then save explicitly.', working:'A request is in progress. Review its status or cancel it.',
 'review-proposal':'Review the proposed changes before applying them to an input draft.',
 'correct-inputs':'Review the next missing or invalid assumption.', 'save-inputs':'Review your draft, then save inputs explicitly.',
 calculate:'Saved assumptions are ready for an explicit calculation. Optional unknowns stay unknown.',
 historical:'This is a historical calculation. Review current assumptions before explicitly calculating again.',
 'verify-result':'Review local option verification and any browser support notice.',
 compare:'Compare saved options, choose a priority if useful, then edit an option to tailor it.',
 'review-alternatives':'Review temporary alternatives, then calculate and save them explicitly.',
 'preview-tailoring':'Review temporary option edits and their local calculation status.',
 'save-solution':'Review the temporary comparison, then explicitly save the revised solution.',
};
/** Open native disclosure ancestors without clicking an action or remounting a draft. */
export function revealJourneyTarget(target:HTMLElement|null){
 if(!target)return;
 for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;
 target.focus();target.scrollIntoView({block:'center'});
}
export function WorkforceJourneyContinue({journey,root,tailoring=false}:{journey:JourneyState;root:RefObject<HTMLElement|null>;tailoring?:boolean}){
 const next=()=>{
  const scope=root.current;if(!scope)return;
  const fields=tailoring?scope.querySelector<HTMLElement>('[data-journey="preview-tailoring"]')??scope:scope;
  const field=journey.focus.kind==='field'?fields.querySelector<HTMLElement>(`[data-journey-field="${journey.focus.field}"]`):null;
  const target=field??scope.querySelector<HTMLElement>(`[data-journey="${journey.step}"]`)??scope.querySelector<HTMLElement>('[data-journey="notice"]');
  revealJourneyTarget(target);
 };
 return <section aria-label="Continue this workforce decision" className="space-y-2 rounded border border-primary/40 bg-muted/30 p-3">
  <p className="text-sm" aria-live="polite">{guidance[journey.step]}</p>
  <button type="button" className="min-h-11 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={journey.step==='loading'} onClick={next}>Continue this decision</button>
  <p className="text-xs">Opens the next review step. Calculation, saving and approval each remain explicit.</p>
 </section>;
}
