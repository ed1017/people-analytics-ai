import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {validateCompensationContext} from './compensation-release-context.ts';
import {rangesForScope} from './compensation-range-context.ts';
import {DEMO_JOB_CODES} from './dataset-demo-contracts.mjs';
const must=(ok)=>{if(!ok)throw Error('Unverified public compensation contract');};
const suppressed=o=>o&&Object.entries(o).some(([k,v])=>(k==='suppressed'||k.endsWith('_suppressed'))&&v!==false&&v!==undefined);
/** Reuse the released UI validation; never recompute individual pay or withheld complements. */
export function publicJobCompaRows(data){return validateCompensationContext(data,P.token);}
/** Only currently listed job/level policy bands, not raw pay or a market benchmark. */
export function publicCatalogBands(data){
 must(data?.data_meta?.datasetToken===P.token&&data.data_meta.cutoff===P.cutoff&&data.constructedPolicy?.version==='constructed-9037-inherited-range-policy-v1');
 must(Array.isArray(data.jobs)&&data.jobs.length>0&&data.jobs.length<=100&&Array.isArray(data.levels)&&data.levels.length>0&&data.levels.length<=20);
 for(const [rows,key]of [[data.jobs,'job_profile_code'],[data.levels,'level_code']])must(rows.every(r=>typeof r[key]==='string'&&/^[A-Z0-9-]{1,40}$/.test(r[key]))&&new Set(rows.map(r=>r[key])).size===rows.length);
 must(data.jobs.length===DEMO_JOB_CODES.length&&data.jobs.every(r=>DEMO_JOB_CODES.includes(r.job_profile_code)));
 must(data.levels.length===11&&data.levels.every(r=>/^L(?:[1-9]|10|11)$/.test(r.level_code)&&r.level_rank===Number(r.level_code.slice(1))));
 must(data.jobs.every(r=>typeof r.job_profile_name==='string'&&r.job_profile_name.length>0&&r.job_profile_name.length<=160));
 must(Array.isArray(data.constructedPolicy.bands)&&data.constructedPolicy.bands.length<=2000);
 // Normalization must not erase source suppression, including parent policy metadata.
 must([data,data.data_meta,data.constructedPolicy,...data.jobs,...data.levels,...data.constructedPolicy.bands].every(r=>r&&typeof r==='object'&&!Array.isArray(r)&&!suppressed(r)));
 const rows=rangesForScope(data,{country:'all',org:'all',level:'all'});
 must(rows.length===data.jobs.length*data.levels.length&&rows.length<=1000);
 return rows.map(r=>{
  // The released JSON uses effectivefrom; the UI adapter also supports effectiveFrom.
  const effective=r.effectivefrom??r.effectiveFrom;
  must(r.effectivefrom===undefined||r.effectiveFrom===undefined||r.effectivefrom===r.effectiveFrom);
  must(typeof effective==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(effective)&&Number.isFinite(Date.parse(effective))&&new Date(effective).toISOString().slice(0,10)===effective&&effective<=P.cutoff);
  return {job:r.job,level:r.level,label:`${r.name} / ${r.level}`,minimum:r.minimum,midpoint:r.midpoint,maximum:r.maximum};
 });
}
