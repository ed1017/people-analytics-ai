'use client';
import {createContext,useContext,useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import type {ChatEvidenceSeries} from '@/lib/chat-evidence-series';
import {ChatEvidenceChart} from './chat-evidence-chart';
import type {ChatMessage} from '@/lib/types';

export function currentHomeVisualAnswer(messages:ChatMessage[], charts:Map<ChatMessage,{context:string}>, context:string, ready:boolean, pending:boolean, error:boolean) {
  const latest=messages.at(-1);
  return ready&&!pending&&!error&&latest?.role==='assistant'&&charts.get(latest)?.context===context?latest:null;
}

const SplitWidth=createContext<{width:number;setWidth:(value:number)=>void}|null>(null);
export function HomeSplitProvider({children}:{children:ReactNode}){
 const [width,setWidth]=useState(54);
 return <SplitWidth.Provider value={{width,setWidth}}>{children}</SplitWidth.Provider>;
}
export function HomeConversationSplit({enabled,visuals,children}:{enabled:boolean;visuals:ReactNode;children:ReactNode}) {
  const root=useRef<HTMLDivElement>(null),shared=useContext(SplitWidth),[localWidth,setLocalWidth]=useState(54),[available,setAvailable]=useState(0);
  useEffect(()=>{const element=root.current;if(!element)return;const observer=new ResizeObserver(entries=>setAvailable(entries[0].contentRect.width));observer.observe(element);return()=>observer.disconnect();},[]);
  const minimum=available>=652?Math.max(40,Math.ceil(300/available*100)):40;
  const maximum=available>=652?Math.max(minimum,Math.min(65,Math.floor((available-344)/available*100))):65;
  const width=Math.max(minimum,Math.min(maximum,shared?.width??localWidth)),setWidth=shared?.setWidth??setLocalWidth;
  const resize=(value:number)=>setWidth(Math.max(minimum,Math.min(maximum,value)));
  return <div ref={root} style={{'--chat-share':`${width}%`} as CSSProperties} className="home-conversation-split" data-split={enabled?'':undefined}><div className="home-conversation-text">{children}</div>{enabled&&<><div className="home-split-divider" role="separator" tabIndex={0} aria-label="Resize chat and visuals" aria-orientation="vertical" aria-valuemin={minimum} aria-valuemax={maximum} aria-valuenow={width} aria-valuetext={`Chat width ${width} percent`} onKeyDown={event=>{const next=event.key==='ArrowLeft'?width-2:event.key==='ArrowRight'?width+2:event.key==='Home'?minimum:event.key==='End'?maximum:null;if(next!==null){event.preventDefault();resize(next);}}} onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(!event.currentTarget.hasPointerCapture(event.pointerId)||!root.current)return;const bounds=root.current.getBoundingClientRect();resize(Math.round(100*(event.clientX-bounds.left)/bounds.width));}} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}/><div className="home-conversation-visuals">{visuals}</div></>}</div>;
}

/** Only the current turn's verified series enters this panel; never retain a prior chart while answering. */
export function HomeAnswerVisuals({pending,error,current,series,supplement}: {pending:boolean;error:boolean;current:boolean;series:ChatEvidenceSeries[];supplement?:ReactNode}) {
  const empty=current&&!pending&&!error&&!series.length&&!supplement;
  if(empty)return <aside className="home-answer-empty" aria-label="Current answer visuals"><p role="status">No chart available</p></aside>;
  const status=pending?'Preparing visuals for your question.':error?'No current visual: the answer could not be completed.':!current?'Ask a question to see its supported visuals here.':!series.length&&!supplement?'No chart is available for this answer.':null;
  return <aside className="home-answer-visuals" aria-label="Current answer visuals" aria-busy={pending}>
    <h3 className="text-lg font-semibold">{status?'Answer visuals':'Visuals for this answer'}</h3>
    {status?<p role="status" className="text-sm text-muted-foreground">{status}</p>:<>{series.map(series=><ChatEvidenceChart key={series.metric} series={series}/>)}{supplement}</>}
  </aside>;
}
