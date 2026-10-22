import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
export type WorkforceFlow={month:string;hires:number|null;separations:number|null};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const count=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0;
const month=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v?v.slice(0,7):null;
/** Company conservation is validated by the released synthetic accounting contract.
 * These are derived external starts, never recruiting offers/internal fills. */
export function homeWorkforceFlows(workforce:unknown,attrition:unknown,settled:boolean,token:string,asOf:string,filters:Record<string,string>):WorkforceFlow[]|null{
 if(!settled||token!==P.token||asOf!==P.cutoff||['country','org','level'].some(k=>filters[k]!=='all'))return null;
 const w=obj(workforce),a=obj(attrition),wd=obj(w.data),ad=obj(a.data),wm=obj(wd.data_meta),am=obj(ad.data_meta);
 if(w.status!=='loaded'||a.status!=='loaded'||wd.as_of!==asOf||ad.as_of!==asOf||[w,a,wd,ad,wm,am].some(v=>v.suppressed===true))return null;
 if([wm,am].some(m=>m.datasetId!==P.datasetId||m.datasetToken!==token||m.contract!==P.contract||m.cutoff!==asOf||m.publicationApproved!==true||m.dataClass!=='constructed-synthetic')||typeof wm.bundleDigest!=='string'||! /^[a-f0-9]{64}$/.test(wm.bundleDigest)||wm.bundleDigest!==am.bundleDigest)return null;
 if(!Array.isArray(wd.trend)||!Array.isArray(ad.trend)||wd.trend.length>120||ad.trend.length>120)return null;
 const h=new Map<string,number>(),e=new Map<string,number>();
 for(const raw of wd.trend){const row=obj(raw),k=month(row.snapshot_date);if(!k||k<'2024-01'||k>asOf.slice(0,7)||row.snapshot_date!==new Date(Date.UTC(Number(k.slice(0,4)),Number(k.slice(5,7)),0)).toISOString().slice(0,10)||h.has(k)||!count(row.headcount)||row.suppressed===true)return null;h.set(k,row.headcount);}
 for(const raw of ad.trend){const row=obj(raw),k=month(row.month);if(!k||k<'2024-01'||k>asOf.slice(0,7)||row.month!==k+'-01'||e.has(k)||!count(row.total_exits)||row.suppressed===true)return null;e.set(k,row.total_exits);}
 const months=[...h.keys()].sort();if(months.length<2||months.at(-1)!==asOf.slice(0,7))return null;
 const result:WorkforceFlow[]=[];let prior=months[0];
 while(prior<asOf.slice(0,7)){const d=new Date(prior+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);const next=d.toISOString().slice(0,7),opening=h.get(prior),closing=h.get(next),exits=e.get(next);
  if(opening===undefined||closing===undefined||exits===undefined)result.push({month:next,hires:null,separations:exits??null});
  else{const starts=closing-opening+exits;if(!count(starts))return null;result.push({month:next,hires:starts,separations:exits});}prior=next;
 }
 return result.some(r=>r.hires!==null)?result:null;
}
