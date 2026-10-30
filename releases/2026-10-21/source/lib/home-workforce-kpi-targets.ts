// @ts-expect-error Native tests share application source.
import {evaluateWorkforceKpis,workforceKpiKey,type WorkforceKpiInput,type WorkforceKpiContext,type WorkforceKpiResult} from './workforce-kpi-status.ts';
import {PUBLIC_9037} from './public-9037-contract.mjs';
import type {DashboardFilters} from './dashboard-scope';
export const HOME_KPI_TARGETS_FIELD='home.workforceKpiTargetsV1';
export type HomeKpiTargets={version:1;entries:{key:string;context:WorkforceKpiContext;value:number|null;revision:number}[]};
export function readHomeKpiTargets(raw:unknown):HomeKpiTargets|null{
 if(raw===undefined)return {version:1,entries:[]};
 const v=raw as HomeKpiTargets;if(!v||Object.keys(v).sort().join()!=='entries,version'||v.version!==1||!Array.isArray(v.entries)||v.entries.length>250)return null;
 const seen=new Set<string>();for(const e of v.entries){if(!e||Object.keys(e).sort().join()!=='context,key,revision,value'||typeof e.key!=='string'||e.key.length>3000||seen.has(e.key)||!Number.isSafeInteger(e.revision)||e.revision<1||e.value!==null&&(typeof e.value!=='number'||!Number.isFinite(e.value)||e.value<0||e.value>1e9)||!e.context||typeof e.context!=='object')return null;seen.add(e.key);}
 return structuredClone(v);
}
export type HomeKpiFacts={datasetToken:string;filters:DashboardFilters;asOf:string;state:'current'|'loading'|'unavailable';turnover:number|null;fte:number|null;timeToFill:number|null;recruitingCurrent:boolean;recruitingDefinition:string|null};
export function homeWorkforceKpiInputs(f:HomeKpiFacts,raw:unknown,ready=true):WorkforceKpiInput[]{
 const stored=readHomeKpiTargets(raw),company={country:'all',org:'all',level:'all',role:'all',scenario:'company'},selected={...f.filters,role:'all',scenario:'company'};
 const context=(scope:typeof company,unit:WorkforceKpiContext['unit'],definition:string,ytd=false):WorkforceKpiContext=>({datasetToken:f.datasetToken,scope,period:{kind:ytd?'ytd':'snapshot',start:ytd?f.asOf.slice(0,4)+'-01-01':f.asOf,end:f.asOf},unit,definition,currency:null,costBasis:null});
 const rows:WorkforceKpiInput[]=[
 {id:'turnover-ytd',label:'Voluntary turnover YTD',metric:'voluntary-turnover-ytd',actual:{value:f.turnover,state:f.state,context:context(selected,'percent','voluntary-ytd-average-month-end-stock',true)},target:null},
 {id:'time-to-fill',label:'Average time to fill',metric:'time-to-fill',actual:{value:f.timeToFill,state:f.recruitingCurrent?f.state:'unavailable',context:context(company,'days',f.recruitingDefinition??'cohort-unavailable')},target:null},
 {id:'fte-stock',label:'Minimum FTE staffing',metric:'staffing-vs-plan',actual:{value:f.fte,state:f.state,context:context(selected,'FTE','recorded-staffing-stock')},target:null}];
 for(const row of rows){const k=workforceKpiKey(row),entry=stored?.entries.find(e=>e.key===k);const value=entry?entry.value:defaultHomeKpiTarget(row);
  if(ready&&stored&&value!==null)row.target={value,state:'current',context:entry?entry.context:row.actual.context,provenance:{kind:'modeled-default',version:entry?'edited-'+entry.revision:'home-targets-v1',reference:entry?'User-edited modeled target':'Illustrative company scenario target for this reporting period'}};
 }
 return rows;
}
export function evaluateHomeWorkforceKpis(f:HomeKpiFacts,raw:unknown,ready=true){return evaluateWorkforceKpis(homeWorkforceKpiInputs(f,raw,ready));}
export function editHomeKpiTargets(raw:unknown,inputs:readonly WorkforceKpiInput[],values:Record<string,number|null>,reset=false):HomeKpiTargets{
 const stored=readHomeKpiTargets(raw);if(!stored)throw Error('Saved targets could not be read. Existing settings were retained.');const keys=new Set(inputs.map(workforceKpiKey)),entries=stored.entries.filter(e=>!keys.has(e.key));
 if(!reset)for(const row of inputs){const value=values[row.id];if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e9||row.metric==='voluntary-turnover-ytd'&&value>100))throw Error('Enter a valid target or leave it blank.');const key=workforceKpiKey(row);entries.push({key,context:structuredClone(row.actual.context),value,revision:(stored.entries.find(e=>e.key===key)?.revision??0)+1});}
 const next={version:1 as const,entries};if(!readHomeKpiTargets(next))throw Error('Target storage is full. Existing targets were retained.');return next;
}

export function kpiComparisonText(row:WorkforceKpiResult){if(row.status==='neutral'||row.target===null||row.gap===null)return 'Target not assessed';const format=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:2}),unit=row.context.unit==='percent'?'%':row.context.unit==='FTE'?' FTE':' days',delta=row.context.unit==='percent'?' pp':unit;return `Target ${row.direction==='at-most'?'≤':'≥'} ${format(row.target)}${unit} · ${row.adverseGap===0?'On target':format(Math.abs(row.gap))+delta+(row.status==='red'?(row.direction==='at-most'?' above':' short'):(row.direction==='at-most'?' below':' above'))}`;}

export function defaultHomeKpiTarget(row:WorkforceKpiInput):number|null {const c=row.actual.context;if(c.datasetToken!==PUBLIC_9037.token||c.period.end!==PUBLIC_9037.cutoff||c.scope.country!=='all'||c.scope.org!=='all'||c.scope.level!=='all')return null;return row.id==='turnover-ytd'?8:row.id==='time-to-fill'&&c.definition==='filled-requisitions-opening-to-closure'?30:null;}
