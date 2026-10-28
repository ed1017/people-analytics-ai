import fields from './public-9037-fields.json' with {type:'json'};
import {PUBLIC_9037} from './public-9037-contract.mjs';
const denied=(key)=>['data_meta','recruiters','skill_id','artifactDigest'].includes(key);
export function projectPublic9037(path,input,digest){
 const allowed=fields[path];if(!allowed)throw Error('Unreviewed public endpoint');
 // The index allowlist does not authorize occupational detail data. Only the
 // existing explicitly unavailable, empty detail response can cross this boundary.
 if(path==='/api/occupational-reference'&&input?.kind==='detail'){
  const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const exact=(v,keys)=>record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
  if(!exact(input,['kind','code','essentialSkills','softwareSkills','suppressedRatings','sources','data_meta'])||typeof input.code!=='string'||!/^\d{2}-\d{4}\.\d{2}$/.test(input.code)||!Array.isArray(input.essentialSkills)||input.essentialSkills.length!==0||!Array.isArray(input.softwareSkills)||input.softwareSkills.length!==0||input.suppressedRatings!==0||!exact(input.sources,['essentialSkills','softwareSkills'])||input.sources.essentialSkills!=='unavailable'||input.sources.softwareSkills!=='unavailable'||!record(input.data_meta))throw Error('Unreviewed occupational detail response');
  return {kind:'detail',code:input.code,essentialSkills:[],softwareSkills:[],suppressedRatings:0,sources:{essentialSkills:'unavailable',softwareSkills:'unavailable'},data_meta:public9037Metadata(digest)};
 }
 function walk(value,at=''){
  if(Array.isArray(value)){
   const itemPath=at+'[]';
   // A sampled empty collection authorizes no future entries or mapping data.
   if(!allowed.some(p=>p===itemPath||p.startsWith(itemPath+'.')||p.startsWith(itemPath+'[]'))){
    if(value.length)throw Error('Public collection must remain empty: '+at);
    return [];
   }
   return value.map(v=>walk(v,itemPath));
  }
  if(value&&typeof value==='object'){
   const out={};for(const [key,v]of Object.entries(value)){
    if(denied(key)||key==='id'&&at==='profiles[]')continue;
    const next=at?at+'.'+key:key;
    if(!allowed.some(p=>p===next||p.startsWith(next+'.')||p.startsWith(next+'[]')))throw Error('Unreviewed public field: '+next);
    out[key]=walk(v,next);
   }
   // Replace nested private receipts, never forward their identifiers or values.
   if(Object.hasOwn(value,'data_meta'))out.data_meta=public9037Metadata(digest,value.data_meta);
   return out;
  }
  if(value===null&&allowed.some(p=>p.startsWith(at+'.')||p.startsWith(at+'[]')))return null;
  if(!allowed.includes(at))throw Error('Unreviewed public leaf: '+at);
  if(typeof value==='number'&&!Number.isFinite(value))throw Error('Invalid public number');
  if(typeof value==='string'&&(/\.private-9037|captured-62-queries|integrity-manifest|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(value)))throw Error('Private marker in public value');
  return value;
 }
 const result=walk(input);
 if(path==='/api/dashboard'&&result.workforce_filter_scope?.status==='verified_aggregate'){
  // Public provenance is explicit; never fabricate or restore the private digest.
  result.workforce_filter_scope={...result.workforce_filter_scope,version:3,status:'verified_public_aggregate',datasetToken:PUBLIC_9037.token,contract:PUBLIC_9037.contract,cutoff:PUBLIC_9037.cutoff};
 }
 if(path==='/api/compensation-job-release'){result.release_id=PUBLIC_9037.compensationRelease;for(const r of result.rows)r.release_id=PUBLIC_9037.compensationRelease;}
 return result;
}
export function public9037Metadata(digest,source={}){
 // Only these two reviewed semantic fields are required by existing clients.
 const extra={};
 const hireConvention='hire_date is accepted offer; start_date drives headcount inflow. Internal hires are movements, not external starts.';
 if(Object.hasOwn(source,'hireDateConvention')){if(source.hireDateConvention!==hireConvention)throw Error('Unreviewed hire convention');extra.hireDateConvention=hireConvention;}
 if(Object.hasOwn(source,'independentForecastValidation')){if(source.independentForecastValidation!==false)throw Error('Unreviewed forecast validation');extra.independentForecastValidation=false;}
 return {...extra,datasetToken:PUBLIC_9037.token,datasetId:PUBLIC_9037.datasetId,bundleDigest:digest,cutoff:PUBLIC_9037.cutoff,dataClass:'constructed-synthetic',publicationApproved:true,contract:PUBLIC_9037.contract,publicationReceiptId:PUBLIC_9037.approval,sourceLabel:'Public fictional synthetic workforce; not observed employee outcomes. Conditional calculations, not approved actions.'};
}
export const public9037Fields=fields;
