import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rng,integer,digest} from '../ml/synthetic-workforce/common.mjs';
const root=new URL('../../',import.meta.url);
export const careerDemoPath='lib/data/synthetic-career-demo-v1.json',careerProtocolPath='lib/simulation/career-demo-protocol.json';
const round=value=>Math.round(value*100)/100;
const date=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function completedMonths(from,to){assert(date(from)&&date(to)&&to>=from,'Valid ordered dates required');const a=from.split('-').map(Number),b=to.split('-').map(Number);return (b[0]-a[0])*12+b[1]-a[1]-(b[2]<a[2]?1:0);}
export function durationSummary(values){assert(values.length>=5&&values.every(value=>Number.isSafeInteger(value)&&value>=12),'Five valid observed promotion durations required');const sorted=[...values].sort((a,b)=>a-b),q=p=>{const at=(sorted.length-1)*p,low=Math.floor(at);return round(sorted[low]+(sorted[Math.ceil(at)]-sorted[low])*(at-low));};return {n:sorted.length,median:q(.5),q1:q(.25),q3:q(.75)};}
const cellKey=(department,level)=>department+':'+level;
const small=n=>n>0&&n<5;
/** In-memory records never leave this offline aggregation boundary. */
export function aggregateSyntheticCareer(records,protocol){
 assert.equal(protocol.minimumCohort,5);assert(Array.isArray(records));
 assert(records.every(row=>typeof row.id==='string'&&row.id.length>0)&&new Set(records.map(row=>row.year+':'+row.id)).size===records.length,'Unique person per annual cohort required');
 const cells=new Map(protocol.departments.flatMap(department=>protocol.levels.map(level=>[cellKey(department.code,level.code),{department:department.code,level:level.code,years:new Map(protocol.years.map(year=>[year,[]]))}])));
 for(const row of records){
  const bucket=cells.get(cellKey(row.department,row.level))?.years.get(row.year);assert(bucket,'Unknown cohort/year cannot be silently omitted');
  const start=row.year+'-01-01',end=row.year+'-12-31',level=protocol.levels.find(level=>level.code===row.level);
  const followup=date(row.exitDate)?row.exitDate:end;
  const promotionValid=row.promotionDate===null&&row.promotionLevel===null||date(row.promotionDate)&&row.promotionDate>=start&&row.promotionDate<=followup&&Number.isSafeInteger(row.promotionLevel)&&row.promotionLevel>level.rank;
  const eligible=row.activeAtStart===true&&row.employment==='salaried'&&date(row.hireDate)&&row.hireDate<=start&&date(row.levelStart)&&row.levelStart>=row.hireDate&&row.levelStart<=start&&completedMonths(row.levelStart,start)>=12&&row.eventCoverage==='complete'&&(row.exitDate===null||date(row.exitDate)&&row.exitDate>=start&&row.exitDate<=end)&&promotionValid;
  if(!eligible)continue;
  const rating=Number.isInteger(row.rating)&&row.rating>=1&&row.rating<=5&&row.rubric===protocol.rubric&&date(row.ratingDate)&&row.ratingDate>=start&&row.ratingDate<=followup?row.rating:null;
  bucket.push({rating,duration:row.promotionDate?completedMonths(row.levelStart,row.promotionDate):null});
 }
 const withheld=new Set();
 for(const [id,cell] of cells){for(const rows of cell.years.values()){
  const rated=rows.filter(row=>row.rating!==null),promoted=rows.filter(row=>row.duration!==null),counts=protocol.ratings.map((_,i)=>rated.filter(row=>row.rating===i+1).length);
  if(rows.length<5||[rated.length,rows.length-rated.length,promoted.length,rows.length-promoted.length,...counts].some(small))withheld.add(id);
 }}
 // Same complementary cells in every year, so changing year cannot reveal a hidden cell.
 for(const level of protocol.levels){const partition=[...cells].filter(([,cell])=>cell.level===level.code);if(partition.filter(([id])=>withheld.has(id)).length===1){const other=partition.filter(([id])=>!withheld.has(id)).sort((a,b)=>Math.min(...[...a[1].years.values()].map(rows=>rows.length))-Math.min(...[...b[1].years.values()].map(rows=>rows.length))||a[0].localeCompare(b[0]));if(other.length)withheld.add(other[0][0]);}}
 return [...cells].map(([id,cell])=>({id,department:cell.department,level:cell.level,periods:[...cell.years].map(([year,rows])=>{
  if(withheld.has(id))return {year,status:'suppressed',metrics:null};
  const rated=rows.filter(row=>row.rating!==null),promoted=rows.filter(row=>row.duration!==null),counts=protocol.ratings.map((_,i)=>rated.filter(row=>row.rating===i+1).length),meets=counts.slice(2).reduce((a,b)=>a+b,0);
  return {year,status:'published',metrics:{eligible:rows.length,promoted:promoted.length,promotionRatePct:round(100*promoted.length/rows.length),rated:rated.length,missingRatings:rows.length-rated.length,meets: rated.length?meets:null,meetsPct:rated.length?round(100*meets/rated.length):null,ratingCounts:rated.length?counts:null,timeToPromotion:promoted.length?durationSummary(promoted.map(row=>row.duration)):null}};
 })}));
}
export async function buildSyntheticCareerDemo({read=path=>readFile(new URL(path,root))}={}){
 const protocol=JSON.parse(await read(careerProtocolPath)),random=rng(protocol.seed,protocol.dataset),records=[];
 for(const [d,department] of protocol.departments.entries())for(const [l,level] of protocol.levels.entries())for(const [y,year] of protocol.years.entries()){
  const count=d===0&&l===2?3:70+5*d+5*l,missing=(d+l+y)%2?5:0,promotions=8+2*d+l+y;
  // Five minimum per category; the remaining ratings vary across annual invented cohorts.
  const ratings=[...Array.from({length:5},(_,rating)=>Array(5).fill(rating+1)).flat(),...Array.from({length:Math.max(0,count-missing-25)},()=>integer(random,2,4))];
  for(let i=0;i<count;i++)records.push({id:year+':'+department.code+':'+level.code+':'+i,department:department.code,level:level.code,year,activeAtStart:true,employment:'salaried',hireDate:(year-6)+'-01-01',levelStart:(year-2-integer(random,0,2))+'-'+String(integer(random,1,12)).padStart(2,'0')+'-01',eventCoverage:'complete',exitDate:i===count-1?year+'-11-30':null,promotionDate:i<promotions?year+'-'+String(integer(random,7,10)).padStart(2,'0')+'-01':null,promotionLevel:i<promotions?level.rank+1:null,rating:i<count-missing?ratings[i]:null,ratingDate:year+'-06-01',rubric:protocol.rubric});
  // Explicitly incomplete follow-up is ineligible, never an assumed nonpromotion.
  records.push({id:year+':'+department.code+':'+level.code+':excluded',department:department.code,level:level.code,year,eventCoverage:'unknown'});
 }
 const paths=[careerProtocolPath,'lib/simulation/career-demo.mjs','lib/ml/synthetic-workforce/common.mjs'];
 return {version:1,status:'verified',dataset:protocol.dataset,dataClass:'constructed-synthetic',seed:protocol.seed,years:protocol.years,departments:protocol.departments,levels:protocol.levels.map(({code})=>({code,label:code})),ratingLabels:protocol.ratings,definitions:Object.fromEntries(['population','eligibility','promotionRate','performance','duration','disclosure','interpretation'].map(key=>[key,protocol[key]])),cohorts:aggregateSyntheticCareer(records,protocol),evidence:{sourceHashes:Object.fromEntries(await Promise.all(paths.map(async path=>[path,digest((await read(path)).toString())]))),rowRecordsPublished:false,overallTotalsPublished:false,operationallyQualified:false}};
}
