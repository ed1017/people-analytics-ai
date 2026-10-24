'use client';
import {useEffect,useId,useState,type PointerEvent,type FocusEvent} from 'react';
import {createPortal} from 'react-dom';

/** One tooltip for mouse, keyboard and touch; never changes chart data. */
export function useChartPointerTooltip(evidenceKey:string){
 const id=useId(),[tip,setTip]=useState<{text:string;x:number;y:number;key:string}|null>(null);
 useEffect(()=>{if(!tip)return;const close=()=>setTip(null),escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};window.addEventListener('scroll',close,true);window.addEventListener('resize',close);window.addEventListener('keydown',escape);return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);window.removeEventListener('keydown',escape);};},[Boolean(tip)]);
 const place=(text:string,x:number,y:number)=>setTip({text,key:evidenceKey,x:Math.max(8,Math.min(x+14,window.innerWidth-240)),y:y+110>window.innerHeight?Math.max(8,y-100):y+14});
 const point=(text:string)=>({tabIndex:0,role:'button' as const,'aria-label':text,'aria-describedby':tip?.key===evidenceKey&&tip?.text===text?id:undefined,
  onPointerMove:(e:PointerEvent<SVGCircleElement>)=>{if(e.pointerType==='mouse')place(text,e.clientX,e.clientY);},
  onPointerLeave:(e:PointerEvent<SVGCircleElement>)=>{if(e.pointerType==='mouse')setTip(null);},
  onPointerDown:(e:PointerEvent<SVGCircleElement>)=>place(text,e.clientX,e.clientY),
  onFocus:(e:FocusEvent<SVGCircleElement>)=>{const r=e.currentTarget.getBoundingClientRect();place(text,r.x+r.width/2,r.y);},onBlur:()=>setTip(null)});
 const tooltip=tip?.key===evidenceKey&&typeof document!=='undefined'?createPortal(<div id={id} role="tooltip" style={{position:'fixed',left:tip.x,top:tip.y,width:224,maxWidth:'calc(100vw - 16px)',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:8,background:'var(--popover)',color:'var(--popover-foreground)',boxShadow:'0 4px 16px #0002',fontSize:12,lineHeight:1.5,zIndex:100,pointerEvents:'none'}}>{tip.text}</div>,document.body):null;
 return {point,tooltip};
}
