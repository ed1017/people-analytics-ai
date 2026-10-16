const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthPattern=/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b(?:\s+(?:of\s+)?(20\d{2}))?|\b(20\d{2})-(0[1-9]|1[0-2])\b/gi;
type Row = Record<string,unknown>;
const validMonth=(value:unknown):value is string=>typeof value==='string'&&/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(value);
const fields=['total_exits','voluntary_exits','involuntary_exits','regrettable_exits','monthly_turnover_pct','monthly_voluntary_turnover_pct'];
export function normalizeHomeMonthlyRows(raw:unknown,limit=3):Row[] {
  if(!Array.isArray(raw))return [];
  return raw.slice(0,Math.min(12,Math.max(0,limit))).filter(row=>row&&typeof row==='object'&&validMonth(row.month)).map(row=>Object.fromEntries([
    ['month',row.month],...fields.map(field=>{const value=row[field],rate=field.endsWith('_pct');return [field,row.suppressed!==true&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&(rate?value<=100:Number.isSafeInteger(value))?value:null];}),
  ]));
}
/** Existing company trend only. Never label it with the selected dashboard filters. */
export function selectHomeMonthlyRows(raw:unknown,question:string,asOf?:string):Row[] {
  if(!Array.isArray(raw))return [];
  const rows=raw.filter(row=>row&&typeof row==='object'&&validMonth(row.month)).sort((a,b)=>a.month.localeCompare(b.month));
  // The current turn's explicit periods take priority over earlier ambiguous questions.
  // Keep every requested comparison month before adding automatic comparison rows.
  const turns=question.split('\n\nCURRENT USER TURN:\n');
  const current=turns.at(-1)??'';
  // A monthly YTD request is a calendar window, not three sampled observations
  // and not a request to derive monthly values from a cumulative YTD rate.
  if(/\b(?:by month|month by month|monthly)\b/i.test(current)&&/\b(?:ytd|year.to.date)\b/i.test(current)){
    const cutoff=typeof asOf==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(asOf)?asOf:undefined;
    if(!cutoff)return [];
    const years=[...new Set(current.match(/\b20\d{2}\b/g)??[])];
    if(years.length>1)return [];
    const year=years[0]??cutoff.slice(0,4);
    return normalizeHomeMonthlyRows(rows.filter(row=>row.month.startsWith(year+'-')&&row.month<=cutoff),12);
  }
  const turnIndex=turns.findLastIndex(turn=>[...turn.matchAll(monthPattern)].length>0);
  if(turnIndex<0)return normalizeHomeMonthlyRows(rows.slice(-3));
  const turn=turns[turnIndex],mentions=[...turn.matchAll(monthPattern)];
  const correction=turnIndex<turns.length-1?turns.at(-1)?.match(/^(?:(?:actually|i mean|sorry)[, ]+)?(?:in )?(20\d{2})[.!?]?\s*$/i):null;
  const years=[...new Set(turn.match(/\b20\d{2}\b/g)??[])];
  const inheritedYear=turns.slice(0,turnIndex).join('\n').match(/\b20\d{2}\b/g)?.at(-1);
  const selected:Row[]=[],resolved:Row[]=[];
  const add=(row:Row)=>{if(!selected.some(item=>item.month===row.month))selected.push(row);};
  for(const mention of mentions){
    const month=mention[4]??String(months.indexOf(mention[1]?.toLowerCase())+1).padStart(2,'0');
    const year=correction?.[1]??mention[2]??mention[3]??(years.length===1?years[0]:turn.slice(0,mention.index).match(/\b20\d{2}\b/g)?.at(-1)??inheritedYear);
    const matches=rows.filter(row=>row.month.slice(5,7)===month&&(!year||row.month.startsWith(year+'-')));
    matches.slice(-3).forEach(add);
    if(matches.length===1)resolved.push(matches[0]);
  }
  for(const target of resolved){
    const month=String(target.month),date=new Date(month+'T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth()-1);
    for(const period of [date.toISOString().slice(0,10),String(Number(month.slice(0,4))-1)+month.slice(4)]){
      const row=rows.find(row=>row.month===period);if(row)add(row);
    }
  }
  return normalizeHomeMonthlyRows(selected.slice(0,3));
}
