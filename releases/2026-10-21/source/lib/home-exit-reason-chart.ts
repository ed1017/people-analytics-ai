// @ts-expect-error Native Node tests share the TypeScript source.
import {exitSurveyEvidence} from './employee-listening.ts';
import {normalizeHomePack} from './home-pack.mjs';
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
/** The answer and chart must use the same bounded request packet, never raw rows
 * which were absent, sampled out, suppressed or unavailable in that request. */
export function homeExitReasonChartFromPacket(packet:unknown):HomeExitReasonChart|null {
 const source=normalizeHomePack(packet).sources.find((item:{id:string})=>item.id==='S2');
 if(source?.status!=='loaded'||!source.facts)return null;
 const facts=record(source.facts),rows=Array.isArray(facts.rows)?facts.rows.filter(row=>record(row).kind==='Reported primary reason'):[];
 return homeExitReasonChart({status:source.status,data:{as_of:source.date,summary:{exit_respondents:facts.exit_respondents},exit_reasons:rows}});
}
const plain=(text:string)=>text.replace(/\*\*|__/g,'').replace(/[–—]/g,'-');
function currentReasonAbsence(answer:string){
 const subject='(?:(?:S2|exit[- ]surveys?)(?:\\s+(?:primary|reason|reasons|response|responses|data|feedback|counts))*|reason counts)';
 const absent=new RegExp('\\b'+subject+'\\s*(?:\\[S2\\])?\\s+(?:(?:is|are|was|were|remain|remains|still|currently|now)\\s+)*(?:unavailable|absent|missing|timed out|not\\s+(?:available|loaded|supplied|provided))\\b','i');
 const noSource=new RegExp("\\b(?:no|without|do not have|don't have|cannot access|can't access)\\s+(?:(?:current|available|supplied|loaded|the|any|usable|reliable)\\s+)*"+subject+'\\b','i');
 return plain(answer).split(/\n+|(?<=[.!?;])\s+|\b(?:but|however)\b/i).some(clause=>{
  // An explicitly earlier limitation can coexist with current supplied values.
  const historical=/\b(?:earlier|previously|before (?:the )?refresh|initially|at first)\b/i.test(clause)&&!/\b(?:still|currently|now|remains?)\b/i.test(clause);
  return !historical&&(absent.test(clause)||noSource.test(clause));
 });
}
/** Prose may vary, but every plotted category must state its current count and share.
 * Values still come exclusively from the normalized source packet. */
export function homeExitReasonChartMatches(answer:string,chart:HomeExitReasonChart|null){
 if(!chart||!answer.match(/\[S2\]/i)||currentReasonAbsence(answer))return false;
 const lines=plain(answer).split(/\r?\n/);
 return chart.rows.every(row=>{
  const escaped=plain(row.reason).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const label=new RegExp('(?:^|[^\\p{L}\\p{N}])'+escaped+'(?=$|[^\\p{L}\\p{N}])','iu');
  const claims=lines.filter(line=>label.test(line)).map(line=>({line,values:line.replace(label,' ').replace(/\[[A-Z]\d+\]/gi,'').match(/[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*%?/g)??[]})).filter(claim=>claim.values.length);
  if(!claims.length)return false;
  return claims.every(({line,values})=>{
   if((line.match(/\[[A-Z]\d+\]/gi)??[]).some(source=>source.toUpperCase()!=='[S2]'))return false;
   const shares=values.filter(value=>value.trim().endsWith('%')),counts=values.filter(value=>!value.trim().endsWith('%'));
   const number=(value:string)=>Number(value.replace(/[,\s%]/g,''));
   return shares.length===1&&counts.length===1&&number(shares[0])===row.percentage&&number(counts[0])===row.count;
  });
 });
}
