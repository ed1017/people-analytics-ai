/** Application contract for the existing dashboard_overview_filtered RPC.
 * Its country/org/level predicates were inspected read-only on 2026-10-07.
 * A receipt verifies dispatch and returned catalogue consistency, not database integrity.
 */
import {PUBLIC_9037} from './public-9037-contract.mjs';
export type DashboardFilters={country:string;org:string;level:string};
type ScopeFields={requested:DashboardFilters;effective:DashboardFilters|null;label:string;basis:string};
export type DashboardScopeReceipt=ScopeFields&({version:1;status:'verified_rpc'|'unsupported'|'mismatch'|'unavailable'}|{version:2;status:'verified_aggregate';artifactDigest:string;metricContract:'voluntary-ytd-nine-month-average-stock-v2';stockStatus:'positive'|'known-empty'}|{version:3;status:'verified_public_aggregate';datasetToken:string;contract:string;cutoff:string;metricContract:'voluntary-ytd-nine-month-average-stock-v2';stockStatus:'positive'|'known-empty'});
export function isVerifiedDashboardScope(value:DashboardScopeReceipt|null|undefined):boolean{return value?.status==='verified_rpc'||value?.status==='verified_aggregate'||value?.status==='verified_public_aggregate';}
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const dimensions=['country','org','level'] as const;
const optionKeys={country:'countries',org:'business_units',level:'levels'} as const;
const allLabels={country:'All countries',org:'All business units',level:'All levels'};
const normalized=(value:unknown)=>value===null||value===undefined||value===''||value==='all'?'all':typeof value==='string'?value:'';
export function dashboardRequestedFilters(params:URLSearchParams):DashboardFilters{return {country:normalized(params.get('country')),org:normalized(params.get('org')),level:normalized(params.get('level'))};}
export function dashboardScopeReceipt(raw:unknown,requested:DashboardFilters):DashboardScopeReceipt{
 const data=object(raw),options=object(data.filter_options),overview=object(data.overview);
 const receipt=(status:Extract<DashboardScopeReceipt,{version:1}>['status'],effective:DashboardFilters|null,label:string,basis:string):DashboardScopeReceipt=>({version:1,status,requested:{...requested},effective,label,basis});
 const supported=dimensions.every(key=>requested[key]==='all'||Array.isArray(options[optionKeys[key]])&&(options[optionKeys[key]] as unknown[]).some(raw=>object(raw).value===requested[key]));
 if(!supported)return receipt('unsupported',null,'Scope unavailable','Requested filter code is absent from the dashboard catalogue; source zeros are withheld.');
 // Do not ignore a future/alternate RPC applied-filter contract that contradicts dispatch.
 if(data.applied_filters!==undefined){const applied=object(data.applied_filters);if(dimensions.some(key=>!Object.hasOwn(applied,key)||normalized(applied[key])!==requested[key]))return receipt('mismatch',null,'Scope unavailable','Returned applied filters do not match the requested dashboard filters.');}
 const label=dimensions.map(key=>requested[key]==='all'?allLabels[key]:String((options[optionKeys[key]] as unknown[]).map(object).find(option=>option.value===requested[key])?.label??requested[key])).join('; ');
 const trend=Array.isArray(data.trend)?data.trend:[];
 // The legacy RPC coalesces a missing current snapshot and denominator to zero.
 // With no returned observation this is unavailable evidence, not an observed zero.
 if(!trend.some(row=>object(row).snapshot_date===overview.snapshot_date)||!Number.isFinite(overview.headcount)||Number(overview.headcount)<=0)return receipt('unavailable',null,'Scope unavailable','No current workforce observation supports this filter combination; counts and rates remain unknown.');
 return receipt('verified_rpc',{...requested},label,'Existing dashboard_overview_filtered predicates; request and returned catalogue agree. Not an independent database attestation.');
}
export function readDashboardScopeReceipt(raw:unknown):DashboardScopeReceipt|null{
 const value=object(raw),requested=object(value.requested),effective=object(value.effective);
 if(value.version===3){
  const keys=['version','status','requested','effective','label','basis','datasetToken','contract','cutoff','metricContract','stockStatus'];
  if(Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key))||value.status!=='verified_public_aggregate'||value.datasetToken!==PUBLIC_9037.token||value.contract!==PUBLIC_9037.contract||value.cutoff!==PUBLIC_9037.cutoff||value.metricContract!=='voluntary-ytd-nine-month-average-stock-v2'||!['positive','known-empty'].includes(String(value.stockStatus))||Object.keys(requested).length!==3||Object.keys(effective).length!==3||dimensions.some(key=>typeof requested[key]!=='string'||String(requested[key]).length===0||String(requested[key]).length>100||effective[key]!==requested[key])||typeof value.label!=='string'||value.label.length===0||value.label.length>200||value.label==='Scope unavailable'||typeof value.basis!=='string'||value.basis.length===0||value.basis.length>300)return null;
  return value as DashboardScopeReceipt;
 }
 if(value.version===2){
  const keys=['version','status','requested','effective','label','basis','artifactDigest','metricContract','stockStatus'];
  if(Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key))||value.status!=='verified_aggregate'||typeof value.artifactDigest!=='string'||!/^[a-f0-9]{64}$/.test(value.artifactDigest)||value.metricContract!=='voluntary-ytd-nine-month-average-stock-v2'||!['positive','known-empty'].includes(String(value.stockStatus))||Object.keys(requested).length!==3||Object.keys(effective).length!==3||dimensions.some(key=>typeof requested[key]!=='string'||String(requested[key]).length===0||String(requested[key]).length>100||effective[key]!==requested[key])||typeof value.label!=='string'||value.label.length===0||value.label.length>200||value.label==='Scope unavailable'||typeof value.basis!=='string'||value.basis.length===0||value.basis.length>300)return null;
  return value as DashboardScopeReceipt;
 }
 if(value.version!==1||!['verified_rpc','unsupported','mismatch','unavailable'].includes(String(value.status))||typeof value.label!=='string'||value.label.length>200||typeof value.basis!=='string'||value.basis.length>300||dimensions.some(key=>typeof requested[key]!=='string'||String(requested[key]).length>100))return null;
 if(value.status==='verified_rpc'?(dimensions.some(key=>typeof effective[key]!=='string'||effective[key]!==requested[key])||value.label==='Scope unavailable'):value.effective!==null)return null;
 return value as DashboardScopeReceipt;
}
export function scopedDashboardResponse(raw:unknown,requested:DashboardFilters){
 const data=object(raw),scope=dashboardScopeReceipt(raw,requested);
 return {...data,overview:scope.status==='verified_rpc'?data.overview:null,trend:scope.status==='verified_rpc'?data.trend:[],workforce_filter_scope:scope};
}
