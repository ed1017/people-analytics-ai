import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rng,integer,digest} from '../ml/synthetic-workforce/common.mjs';
const root=new URL('../../',import.meta.url);
export const payDemoPath='lib/data/synthetic-pay-demo-v1.json';
export const protocolPath='lib/simulation/pay-demo-protocol.json';
const key=(job,level,location)=>[job,level,location].join(':');
const round=(value,places=2)=>Number(value.toFixed(places));
export function payStatistics(values){
 assert(values.length>=5&&values.every(value=>Number.isFinite(value)&&value>0),'At least five eligible positive pay values required');
 const sorted=[...values].sort((a,b)=>a-b),n=values.length,mean=values.reduce((a,b)=>a+b,0)/n;
 const quantile=p=>{const index=(n-1)*p,lower=Math.floor(index);return sorted[lower]+(sorted[Math.ceil(index)]-sorted[lower])*(index-lower);};
 assert(Number.isFinite(mean)&&Number.isFinite(values.reduce((sum,value)=>sum+(value-mean)**2,0)),'Non-finite distribution');
 return {mean:round(mean),median:round(quantile(.5)),q1:round(quantile(.25)),q3:round(quantile(.75)),sd:round(Math.sqrt(values.reduce((sum,value)=>sum+(value-mean)**2,0)/n))};
}
/** Local-only aggregate contract. No row, identifier, extreme or arbitrary marginal is returned. */
export function aggregateSyntheticPay(records,bands,protocol){
 assert.equal(protocol.minimumCohort,5);assert.equal(protocol.currency,'USD');
 assert(Array.isArray(records)&&Array.isArray(bands));
 assert(records.every(row=>typeof row.recordId==='string'&&row.recordId.length>0)&&new Set(records.map(row=>row.recordId)).size===records.length,'Unique synthetic record identities required');
 const bandMap=new Map(bands.map(band=>[key(band.job,band.level,band.location),band]));assert.equal(bandMap.size,bands.length,'Duplicate range cohort');
 const buckets=new Map(bands.map(band=>[key(band.job,band.level,band.location),{band,rows:[],excluded:0}]));
 for(const row of records){
  const bucket=buckets.get(key(row.job,row.level,row.location));assert(bucket,'Unmapped cohort cannot be silently omitted');
  const band=bucket.band;
  const eligible=row.eligibility==='active-salaried'&&row.effectiveDate===protocol.effectiveDate&&row.currency===protocol.currency&&row.payPeriod===protocol.payPeriod&&row.payBasis===protocol.payBasis&&Number.isFinite(row.fte)&&row.fte>0&&row.fte<=1&&Number.isFinite(row.basePay)&&row.basePay>0&&Number.isFinite(row.basePay/row.fte)&&row.rangeId===band.id&&band.currency===row.currency&&band.effectiveDate===row.effectiveDate&&band.basis===protocol.rangeBasis&&Number.isFinite(band.midpoint)&&band.midpoint>0;
  if(eligible)bucket.rows.push({normalizedPay:row.basePay/row.fte,midpoint:band.midpoint});else bucket.excluded++;
 }
 const suppressed=new Set([...buckets].filter(([,bucket])=>bucket.rows.length<protocol.minimumCohort).map(([id])=>id));
 // Fixed partitions, not request-dependent suppression. All cells remain suppressed under every UI filter.
 for(const job of protocol.jobs)for(const level of protocol.levels){
  const cells=[...buckets].filter(([,bucket])=>bucket.band.job===job.code&&bucket.band.level===level.code);
  if(cells.filter(([id])=>suppressed.has(id)).length===1){const other=cells.filter(([id])=>!suppressed.has(id)).sort((a,b)=>a[1].rows.length-b[1].rows.length||a[0].localeCompare(b[0]));if(other.length)suppressed.add(other[0][0]);}
 }
 return [...buckets].map(([id,bucket])=>{
  const {band,rows,excluded}=bucket,identity={id,job:band.job,level:band.level,location:band.location};
  if(suppressed.has(id))return {...identity,status:'suppressed',coverage:null,metrics:null};
  const count=rows.length,stats=payStatistics(rows.map(row=>row.normalizedPay));
  const normalizedSum=rows.reduce((sum,row)=>sum+row.normalizedPay,0),midpointSum=rows.reduce((sum,row)=>sum+row.midpoint,0);
  assert(Number.isFinite(normalizedSum)&&Number.isFinite(midpointSum)&&Number.isFinite(normalizedSum/midpointSum),'Non-finite aggregate');
  return {...identity,status:'published',coverage:{eligible:count,status:excluded?'partial':'complete',excluded:excluded===0||excluded>=5?excluded:null,total:excluded===0||excluded>=5?count+excluded:null},metrics:{compaRatioPct:round(100*normalizedSum/midpointSum),rangeMidpoint:band.midpoint,...stats}};
 });
}
/** Generate only in memory; callers receive the disclosure-controlled aggregate artifact. */
export async function buildSyntheticPayDemo({read=path=>readFile(new URL(path,root))}={}){
 const protocolBytes=await read(protocolPath),protocol=JSON.parse(protocolBytes),random=rng(protocol.seed,protocol.dataset),records=[],bands=[];
 for(const [j,job] of protocol.jobs.entries())for(const [l,level] of protocol.levels.entries())for(const [a,location] of protocol.locations.entries()){
  const id=key(job.code,level.code,location.code),band={id,job:job.code,level:level.code,location:location.code,currency:protocol.currency,effectiveDate:protocol.effectiveDate,basis:protocol.rangeBasis,midpoint:Math.round(job.midpoint*level.multiplier*location.multiplier)};bands.push(band);
  // Two small cohorts exercise primary and complementary suppression; no exact size is published.
  const count=j===2&&l===0&&a===2?3:j===1&&l===1&&a===0?4:integer(random,12,22);
  for(let i=0;i<count;i++){
   const fte=[1,1,1,.8,.5][integer(random,0,4)],ratio=.8+random()*.35+(i%7===0?.1:0),annualFullTime=Math.round(band.midpoint*ratio/100)*100;
   records.push({recordId:id+'#'+i,job:job.code,level:level.code,location:location.code,rangeId:id,currency:protocol.currency,effectiveDate:protocol.effectiveDate,payPeriod:protocol.payPeriod,payBasis:protocol.payBasis,eligibility:'active-salaried',fte,basePay:round(annualFullTime*fte)});
  }
  // Deliberate absent, incompatible and ineligible inputs; never replaced by invented zeros.
  const invalid=(j+l+a)%3;
  for(let i=0;i<invalid;i++)records.push({recordId:id+'#excluded-'+i,job:job.code,level:level.code,location:location.code,rangeId:id,currency:i?'CAD':protocol.currency,effectiveDate:protocol.effectiveDate,payPeriod:protocol.payPeriod,payBasis:protocol.payBasis,eligibility:'active-salaried',fte:1,basePay:i?50000:null});
 }
 const sourcePaths=[protocolPath,'lib/simulation/pay-demo.mjs','lib/ml/synthetic-workforce/common.mjs'];
 return {version:1,status:'verified',dataset:protocol.dataset,dataClass:'constructed-synthetic',effectiveDate:protocol.effectiveDate,currency:protocol.currency,payUnit:'Annual base pay at 1.0 FTE',minimumCohort:protocol.minimumCohort,seed:protocol.seed,jobs:protocol.jobs.map(({code,label})=>({code,label})),levels:protocol.levels.map(({code})=>({code,label:code})),locations:protocol.locations.map(({code,label})=>({code,label})),definitions:{population:protocol.population,compaRatio:protocol.compaRatio,distribution:protocol.distribution,disclosure:protocol.disclosure,interpretation:protocol.interpretation},cohorts:aggregateSyntheticPay(records,bands,protocol),evidence:{sourceHashes:Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,digest((await read(path)).toString())]))),rowRecordsPublished:false,overallTotalsPublished:false,operationallyQualified:false}};
}
