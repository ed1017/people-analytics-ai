// Browser-safe closed contract. No provider credentials, environment or IO.
export const DASHBOARD_CONTRACT='invented-headcount-dashboard-v1';
/** @typedef {{snapshot_date:string,headcount:number,fte:number}} CompanyPoint */
/** @typedef {{contract:string,companyKey:string,datasetToken:string,asOf:string,scope:string,capabilities:string[],overview:CompanyPoint,trend:CompanyPoint[]}} CompanyDashboard */
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const count=v=>Number.isSafeInteger(v)&&v>=0;
const fte=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
/** @returns {CompanyDashboard} */
export function readCompanyDashboard(value,expectedToken,expectedCompany){
 if(!exact(value,['contract','companyKey','datasetToken','asOf','scope','capabilities','overview','trend'])||value.contract!==DASHBOARD_CONTRACT||
  typeof expectedToken!=='string'||!/^invented-company-[a-f0-9]{64}:1$/.test(expectedToken)||value.datasetToken!==expectedToken||
  !expectedCompany||value.companyKey!==expectedCompany.companyKey||value.asOf!==expectedCompany.asOf||typeof value.companyKey!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(value.companyKey)||value.scope!=='company'||!date(value.asOf)||
  JSON.stringify(value.capabilities)!=='["headcount","fte","recorded_headcount_change"]'||
  !exact(value.overview,['snapshot_date','headcount','fte'])||value.overview.snapshot_date!==value.asOf||!count(value.overview.headcount)||!fte(value.overview.fte)||value.overview.fte>value.overview.headcount||
  !Array.isArray(value.trend)||value.trend.length<1||value.trend.length>120)throw Error('Unsupported company dashboard');
 let previous='';
 for(const p of value.trend){if(!exact(p,['snapshot_date','headcount','fte'])||!date(p.snapshot_date)||p.snapshot_date<=previous||p.snapshot_date>value.asOf||!count(p.headcount)||!fte(p.fte)||p.fte>p.headcount)throw Error('Unsupported company history');previous=p.snapshot_date;}
 const last=value.trend.at(-1);if(last.snapshot_date!==value.asOf||last.headcount!==value.overview.headcount||last.fte!==value.overview.fte)throw Error('Company snapshot mismatch');
 return structuredClone(value);
}
/** Deterministic explanation of this limited contract, never model synthesis. */
export function companyHeadcountAnswer(dashboard,question){
 const q=question.trim().toLowerCase();
 const supported=/^(?:how (?:has|did) (?:our |company-wide )?(?:headcount|workforce) change(?:d)?|(?:show|review) (?:our |company-wide )?(?:recorded )?(?:headcount|workforce|fte)(?: history| trend)?|what (?:is|was) (?:our |the company-wide )?(?:headcount|fte)|how many people (?:do we have|are in (?:our|the) company))\??$/.test(q);
 if(!supported)return {supported:false,text:'This company fixture supports only company-wide recorded headcount and FTE snapshots. Costs, turnover, subgroup analysis, forecasts and staffing plans are unavailable. Ask how recorded headcount changed.'};
 const first=dashboard.trend[0],last=dashboard.trend.at(-1),change=last.headcount-first.headcount;
 return {supported:true,text:`${dashboard.companyKey}: ${last.headcount} people and ${last.fte} FTE on ${last.snapshot_date}. ${dashboard.trend.length>1?`Recorded headcount changed from ${first.headcount} on ${first.snapshot_date} to ${last.headcount}, a net change of ${change>0?'+':''}${change} people.`:'Only one snapshot is available; no change is inferred.'} Company-wide synthetic snapshots only; this does not identify hires, departures or their causes.`};
}
