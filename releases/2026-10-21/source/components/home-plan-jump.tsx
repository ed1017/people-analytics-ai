'use client';
import styles from './home-plan-jump.module.css';
/** Local navigation only: no draft mutation, history entry, calculation or save. */
export function HomePlanJump({back=false}:{back?:boolean}){
 return <button type="button" className={styles.jump} onClick={event=>{
  const root=event.currentTarget.closest('.home-conversation-split');
  const target=back?Array.from(root?.querySelectorAll<HTMLTextAreaElement>('.home-conversation-text textarea#overview-question')??[]).find(el=>!el.disabled&&el.getClientRects().length>0):root?.querySelector<HTMLElement>('.home-conversation-visuals [aria-label="Planning workspace"]');
  if(!target)return;
  let ancestor:HTMLElement|null=target;while(ancestor&&ancestor!==root){if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;ancestor=ancestor.parentElement;}
  if(!back){target.querySelectorAll('details').forEach(details=>{if(details.querySelector('[aria-label="Interactive scenario planner"]'))details.open=true;});target.tabIndex=-1;}
  target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});
 }}>{back?'Back to question':'View current plan ↓'}</button>;
}
