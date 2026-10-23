/** Reviewed 9037 joint reader. Reconciles all 960 cells, 33 dates and event legs
 * against the separately pinned query capture. No inferred scoped company data.
 * Shares the established 9847 reader algorithm; leaves its frozen contract intact. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {isReviewed9037Provider,OFFLINE_9037_DATASET_ID} from './dataset-9037-offline-provider.mjs';
import {deepFreeze,exact,DEMO_BUS} from './dataset-demo-contracts.mjs';

export const JOINT_DASHBOARD_FORMAT='workforce-9037-offline-joint-dashboard-v1';
export const REVIEWED_9037_JOINT_DIGEST='bc2cee280389fa646dfdb7901ded66946b4552c65d59d00a0c616bd0cf28d8a8';
export const JOINT_TURNOVER_CONTRACT='voluntary-ytd-nine-month-average-stock-v2';
export const MAX_JOINT_DASHBOARD_BYTES=2*1024*1024;
const countries=['AU','BR','CA','DE','FR','GB','IN','JP','SG','US'];
const levels=Array.from({length:12},(_,i)=>'L'+(i+1));
const dimensions={country:countries,org:[...DEMO_BUS],level:levels};
const fields=['country','org','level'];
const expectedDates=Array.from({length:33},(_,i)=>new Date(Date.UTC(2024,i+1,0)).toISOString().slice(0,10));
const fixture='47dbd4e63ca953fa8761e4d3c4e7de55aeb0f19c595224f8707d03e209015460';
const must=(v,m)=>{if(!v)throw Error('Joint aggregate contract: '+m);};
const hash=v=>createHash('sha256').update(v).digest('hex');
const safe=n=>Number.isSafeInteger(n),count=n=>safe(n)&&n>=0;
const round=(n,p=1)=>Math.round((n+Number.EPSILON)*10**p)/10**p;
const sum=(rows,index)=>rows.reduce((n,r)=>n+r[index],0);
const same=(a,b)=>isDeepStrictEqual(a,b);

export async function create9037JointDashboard({jointBytes,provider,rows}){
 must(isReviewed9037Provider(provider),'reviewed provider');
 const expectedJointDigest=REVIEWED_9037_JOINT_DIGEST;
 must(jointBytes instanceof Uint8Array&&jointBytes.byteLength>0&&jointBytes.byteLength<=MAX_JOINT_DASHBOARD_BYTES,'bounded bytes');
 const owned=Buffer.from(jointBytes);must(hash(owned)===expectedJointDigest,'digest');
 const joint=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(owned));
 must(exact(joint,['format','datasetId','sourceBundleDigest','parentArtifactDigest','sourceFixtureDigest','cutoff','metricContract','publicationApproved','independentForecastValidation','dimensions','dates','cells','flows']),'root fields');
 must(joint.format===JOINT_DASHBOARD_FORMAT&&joint.datasetId===OFFLINE_9037_DATASET_ID&&joint.sourceBundleDigest==='bb61cab68e4395f8462d37e88cda9da300b71e91062998df64fe2aba9631e658'&&joint.parentArtifactDigest==='a5c31fd892ee4542c450dd8ddd8a8616d5534dd6e3a5181e6d578c0067f77b25'&&joint.sourceFixtureDigest===fixture&&joint.cutoff==='2026-09-30'&&joint.metricContract===JOINT_TURNOVER_CONTRACT&&joint.publicationApproved===false&&joint.independentForecastValidation===false,'binding and conventions');
 must(same(joint.dimensions,dimensions)&&same(joint.dates,expectedDates),'exact dimensions/calendar');
 must(Array.isArray(joint.cells)&&joint.cells.length===960&&Array.isArray(joint.flows)&&joint.flows.length<=960*32,'bounded cells/flows');
 const keys=countries.flatMap(country=>DEMO_BUS.flatMap(org=>levels.map(level=>[country,org,level]))),cells=[];
 for(const row of joint.cells){
  must(Array.isArray(row)&&row.length===4&&row.slice(0,3).every(count)&&Array.isArray(row[3])&&row[3].length<=99&&row[3].length%3===0,'cell fields');
  let previousMonth=-1,hc=0,fte=0,index=0;const series=[];
  for(let mi=0;mi<33;mi++){
   if(index<row[3].length&&row[3][index]===mi){
    const [month,dh,df]=row[3].slice(index,index+3);must(count(month)&&month>previousMonth&&month<33&&safe(dh)&&safe(df)&&(dh!==0||df!==0),'change point');
    previousMonth=month;hc+=dh;fte+=df;index+=3;
   }
   must(count(hc)&&count(fte)&&hc<=9037&&fte<=hc*10000&&(hc>0||fte===0),'stock/FTE');series.push([hc,fte]);
  }
  must(index===row[3].length&&(series[32][0]>0?row[0]>0:row[0]===0),'chronology/current cost');
  cells.push([...row.slice(0,3),series]);
 }
 const flows=new Map();let previousKey=-1;
 for(const row of joint.flows){
  must(Array.isArray(row)&&row.length===9&&row.every(count),'flow fields');const [mi,ci,...values]=row,key=mi*960+ci;
  must(mi>=1&&mi<33&&ci<960&&key>previousKey&&values.some(n=>n>0)&&values[2]<=values[1],'flow key/counts');previousKey=key;flows.set(key,values);
 }
 const zero=()=>[0,0,0,0,0,0,0],companyFlows=Array.from({length:33},zero);
 for(let ci=0;ci<960;ci++){
  let voluntary=0;
  for(let mi=1;mi<33;mi++){
   const v=flows.get(mi*960+ci)??zero(),[starts,exits,vol,pin,pout,tin,tout]=v;
   must(cells[ci][3][mi-1][0]+starts-exits+pin-pout+tin-tout===cells[ci][3][mi][0],'monthly cell identity');
   if(mi>=24)voluntary+=vol;
   v.forEach((n,j)=>companyFlows[mi][j]+=n);
  }
  must(voluntary===cells[ci][2],'cell YTD numerator');
 }
 const get=async name=>rows[name];
 const old=(await get('dashboard'))[0].payload,trend=await get('dashboard_headcount_trend'),projection=await get('projection_monthly'),attrition=await get('attrition_monthly_trend');
 for(let mi=0;mi<33;mi++){
  const hc=cells.reduce((n,r)=>n+r[3][mi][0],0),fte=cells.reduce((n,r)=>n+r[3][mi][1],0);
  must(hc===trend[mi].headcount&&round(fte/10000)===trend[mi].fte&&trend[mi].snapshot_date===expectedDates[mi],'company monthly stock');
  if(mi>0){const v=companyFlows[mi],p=projection[mi-1],a=attrition.find(r=>r.month.slice(0,7)===expectedDates[mi].slice(0,7));must(v[0]===p.external_starts&&v[1]===p.exits&&v[3]===p.promotions&&v[4]===p.promotions&&v[5]===p.transfers&&v[6]===p.transfers&&a?.voluntary_exits===v[2]&&a.total_exits===v[1],'company event reconciliation');}
 }
 const options=old.filter_options;
 for(const [i,key]of ['countries','business_units','levels'].entries())must(same(options[key].map(r=>r.value).sort(),[...dimensions[fields[i]]].sort()),'filter catalog');
 function scope(filters){
  must(exact(filters,fields)&&fields.every(k=>typeof filters[k]==='string'&&(filters[k]==='all'||dimensions[k].includes(filters[k]))),'unknown filter');
  const indices=keys.flatMap((key,i)=>fields.every((k,j)=>filters[k]==='all'||filters[k]===key[j])?[i]:[]);
  const selected=indices.map(i=>cells[i]),series=expectedDates.map((snapshot_date,mi)=>({snapshot_date,headcount:selected.reduce((n,r)=>n+r[3][mi][0],0),fte:round(selected.reduce((n,r)=>n+r[3][mi][1],0)/10000)}));
  const last=series[32],numerator=sum(selected,2),denominatorSum=series.slice(24).reduce((n,r)=>n+r.headcount,0),rate=denominatorSum>0?round(900*numerator/denominatorSum):null;
  const overview={snapshot_date:joint.cutoff,headcount:last.headcount,fte:last.fte,labor_cost_usd:round(sum(selected,0)/100,2),open_positions:sum(selected,1),voluntary_turnover_ytd_pct:rate};
  return {overview,trend:series,filter_options:options,turnover:{contract:JOINT_TURNOVER_CONTRACT,voluntary_exits:numerator,calendar_months:9,sum_month_end_headcount:denominatorSum,average_month_end_headcount:denominatorSum/9,status:rate===null?'unavailable-zero-denominator':'available',rate_pct:rate}};
 }
 const company=scope({country:'all',org:'all',level:'all'});
 must(same(company.overview,old.overview)&&same(company.trend,old.trend),'sealed company parity');
 for(const [field,name,code]of [['org','workforce_business_unit_summary','org_code'],['country','workforce_country_summary','country_code'],['level','workforce_level_summary','level_code']]){
  const rows=await get(name);
  for(const value of dimensions[field]){const s=scope({country:'all',org:'all',level:'all',[field]:value}),r=rows.find(row=>row[code]===value);must(s.overview.headcount===(r?.headcount??0)&&s.overview.fte===(r?.fte??0),'dimension stock partition');}
 }
 const finance=await get('finance_current_summary'),exitBU=await get('attrition_business_unit_summary');
 for(const org of DEMO_BUS){const s=scope({country:'all',org,level:'all'}),f=finance.find(r=>r.org_code===org),e=exitBU.find(r=>r.org_code===org);must(s.overview.labor_cost_usd===f.labor_cost_usd&&s.overview.open_positions===f.vacant_positions&&s.turnover.voluntary_exits===e.voluntary_exits&&s.overview.voluntary_turnover_ytd_pct===e.voluntary_turnover_ytd_pct,'BU cost/vacancy/exit partition');}
 deepFreeze(joint);deepFreeze(cells);
 function dashboardResponse(filters){
  const s=scope(filters),label=fields.map((k,i)=>filters[k]==='all'?['All countries','All business units','All levels'][i]:options[['countries','business_units','levels'][i]].find(r=>r.value===filters[k]).label).join('; ');
  const {turnover,...payload}=s;
  return deepFreeze({...payload,workforce_filter_scope:{version:2,status:'verified_aggregate',requested:{...filters},effective:{...filters},label,basis:'Pinned complete synthetic joint cube; exact calendar, group flows and sealed company totals reconciled. Not an RPC or real-world attestation.',artifactDigest:expectedJointDigest,metricContract:JOINT_TURNOVER_CONTRACT,stockStatus:s.overview.headcount===0?'known-empty':'positive'},turnover_evidence:turnover});
 }
 return Object.freeze({digest:expectedJointDigest,metricContract:JOINT_TURNOVER_CONTRACT,dashboardResponse,
 read(params){must(Array.isArray(params)&&params.length===3,'filter tuple');const filters=Object.fromEntries(fields.map((k,i)=>[k,params[i]===null?'all':params[i]])),s=scope(filters);return deepFreeze([{payload:{overview:s.overview,trend:s.trend,filter_options:s.filter_options}}]);}});
}
