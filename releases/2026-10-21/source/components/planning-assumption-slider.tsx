'use client';
import {useId,useState} from 'react';
import {sliderNumber,sliderExtent,sliderEdit,discreteMonths,type PlanningSliderSpec} from '@/lib/planning-slider';
import styles from './planning-assumption-slider.module.css';

/** One raw text value owns both inputs. Invalid/blank text never becomes zero. */
export function PlanningAssumptionSlider({label,value,onChange,spec,help,disabled=false,displayPrecision}:{label:string;value:string;onChange:(value:string)=>void;spec:PlanningSliderSpec;help?:string;disabled?:boolean;displayPrecision?:number}){
 const [focused,setFocused]=useState(false),[draft,setDraft]=useState<{base:string;text:string}|null>(null),[notice,setNotice]=useState('');
 const wholeMonths=discreteMonths(spec),text=wholeMonths&&draft?.base===value?draft.text:value;
 const commit=()=>{setFocused(false);if(!wholeMonths||!draft||draft.base!==value)return;const n=Number(draft.text);if(draft.text.trim()!==''&&Number.isFinite(n)){const next=sliderEdit(n,spec);onChange(next);setNotice(next!==draft.text?`Using ${next} whole months.`:'');}else setNotice('Incomplete month entry discarded; previous value retained.');setDraft(null);};
 const id=useId(),number=sliderNumber(value,spec),maximum=sliderExtent(value,spec);
 const invalid=text.trim()!==''&&sliderNumber(text,spec)===null;
 const displayed=!focused&&displayPrecision!==undefined&&number!==null?String(Number(number.toFixed(displayPrecision))):text;
 return <div className={styles.field}>
  <div className={styles.row}>
   <label htmlFor={id}>{label} <span className={styles.unit}>({spec.unit})</span></label>
   <input className={styles.range} type="range" aria-label={`${label} slider`} aria-describedby={`${id}-help`} aria-valuetext={number===null?'Not set — edit the number or move the slider':`${value} ${spec.unit}`} min={spec.min} max={maximum} step={spec.precision===0?1:'any'} value={number??spec.min} disabled={disabled}
    onChange={event=>{setDraft(null);setNotice('');onChange(sliderEdit(Number(event.target.value),spec));}}
    onKeyDown={event=>{const direction=event.key==='ArrowRight'||event.key==='ArrowUp'?1:event.key==='ArrowLeft'||event.key==='ArrowDown'?-1:0;if(direction){event.preventDefault();onChange(sliderEdit((number??spec.min)+direction*spec.keyboardStep,spec));}else if(event.key==='Home'||event.key==='End'){event.preventDefault();onChange(sliderEdit(event.key==='Home'?spec.min:maximum,spec));}}}/>
   <input id={id} className={styles.number} aria-label={label} type="text" inputMode={spec.precision===0?'numeric':'decimal'} value={displayed} onFocus={()=>setFocused(true)} onBlur={commit} onKeyDown={event=>{if(wholeMonths&&event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}else if(wholeMonths&&event.key==='Escape'){setDraft(null);setNotice('Month edit cancelled.');event.preventDefault();}}} title={displayed!==value?'Full precision is retained; focus to edit.':undefined} disabled={disabled} aria-invalid={invalid} aria-describedby={`${id}-help`} onChange={event=>{setNotice('');if(wholeMonths)setDraft({base:value,text:event.target.value});else onChange(event.target.value);}}/>
  </div>
  {wholeMonths&&draft&&<small role="status">Editing months; chart uses {value} until you finish. Decimals round to the nearest whole month.</small>}{notice&&<small role="status">{notice}</small>}
  <small id={`${id}-help`} className={invalid||value.trim()===''||help?styles.help:'sr-only'}>{invalid?`Use ${spec.min.toLocaleString()}–${spec.max.toLocaleString()}${spec.preservePrecision?'':spec.precision===0?', whole numbers only':`, up to ${spec.precision} decimal places`}.`:value.trim()===''?'Not set. Enter a number or move the slider.':help??`Slider range ${spec.min.toLocaleString()}–${maximum.toLocaleString()}. Type larger values to extend it.`}</small>
 </div>;
}
