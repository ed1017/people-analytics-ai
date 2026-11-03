/** Join only the pinned BU exit partition to its exact Jan–Sep month-end stock partition. */
export function withBusinessUnitTurnover(attrition,dashboards){
 const must=(v)=>{if(!v)throw Error('Business-unit turnover denominator unavailable');};
 const rows=attrition.business_units,asOf=attrition.as_of;
 must(['2026-09-30','2026-10-31'].includes(asOf)&&Array.isArray(rows)&&rows.length===8&&new Set(rows.map(r=>r.org_code)).size===8&&dashboards.length===9);
 const calendarMonths=Number(asOf.slice(5,7)),metricContract=calendarMonths===10?'voluntary-ytd-calendar-month-average-stock-v3':'voluntary-ytd-nine-month-average-stock-v2';
 const sums=Array(calendarMonths).fill(0);let exits=0,voluntary=0;
 const business_units=rows.map((row,i)=>{
  const d=dashboards[i],f={country:'all',org:row.org_code,level:'all'},s=d.workforce_filter_scope,t=d.turnover_evidence;
  must(s?.status==='verified_public_aggregate'&&Object.entries(f).every(([k,v])=>s.requested?.[k]===v&&s.effective?.[k]===v)&&s.cutoff===asOf);
  must(t?.contract===metricContract&&t.calendar_months===calendarMonths&&t.status==='available'&&t.voluntary_exits===row.voluntary_exits);
  const months=d.trend?.filter(r=>r.snapshot_date>='2026-01-01'&&r.snapshot_date<=asOf);must(months?.length===calendarMonths);
  months.forEach((r,j)=>{must(r.snapshot_date===new Date(Date.UTC(2026,j+1,0)).toISOString().slice(0,10)&&Number.isSafeInteger(r.headcount)&&r.headcount>=0);sums[j]+=r.headcount;});
  const sum=months.reduce((n,r)=>n+r.headcount,0),average=sum/calendarMonths;must(average>0&&sum===t.sum_month_end_headcount&&average===t.average_month_end_headcount);
  must(Number.isSafeInteger(row.exits)&&row.exits>=0&&Number.isSafeInteger(row.voluntary_exits)&&row.voluntary_exits>=0&&row.voluntary_exits<=row.exits);
  must(Math.round(1000*row.voluntary_exits/average)/10===row.voluntary_turnover_ytd_pct&&row.voluntary_turnover_ytd_pct===t.rate_pct);
  exits+=row.exits;voluntary+=row.voluntary_exits;
  return {...row,total_turnover_ytd_pct:100*row.exits/average,average_month_end_headcount:average};
 });
 const company=dashboards[8],f=company.workforce_filter_scope;must(f?.status==='verified_public_aggregate'&&['country','org','level'].every(k=>f.requested?.[k]==='all'&&f.effective?.[k]==='all')&&f.cutoff===asOf);
 const months=company.trend?.filter(r=>r.snapshot_date>='2026-01-01'&&r.snapshot_date<=asOf);must(months?.length===calendarMonths&&months.every((r,i)=>r.snapshot_date===new Date(Date.UTC(2026,i+1,0)).toISOString().slice(0,10)&&r.headcount===sums[i]));
 must(exits===attrition.summary.total_exits&&voluntary===attrition.summary.voluntary_exits&&Math.round(1000*exits/(sums.reduce((a,b)=>a+b,0)/calendarMonths))/10===attrition.summary.total_turnover_ytd_pct);
 return {...attrition,business_units};
}
