/** Stock observations only: never sum headcount/FTE or infer flows from net change. */
export function queryWorkforceHistory(data,args){
 const fail=message=>({status:'unsupported',answer:message,points:[]});
 if(!args||!['headcount','fte'].includes(args.metric)||!/^\d{4}-\d{2}-\d{2}$/.test(args.start)||!/^\d{4}-\d{2}-\d{2}$/.test(args.end)||args.start>args.end)return fail('Choose headcount or FTE and an explicit ordered month-end period.');
 const rows=data?.trend;
 if(!Array.isArray(rows)||rows.length!==33||rows.some((r,i)=>r.snapshot_date!==new Date(Date.UTC(2024,i+1,0)).toISOString().slice(0,10)||!Number.isSafeInteger(r.headcount)||r.headcount<0||!Number.isFinite(r.fte)||r.fte<0||r.fte>r.headcount))throw Error('Historical stock observations could not be verified.');
 if(!rows.some(r=>r.snapshot_date===args.start)||!rows.some(r=>r.snapshot_date===args.end))return fail('Recorded month-end headcount and FTE are available from 2024-01-31 through 2026-09-30. No observations are substituted for unsupported dates.');
 const points=rows.filter(r=>r.snapshot_date>=args.start&&r.snapshot_date<=args.end).map(r=>({date:r.snapshot_date,value:r[args.metric]}));
 const unit=args.metric==='headcount'?'people':'FTE', first=points[0],last=points.at(-1),change=Math.round((last.value-first.value)*10)/10;
 return {status:'available',metric:args.metric,unit,start:first.date,end:last.date,points,change,
  answer:`Recorded ${args.metric==='headcount'?'headcount':'full-time equivalents'} (${unit}), ${first.date} through ${last.date}.\n\n${points.map(p=>`${p.date}: ${p.value.toLocaleString('en-US',{maximumFractionDigits:1})} ${unit}`).join('\n')}\n\nNet stock change: ${change.toLocaleString('en-US',{maximumFractionDigits:1})} ${unit}. `};
}
