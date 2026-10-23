import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteFindings,developmentFindings,scenarioFindings,designFindings,allocationFindings,executionFindings,occupationFindings} from '../lib/context-findings.ts';
import {developmentCatalog,developmentCost,quoteInputs} from '../lib/development-costs.ts';
import {snapshotFindings} from '../lib/key-findings.ts';
test('quote selection preserves unknown, zero, currency and per-session basis',()=>{
 const q=developmentCatalog[1];assert.match(quoteFindings(q).items[0],/USD 1,800 per cohort package per session/);
 assert.match(quoteFindings({...q,fee:''}).items[0],/unknown/);assert.match(quoteFindings({...q,fee:'0',currency:'EUR'}).items[0],/EUR 0/);
 assert.match(quoteFindings(undefined).items.join(' '),/Select a quote/);
});
test('development findings use calculator results and refresh with edits, not approved budgets',()=>{
 const q=developmentCatalog[0],i={...quoteInputs(q),participants:'2',additionalFees:'0',hourlyCost:''};
 const a=developmentFindings(q,developmentCost(q,i));assert.match(a.items[0],/USD 720/);assert.match(a.items[1],/12 employee hours/);assert.match(a.items[2],/unknown/);
 const b=developmentFindings(q,developmentCost(q,{...i,participants:'4',hourlyCost:'10'}));assert.match(b.items[0],/USD 1,440/);assert.match(b.items[2],/USD 1,680.*not.*approved budget/);
 assert.match(developmentFindings(q,developmentCost(q,{...i,participants:'-1'})).items[0],/invalid/);
});
test('stored plan findings do not invent unknown endpoints or staffing feasibility',()=>{
 const s={scenario_name:'Test',points:[{planning_month:'2027-01-01',planned_headcount:0,planned_fte:null}]};
 assert.match(scenarioFindings(s).items[1],/headcount is 0/);assert.match(scenarioFindings(s).items[2],/separate from unsaved/);
 assert.match(scenarioFindings(undefined).items[1],/unavailable/);
});
test('design, allocation and execution maintain distinct units and uncertainty',()=>{
 assert.match(designFindings(null,'X').items[0],/No calculated/);
 assert.match(designFindings({as_of:'2026-09-30',modeled:{authorized_positions:10,open_vacancies:0}},'X').items[1],/0 vacancies/);
 assert.match(allocationFindings({build:2,move:3,buy:1},'X').items[0],/Build 2, move 3 and buy 1 role-capacity/);
 const r={as_of:'2026-09-30',planning_start_month:'2027-01',planning_end_month:null,final_remaining_net_gap:0};
 assert.match(executionFindings(r).items[0],/0 role-capacity/);assert.match(executionFindings(r).items[1],/does not cancel earlier/);assert.match(executionFindings(r).scope,/unknown end/);
 assert.match(executionFindings({...r,final_remaining_net_gap:NaN}).items[0],/unknown/);
});
test('occupation scope follows selection without claiming employee readiness',()=>{
 const e={selectedOccupationCode:'15-1252.00',occupation:{title:'Software Developers',release:'31.0'},sourceMode:'public_snapshot',mappingStatus:'No internal mapping selected'};
 assert.match(occupationFindings(e).scope,/15-1252.00/);assert.match(occupationFindings(e).items[0],/curated public excerpt/);assert.match(occupationFindings(e).items[2],/do not establish employee/);
});
test('legacy labels are presentation-only and do not hide unknown metrics',()=>{
 const r=snapshotFindings({snapshot_date:'2026-09-30',headcount:920,fte:900.4,open_positions:null,voluntary_turnover_ytd_pct:null},'Demo CA / Demo BU-TECH / Demo level 8');
 assert.equal(r.scope,'CA / BU-TECH / level 8 · 2026-09-30');assert.match(r.items[0],/920 people/);assert.equal(r.items.length,1);
});

test('retained structural results are hidden during calculation or failure',()=>{
 const source=fs.readFileSync(new URL('../components/workforce-planning/position-workforce-design-destination.tsx',import.meta.url),'utf8');
 assert.match(source,/!positionModelingLoading && !structuralActionProps.loading && !structuralActionProps.error && <KeyFindings/);
});
import {capacityFindings} from '../lib/context-findings.ts';
test('capacity findings distinguish preview, people, shortfall and surplus',()=>{
 const r={assumptions:{scope:{label:'Tickets'}},points:[{month:'2027-01',requiredFte:4,gapFte:2}]};
 assert.match(capacityFindings(r,true).scope,/unconfirmed preview/);assert.match(capacityFindings(r,true).items[1],/2 FTE shortfall/);
 assert.match(capacityFindings({...r,points:[{month:'2027-02',requiredFte:4,gapFte:-1}]},false).items[1],/1 FTE surplus/);
 assert.match(capacityFindings(null,true).items[1],/Blank inputs remain unknown/);
});
