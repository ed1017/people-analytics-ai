// Separate extension stream: the previously inspected 51-month prefix is unchanged.
import {hiringCohortFixture} from './hiring-cohort-generator.mjs';
export const selectionGeneratorVersion='hiring-selection-extension-v1';
export function hiringSelectionFixture(scenario,seed,cutoff){
 const snapshot=hiringCohortFixture(scenario,seed,cutoff),{input}=snapshot;
 input.manifest.generatorVersion=selectionGeneratorVersion;
 let state=(seed^0x9e3779b9)>>>0;
 const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 const template=structuredClone(input.records[0]);
 for(let month=51;month<57;month++){
  const opened=Date.UTC(2021,month,1),openedAt=new Date(opened).toISOString(),observedAt=new Date(opened+92*86400000).toISOString();
  const n=60+(month*17)%41,logit=scenario==='stationary'?-.3:scenario==='assessment-reversal'?-1:-1.2+.035*month;
  let started=0;for(let i=0;i<n;i++)if(random()<1/(1+Math.exp(-logit)))started++;
  const cancelled=Math.floor((n-started)*.3);
  for(const [status,count] of [['filled',started],['cancelled',cancelled],['open',n-started-cancelled]]){
   if(!count)continue;
   const row=structuredClone(template),start=status==='filled'?new Date(opened+60*86400000).toISOString():null;
   Object.assign(row,{recordKey:`cohort-${month}-${status}`,effectiveAt:openedAt,observedAt});
   Object.assign(row.value,{count,openedAt,status,actualStartAt:start,startObservedAt:start,features:[{name:'opening-month',availableAt:openedAt}]});
   input.records.push(row);
  }
 }
 return snapshot;
}
