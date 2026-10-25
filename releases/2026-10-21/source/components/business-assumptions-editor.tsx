'use client';
import {useState} from 'react';
import type {BusinessPlanning} from '@/lib/home-business-planning';
import {previewAssumptions,type PreviewAssumptions} from '@/lib/planner-preview-inputs';
import styles from './decision-style.module.css';

/** Applies to the conversation-owned plan; never creates a separate saved store. */
export function BusinessAssumptionsEditor({state,disabled,onApply,onEditing}:{state:BusinessPlanning;disabled:boolean;onApply:(draft:PreviewAssumptions,key:string)=>void;onEditing:(open:boolean)=>void}){
 const [edit,setEdit]=useState<{draft:PreviewAssumptions;key:string}|null>(null),[error,setError]=useState('');
 if(!state.staffing)return null;
 return <div><button type="button" className="min-h-11 rounded border px-3 text-sm" disabled={disabled} aria-expanded={!!edit} onClick={()=>{onEditing(!edit);setEdit(edit?null:{draft:previewAssumptions(state),key:JSON.stringify(state)});setError('');}}>Edit budget & dates</button>
 {edit&&<form className={styles.editor} aria-label="Budget and readiness" onSubmit={event=>{event.preventDefault();try{onApply(edit.draft,edit.key);onEditing(false);setEdit(null);setError('');}catch(e){setError((e as Error).message);}}}>
 {([{key:'budget',label:'Budget ceiling USD',type:'text'},{key:'arrivalDate',label:'Hire arrival',type:'date'},{key:'moveMonth',label:'Redeployment ready',type:'month'},{key:'buildMonth',label:'Development ready',type:'month'}] as const).map(field=><label key={field.key}>{field.label}<input type={field.type} inputMode={field.key==='budget'?'decimal':undefined} value={edit.draft[field.key]} disabled={disabled} onChange={e=>setEdit({...edit,draft:{...edit.draft,[field.key]:e.target.value}})}/></label>)}
 <small>Blank budget means unknown, not zero. Dates are planning assumptions.</small>
 {error&&<p role="alert">{error}</p>}<div className="flex flex-wrap gap-2"><button disabled={disabled} type="submit">Apply changes</button><button type="button" onClick={()=>{onEditing(false);setEdit(null);setError('');}}>Cancel</button></div>
 </form>}</div>;
}
