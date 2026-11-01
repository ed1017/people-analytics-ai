/** Calendar-quarter rates from verified scoped counts and closing stocks, never monthly percentages. */
export const QUARTERLY_DEFINITION='Quarter exits / average of the three month-end headcounts x 100. Not annualized. Synthetic workforce data.';
export const QUARTERLY_CLARIFICATION='Which groups do you mean: business units, countries or levels?';
const fields=['country','org','level'];
const count=n=>Number.isSafeInteger(n)&&n>=0;
const clean=t=>t.toLowerCase().replace(/[\u2010-\u2014]/g,'-').replace(/\s+/g,' ').trim();
export function quarterlyTurnoverIntent(question,turns=[]){
 if(typeof question!=='string'||question.length>1200)return null;
 let text=clean(question);
 if(turns.at(-1)?.role==='assistant'&&turns.at(-1).text===QUARTERLY_CLARIFICATION&&/^(?:by )?(?:business units?|countries|levels?)[.!?]?$/.test(text)){
  const previous=turns.at(-2);if(previous?.role==='user')text=clean(previous.text).replace(/\b(?:business[ -]units?|bu|countries|country|levels?)\b/g,'')+' '+text;
 }
 if(!/\b(?:turnover|attrition)\b/.test(text)||! /\b(?:quarterly|quarters?|q[1-4])\b/.test(text))return null;
 const dimensions=[[/\b(?:business[ -]units?|bu)\b/,'org'],[/\b(?:countries|country)\b/,'country'],[/\blevels?\b/,'level']].filter(([re])=>re.test(text));
 if(dimensions.length!==1)return {answer:QUARTERLY_CLARIFICATION};
 if(/\b(?:involuntary|regrettable|annualized|annualised|forecast|predict|why|cause|drivers?|department|team|tenure|role|gender|age|last|previous|next)\b/.test(text)||/\bvoluntary\b/.test(text)&&/\btotal\b/.test(text))return {answer:'Please choose total or voluntary turnover, a grouping of business units, countries or levels, and an explicit calendar year if needed. Quarterly forecasts and other group definitions are unavailable.'};
 const years=[...new Set(text.match(/\b20\d{2}\b/g)??[])];
 const qs=[...new Set([...text.matchAll(/\bq([1-4])\b/g)].map(m=>Number(m[1])))];
 if(years.length>1||qs.length&&years.length!==1)return {answer:'Please specify one calendar year for the quarter selection, for example Q3 2026.'};
 const range=text.match(/\bq([1-4])\s*(?:to|through|-)\s*q([1-4])\b/);
 if(range){if(Number(range[1])>Number(range[2])||qs.length!==2)return {answer:'Please give a chronological quarter range within one calendar year.'};qs.splice(0,qs.length,...Array.from({length:Number(range[2])-Number(range[1])+1},(_,i)=>Number(range[1])+i));}
 const remainder=text.replace(/\b(?:20\d{2}|q[1-4])\b/g,'').replace(/\b(?:what|are|is|were|was|the|our|company|show|me|please|turnover|attrition|rates?|by|group|groups|quarter|quarters|quarterly|each|every|over|all|available|history|for|in|during|from|to|through|and|compare|comparison|total|overall|voluntary|business|units?|bu|countries|country|levels?)\b/g,'').replace(/[\s,.?!:-]/g,'');
 if(remainder)return {answer:'Please specify quarterly total or voluntary turnover by business unit, country or level. Other measures or combined requests need a separate question.'};
 return {groupBy:dimensions[0][1],metric:/\bvoluntary\b/.test(text)?'voluntary':'total',year:years.length?Number(years[0]):null,quarters:qs};
}
export function calculateQuarterlyTurnover(history,selection,asOf){
 if(!Array.isArray(history)||history.length!==33||asOf!=='2026-09-30')throw Error('Incomplete quarterly history');
 for(let i=0;i<33;i++){
  const row=history[i],month=new Date(Date.UTC(2024,i,1)).toISOString().slice(0,10);
  if(!row||row.month!==month||!count(row.headcount)||i===0&&(row.total_exits!==null||row.voluntary_exits!==null)||i>0&&(!count(row.total_exits)||!count(row.voluntary_exits)||row.voluntary_exits>row.total_exits))throw Error('Invalid quarterly history');
 }
 const keys=selection.year?Array.from({length:4},(_,i)=>`${selection.year}-Q${i+1}`):Array.from({length:10},(_,i)=>`${2024+Math.floor((i+1)/4)}-Q${(i+1)%4+1}`);
 return keys.filter(key=>!selection.quarters.length||selection.quarters.includes(Number(key.at(-1)))).map(quarter=>{
  const year=Number(quarter.slice(0,4)),q=Number(quarter.at(-1)),first=(q-1)*3;
  const periodStart=new Date(Date.UTC(year,first,1)).toISOString().slice(0,10),periodEnd=new Date(Date.UTC(year,first+3,0)).toISOString().slice(0,10);
  const months=Array.from({length:3},(_,i)=>new Date(Date.UTC(year,first+i,1)).toISOString().slice(0,10));
  const rows=months.map(month=>history.find(r=>r.month===month));
  const unavailable=periodEnd>asOf?'Quarter is not fully observed':rows.some(r=>!r||r.total_exits===null)?'Grouped exit counts are incomplete':null;
  const exitCount=unavailable?null:rows.reduce((n,r)=>n+r[selection.metric==='total'?'total_exits':'voluntary_exits'],0);
  const stockSum=unavailable?null:rows.reduce((n,r)=>n+r.headcount,0),averageMonthEndHeadcount=stockSum===null?null:stockSum/3;
  const reason=unavailable??(averageMonthEndHeadcount===0?'Average headcount is zero':null);
  return {quarter,periodStart,periodEnd,status:reason?'unavailable':'available',exitCount,averageMonthEndHeadcount,ratePct:reason?null:exitCount/averageMonthEndHeadcount*100,reason};
 });
}
/** Shared response/display validator. Counts and denominator independently reproduce each visible rate. */
export function readQuarterlyTurnover(value){
 if(!value||!fields.includes(value.groupBy)||!['total','voluntary'].includes(value.metric)||value.asOf!=='2026-09-30'||value.definition!==QUARTERLY_DEFINITION||!Array.isArray(value.rows)||!value.rows.length||value.rows.length>132)return null;
 const seen=new Set();
 for(const r of value.rows){
  if(!r||!/^20\d{2}-Q[1-4]$/.test(r.quarter)||typeof r.groupCode!=='string'||r.groupCode.length>50||typeof r.groupLabel!=='string'||!r.groupLabel||r.groupLabel.length>150||seen.has(r.groupCode+'|'+r.quarter))return null;
  seen.add(r.groupCode+'|'+r.quarter);
  const y=Number(r.quarter.slice(0,4)),q=Number(r.quarter.at(-1));
  if(r.periodStart!==new Date(Date.UTC(y,(q-1)*3,1)).toISOString().slice(0,10)||r.periodEnd!==new Date(Date.UTC(y,q*3,0)).toISOString().slice(0,10))return null;
  if(r.status==='available'){
   if(r.periodEnd>value.asOf||!count(r.exitCount)||!Number.isFinite(r.averageMonthEndHeadcount)||r.averageMonthEndHeadcount<=0||!Number.isFinite(r.ratePct)||r.ratePct<0||Math.abs(r.ratePct-r.exitCount/r.averageMonthEndHeadcount*100)>1e-9||r.reason!==null)return null;
  }else if(r.status!=='unavailable'||r.ratePct!==null||!['Quarter is not fully observed','Grouped exit counts are incomplete','Average headcount is zero'].includes(r.reason)||r.reason==='Average headcount is zero'&&(!count(r.exitCount)||r.averageMonthEndHeadcount!==0)||r.reason!=='Average headcount is zero'&&(r.exitCount!==null||r.averageMonthEndHeadcount!==null))return null;
 }
 return value;
}
