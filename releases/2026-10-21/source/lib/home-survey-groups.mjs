const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const label=v=>typeof v==='string'&&v.trim().length>0&&v.length<=160;
/** Complete released partition only. Missing/suppressed/invalid groups never become a sampled ranking. */
export function readHomeSurveyGroups(value){
 if(!value||!date(value.asOf)||!Number.isSafeInteger(value.respondents)||value.respondents<=0||!Array.isArray(value.rows)||!value.rows.length||value.rows.length>40)return null;
 const codes=new Set(),rows=[];let total=0;
 for(const r of value.rows){
  if(!r||(r.suppressed!==undefined&&r.suppressed!==false)||!label(r.org_code)||!label(r.org_name)||codes.has(r.org_code)||!Number.isSafeInteger(r.respondents)||r.respondents<=0||!Number.isFinite(r.avg_score)||r.avg_score<1||r.avg_score>5||!Number.isFinite(r.favorable_pct)||r.favorable_pct<0||r.favorable_pct>100)return null;
  codes.add(r.org_code);total+=r.respondents;
  rows.push({org_code:r.org_code,org_name:r.org_name,respondents:r.respondents,avg_score:r.avg_score,favorable_pct:r.favorable_pct});
 }
 if(total!==value.respondents)return null;
 rows.sort((a,b)=>a.org_code.localeCompare(b.org_code));
 return {asOf:value.asOf,respondents:total,scope:'Complete released business-unit partition; workforce filters do not apply. Not teams or demographics.',metric:'Engagement favorability: answered items rated 4 or 5 on a 1–5 scale, averaged across valid respondents; not text sentiment or eNPS.',suppression:'No suppression status asserted. Comparison unavailable if any supplied row is suppressed, invalid or the respondent partition is incomplete.',rows};
}
export function homeSurveyGroups(data){
 if(data?.suppressed===true||data?.summary?.suppressed===true)return null;
 return readHomeSurveyGroups({asOf:data?.as_of,respondents:data?.summary?.engagement_respondents,rows:data?.business_units});
}
