import {aggregateRegistry} from './home-aggregate-registry.mjs';
/** Supplemental display contract; numbers originate in the validated server query, never prose. */
export function aggregateVisual(result){
 const def=aggregateRegistry.find(d=>d.id===result?.registryId),m=def?.metrics[result?.metric];
 const text=v=>typeof v==='string'&&v.length>0&&v.length<=1000&&!/[\u0000-\u001f\u007f]/.test(v);
 const integer=v=>Number.isSafeInteger(v)&&v>=0;
 if(!def||!m||result.unit!==m.unit||result.definition!==m.definition||result.scope!==def.scope||result.period!==def.period||!/^\d{4}-\d{2}-\d{2}$/.test(result.asOf??'')||!Number.isFinite(Date.parse(result.asOf))||new Date(result.asOf).toISOString().slice(0,10)!==result.asOf)return null;
 if(!integer(result.totalGroups)||result.totalGroups<1||result.totalGroups>(def.maxRows??500)||!integer(result.eligibleGroups)||!integer(result.excludedGroups)||result.eligibleGroups+result.excludedGroups!==result.totalGroups||!['ascending','descending'].includes(result.order)||result.coverage!==def.coverage||result.complete!==(def.coverage==='released-collection'&&result.excludedGroups===0))return null;
 const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=(m.min??0)&&v<=m.max&&(!m.integer||Number.isSafeInteger(v));
 if(!Array.isArray(result.rows)||result.rows.length>20||result.rows.length>result.eligibleGroups||result.returnedGroups!==result.rows.length||!Array.isArray(result.limitations)||result.limitations.length>10||!result.limitations.every(text))return null;
 if(result.completeTie){if(!result.complete||result.completeTie.count!==result.totalGroups||!valid(result.completeTie.value)||result.rows.length!==0||result.truncated!==false)return null;}
 else{
  if(result.rows.length<1||result.truncated!==(result.rows.length<result.eligibleGroups))return null;
  const ids=new Set();let rank=0;
  for(const [i,r]of result.rows.entries()){
   if(!r||typeof r!=='object'||Array.isArray(r)||!text(r.id)||!text(r.label)||ids.has(r.id)||!valid(r.value))return null;ids.add(r.id);
   if(i&&((result.order==='ascending'&&r.value<result.rows[i-1].value)||(result.order==='descending'&&r.value>result.rows[i-1].value)))return null;
   if(!i||r.value!==result.rows[i-1].value)rank=i+1;if(r.rank!==rank)return null;
  }
 }
 return structuredClone(result);
}
