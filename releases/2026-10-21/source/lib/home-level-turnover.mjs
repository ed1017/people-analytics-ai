import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {demoBusinessUnitNames} from './catalog-display.ts';

const normalize=value=>value.toLowerCase().replace(/[\u2010-\u2014]/g,'-').replace(/\s+/g,' ').trim();
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const units=Object.entries(demoBusinessUnitNames).map(([code,label])=>({code,label,pattern:new RegExp('(?<![a-z0-9-])(?:'+escape(label.toLowerCase())+'|'+escape(code.toLowerCase())+')(?![a-z0-9-])','g')}));
const year=P.cutoff.slice(0,4),month=new Date(P.cutoff+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',timeZone:'UTC'});
export const LEVEL_TURNOVER_PERIOD=`January-${month} ${year}`;
export const LEVEL_TURNOVER_DEFINITION='YTD turnover rate = exits / average monthly closing headcount x 100. Contribution = level exits / business-unit exits x 100. Not annualized; contribution is not causation.';
export const LEVEL_CODES=Object.freeze(Array.from({length:12},(_,i)=>'L'+(i+1)));

/** Exact current-YTD evidence questions only. Unknown scope, qualifiers and plan
 * edits retain their original path; follow-ups inherit only our own last answer. */
export function levelTurnoverIntent(question,turns=[]){
 if(typeof question!=='string'||question.length>1200)return null;
 let text=normalize(question);
 const last=turns.at(-1),prior=last?.role==='assistant'&&typeof last.text==='string'?last.text.match(/^Current-YTD (total|voluntary) turnover by level: ([^.]+)\./):null;
 const follow=/^(?:show (?:that|it) again|show (?:the )?(?:rates|counts|contributions)|what (?:does it cost|about (?:cost|costs|tenure))|what should we investigate)[.!?]?$/;
 if(prior&&follow.test(text)&&units.some(unit=>unit.label===prior[2]))text=`show ${prior[1]} turnover by level for ${prior[2].toLowerCase()} and ${text}`;
 if(!/\blevels?\b/.test(text)||!/\b(?:turnover|attrition)\b/.test(text))return null;
 const matches=units.filter(unit=>new RegExp(unit.pattern).test(text));
 if(matches.length!==1)return null;
 const unit=matches[0];
 // Consume only the preposition attached to the exact BU. A remaining 'in IN'
 // or 'for IT' is geography, not a pair of ignorable stopwords.
 text=text.replace(new RegExp('(?:\\b(?:for|in|of|at|from|across)\\s+)?'+unit.pattern.source,'g'),'');
 // Explicit relative or historical periods are never quietly recast as YTD.
 const currentWindow=new RegExp('\\b(?:'+year+' (?:ytd|year-to-date)|(?:ytd|year-to-date)(?: for| in)? '+year+'|january(?:-| to | through )'+month.toLowerCase()+' '+year+'|as of '+P.cutoff+')\\b','g');
 text=text.replace(currentWindow,'current');
 const unsupportedPeriod=/\b(?:this|current)\s+(?:calendar\s+)?(?:year|month)\b/.test(text)||/\b(?:today|yesterday|tomorrow|past|weeks?|weekly|days?|daily|months?|20\d{2}|last|previous|next|annual|annualized|annualised|monthly|quarterly|quarters?|q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(text);
 const voluntary=/\bvoluntary\b/.test(text),total=/\b(?:total|overall)\b/.test(text);
 const unsupportedMetric=/\b(?:involuntary|regrettable|retirement)\b/.test(text)||(voluntary&&total);
 const cost=/\bcosts?\b/.test(text),tenure=/\btenure\b/.test(text),guidance=/\b(?:investigate|drivers?|drive|driving)\b/.test(text);
 // Consume grammatical uses of short words only in explicit constructions. ISO
 // country codes (IN/IT/AT/TO/BY/IS/DO/ME) must not vanish in a broad word list.
 text=text.replace(/\b(?:by|across)\s+(?:all\s+)?levels?\b/g,'levels')
  .replace(/\bwhat does it cost\b/g,'cost').replace(/\bshow it again\b/g,'show that again')
  .replace(/\b(show|tell) me\b/g,'$1').replace(/\b(what|how|which) (?:is|do)\b/g,'$1')
  .replace(/\b(?:in|for|during|from)\s+(?=(?:20\d{2}|q[1-4]|current|latest|available|ytd|year-to-date|last|previous|next|this|past|today|yesterday|tomorrow|january|february|march|april|may|june|july|august|september|october|november|december)\b)/g,'');
 const remainder=text.replace(/\b(?:20\d{2}|q[1-4])\b/g,'').replace(/\b(?:which|what|how|are|were|was|does|did|the|our|a|an|all|show|please|tell|levels?|of|through|business|unit|company|turnover|attrition|total|overall|voluntary|involuntary|regrettable|retirement|rates?|counts?|exits?|contributions?|contribute|contributing|drive|drivers?|driving|breakdown|break|down|compare|comparison|current|latest|available|ytd|year-to-date|and|also|that|again|about|costs?|tenure|should|we|investigate|today|yesterday|tomorrow|past|weeks?|weekly|days?|daily|months?|this|calendar|last|previous|next|year|annual|annualized|annualised|monthly|quarterly|quarters?|january|february|march|april|may|june|july|august|september|october|november|december)\b/g,'').replace(/[\s,.!?;:'’"()-]/g,'');
 if(remainder)return null;
 const metric=voluntary?'voluntary':'total';
 const answer=unsupportedMetric?'Choose total or voluntary turnover for the level breakdown.':unsupportedPeriod?`The level breakdown supports the current YTD period, ${LEVEL_TURNOVER_PERIOD} (as of ${P.cutoff}). Ask for that period explicitly; the requested period has not been substituted.`:undefined;
 return {org:unit.code,metric,cost,tenure,guidance,...(answer?{answer}:{})};
}

const count=value=>Number.isSafeInteger(value)&&value>=0;
/** Validate all monthly rows, then take this dataset's current calendar YTD. */
export function currentYtdHistory(history,asOf=P.cutoff){
 const end=new Date(asOf+'T00:00:00Z'),months=(end.getUTCFullYear()-2024)*12+end.getUTCMonth()+1;
 if(asOf!==P.cutoff||!Array.isArray(history)||history.length!==months)throw Error('Incomplete level turnover history.');
 for(let i=0;i<months;i++){
  const row=history[i],month=new Date(Date.UTC(2024,i,1)).toISOString().slice(0,10);
  if(!row||Object.keys(row).sort().join(',')!=='headcount,month,total_exits,voluntary_exits'||row.month!==month||!count(row.headcount)||i===0&&(row.total_exits!==null||row.voluntary_exits!==null)||i>0&&(!count(row.total_exits)||!count(row.voluntary_exits)||row.voluntary_exits>row.total_exits))throw Error('Invalid level turnover history.');
 }
 return history.filter(row=>row.month.startsWith(asOf.slice(0,4)+'-'));
}

/** Whole monthly partitions must reconcile before any level is shown. */
export function calculateLevelTurnover(base,levels,metric,asOf=P.cutoff){
 const baseYtd=currentYtdHistory(base,asOf);
 if(!['total','voluntary'].includes(metric)||!Array.isArray(levels)||levels.length!==LEVEL_CODES.length||new Set(levels.map(level=>level.code)).size!==LEVEL_CODES.length||levels.some(level=>!LEVEL_CODES.includes(level.code)))throw Error('Incomplete level partition.');
 for(const level of levels)currentYtdHistory(level.history,asOf);
 for(let i=0;i<base.length;i++)for(const key of ['headcount','total_exits','voluntary_exits']){
  if(base[i][key]===null){if(levels.some(level=>level.history[i][key]!==null))throw Error('Conflicting level history.');}
  else {const sum=levels.reduce((n,level)=>n+level.history[i][key],0);if(!Number.isSafeInteger(sum)||sum!==base[i][key])throw Error('Level partition does not reconcile.');}
 }
 const key=metric==='total'?'total_exits':'voluntary_exits',totalExits=baseYtd.reduce((n,row)=>n+row[key],0),stockSum=baseYtd.reduce((n,row)=>n+row.headcount,0);
 if(!count(totalExits)||!count(stockSum)||baseYtd.length!==Number(asOf.slice(5,7)))throw Error('Invalid YTD totals.');
 const rows=levels.map(level=>{
  const ytd=currentYtdHistory(level.history,asOf),exitCount=ytd.reduce((n,row)=>n+row[key],0),averageHeadcount=ytd.reduce((n,row)=>n+row.headcount,0)/ytd.length;
  return {code:level.code,exitCount,contributionPct:totalExits?exitCount/totalExits*100:null,averageHeadcount,ratePct:averageHeadcount?exitCount/averageHeadcount*100:null};
 }).sort((a,b)=>b.exitCount-a.exitCount||Number(a.code.slice(1))-Number(b.code.slice(1)));
 return {totalExits,averageHeadcount:stockSum/baseYtd.length,ratePct:stockSum?totalExits/(stockSum/baseYtd.length)*100:null,rows};
}
