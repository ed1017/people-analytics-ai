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
/** Bind positive numeric findings, never a mere mention inside an unavailable-source reply. */
export function homeExitReasonChartMatches(answer:string,chart:HomeExitReasonChart|null){
 if(!chart)return false;
 const absent=/\b(?:exit[- ]survey(?:\s+(?:primary|reason|reasons|counts|data|results))*|s2)\s*(?:\[s2\])?\s+(?:(?:is|are|remain|remains|still|currently|now)\s+)*(?:unavailable|absent|missing|not\s+(?:available|loaded|supplied))/i;
 const noSource=/\b(?:no|without|do not have|don't have|cannot access|can't access)\s+(?:(?:current|available|supplied|loaded|the|any|usable|reliable)\s+)*(?:exit[- ]survey|S2\b|reason counts)/i;
 if(absent.test(answer)||noSource.test(answer))return false;
 const normalize=(text:string)=>text.replace(/\*\*/g,'').replace(/\s+/g,' ').trim().toLowerCase();
 const bullets=answer.split('\n').filter(line=>/^\s*[-*]\s+/.test(line)).map(line=>normalize(line.replace(/^\s*[-*]\s+/,'')));
 return homeExitReasonFactLines(chart).every(fact=>bullets.filter(line=>line===normalize(fact)).length===1);
}

/** A reason request selects reason rows before lexical matching can favor survey questions. */
export function asksHomeExitSurveyReasons(selection:string){
 const turns=selection.split('\n\nCURRENT USER TURN:\n'),current=turns.at(-1)??'';
 const request=(text:string)=>/\b(?:exit[- ]survey|exit feedback)\b/i.test(text)&&/\b(?:reasons?|leav(?:e|ing)|left|report(?:ed)?)\b/i.test(text);
 if(request(current))return true;
 if(/\b(?:administrative|separation records|manager favorability|satisfaction)\b/i.test(current))return false;
 return /\b(?:chart|counts?|percentages?|shares?|reasons?|common|why|those|these|compare|refreshed|again|now)\b/i.test(current)&&turns.slice(0,-1).some(request);
}
export function selectHomeExitSurveyReasonRows(rows:unknown[],selection:string){
 if(!asksHomeExitSurveyReasons(selection))return null;
 // Keep unavailable/suppressed rows explicit; never fill them from administrative exits.
 return rows.filter(row=>record(row).kind==='Reported primary reason').sort((a,b)=>{
  const x=record(a),y=record(b),xn=x.suppressed===true||!count(x.exits)?-1:x.exits,yn=y.suppressed===true||!count(y.exits)?-1:y.exits;
  return yn-xn;
 });
}
/** Charts consume precisely the selected normalized S2 rows supplied to this model turn. */
export function homeExitReasonChartFromPack(pack:unknown):HomeExitReasonChart|null{
 const sources=record(pack).sources,source=Array.isArray(sources)?record(sources.find(item=>record(item).id==='S2')):{},facts=record(source.facts),rows=facts.rows;
 if(source.status!=='loaded'||!Array.isArray(rows)||rows.length>3)return null;
 const reasons=rows.filter(row=>record(row).kind==='Reported primary reason');
 return homeExitReasonChart({status:source.status,data:{as_of:source.date,summary:{exit_respondents:facts.exit_respondents},exit_reasons:reasons}});
}
export function homeExitReasonFactLines(chart:HomeExitReasonChart){
 return chart.rows.map(row=>`${row.reason}: ${row.count.toLocaleString('en-US')} (${row.percentage}%). [S2]`);
}
