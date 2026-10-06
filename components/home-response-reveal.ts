/** Reveal the pending turn without moving keyboard focus. When it completes,
 * keep its answer in view if a newly inserted goal panel displaced it. Any
 * intervening user navigation or composer input leaves scrolling to the user.
 */
export function queueHomeResponseReveal(viewport:()=>HTMLElement|null,isCurrent:()=>boolean) {
 let frame=0,cancelled=false,position:{outer:number;inner:number}|null=null;
 const events=['wheel','touchstart','pointerdown','keydown','input'] as const;
 const cancel=()=>{cancelled=true;cancelAnimationFrame(frame);for(const event of events)window.removeEventListener(event,cancel,true);};
 const target=()=>{const port=viewport(),answers=port?.querySelectorAll<HTMLElement>('[data-chat-role="assistant"]');return port?.querySelector<HTMLElement>('[aria-label="AI answer status"]')??answers?.[answers.length-1];};
 const reveal=(completion:boolean)=>{
  if(cancelled||!isCurrent()){cancel();return;}
  const port=viewport(),node=target();
  if(port&&node){
   if(completion&&position&&(Math.abs(scrollY-position.outer)>2||Math.abs(port.scrollTop-position.inner)>2)){cancel();return;}
   const box=node.getBoundingClientRect(),bounds=port.getBoundingClientRect(),dock=document.querySelector<HTMLElement>('.home-composer-dock');
   const dockTop=dock&&['fixed','sticky'].includes(getComputedStyle(dock).position)?dock.getBoundingClientRect().top:innerHeight;
   if(completion&&box.top>=Math.max(0,bounds.top)&&box.bottom<=Math.min(innerHeight,bounds.bottom,dockTop)){cancel();return;}
   const margin=node.style.scrollMarginTop;
   node.style.scrollMarginTop=getComputedStyle(port).scrollMarginTop;
   node.scrollIntoView({block:'start',behavior:'instant'});
   node.style.scrollMarginTop=margin;
   position={outer:scrollY,inner:port.scrollTop};
  }
  if(completion)cancel();
 };
 const queue=(completion:boolean)=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>reveal(completion));});};
 for(const event of events)window.addEventListener(event,cancel,{capture:true,passive:true});
 queue(false);
 return {cancel,complete:()=>{if(!cancelled)queue(true);}};
}
