'use client';
import {useId,useRef,useState,type ReactNode} from 'react';
import {ChartNoAxesCombined,Sparkles,Users} from 'lucide-react';
import {homePromptCategories} from '@/lib/home-prompt-categories';
import styles from './home-chat-shell.module.css';
const icons=[ChartNoAxesCombined,Users,Sparkles];
export function HomePromptCategories({onQuestion,disabled=false,templates}:{onQuestion:(question:string)=>void;disabled?:boolean;templates?:ReactNode}){
 const [selected,setSelected]=useState(0),id=useId(),tabs=useRef<(HTMLButtonElement|null)[]>([]);
 const category=homePromptCategories[selected],Icon=icons[selected];
 return <section aria-label="Suggested questions">
  <div role="tablist" aria-label="Prompt categories" className={styles.promptCategories}>
   {homePromptCategories.map((group,index)=><button key={group.id} ref={el=>{tabs.current[index]=el;}} id={id+'-'+group.id} type="button" role="tab" aria-selected={selected===index} aria-controls={id+'-questions'} tabIndex={selected===index?0:-1} onClick={()=>setSelected(index)} onKeyDown={event=>{const next=event.key==='ArrowRight'?(index+1)%3:event.key==='ArrowLeft'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:null;if(next!==null){event.preventDefault();setSelected(next);tabs.current[next]?.focus();}}}>{group.label}</button>)}
  </div>
  <div role="tabpanel" id={id+'-questions'} aria-labelledby={id+'-'+category.id} className={styles.questions}>
   {category.prompts.map(question=><button key={question} type="button" disabled={disabled} onClick={()=>onQuestion(question)}><Icon size={19} aria-hidden="true"/><span>{question}</span></button>)}
  </div>
  {category.id==='capacity'&&templates}
 </section>;
}
