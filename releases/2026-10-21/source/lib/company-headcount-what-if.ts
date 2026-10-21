// @ts-expect-error Native regression tests share TypeScript source.
import {readDashboardScopeReceipt} from './dashboard-scope.ts';
// @ts-expect-error Native regression tests share TypeScript source.
import {monthlyHeadcountFlow} from './monthly-headcount-flow.ts';
import {PUBLIC_9037} from './public-9037-contract.mjs';

export type CompanySnapshot={opening:number;asOf:string;token:string};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const stock=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=1e9;
export function readCompanySnapshot(raw:unknown,token:string):CompanySnapshot {
 const data=object(raw),overview=object(data.overview),meta=object(data.data_meta),receipt=readDashboardScopeReceipt(data.workforce_filter_scope);
 if(token!==PUBLIC_9037.token||!receipt||receipt.version!==3||receipt.datasetToken!==token||['country','org','level'].some(k=>receipt.requested[k as keyof typeof receipt.requested]!=='all'||receipt.effective?.[k as keyof typeof receipt.requested]!=='all')||meta.datasetToken!==token||meta.contract!==PUBLIC_9037.contract||meta.cutoff!==PUBLIC_9037.cutoff||meta.dataClass!=='constructed-synthetic'||overview.snapshot_date!==receipt.cutoff||!stock(overview.headcount)||receipt.stockStatus!==(overview.headcount===0?'known-empty':'positive'))throw Error('Verified company snapshot unavailable.');
 const matches=Array.isArray(data.trend)?data.trend.map(object).filter(row=>row.snapshot_date===overview.snapshot_date):[];
 if(matches.length!==1||matches[0].headcount!==overview.headcount)throw Error('Company snapshot and recorded history do not agree.');
 return {opening:overview.headcount,asOf:receipt.cutoff,token};
}
export function readMonthlyPeople(raw:string):number|null {
 if(!raw.trim())return null;
 if(!/^\d+$/.test(raw.trim())||raw.trim().length>10||!stock(Number(raw.trim())))throw Error('Enter whole people from 0 to 1,000,000,000.');
 return Number(raw.trim());
}
export function companyHeadcountWhatIf(snapshot:CompanySnapshot,hiresText:string,exitsText:string){
 if(snapshot.token!==PUBLIC_9037.token||snapshot.asOf!==PUBLIC_9037.cutoff||!stock(snapshot.opening))throw Error('Verified company snapshot unavailable.');
 const hires=readMonthlyPeople(hiresText),exits=readMonthlyPeople(exitsText);
 if(hires===null||exits===null)return null;
 return monthlyHeadcountFlow({asOf:snapshot.asOf,opening:snapshot.opening,months:6,hires,exits,transfersIn:0,transfersOut:0});
}
