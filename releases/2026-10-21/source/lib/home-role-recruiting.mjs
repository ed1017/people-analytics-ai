/** Complete role comparison from authenticated catalogue and role timing responses. */
export function roleRecruitingComparison(catalog, responses, cutoff) {
 const must=(v,m)=>{if(!v)throw Error(m);};
 const suppressed=v=>v&&typeof v==='object'&&Object.entries(v).some(([k,x])=>(k==='suppressed'||k.endsWith('_suppressed'))&&x!==false&&x!==undefined);
 must(!suppressed(catalog),'Suppressed catalogue');
 const profiles=catalog?.profiles;
 must(Array.isArray(profiles)&&profiles.length>0&&profiles.length<=100,'Role catalogue unavailable');
 must(Array.isArray(responses)&&responses.length===profiles.length,'Incomplete role timing coverage');
 const codes=new Set();let start,end;
 const rows=profiles.map((p,i)=>{
  must(!suppressed(p)&&p.active===true&&typeof p.code==='string'&&p.code.length<=100&&typeof p.name==='string'&&!codes.has(p.code),'Invalid role catalogue');codes.add(p.code);
  const d=responses[i],t=d?.timing_evidence,m=t?.opening_to_accepted_offer;
  must(!suppressed(d)&&!suppressed(t)&&!suppressed(m),'Suppressed role evidence');
  must(d?.job_profile_code===p.code&&d.as_of===cutoff&&t?.as_of===cutoff&&t.schema_version===1&&t.source==='ta_requisition_metrics'&&t.method_version==='recruiting-timing-v1','Conflicting role evidence');
  must(t.scope?.job_profile_code===p.code&&t.scope.business_unit===null&&t.scope.country===null&&t.period_basis==='requisition closed_date','Unsupported role scope');
  const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  must(validDate(t.period_start)&&validDate(t.period_end)&&t.period_start<=t.period_end&&t.period_end<=cutoff,'Invalid role period');
  must(t.period_start==='2025-10-01'&&t.period_end==='2026-09-30','Unsupported released role period');
  start??=t.period_start;end??=t.period_end;must(start===t.period_start&&end===t.period_end,'Mixed role periods');
  must(m&&Number.isSafeInteger(m.valid_sample_count)&&m.valid_sample_count>=0&&m.minimum_benchmark_sample===5,'Invalid role sample');
  const available=m.status==='historical benchmark available';
  must(available?m.valid_sample_count>=5&&Number.isFinite(m.median_days)&&m.median_days>=0:m.median_days===null,'Invalid role benchmark');
  return {job_profile_code:p.code,job_profile_name:p.name,median_time_to_fill_days:available?m.median_days:null};
 });
 return {as_of:cutoff,summary:{active_job_profiles:profiles.length},roles:rows,period_start:start,period_end:end};
}
