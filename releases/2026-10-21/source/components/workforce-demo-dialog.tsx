'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
/** Presentation only: the journey stays mounted so closing never discards a draft. */
export function WorkforceDemoDialog({open,onClose,step,gapFte,children}:{open:boolean;onClose:()=>void;step:string;gapFte?:number|null;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),title=useRef<HTMLHeadingElement>(null);
 useLayoutEffect(()=>{const node=dialog.current;if(!node)return;if(open&&!node.open){opener.current=document.activeElement as HTMLElement;node.showModal();title.current?.focus();}if(!open&&node.open){node.close();const target=opener.current?.isConnected?opener.current:document.querySelector<HTMLElement>('[data-demo-resume]');target?.focus();}},[open]);
 useLayoutEffect(()=>{if(open)title.current?.focus();},[open,step]);
 return <dialog ref={dialog} aria-labelledby="workforce-demo-title" aria-describedby="workforce-demo-description" onCancel={e=>{e.preventDefault();onClose();}} className="workforce-demo-dialog"><header className="workforce-demo-dialog-header"><div><h2 ref={title} tabIndex={-1} id="workforce-demo-title">{typeof gapFte==='number'&&Number.isFinite(gapFte)?`Close the ${gapFte.toLocaleString('en-US',{maximumFractionDigits:2})} FTE capacity gap`:'Review the capacity gap'}</h2><p className="workforce-demo-badge">Planning scenario</p><p id="workforce-demo-description">{step} · FTE means full-time-equivalent capacity. No live AI. Close and reopen to resume your edits.</p></div><button type="button" onClick={onClose} className="min-h-11 rounded border px-4">Close scenario</button></header><div className="workforce-demo-dialog-body">{children}</div></dialog>;
}
