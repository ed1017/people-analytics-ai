import type {DashboardFilters} from './dashboard-scope';
import type {ScenarioEngineBaselinePoint} from './scenario-engine';
import type {ScenarioModelAssumptions} from './types';
import type {ProjectionSpec,ProjectionField} from './home-solution-conversation-schema';
// @ts-expect-error Native fixture tests share TypeScript source.
import {assertSolutionShape,projectionSpecSchema} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {runScenarioModel} from './scenario-engine.ts';

export type ProjectionDatasetVersion={datasetId:string;datasetToken:string;bundleDigest:string;cutoff:string};
export type ProjectionInputs={asOf:string;opening:number;filters:DashboardFilters;scope:string;relations:string[];datasetVersion:ProjectionDatasetVersion|null;defaults:ScenarioModelAssumptions|null;baseline:ScenarioEngineBaselinePoint[]};
export type HeadcountProjection={id:string;revision:number;spec:ProjectionSpec;inputDigest:string;inputs:ProjectionInputs;assumptions:Partial<Record<ProjectionField,number>>;interpretations:string[];limitations:string[];points:{month:string;opening:number;hires:number;exits:number;transfersIn:number;transfersOut:number;headcount:number;reference:number|null}[]};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const bounds:Record<ProjectionField,[number,number]>={annual_growth_pct:[-10,20],salary_inflation_pct:[-5,15],annual_attrition_pct:[0,30],fill_rate_pct:[0,100],productivity_hiring_reduction_pct:[0,50],monthly_hires:[0,1e6],monthly_exits:[0,1e6],monthly_transfers_in:[0,1e6],monthly_transfers_out:[0,1e6]};
const company=(filters:DashboardFilters)=>Object.values(filters).every(value=>value==='all');
export async function projectionDigest(inputs:ProjectionInputs){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(inputs))))].map(value=>value.toString(16).padStart(2,'0')).join('');}
function verifyInputs(inputs:ProjectionInputs){
 const version=inputs?.datasetVersion;
 const validVersion=version===null||!!version&&Object.keys(version).sort().join(',')==='bundleDigest,cutoff,datasetId,datasetToken'&&/^[a-z0-9][a-z0-9-]{0,95}$/.test(version.datasetId)&&new RegExp('^'+version.datasetId+':[0-9]{1,12}$').test(version.datasetToken)&&/^[a-f0-9]{64}$/.test(version.bundleDigest)&&version.cutoff===inputs.asOf;
 if(!inputs||!/^20\d\d-\d\d-\d\d$/.test(inputs.asOf)||new Date(inputs.asOf).toISOString().slice(0,10)!==inputs.asOf||!Number.isFinite(inputs.opening)||inputs.opening<=0||inputs.opening>1e9||!inputs.filters||!['country','org','level'].every(key=>typeof inputs.filters[key as keyof DashboardFilters]==='string')||typeof inputs.scope!=='string'||inputs.scope.length>300||!Array.isArray(inputs.relations)||!inputs.relations.every(s=>typeof s==='string'&&s.length<100)||!validVersion)throw Error('The active opening workforce snapshot is unavailable or invalid. No forecast was calculated.');
}
/** All scenario arithmetic is deterministic; user/model language never executes here. */
export async function calculateHeadcountProjection(spec:ProjectionSpec,inputs:ProjectionInputs,prior:HeadcountProjection[],userTurnIds:string[]):Promise<HeadcountProjection>{
 assertSolutionShape(spec,projectionSpecSchema,'projection');verifyInputs(inputs);
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(spec.id))throw Error('Use a stable analysis ID.');
 const base=spec.base?prior.find(item=>item.id===spec.base!.id&&item.revision===spec.base!.revision):null;
 if(spec.base&&!base)throw Error('The referenced projection revision is unavailable. Rebuild it from current inputs.');
 if(base&&!same(base.inputs.datasetVersion,inputs.datasetVersion))throw Error('The projection dataset binding changed; start a new scenario with explicit assumptions.');
 if(base&&(base.spec.method!==spec.method||!same(base.inputs.filters,inputs.filters)))throw Error('The projection method or population changed; start a new scenario with explicit assumptions.');
 const assumptions:Partial<Record<ProjectionField,number>>=base?{...base.assumptions}:spec.method==='configured_scenario'?{...inputs.defaults}:{monthly_transfers_in:0,monthly_transfers_out:0};
 const interpretations=base?[...base.interpretations]:[],seen=new Set<string>();
 for(const change of spec.changes){
  if(seen.has(change.field))throw Error('Review one change for each projection assumption.');seen.add(change.field);
  const flow=change.field.startsWith('monthly_');if(flow!==(spec.method==='monthly_flow'))throw Error('This assumption belongs to a different projection method.');
  if(change.basis==='user'&&!userTurnIds.includes(change.turnId??''))throw Error('A user assumption needs its actual conversation turn.');
  const before=assumptions[change.field],value=change.kind==='scale'?before===undefined?NaN:before*change.value:change.value,[min,max]=bounds[change.field];
  if(!Number.isFinite(value)||value<min||value>max)throw Error(`The ${change.field} assumption is missing or outside ${min}–${max}.`);
  assumptions[change.field]=value;
  interpretations.push(`${change.field}: ${value}${change.field.endsWith('_pct')?'%':' people/month'}. ${change.interpretation} (${change.basis==='illustrative'?'Illustrative assumption; not supplied by the user':`Unconfirmed model interpretation of turn ${change.turnId}; not user confirmation`}${change.kind==='scale'?`; previous ${before} × ${change.value}`:''}).`);
 }
 const limitations=['Assumption-based scenario, not a trained forecast or a promised outcome.',inputs.datasetVersion?'Constructed data is bound to the named dataset token, cutoff and bundle digest. This identifies source inputs, not independent forecast validation. October–December 2026 has no modeled baseline history; explicit conditional monthly flows do not fill that historical gap.':'Active configured data is synthetic. Source version/import identity is not exposed; the content digest identifies only the inputs used in this calculation.','No intervention effectiveness, savings, staffing availability or funding is inferred.','Model-selected basis and turn references describe proposed interpretation, not independently confirmed user assumptions.'];
 const inputDigest=await projectionDigest(inputs);if(base&&base.inputDigest!==inputDigest)limitations.push('The active source inputs changed since the prior projection; this revision uses the new opening snapshot.');
 const series=resolvedProjectionSeries(spec,inputs,assumptions);limitations.push(...series.limitations);
 return {id:spec.id,revision:1+Math.max(0,...prior.filter(item=>item.id===spec.id).map(item=>item.revision)),spec:structuredClone(spec),inputs:structuredClone(inputs),inputDigest,assumptions,interpretations,limitations,points:series.points};
}
/** Resolved assumptions remain authored conditional inputs. Recompute results
 * without requiring earlier revisions that the bounded history may have pruned. */
function resolvedProjectionSeries(spec:ProjectionSpec,inputs:ProjectionInputs,assumptions:HeadcountProjection['assumptions']){
 if(Object.entries(assumptions).some(([field,value])=>!Object.hasOwn(bounds,field)||field.startsWith('monthly_')!==(spec.method==='monthly_flow')||typeof value!=='number'||!Number.isFinite(value)||value<bounds[field as ProjectionField][0]||value>bounds[field as ProjectionField][1]))throw Error('The resolved projection assumptions are invalid.');
 const limitations:string[]=[];
 const points:HeadcountProjection['points']=[];
 if(spec.method==='configured_scenario'){
  if(!company(inputs.filters))throw Error('Configured scenario defaults are company-wide. For a filtered population use explicit monthly_flow assumptions.');
  if(!inputs.defaults||inputs.baseline.length<spec.months)throw Error('Configured baseline/defaults do not cover this horizon. Use a shorter supported horizon or explicit monthly flows.');
  for(const field of Object.keys(inputs.defaults) as (keyof ScenarioModelAssumptions)[]){const value=assumptions[field],[min,max]=bounds[field];if(value===undefined||!Number.isFinite(value)||value<min||value>max)throw Error('A configured scenario assumption is unavailable.');}
  const asDate=new Date(inputs.asOf),expectedMonth=(index:number)=>new Date(Date.UTC(asDate.getUTCFullYear(),asDate.getUTCMonth()+index+1,1)).toISOString().slice(0,7);
  const baseline=inputs.baseline.slice(0,spec.months);
  if(baseline.some((row,index)=>row.planning_month.slice(0,7)!==expectedMonth(index)||[row.planned_headcount,row.planned_fte,row.planned_labor_cost_usd].some(value=>!Number.isFinite(value)||value<0)))throw Error('The stored baseline is not a complete forward window from the active snapshot. No dates or missing months were invented.');
  const result=runScenarioModel({asOf:inputs.asOf,startingHeadcount:inputs.opening,baselinePoints:baseline,defaults:inputs.defaults,assumptions:assumptions as ScenarioModelAssumptions});
  let opening=inputs.opening;
  for(const point of result.points){points.push({month:point.planning_month,opening,hires:point.modeled_hires,exits:point.modeled_exits,transfersIn:0,transfersOut:0,headcount:point.modeled_headcount,reference:point.baseline_headcount});opening=point.modeled_headcount;}
  limitations.push('Configured engine: opening + implied hires − implied exits. Displayed values round to one decimal; row arithmetic can differ by 0.1.','The stored Baseline is a reference curve. Its stored hires/exits do not reconcile it and are not used as flows. Engine-implied flows use the configured target, attrition, fill rate and productivity assumptions.');
 }else{
  if(assumptions.monthly_hires===undefined||assumptions.monthly_exits===undefined)throw Error('Monthly hires and exits are unknown. Supply explicit user assumptions or clearly labelled illustrative values before plotting.');
  const hires=assumptions.monthly_hires,exits=assumptions.monthly_exits,transfersIn=assumptions.monthly_transfers_in??0,transfersOut=assumptions.monthly_transfers_out??0;
  if(company(inputs.filters)&&(transfersIn||transfersOut))throw Error('Internal transfers cannot change company-wide headcount. Set company transfers to zero; scoped inflows/outflows require a filtered population.');
  let opening=inputs.opening;const date=new Date(inputs.asOf);
  for(let index=0;index<spec.months;index++){const headcount=opening+hires-exits+transfersIn-transfersOut;if(headcount<0||headcount>1e9)throw Error('The assumed flows produce an infeasible headcount. Reduce exits/outflows or revise the horizon; negative headcount is not clamped.');points.push({month:new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+index+1,1)).toISOString().slice(0,10),opening,hires,exits,transfersIn,transfersOut,headcount,reference:null});opening=headcount;}
  limitations.push('Constant monthly gross external hires and exits are assumptions, not observed flows. Opening + hires − exits + scoped transfers in − scoped transfers out. Unspecified transfers are assumed zero.');
 }
 return {points,limitations};
}
export function readHeadcountProjections(raw:unknown):HeadcountProjection[]{
 if(!Array.isArray(raw)||raw.length>6)throw Error('The saved projection history cannot be read.');
 const seen=new Set<string>();
 for(const value of raw){assertSolutionShape(value.spec,projectionSpecSchema,'saved projection');verifyInputs(value.inputs);const key=JSON.stringify([value.id,value.revision]);if(value.id!==value.spec.id||!Number.isSafeInteger(value.revision)||value.revision<1||seen.has(key)||typeof value.inputDigest!=='string'||!/^[a-f0-9]{64}$/.test(value.inputDigest)||!value.assumptions||Object.entries(value.assumptions).some(([field,number])=>!Object.hasOwn(bounds,field)||typeof number!=='number'||!Number.isFinite(number)||number<bounds[field as ProjectionField][0]||number>bounds[field as ProjectionField][1])||!Array.isArray(value.points)||value.points.length!==value.spec.months||value.points.some((point:HeadcountProjection['points'][number])=>typeof point.month!=='string'||!['opening','hires','exits','transfersIn','transfersOut','headcount'].every(key=>typeof point[key as keyof typeof point]==='number'&&Number.isFinite(point[key as keyof typeof point])&&Number(point[key as keyof typeof point])>=0))||![value.interpretations,value.limitations].every(list=>Array.isArray(list)&&list.length<=40&&list.every(item=>typeof item==='string'&&item.length<1000)))throw Error('The saved projection history cannot be verified.');seen.add(key);}
 for(const value of raw)if(!same(value.points,resolvedProjectionSeries(value.spec,value.inputs,value.assumptions).points))throw Error('The saved projection arithmetic does not match its inputs and conditional assumptions.');
 return structuredClone(raw);
}
