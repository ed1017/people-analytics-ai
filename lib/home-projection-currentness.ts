import type {DashboardFilters} from './dashboard-scope';
import type {HeadcountProjection,ProjectionInputs} from './home-solution-projection';
// @ts-expect-error Native offline tests share TypeScript source.
import {projectionDigest,readHeadcountProjections} from './home-solution-projection.ts';

/** A fresh read of mutable legacy inputs, never an immutable dataset certificate. */
export type ProjectionCurrentnessReceipt={version:1;provenance:'legacy-live-source-read';datasetToken:'legacy-v1:0';checkedAt:string;inputs:ProjectionInputs;inputDigest:string};
export type ProjectionSelection={goalId:string;goalStatement:string;id:string;revision:number};
const dimensions=['country','org','level'] as const;
const exact=(value:unknown,keys:string[]):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const validFilter=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=100&&v.trim()===v&&!/[\u0000-\u001f\u007f]/.test(v);
function filtersValid(value:unknown):value is DashboardFilters{return exact(value,[...dimensions])&&dimensions.every(key=>validFilter(value[key]));}
const sameFilters=(a:DashboardFilters,b:DashboardFilters)=>dimensions.every(key=>a[key]===b[key]);
const date=(v:unknown):v is string=>typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const nonnegative=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;

/** No omitted dimensions, duplicate parameters, unknown keys or silent defaults. */
export function projectionCurrentnessFilters(params:URLSearchParams):DashboardFilters{
 if([...params.keys()].length!==3||dimensions.some(key=>params.getAll(key).length!==1)||[...params.keys()].some(key=>!dimensions.includes(key as typeof dimensions[number])))throw Error('Supply exactly country, org and level filters.');
 const filters={country:params.get('country'),org:params.get('org'),level:params.get('level')};
 if(!filtersValid(filters))throw Error('Invalid projection filters.');
 return filters;
}

function readInputs(raw:unknown):ProjectionInputs{
 if(!exact(raw,['asOf','opening','filters','scope','relations','datasetVersion','defaults','baseline'])||!date(raw.asOf)||!nonnegative(raw.opening)||Number(raw.opening)<=0||Number(raw.opening)>1e9||!filtersValid(raw.filters)||typeof raw.scope!=='string'||!raw.scope.trim()||raw.scope.length>300||raw.datasetVersion!==null||!Array.isArray(raw.relations)||raw.relations.length>10||!raw.relations.length||raw.relations.some(v=>typeof v!=='string'||!v||v.length>=100)||!Array.isArray(raw.baseline)||raw.baseline.length>24)throw Error('Projection source inputs are unavailable or invalid.');
 const defaults=['annual_growth_pct','salary_inflation_pct','annual_attrition_pct','fill_rate_pct','productivity_hiring_reduction_pct'];
 if(raw.defaults!==null&&(!exact(raw.defaults,defaults)||Object.values(raw.defaults).some(v=>typeof v!=='number'||!Number.isFinite(v))))throw Error('Invalid configured projection inputs.');
 if(raw.baseline.some(row=>!exact(row,['planning_month','planned_headcount','planned_fte','planned_labor_cost_usd'])||!date(row.planning_month)||!['planned_headcount','planned_fte','planned_labor_cost_usd'].every(key=>nonnegative(row[key]))))throw Error('Invalid projection reference inputs.');
 return structuredClone(raw) as unknown as ProjectionInputs;
}

export async function createProjectionCurrentnessReceipt(raw:unknown,datasetToken:string,filters:DashboardFilters,checkedAt=new Date().toISOString()):Promise<ProjectionCurrentnessReceipt>{
 if(datasetToken!=='legacy-v1:0')throw Error('This source read requires the current legacy binding.');
 const inputs=readInputs(raw);
 if(!filtersValid(filters)||!sameFilters(inputs.filters,filters)||!Number.isFinite(Date.parse(checkedAt))||new Date(checkedAt).toISOString()!==checkedAt)throw Error('Projection source scope or read time does not match.');
 return {version:1,provenance:'legacy-live-source-read',datasetToken,checkedAt,inputs,inputDigest:await projectionDigest(inputs)};
}

/** Consume only a fresh GET response. The UI owns request cancellation/epoch and
 * must supply a live guard for goal, workspace, selection, filters and dataset.
 * This function does not select a projection, persist anything or certify data.
 */
export async function currentHeadcountProjection({selection,activeGoal,analyses,receipt,filters,datasetToken,isCurrent}:{selection:ProjectionSelection;activeGoal:{id:string;statement:string};analyses:unknown;receipt:unknown;filters:DashboardFilters;datasetToken:string;isCurrent:()=>boolean}):Promise<HeadcountProjection>{
 if(!isCurrent()||!selection.goalId||selection.goalId!==activeGoal.id||selection.goalStatement!==activeGoal.statement)throw Error('The selected projection goal changed.');
 if(!exact(receipt,['version','provenance','datasetToken','checkedAt','inputs','inputDigest'])||receipt.version!==1||receipt.provenance!=='legacy-live-source-read'||receipt.datasetToken!==datasetToken||typeof receipt.checkedAt!=='string'||typeof receipt.inputDigest!=='string')throw Error('The projection source receipt is unavailable or stale.');
 const item=readHeadcountProjections(analyses).find(p=>p.id===selection.id&&p.revision===selection.revision);
 if(!item)throw Error('Select an available projection revision.');
 const checked=await createProjectionCurrentnessReceipt(receipt.inputs,datasetToken,filters,receipt.checkedAt);
 if(!isCurrent())throw Error('The projection context changed during verification.');
 if(receipt.inputDigest!==checked.inputDigest||item.inputDigest!==checked.inputDigest||!same(item.inputs,checked.inputs))throw Error('Projection inputs changed. Review a projection using the current source inputs.');
 return item;
}
