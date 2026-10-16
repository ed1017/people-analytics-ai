// @ts-expect-error Native Node tests share application source.
import {validHistoryDate} from './history-date.ts';
export const HOME_HISTORY_ROWS=36;
type Row=Record<string,unknown>;
const names=['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthPattern=/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b(?:\s+(20\d{2}))?|\b(20\d{2})-(0[1-9]|1[0-2])(?:-(\d{2}))?\b/gi;
/** null means no explicit historical window. [] means the requested window has no eligible observations.
 * Calendar selection only: never aggregate stocks, rates, survey populations or modeled flows. */
export function selectHomeHistory(raw:unknown,dateField:string,question:string,asOf?:string):Row[]|null {
 const text=question.split('\n\nCURRENT USER TURN:\n').at(-1)??'';
 const rows=(Array.isArray(raw)?raw:[]).filter((r):r is Row=>!!r&&typeof r==='object'&&validHistoryDate(r[dateField])).sort((a,b)=>String(a[dateField]).localeCompare(String(b[dateField])));
 const cutoff=validHistoryDate(asOf)?asOf:null;
 const years=[...new Set(text.match(/\b20\d{2}\b/g)??[])],matches=[...text.matchAll(monthPattern)];
 const resolve=(m:RegExpMatchArray,last:boolean,fallback:string|null)=>{
  const year=m[2]??m[3]??fallback;if(!year)return null;
  const month=m[4]??String(names.findIndex(n=>n.startsWith(m[1].toLowerCase().slice(0,3)))+1).padStart(2,'0');
  const day=m[5]??(last?String(new Date(Date.UTC(Number(year),Number(month),0)).getUTCDate()):'01');
  const date=`${year}-${month}-${day}`;return validHistoryDate(date)?date:null;
 };
 let start:string,end:string;
 // Explicit bounds override YTD and full-history shorthand.
 if(matches.length===2&&/^\s*(?:to|through|until|[\u2013\u2014-])\s*$/i.test(text.slice((matches[0].index??0)+matches[0][0].length,matches[1].index))){
  const fallback=years.length===1?years[0]:null,first=resolve(matches[0],false,fallback),last=resolve(matches[1],true,fallback);
  if(!first||!last)return [];start=first;end=last;
 }else if(/\b(?:ytd|year[ -]to[ -]date)\b/i.test(text)){
  if(!cutoff||years.length>1)return [];
  const year=years[0]??cutoff.slice(0,4);start=year+'-01-01';end=year+'-12-31';
  if(matches.length===1&&/\b(?:through|until|to|as of)\s*$/i.test(text.slice(0,matches[0].index))){
   const last=resolve(matches[0],true,year);if(!last)return [];end=last;
  }
 }else if(/\b(?:all|full|entire|complete)\s+(?:available\s+)?history\b/i.test(text)){
  start='2000-01-01';end='2099-12-31';
 }else if(matches.length===0&&years.length===1&&/\b(?:monthly|by month|history|historical|trend)\b/i.test(text)){
  start=years[0]+'-01-01';end=years[0]+'-12-31';
 }else return null;
 if(start>end)return [];
 if(cutoff&&end>cutoff)end=cutoff;
 // Return the entire selected window. The packet normalizer owns the explicit row/byte bounds.
 return rows.filter(row=>String(row[dateField])>=start&&String(row[dateField])<=end);
}
