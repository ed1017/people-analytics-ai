/** Application contract for the existing dashboard_overview_filtered RPC.
 * Its country/org/level predicates were inspected read-only on 2026-10-07.
 * A receipt verifies dispatch and returned catalogue consistency, not database integrity.
 */
export type DashboardFilters={country:string;org:string;level:string};
export type DashboardScopeReceipt={version:1;status:'verified_rpc'|'unsupported'|'mismatch'|'unavailable';requested:DashboardFilters;effective:DashboardFilters|null;label:string;basis:string};
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const dimensions=['country','org','level'] as const;
const optionKeys={country:'countries',org:'business_units',level:'levels'} as const;
const allLabels={country:'All countries',org:'All business units',level:'All levels'};
const normalized=(value:unknown)=>value===null||value===undefined||value===''||value==='all'?'all':typeof value==='string'?value:'';
export function dashboardRequestedFilters(params:URLSearchParams):DashboardFilters{return {country:normalized(params.get('country')),org:normalized(params.get('org')),level:normalized(params.get('level'))};}
export function dashboardScopeReceipt(raw:unknown,requested:DashboardFilters):DashboardScopeReceipt{
 const data=object(raw),options=object(data.filter_options),overview=object(data.overview);
 const receipt=(status:DashboardScopeReceipt['status'],effective:DashboardFilters|null,label:string,basis:string):DashboardScopeReceipt=>({version:1,status,requested:{...requested},effective,label,basis});
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
 if(value.version!==1||!['verified_rpc','unsupported','mismatch','unavailable'].includes(String(value.status))||typeof value.label!=='string'||value.label.length>200||typeof value.basis!=='string'||value.basis.length>300||dimensions.some(key=>typeof requested[key]!=='string'||String(requested[key]).length>100))return null;
 if(value.status==='verified_rpc'?(dimensions.some(key=>typeof effective[key]!=='string'||effective[key]!==requested[key])||value.label==='Scope unavailable'):value.effective!==null)return null;
 return value as DashboardScopeReceipt;
}
export function scopedDashboardResponse(raw:unknown,requested:DashboardFilters){
 const data=object(raw),scope=dashboardScopeReceipt(raw,requested);
 return {...data,overview:scope.status==='verified_rpc'?data.overview:null,trend:scope.status==='verified_rpc'?data.trend:[],workforce_filter_scope:scope};
}
