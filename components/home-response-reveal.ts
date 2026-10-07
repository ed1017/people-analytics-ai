/** Reveal one submitted turn after the intro collapses, without moving keyboard focus.
 * Later response updates never scroll; any new user navigation cancels the queued reveal.
 */
export function queueHomeResponseReveal(viewport:()=>HTMLElement|null,isCurrent:()=>boolean):()=>void {
 let frame=0,cancelled=false;
 const events=['wheel','touchstart','pointerdown','keydown'] as const;
 const cancel=()=>{cancelled=true;cancelAnimationFrame(frame);for(const event of events)window.removeEventListener(event,cancel,true);};
 for(const event of events)window.addEventListener(event,cancel,{capture:true,passive:true});
 frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
  if(cancelled||!isCurrent()){cancel();return;}
  const port=viewport(),answers=port?.querySelectorAll<HTMLElement>('[data-chat-role="assistant"]');
  const target=port?.querySelector<HTMLElement>('[aria-label="AI answer status"]')??answers?.[answers.length-1];
  if(target&&port){
   const margin=target.style.scrollMarginTop;
   target.style.scrollMarginTop=getComputedStyle(port).scrollMarginTop;
   // An immediate single movement also respects reduced-motion preferences.
   target.scrollIntoView({block:'start',behavior:'instant'});
   target.style.scrollMarginTop=margin;
  }
  cancel();
 });});
 return cancel;
}
