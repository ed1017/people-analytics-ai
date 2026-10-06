// @ts-expect-error Native Node tests share the TypeScript source.
import {exitSurveyEvidence} from './employee-listening.ts';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const count=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
export type HomeExitReasonChart={source:'S2';date:string;respondents:number;rows:{reason:string;count:number;percentage:number}[]};
/** One supported categorical contract: primary-reason counts from the existing exit survey source. */
export function homeExitReasonChart(result:unknown):HomeExitReasonChart|null {
 const loaded=record(result),raw=record(loaded.data),source=exitSurveyEvidence(raw),rawRows=raw.exit_reasons;
 if(loaded.status!=='loaded'||raw.suppressed===true||record(raw.summary).suppressed===true||!Array.isArray(rawRows)||rawRows.length<2||rawRows.length>40)return null;
 if(!count(source.respondents)||source.respondents===0||!source.as_of||!/^20\d{2}-\d{2}-\d{2}$/.test(source.as_of)||!Number.isFinite(Date.parse(source.as_of))||new Date(source.as_of).toISOString().slice(0,10)!==source.as_of)return null;
 const seen=new Set<string>(),rows:HomeExitReasonChart['rows']=[];
 for(const item of source.reasons){
  const name=item.primary_reason,n=item.exits,pct=item.pct_of_exit_responses;
  if(item.suppressed===true||typeof name!=='string'||!name.trim()||name.length>160||/[\p{Cc}\p{Cf}]/u.test(name)||seen.has(name.toLowerCase())||!count(n)||n>source.respondents||typeof pct!=='number'||pct<0||pct>100||Math.abs(pct-n/source.respondents*100)>0.051)return null;
  seen.add(name.toLowerCase());rows.push({reason:name,count:n,percentage:pct});
 }
 if(rows.reduce((sum,item)=>sum+item.count,0)>source.respondents||rows.filter(item=>item.count>0).length<2)return null;
 return {source:'S2',date:source.as_of,respondents:source.respondents,rows:rows.sort((a,b)=>b.count-a.count||a.reason.localeCompare(b.reason)).slice(0,3)};
}
/** Match the subject/citation only; chart values never come from assistant-authored prose or arrays. */
export function homeExitReasonChartMatches(answer:string,chart:HomeExitReasonChart|null){
 if(!chart||!answer.match(/\[S2\]/i))return false;
 const words=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]/g,'');
 const text=words(answer);
 return chart.rows.filter(row=>text.includes(words(row.reason))).length>=2;
}
