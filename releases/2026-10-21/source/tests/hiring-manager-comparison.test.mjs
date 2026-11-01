import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {generateCompanyPositionInventoryV2} from '../lib/company-position-model-v2.ts';
import {createPositionAllocation,calculatePositionAllocation} from '../lib/position-allocation.ts';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=readFileSync(new URL('../components/workforce-planning/position-allocation-visuals.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const mod={exports:{}};vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require});
const inventory=generateCompanyPositionInventoryV2(),positions=inventory.positions.filter(p=>p.status==='vacant'&&p.countryCode==='US'&&p.role==='Frontend Software Engineer');
function saved(index,patch={}){const draft=createPositionAllocation(positions.map(p=>p.id),false,inventory);Object.assign(draft.input,{hire:2,repurpose:0,train:0,repurposeMode:'redeploy',budgetUsd:100000,horizonMonths:4,hireMonth:2,hireReadyMonth:4,redeployMonth:1,trainReadyMonth:4,releaseFte:1,annualHireCostUsd:163176,hireFeeUsd:6000,repurposeCostUsd:2000,trainingFeeUsd:2500,trainingHoursPerSlot:80,hourlyTimeValueUsd:50,backfill:'none',...patch});return {scenarioNumber:index,revision:1,draft,result:calculatePositionAllocation(draft)};}
const render=records=>renderToStaticMarkup(React.createElement(mod.exports.PositionScenarioComparison,{records}));
const row=(html,label)=>html.split('</tr>').find(value=>value.includes('>'+label+'</th>'))??'';
test('fixed-budget demo exposes unequal company capacity despite equal selected-vacancy capacity',()=>{
 assert.equal(positions.length,2);assert.deepEqual(positions.map(p=>p.team).sort(),['Digital Services','Sales']);
 const hire=saved(1),train=saved(2,{hire:1,train:1}),move=saved(3,{hire:1,repurpose:1});
 for(const [record,cash,net,gap] of [[hire,93588,2,0],[train,49294,1,1],[move,48794,1,1]]){assert.equal(record.result.valid,true);assert.equal(record.result.cashTotal,cash);assert.equal(record.result.targetReadyFte,2);assert.equal(record.result.netCapacityDeltaFte,net);assert.equal(record.result.sourceGapFte,gap);assert.ok(record.result.budgetRemaining>=0);}
 assert.equal(train.result.timeValue,4000);assert.equal(train.result.timeline[1].netCapacityDeltaFte,-0.17);
 const before=JSON.stringify([hire,train]),html=render([hire,train]);assert.match(row(html,'Company-wide net capacity change (FTE)'),/>2<.*>1</);assert.match(row(html,'Assumed target ready FTE'),/>2<.*>2</);assert.match(row(html,'Cash / cash budget (USD)'),/\$93,588.*\$100,000.*\$49,294.*\$100,000/);assert.match(html,/Internal release and skill readiness need confirmation/);assert.match(html,/does not establish Finance approval/);assert.equal(JSON.stringify([hire,train]),before);
});
test('saved readiness months distinguish redeployment, training and unused routes',()=>{
 const html=render([saved(2,{hire:1,train:1}),saved(3,{hire:1,repurpose:1})]);assert.match(row(html,'Assumed ready month (hire / redeploy / train)'),/4 \/ Not used \/ 4.*4 \/ 1 \/ Not used/);
 const redesign=render([saved(4,{hire:1,repurpose:1,repurposeMode:'redesign'})]);assert.match(row(redesign,'Assumed ready month (hire / redeploy / train)'),/4 \/ Not used \/ Not used/);
});
test('missing capacity and cost assumptions remain unknown',()=>{
 const unknown=saved(5,{hire:1,train:1,horizonMonths:2,trainingHoursPerSlot:null,annualHireCostUsd:null,budgetUsd:null});const html=render([unknown]);assert.equal(unknown.result.netCapacityDeltaFte,null);assert.match(row(html,'Company-wide net capacity change (FTE)'),/>Unknown</);assert.match(row(html,'Cash / cash budget (USD)'),/Unknown \/ Unknown/);assert.match(row(html,'Employee time value (USD)'),/Unknown/);
});

test('unused repurpose role and donor defaults cannot imply an unrelated role or transfer',()=>{
 const hire=saved(1,{repurposeRole:'AI Architect'}),move=saved(2,{hire:1,repurpose:1,repurposeRole:'AI Architect'});
 const html=render([hire,move]);assert.match(row(html,'Repurpose route'),/Not used.*Redeploy into selected vacancies/);assert.doesNotMatch(html,/AI Architect/);assert.match(row(html,'Source team / release FTE'),/Not used.*Client Operations \/ 1/);
 const redesign=render([saved(3,{hire:1,repurpose:1,repurposeMode:'redesign',repurposeRole:'AI Architect'})]);assert.match(row(redesign,'Repurpose route'),/Redesign as AI Architect/);assert.match(row(redesign,'Source team / release FTE'),/Not used/);
});
