import test from 'node:test';
import assert from 'node:assert/strict';
import contract from '../docs/workforce-performance-release-contract.json' with {type:'json'};
const bus=['BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH'];
const permits=filters=>contract.allowedFilters.some(row=>JSON.stringify(row)===JSON.stringify(filters));
// Test-only mathematical release gate; not app code or a new displayed dataset.
const gate=cells=>cells.length===8&&new Set(cells.map(c=>c.org)).size===8&&cells.every(c=>bus.includes(c.org)&&c.counts.length===5&&c.counts.every(n=>Number.isSafeInteger(n)&&n>=10&&c.counts.reduce((a,b)=>a+b,0)-n>=10));
test('finite release is exactly global plus eight disjoint BU signatures',()=>{
 assert.equal(contract.allowedFilters.length,9);assert.deepEqual(contract.allowedFilters.map(x=>x.org),['all',...bus]);assert(contract.allowedFilters.every(x=>x.country==='all'&&x.level==='all'));
 for(const org of ['all',...bus]){assert(permits({country:'all',org,level:'all'}));assert(!permits({country:'US',org,level:'all'}));assert(!permits({country:'all',org,level:'IC2'}));}
 assert(!permits({country:'all',org:'unknown',level:'all'}));
 // Global row is the sum of eight unit basis rows: rank stays eight.
 const basis=bus.map((_,i)=>bus.map((_,j)=>Number(i===j)));assert.deepEqual(basis[0].map((_,j)=>basis.reduce((n,r)=>n+r[j],0)),Array(8).fill(1));
});
test('all-or-none gate prevents recovering a suppressed BU by subtraction',()=>{
 const safe=bus.map(org=>({org,counts:[10,15,20,25,30]}));assert(gate(safe));
 for(let i=0;i<8;i++){const changed=structuredClone(safe);changed[i].counts[0]=9;assert(!gate(changed));changed[i].counts=[0,0,100,0,0];assert(!gate(changed));}
 assert(!gate(safe.slice(0,7)));assert(!gate([...safe.slice(0,7),safe[0]]));
});
test('existing membership totals cannot determine a 1–9-person subgroup rating count',()=>{
 let combinations=0;
 for(let population=20;population<=100;population++)for(let category=10;category<=population-10;category++)for(let subgroup=1;subgroup<=9;subgroup++){
  assert.equal(Math.max(0,category-(population-subgroup)),0);assert.equal(Math.min(subgroup,category),subgroup);combinations++;
 }
 assert.equal(combinations,29889);
});
test('contract records synthetic convention, absent not-rated evidence and no raw transfer',()=>{
 assert.equal(contract.status,'proposal_not_authorized_or_applied');assert.equal(contract.availability.originalAvailableAt,null);assert.equal(contract.availability.kind,'new_simulated_convention');assert.equal(contract.availability.historicalOrPredictiveUse,false);assert.equal(contract.recommendedAccess.rawTransfer,'none');assert.equal(contract.recommendedAccess.snapshotRatingPopulation,'none');assert.match(contract.source.notRated,/not_collected/);assert.equal(contract.readOnlyEvidence.matchedRows,10000);assert.equal(contract.readOnlyEvidence.snapshotWithoutReview,0);assert.equal(contract.readOnlyEvidence.reviewWithoutSnapshot,0);
});
