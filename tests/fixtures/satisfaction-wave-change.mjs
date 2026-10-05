// Illustrative values only. Dates mirror the three known waves; values are NOT company extracts.
import {fixture,at} from './predictive-readiness.mjs';
export const satisfactionFixtureDefinition=()=>({version:'score1',responseScale:[1,2,3,4,5],favorableValues:[4,5],
 respondentAggregation:'mean-of-respondent-answered-item-shares',missingItemPolicy:'answered-items-only',minimumAnsweredItems:1,
 itemWeighting:'equal',reverseItems:[],excludedItems:[],evidenceRef:'constructed-wave-change-scoring-v1'});
export function satisfactionWaveFixture(){
 const input=fixture('satisfaction'),template=structuredClone(input.records[0]);
 input.cutoff=at('2026-07-02');input.manifest.generatorVersion='constructed-three-wave-change-v1';
 input.manifest.completion={status:'complete',through:at('2026-06-30'),observedAt:at('2026-07-01'),populationVersion:'pop1',evidenceRef:'constructed-three-wave-completion'};
 input.records=[['2024-10-31','2024-11-01',80,100,75],['2025-10-31','2025-11-01',60,100,80],['2026-06-30','2026-07-01',90,120,78]].map(([day,observed,n,N,score],i)=>{
  const row=structuredClone(template);Object.assign(row,{recordKey:`wave-${i+1}`,effectiveAt:at(day),observedAt:at(observed)});
  Object.assign(row.value,{waveId:`constructed-wave-${i+1}`,launchAt:at(day.slice(0,7)+'-01'),closeAt:at(day),
   respondents:n,eligible:N,metric:score,shareSum:score*n/100});return row;
 });return input;
}
