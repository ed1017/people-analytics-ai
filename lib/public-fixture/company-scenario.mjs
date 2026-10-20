import {runScenarioModel} from '../scenario-engine.ts';
import {canonicalJson,sha256} from './read-provider.mjs';

export const COMPANY_SCENARIO_CONTRACT='public-company-scenario-arithmetic-v1';
export const COMPANY_SCENARIO_BOUNDS=Object.freeze({
 annual_growth_pct:Object.freeze({min:-10,max:20}),salary_inflation_pct:Object.freeze({min:-5,max:15}),
 annual_attrition_pct:Object.freeze({min:0,max:30}),fill_rate_pct:Object.freeze({min:0,max:100}),
 productivity_hiring_reduction_pct:Object.freeze({min:0,max:50}),
});
const fail=m=>{throw Error('Invalid public company scenario: '+m);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const finite=(v,min=0,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const sum=(rows,k)=>rows.reduce((s,r)=>s+r[k],0);
export function validateCompanyScenarioRequest(body){
 if(!exact(body,['assumptions'])||!object(body.assumptions))fail('request shape');
 for(const [key,value]of Object.entries(body.assumptions)){const b=COMPANY_SCENARIO_BOUNDS[key];if(!Object.hasOwn(COMPANY_SCENARIO_BOUNDS,key)||!finite(value,b.min,b.max))fail('assumption bounds');}
 return structuredClone(body.assumptions);
}
export function createCompanyScenarioCalculator(text,trustedDigest){
 if(typeof text!=='string'||Buffer.byteLength(text)>65536||!hash(trustedDigest)||sha256(text)!==trustedDigest)fail('manifest size/digest');
 let m;try{m=JSON.parse(text);}catch{fail('JSON');}
 if(!exact(m,['schemaVersion','contract','provenance','documents'])||m.schemaVersion!==1||m.contract!==COMPANY_SCENARIO_CONTRACT)fail('manifest');
 const p=m.provenance;
 if(!exact(p,['origin','capturedAt','scope'])||p.origin!=='https://www.ed-ai.app'||p.scope!=='company-arithmetic-public-input-subsets-only'||typeof p.capturedAt!=='string'||!Number.isFinite(Date.parse(p.capturedAt))||new Date(p.capturedAt).toISOString()!==p.capturedAt)fail('provenance');
 const targets=['/api/headcount','/api/scenario-modeler','/api/workforce-planning'];
 if(!Array.isArray(m.documents)||m.documents.length!==3)fail('documents');
 const docs=new Map();
 for(const d of m.documents){if(!exact(d,['target','sha256','body'])||!targets.includes(d.target)||docs.has(d.target)||!hash(d.sha256)||sha256(canonicalJson(d.body))!==d.sha256)fail('document');docs.set(d.target,d.body);}
 const stock=docs.get(targets[0]),settings=docs.get(targets[1]),plan=docs.get(targets[2]);
 if(!exact(stock,['headcount'])||!Number.isSafeInteger(stock.headcount)||!finite(stock.headcount,1,1e8))fail('headcount');
 const keys=Object.keys(COMPANY_SCENARIO_BOUNDS);
 if(!exact(settings,['as_of','defaults','bounds'])||settings.as_of!=='2026-09-30'||!exact(settings.defaults,keys)||canonicalJson(settings.bounds)!==canonicalJson(COMPANY_SCENARIO_BOUNDS))fail('settings');
 validateCompanyScenarioRequest({assumptions:settings.defaults});
 if(settings.defaults.annual_growth_pct!==0||settings.defaults.salary_inflation_pct!==0||settings.defaults.fill_rate_pct!==100||settings.defaults.productivity_hiring_reduction_pct!==0)fail('baseline assumptions');
 if(!exact(plan,['scenario_name','scenario_type','opening_headcount','history_cutoff','planning_start','planning_end','unmodeled_gap','independent_forecast_validation','points'])||plan.scenario_name!=='Baseline'||plan.scenario_type!=='draft_assumption'||plan.opening_headcount!==stock.headcount||plan.history_cutoff!==settings.as_of||plan.planning_start!=='2027-01-01'||plan.planning_end!=='2027-12-01'||canonicalJson(plan.unmodeled_gap)!==canonicalJson(['2026-10','2026-11','2026-12'])||plan.independent_forecast_validation!==false||!Array.isArray(plan.points)||plan.points.length!==12)fail('plan identity/horizon');
 for(const [i,r]of plan.points.entries()){
  if(!exact(r,['planning_month','planned_headcount','planned_fte','planned_hires','planned_exits','planned_labor_cost_usd'])||r.planning_month!==`2027-${String(i+1).padStart(2,'0')}-01`||r.planned_headcount!==stock.headcount||r.planned_hires!==0||r.planned_exits!==0||!finite(r.planned_fte,0,stock.headcount)||!finite(r.planned_labor_cost_usd))fail('baseline point');
 }
 freeze(m);
 return Object.freeze({contract:COMPANY_SCENARIO_CONTRACT,read:()=>settings,calculate(body){
  const requested=validateCompanyScenarioRequest(body),assumptions={...settings.defaults,...requested},ledger=[];
  const result=runScenarioModel({asOf:settings.as_of,startingHeadcount:stock.headcount,baselinePoints:plan.points,defaults:settings.defaults,assumptions,onPoint:r=>{
   if(Math.abs(r.opening_headcount+r.hires-r.exits-r.closing_headcount)>1e-7)fail('monthly accounting');ledger.push(r);
  }});
  if(ledger.length!==12||Math.abs(stock.headcount+sum(ledger,'hires')-sum(ledger,'exits')-ledger.at(-1).closing_headcount)>1e-7)fail('total accounting');
  result.methodology=result.methodology.filter(s=>!s.startsWith('Modeled hires and exits are engine-implied gross flows')).concat([
   'Constructed September 2026 stock is carried to January 2027; October–December 2026 is unmodeled, not an observed or forecast bridge.',
   'Stored flat draft hires/exits are zero and reconcile. What-if hires/exits are separate engine-implied gross flows; they are not stored plan flows or observed future outcomes.',
   `The ${settings.defaults.annual_attrition_pct}% company annualized January–September exit rate is a shared scenario assumption. Fill rate and productivity are authored assumptions, not estimated capacity.`,
   'Growth and inflation adjustments span the twelve explicit planning points; there is no independent forecast validation.',
  ]);
  result.accounting={scope:{type:'company'},basis:'Unrounded conditional arithmetic; display values are rounded separately.',monthly:ledger,starting_headcount:stock.headcount,total_hires:sum(ledger,'hires'),total_exits:sum(ledger,'exits'),ending_headcount:ledger.at(-1).closing_headcount};
  // Deliberately no segment_breakdown, data_meta or invented full-endpoint receipt.
  return freeze(result);
 }});
}
