const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthPattern=/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b(?:\s+(?:of\s+)?(20\d{2}))?|\b(20\d{2})-(0[1-9]|1[0-2])\b/gi;
type Row = Record<string,unknown>;
const validMonth=(value:unknown):value is string=>typeof value==='string'&&/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(value);
const fields=['total_exits','voluntary_exits','involuntary_exits','regrettable_exits','monthly_turnover_pct','monthly_voluntary_turnover_pct'];
export function normalizeHomeMonthlyRows(raw:unknown):Row[] {
  if(!Array.isArray(raw))return [];
  return raw.slice(0,3).filter(row=>row&&typeof row==='object'&&validMonth(row.month)).map(row=>Object.fromEntries([
    ['month',row.month],...fields.map(field=>{const value=row[field],rate=field.endsWith('_pct');return [field,row.suppressed!==true&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&(rate?value<=100:Number.isSafeInteger(value))?value:null];}),
  ]));
}
/** Existing company trend only. Never label it with the selected dashboard filters. */
export function selectHomeMonthlyRows(raw:unknown,question:string):Row[] {
  if(!Array.isArray(raw))return [];
  const rows=raw.filter(row=>row&&typeof row==='object'&&validMonth(row.month)).sort((a,b)=>a.month.localeCompare(b.month));
  const mentions=[...question.matchAll(monthPattern)],mention=mentions.at(-1);
  if(!mention)return normalizeHomeMonthlyRows(rows.slice(-3));
  const month=mention[4]??String(months.indexOf(mention[1]?.toLowerCase())+1).padStart(2,'0');
  // A short month-only follow-up keeps an explicitly stated year from earlier user turns.
  const correction=question.slice((mention.index??0)+mention[0].length).match(/(?:^|\n)(?:(?:actually|i mean|sorry)[, ]+)?(?:in )?(20\d{2})[.!?]?\s*$/i);
  const year=correction?.[1]??mention[2]??mention[3]??question.slice(0,mention.index).match(/\b20\d{2}\b/g)?.at(-1);
  const matches=rows.filter(row=>row.month.slice(5,7)===month&&(!year||row.month.startsWith(year+'-')));
  if(matches.length!==1)return normalizeHomeMonthlyRows(matches.slice(-3));
  const target=matches[0],date=new Date(target.month+'T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth()-1);const previous=date.toISOString().slice(0,10);
  const priorYear=String(Number(target.month.slice(0,4))-1)+target.month.slice(4);
  return normalizeHomeMonthlyRows([target,...rows.filter(row=>row.month===previous||row.month===priorYear)].slice(0,3));
}
