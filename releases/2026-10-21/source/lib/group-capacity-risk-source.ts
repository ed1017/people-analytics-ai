import {PUBLIC_9037} from './public-9037-contract.mjs';
import {withBusinessUnitTurnover} from './home-bu-turnover.mjs';
import {public9037Metadata} from './public-9037-projection.mjs';
// @ts-expect-error Native tests share source.
import {catalogDisplayLabel} from './catalog-display.ts';
import type {RiskGroup} from './group-capacity-risk';
type Dashboard={data_meta:{datasetToken:string;bundleDigest:string;cutoff:string};overview:{headcount:number;fte:number;snapshot_date:string};workforce_filter_scope:{datasetToken:string};trend:{snapshot_date:string;headcount:number;fte:number}[]};
/** Complete released BU partition only; never infer department or cross-filter coverage. */
export function readCapacityRiskGroups(attrition:unknown,dashboards:unknown[]):RiskGroup[]{
 const a=attrition as {data_meta:Dashboard['data_meta'];as_of:string;business_units:{org_code:string;org_name?:string;exits:number}[]};
 const validMeta=(m:Dashboard['data_meta'])=>{if(!m||!/^[a-f0-9]{64}$/.test(m.bundleDigest))return false;const expected=public9037Metadata(m.bundleDigest,m);return Object.keys(m).length===Object.keys(expected).length&&Object.entries(expected).every(([key,value])=>m[key as keyof typeof m]===value);};
 if(!validMeta(a?.data_meta)||dashboards.some(d=>!validMeta((d as Dashboard)?.data_meta)))throw Error('Public source identity could not be verified.');
 if(!a?.data_meta||a.data_meta.datasetToken!==PUBLIC_9037.token||a.as_of!==PUBLIC_9037.cutoff||dashboards.some(raw=>{const d=raw as Dashboard;return d?.data_meta?.datasetToken!==PUBLIC_9037.token||d.data_meta.bundleDigest!==a.data_meta.bundleDigest||d.data_meta.cutoff!==a.as_of||d.workforce_filter_scope?.datasetToken!==PUBLIC_9037.token||d.overview?.snapshot_date!==a.as_of;}))throw Error('Matching current public group evidence is unavailable.');
 const checked=withBusinessUnitTurnover(a,dashboards);
 const stocks=dashboards as Dashboard[];
 if(stocks.some(d=>{if(!Number.isSafeInteger(d.overview.headcount)||d.overview.headcount<0||!Number.isFinite(d.overview.fte)||d.overview.fte<0||d.overview.fte>d.overview.headcount)return true;const last=d.trend.find(p=>p.snapshot_date===a.as_of);return !last||last.headcount!==d.overview.headcount||last.fte!==d.overview.fte;})||Math.abs(stocks.slice(0,8).reduce((sum,d)=>sum+d.overview.fte,0)-stocks[8].overview.fte)>0.000001)throw Error('Starting workforce stocks do not reconcile.');
 return checked.business_units.map((r:{org_code:string;exits:number},i:number)=>{const d=dashboards[i] as Dashboard;if(!Number.isFinite(d.overview.fte)||d.overview.fte<0||d.overview.fte>d.overview.headcount)throw Error('Group FTE evidence unavailable.');return {code:r.org_code,label:catalogDisplayLabel(r.org_code),asOf:a.as_of,headcount:d.overview.headcount,fte:d.overview.fte,exits:r.exits,historyMonths:9};});
}
