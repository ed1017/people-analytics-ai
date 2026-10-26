import test from 'node:test';
import assert from 'node:assert/strict';
import {createPositionScenario, revisePositionScenario, calculatePositionScenario, validatePositionScenario} from '../lib/position-design-scenario.ts';
const row=(id,overrides={})=>({id,role:'BI-ANA',level:'L2',businessUnit:'BU-CLIENTOPS',location:'US',fte:1,annualCostUsd:100000,occupancy:'occupied',...overrides});
const baseline=()=>({version:'demo-v3',asOf:'2026-09-30',scope:'Client Operations',source:'user-entered',positions:[row('p1'),row('p2',{fte:0.5,annualCostUsd:50000,occupancy:'vacant'})]});

test('current/proposed positions retain stable identity and distinct employee semantics',()=>{
 const source=baseline(), original=createPositionScenario('design-1',source), before=JSON.stringify(original);
 const changes=[{kind:'change',id:'p1',patch:{role:'BI-DEV',level:'L3',fte:0.8,annualCostUsd:90000}},{kind:'move',id:'p1',businessUnit:'BU-MANAGEDSERVICES',location:'GB'},{kind:'remove',id:'p2'},{kind:'add',position:row('p3',{fte:0.5,annualCostUsd:40000,occupancy:'unknown'})}];
 const next=revisePositionScenario(original,changes), result=calculatePositionScenario(next);
 assert.equal(next.revision,2);assert.equal(next.baseline.version,'demo-v3');assert.equal(JSON.stringify(original),before);
 assert.equal(result.netPositions,0);assert.ok(Math.abs(result.netPositionFte + 0.2) < 1e-12);assert.equal(result.annualPositionCostDeltaUsd,-20000);assert.equal(result.employeeHeadcountChange,null);
 assert.equal(result.proposed[0].id,'p1');assert.equal(result.proposed[0].location,'GB');assert.equal(result.proposed[0].role,'BI-DEV');assert.equal(result.current[0].role,'BI-ANA');
 assert.equal(result.proposedTotals.unknownOccupancyPositions,1);
 changes[0].patch.role='mutated';source.positions[0].role='mutated';result.current[0].role='mutated';assert.equal(next.changes[0].patch.role,'BI-DEV');assert.equal(original.baseline.positions[0].role,'BI-ANA');
});

test('add/remove are net positions, not automatic hires/terminations or savings',()=>{
 const original=createPositionScenario('design-2',baseline());
 const added=calculatePositionScenario(revisePositionScenario(original,[{kind:'add',position:row('new',{occupancy:'vacant'})}]));
 assert.equal(added.netPositions,1);assert.equal(added.employeeHeadcountChange,null);assert.equal(added.annualPositionCostDeltaUsd,100000);
 const removed=calculatePositionScenario(revisePositionScenario(original,[{kind:'remove',id:'p1'}]));assert.equal(removed.netPositions,-1);assert.equal(removed.employeeHeadcountChange,null);
});

test('unknown cost/FTE/location remain unknown, explicit zero stays zero',()=>{
 const source=baseline();source.positions=[row('unknown',{fte:null,annualCostUsd:null,location:null,occupancy:'unknown'})];
 const original=createPositionScenario('design-3',source), result=calculatePositionScenario(original);
 assert.equal(result.currentTotals.positionFte,null);assert.equal(result.currentTotals.annualPositionCostUsd,null);assert.equal(result.netPositionFte,null);assert.equal(result.annualPositionCostDeltaUsd,null);assert.equal(result.proposed[0].location,null);
 const zero=calculatePositionScenario(revisePositionScenario(original,[{kind:'change',id:'unknown',patch:{fte:0,annualCostUsd:0}}]));assert.equal(zero.proposedTotals.positionFte,0);assert.equal(zero.proposedTotals.annualPositionCostUsd,0);assert.equal(zero.annualPositionCostDeltaUsd,null);
});

test('revisions round trip in an existing JSON save envelope and preserve original basis',()=>{
 const original=createPositionScenario('design-4',baseline());
 const revised=revisePositionScenario(original,[{kind:'move',id:'p1',businessUnit:'BU-OTHER',location:null}]);
 const reopened=JSON.parse(JSON.stringify({positionScenario:revised,original}));validatePositionScenario(reopened.positionScenario);
 assert.deepEqual(calculatePositionScenario(reopened.positionScenario),calculatePositionScenario(revised));assert.deepEqual(reopened.original,original);
 const reset=revisePositionScenario(reopened.positionScenario,[]);assert.equal(reset.revision,3);assert.deepEqual(calculatePositionScenario(reset).proposed,original.baseline.positions);
 assert.equal(reopened.positionScenario.changes.length,1);
});

test('reject malformed baselines, duplicate IDs, unknown targets and silent ID reuse',()=>{
 assert.throws(()=>createPositionScenario('x',{...baseline(),asOf:'2026-02-30'}));
 assert.throws(()=>createPositionScenario('x',{...baseline(),positions:[row('p1'),row('p1')]}));
 assert.throws(()=>createPositionScenario('x',{...baseline(),version:''}));
 const original=createPositionScenario('x',baseline());
 for(const changes of [[{kind:'remove',id:'absent'}],[{kind:'add',position:row('p1')}],[{kind:'remove',id:'p1'},{kind:'add',position:row('p1')}],[{kind:'change',id:'p1',patch:{id:'different'}}],[{kind:'change',id:'p1',patch:{fte:-1}}],[{kind:'change',id:'p1',patch:{annualCostUsd:NaN}}],[{kind:'change',id:'p1',patch:{role:undefined}}],[{kind:'change',id:'p1',patch:{}}],[{kind:'hire',id:'p1'}]]) assert.throws(()=>revisePositionScenario(original,changes));
 assert.throws(()=>validatePositionScenario({...original,schemaVersion:2}));
});

test('identical repeated proposal is replayed once, never cumulatively duplicated',()=>{
 const original=createPositionScenario('design-5',baseline()),changes=[{kind:'add',position:row('p3')}];
 const first=revisePositionScenario(original,changes),second=revisePositionScenario(first,changes);
 assert.equal(calculatePositionScenario(first).proposedTotals.positions,3);assert.equal(calculatePositionScenario(second).proposedTotals.positions,3);assert.equal(second.revision,3);
});

test('position totals do not expose Infinity as a valid scenario result',()=>{
 const source=baseline();source.positions=[row('a',{annualCostUsd:Number.MAX_VALUE}),row('b',{annualCostUsd:Number.MAX_VALUE})];
 assert.throws(()=>calculatePositionScenario(createPositionScenario('overflow',source)),/numeric range/);
});

test('revision limit rejects an increment that would produce an invalid saved revision',()=>{
 const original={...createPositionScenario('revision-limit',baseline()),revision:Number.MAX_SAFE_INTEGER-2};
 const final=revisePositionScenario(original,[]);
 assert.equal(final.revision,Number.MAX_SAFE_INTEGER-1);
 assert.doesNotThrow(()=>validatePositionScenario(final));
 assert.throws(()=>revisePositionScenario(final,[]),/revision limit reached/);
 assert.equal(final.revision,Number.MAX_SAFE_INTEGER-1);
 assert.throws(()=>validatePositionScenario({...final,revision:Number.MAX_SAFE_INTEGER}),/revision/);
});
