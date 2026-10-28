/** Released Jan–Sep BU rates, never reconstructed from the selected snapshot. */
export function readHomeTurnoverGroups(value){
 if(!value||value.asOf!=='2026-09-30'||value.periodStart!=='2026-01-01'||!Array.isArray(value.rows)||value.rows.length!==8)return null;
 const count=n=>Number.isSafeInteger(n)&&n>=0,rate=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
 if(!count(value.totalExits)||!count(value.voluntaryExits)||value.voluntaryExits>value.totalExits)return null;
 const seen=new Set(),rows=[];let exits=0,voluntary=0;
 for(const r of value.rows){
  if(!r||(r.suppressed!==undefined&&r.suppressed!==false)||!['org_code','org_name'].every(k=>typeof r[k]==='string'&&r[k].trim()&&r[k].length<=160)||seen.has(r.org_code)||!count(r.exits)||!count(r.voluntary_exits)||r.voluntary_exits>r.exits||!rate(r.voluntary_turnover_ytd_pct))return null;
  seen.add(r.org_code);exits+=r.exits;voluntary+=r.voluntary_exits;
  rows.push({org_code:r.org_code,org_name:r.org_name,exits:r.exits,voluntary_exits:r.voluntary_exits,voluntary_turnover_ytd_pct:r.voluntary_turnover_ytd_pct});
 }
 if(exits!==value.totalExits||voluntary!==value.voluntaryExits)return null;
 rows.sort((a,b)=>a.org_code.localeCompare(b.org_code));
 return {asOf:value.asOf,periodStart:value.periodStart,totalExits:exits,voluntaryExits:voluntary,scope:'All eight business units; country and level filters do not apply.',metric:'Voluntary turnover YTD (%), January–September 2026; supplied source rate. Exits are counts, not total turnover rates. These descriptive baselines do not identify causes.',rows};
}
export function homeTurnoverGroups(data){
 if(data?.suppressed===true||data?.summary?.suppressed===true)return null;
 return readHomeTurnoverGroups({asOf:data?.as_of,periodStart:'2026-01-01',totalExits:data?.summary?.total_exits,voluntaryExits:data?.summary?.voluntary_exits,rows:data?.business_units});
}
