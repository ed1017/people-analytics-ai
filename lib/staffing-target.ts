import type {BusinessUnitScenarioOption, BusinessUnitScenarioResponse, ScenarioModelAssumptions} from './types';

export const STAFFING_TARGET_BASIS='business-unit-baseline-v1';
// Explicit reviewed draft horizon, never an inferred bridge across the missing quarter.
export const STAFFING_TARGET_9037_BASIS='constructed-9037-carried-stock-2027-v1';
export const STAFFING_TARGET_9037_HORIZON=Object.freeze({start:'2027-01-01',end:'2027-12-01',openingStockDate:'2026-09-30',unmodeledMonths:Object.freeze(['2026-10','2026-11','2026-12'])});

export type StaffingCatalog={as_of:string;defaults:ScenarioModelAssumptions;business_units:BusinessUnitScenarioOption[];staffing_target_basis:string;staffing_target_horizon?:typeof STAFFING_TARGET_9037_HORIZON};
const bounds={annual_growth_pct:[-10,20],salary_inflation_pct:[-5,15],annual_attrition_pct:[0,30],fill_rate_pct:[0,100],productivity_hiring_reduction_pct:[0,50]} as const;
const keys=Object.keys(bounds) as (keyof ScenarioModelAssumptions)[];
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const stock=(value:unknown):value is number=>finite(value)&&value>=0&&value<=1e9;
const text=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=200;
export const validStaffingDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const nextMonth=(month:string)=>{const [year,value]=month.split('-').map(Number);return `${year+(value===12?1:0)}-${String(value===12?1:value+1).padStart(2,'0')}`;};
const fail=()=>{throw Error('Comparable business-unit supply is unavailable. Refresh source data before comparing.');};
function candidateHorizon(data:unknown){
 const d=data as StaffingCatalog&{data_meta?:{datasetId?:string;publicationApproved?:boolean}};
 if(d.staffing_target_basis!==STAFFING_TARGET_9037_BASIS)return false;
 const h=d.staffing_target_horizon;
 if(d.as_of!=='2026-09-30'||d.data_meta?.datasetId!=='workforce-demo-9037-2026-09-30-v3-1-offline-candidate'||d.data_meta?.publicationApproved!==false||!h||h.start!==STAFFING_TARGET_9037_HORIZON.start||h.end!==STAFFING_TARGET_9037_HORIZON.end||h.openingStockDate!==d.as_of||JSON.stringify(h.unmodeledMonths)!==JSON.stringify(STAFFING_TARGET_9037_HORIZON.unmodeledMonths))fail();
 return true;
}
const rawNumber=(value:unknown)=>{if((typeof value!=='number'&&typeof value!=='string')||String(value).trim()===''||!Number.isFinite(Number(value)))fail();return Number(value);};
const rawStock=(value:unknown)=>{const number=rawNumber(value);if(!stock(number))fail();return number;};

/** Opt-in checks before the legacy loader can turn missing source values into zero. */
export function assertStaffingCatalogSource(defaults:Record<string,unknown>|null,rows:Record<string,unknown>[]|null){
 if(!defaults||!rows?.length||!validStaffingDate(defaults.as_of))fail();
 for(const key of keys){const n=rawNumber(defaults![`baseline_${key}`]);if(n<bounds[key][0]||n>bounds[key][1])fail();}
 const seen=new Set();
 for(const row of rows!){if(row.as_of!==defaults!.as_of||!text(row.org_code)||!text(row.org_name)||seen.has(row.org_code))fail();seen.add(row.org_code);rawStock(row.headcount);rawStock(row.fte);}
}
export function assertStaffingBaselineSource(rows:Record<string,unknown>[]|null,asOf:string){
 if(!validStaffingDate(asOf)||!rows?.length)fail();let previous=asOf.slice(0,7);
 for(const row of rows!){if(!validStaffingDate(row.planning_month)||row.planning_month.slice(8)!=='01'||row.planning_month.slice(0,7)!==nextMonth(previous))fail();previous=(row.planning_month as string).slice(0,7);for(const key of ['planned_headcount','planned_fte','planned_labor_cost_usd'])rawStock(row[key]);}
}
export function readStaffingCatalog(value:unknown):StaffingCatalog{
 const data=value as StaffingCatalog;
 if(!data||(data.staffing_target_basis!==STAFFING_TARGET_BASIS&&!candidateHorizon(data))||!validStaffingDate(data.as_of)||!data.defaults||!Array.isArray(data.business_units)||!data.business_units.length)fail();
 for(const key of keys){const n=data.defaults[key];if(!finite(n)||n<bounds[key][0]||n>bounds[key][1])fail();}
 const seen=new Set();for(const unit of data.business_units){if(!unit||!text(unit.org_code)||!text(unit.org_name)||!stock(unit.headcount)||!stock(unit.fte)||seen.has(unit.org_code))fail();seen.add(unit.org_code);}
 return data;
}
export function readStaffingSupply(value:unknown,catalog:StaffingCatalog,orgCode:string):BusinessUnitScenarioResponse{
 const data=value as BusinessUnitScenarioResponse&{staffing_target_basis?:string};
 const unit=catalog.business_units.find(row=>row.org_code===orgCode);
 if(!unit||!data||data.staffing_target_basis!==catalog.staffing_target_basis||data.as_of!==catalog.as_of||data.source_scenario!=='Baseline'||data.scope?.type!=='business_unit'||data.scope.org_code!==orgCode||data.scope.org_name!==unit.org_name||data.scope.current_headcount!==unit.headcount||data.summary?.starting_headcount!==unit.headcount||!data.assumptions||!data.defaults)fail();
 for(const key of keys)if(data.assumptions[key]!==catalog.defaults[key]||data.defaults[key]!==catalog.defaults[key])fail();
 readStaffingCatalog(catalog);
 const carried=candidateHorizon(catalog);
 if(carried&&!candidateHorizon(data))fail();
 if(!Array.isArray(data.points)||!data.points.length)fail();
 if(carried&&(data.points.length!==12||data.points[0].planning_month!==STAFFING_TARGET_9037_HORIZON.start||data.points.at(-1)!.planning_month!==STAFFING_TARGET_9037_HORIZON.end))fail();
 let previous=carried?'2026-12':catalog.as_of.slice(0,7);
 for(const point of data.points){if(!validStaffingDate(point.planning_month)||point.planning_month.slice(8)!=='01'||point.planning_month.slice(0,7)!==nextMonth(previous)||!stock(point.modeled_headcount))fail();previous=point.planning_month.slice(0,7);}
 if(data.scope.planning_horizon_start!==data.points[0].planning_month||data.scope.planning_horizon_end!==data.points.at(-1)!.planning_month)fail();
 return data;
}
/** A single explicit target point. Never infer targets for any other month. */
export function staffingTargetPoint(supply:BusinessUnitScenarioResponse|null,month:string,target:string){
 if(!supply||!validStaffingDate(month))return null;
 const matches=supply.points.filter(point=>point.planning_month===month);
 if(matches.length!==1||!stock(matches[0].modeled_headcount))return null;
 if(!/^\d+$/.test(target)||!Number.isSafeInteger(Number(target))||Number(target)>1e9)return null;
 const required=Number(target),available=matches[0].modeled_headcount;
 return {month,required,available,gap:Math.round((required-available)*10)/10};
}
