import type {StructuralPositionCatalogResponse} from './types';

export type PositionDashboardScope = {businessUnit:string;role:string;level:string};
export const ALL_POSITION_SCOPE:PositionDashboardScope = {businessUnit:'',role:'',level:''};
const count=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;

/** Read-only catalog totals. Budget and structural frozen status are demo assumptions, never funded spend or FTE. */
export function positionDashboard(catalog:StructuralPositionCatalogResponse|null,scope:PositionDashboardScope=ALL_POSITION_SCOPE){
 if(!catalog||!Array.isArray(catalog.combinations)||!/^\d{4}-\d{2}-\d{2}$/.test(catalog.as_of))return {status:'unavailable' as const};
 const keys=new Set<string>();
 for(const row of catalog.combinations){
  if(!row||![row.org_code,row.level_code,row.job_profile_code].every(value=>typeof value==='string'&&value.length>0))return {status:'unavailable' as const};
  const key=JSON.stringify([row.org_code,row.level_code,row.job_profile_code]);
  if(keys.has(key))return {status:'unavailable' as const};keys.add(key);
 }
 const rows=catalog.combinations.filter(row=>(!scope.businessUnit||row.org_code===scope.businessUnit)&&(!scope.role||row.job_profile_code===scope.role)&&(!scope.level||row.level_code===scope.level));
 if(!rows.length)return {status:'empty' as const,asOf:catalog.as_of};
 if(rows.some(row=>!count(row.current_positions)||!count(row.vacant_positions)||row.vacant_positions>row.current_positions))return {status:'unavailable' as const};
 const sum=(key:'current_positions'|'vacant_positions')=>rows.reduce((n,row)=>n+row[key],0);
 const optionalSum=(key:'frozen_positions'|'open_requisition_vacancies'|'on_hold_requisition_vacancies'|'uncovered_vacancies')=>rows.every(row=>count(row[key]))?rows.reduce((n,row)=>n+row[key]!,0):null;
 const current=sum('current_positions'),activeVacancies=sum('vacant_positions'),filled=current-activeVacancies;
 const frozen=optionalSum('frozen_positions'),recruiting=optionalSum('open_requisition_vacancies'),onHold=optionalSum('on_hold_requisition_vacancies'),other=optionalSum('uncovered_vacancies');
 if(rows.some(row=>[row.open_requisition_vacancies,row.on_hold_requisition_vacancies,row.uncovered_vacancies].every(count)&&(row.open_requisition_vacancies! + row.on_hold_requisition_vacancies! + row.uncovered_vacancies!)!==row.vacant_positions))return {status:'unavailable' as const};
 const budgeted=frozen===null?null:current+frozen,vacant=frozen===null?null:activeVacancies+frozen;
 if([current,activeVacancies,filled,frozen,recruiting,onHold,other,budgeted,vacant].some(n=>n!==null&&!count(n)))return {status:'unavailable' as const};
 return {status:'ready' as const,asOf:catalog.as_of,current,budgeted,filled,vacant,frozen,recruiting,onHold,other,breakdownKnown:[frozen,recruiting,onHold,other].every(n=>n!==null)};
}
