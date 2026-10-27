import {demoBusinessUnitNames} from './catalog-display.ts';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';

/** Conservative semantic route for a named BU's recent FTE decline and next steps.
 * Explicit dates, additional measures and causal propositions retain ordinary routing. */
export function fteInvestigationSelection(question,filters){
 if(typeof question!=='string'||question.length>1200)return null;
 let text=question.toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ').trim();
 const groups=Object.entries(demoBusinessUnitNames).filter(([code,label])=>text.includes(label.toLowerCase())||text.includes(code.toLowerCase()));
 if(groups.length!==1||! /\b(?:fte|full[ -]time equivalents?)\b/.test(text)||! /\b(?:why|explain)\b/.test(text)||! /\b(?:losing|lost|loss|falling|fallen|declining|decline|decreased|decreasing|dropped|dropping)\b/.test(text))return null;
 const [org,label]=groups[0];
 text=text.replaceAll(label.toLowerCase(),'').replaceAll(org.toLowerCase(),'');
 const remainder=text.replace(/\b(?:why|explain|is|are|has|have|the|our|its|business|unit|been|fte|full|time|equivalents?|losing|lost|loss|falling|fallen|declining|decline|decreased|decreasing|dropped|dropping|and|also|what|should|could|can|would|we|hr|leaders?|managers?|do|about|it|next|actions?|take|steps?|investigate|check|please|recent|recently|in)\b/g,'').replace(/[\s,?.!;-]/g,'');
 if(remainder)return null;
 if(!filters||!['country','org','level'].every(k=>typeof filters[k]==='string'&&filters[k]))return null;
 const end=P.cutoff,date=new Date(end+'T00:00:00Z');
 const start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-2,0)).toISOString().slice(0,10);
 return {label,history:{metric:'fte',start,end,country:filters.country,org,level:filters.level}};
}

const actions='Next steps\n- Reconcile exits, hires, transfers and contracted-hours changes for the same period and group.\n- Review FTE changes by role and location, then check workload and service commitments.\n- If work is uncovered, compare replacement hiring, redeployment and workload changes in Scenario Planning.';
const number=value=>value.toLocaleString('en-US',{maximumFractionDigits:1});
const month=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});

export async function fteInvestigationReply(question,filters,readQuestions,signal){
 const selection=fteInvestigationSelection(question,filters);if(!selection)return null;
 signal.throwIfAborted();
 const reply=await readQuestions({parts:[{kind:'history',history:selection.history,comparison:null}]},signal);
 signal.throwIfAborted();
 const chart=reply?.charts?.find(c=>c.kind==='recorded'&&c.metric==='fte'&&c.unit==='FTE');
 if(!chart)return {...reply,answer:(reply?.answer??'FTE history is unavailable for this scope.')+'\n\n'+actions};
 const points=chart.points;
 if(!Array.isArray(points)||points.length!==4||points[0].date!==selection.history.start||points.at(-1).date!==selection.history.end||points.some(p=>!Number.isFinite(p.value)||p.value<0))throw Error('FTE investigation history could not be verified.');
 const first=points[0],last=points.at(-1),delta=Math.round((last.value-first.value)*10)/10;
 const summary=delta<0?`${selection.label} lost ${number(-delta)} FTE`:delta>0?`${selection.label} gained ${number(delta)} FTE`:`${selection.label}'s FTE was unchanged`;
 const finding=`${summary} from ${month(first.date)} to ${month(last.date)} (${number(first.value)} → ${number(last.value)} FTE).`;
 const scope=filters.country!=='all'||filters.level!=='all'?`\n${chart.scope}.`:'';
 return {...reply,answer:`${finding}${scope}\n\nThe cause needs a movement-level FTE breakdown; the available history shows the net change.\n\n${actions}`};
}
