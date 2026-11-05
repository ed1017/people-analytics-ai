import {createHash} from 'node:crypto';
const DAY=86400000;
export const openingFeatures=['definedScope','panelReserved','flexibleStartWindow'];
export const openingFamilies=['stable','mix-shift','relationship-reversal'];
export function openingCohorts(family,months){
 if(!openingFamilies.includes(family))throw Error('Unknown family');
 return months.flatMap(month=>{
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid month');
  return Array.from({length:8},(_,mask)=>{
   const features=Object.fromEntries(openingFeatures.map((key,i)=>[key,(mask>>i)&1]));
   const openedAt=month+'-01T00:00:00.000Z';
   const shifted=family==='mix-shift'&&month>='2025-10';
   return {key:month+'/'+mask,month,mask,openedAt,featuresAvailableAt:openedAt,features,
    openings:shifted?10+10*Object.values(features).reduce((a,b)=>a+b,0):40};
  });
 });
}
/** Outcomes are requested separately from opening-known features; no person rows or IDs. */
export function observeOpeningCohorts(family,seed,cohorts,asOf){
 if(!openingFamilies.includes(family)||!Number.isSafeInteger(seed)||seed<0)throw Error('Invalid simulation');
 return cohorts.map(c=>{
  const labelAvailableAt=new Date(Date.parse(c.openedAt)+91*DAY).toISOString();
  if(!Number.isFinite(Date.parse(asOf))||labelAvailableAt>asOf)throw Error('Follow-up not released');
  const sign=family==='relationship-reversal'&&c.month>='2025-10'?-1:1;
  const logit=-.2+sign*.7*Object.values(c.features).reduce((n,x)=>n+2*x-1,0);
  const probability=1/(1+Math.exp(-logit));let started=0;
  for(let i=0;i<c.openings;i++){
   const random=createHash('sha256').update(`${seed}|${c.key}|${i}`).digest().readUInt32BE(0)/4294967296;
   if(random<probability)started++;
  }
  const cancelled=Math.floor(.3*(c.openings-started));
  return {...c,labelAvailableAt,started,cancelled,unresolved:c.openings-started-cancelled};
 });
}
