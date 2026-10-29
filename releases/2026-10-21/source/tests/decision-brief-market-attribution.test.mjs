import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {createRequire} from 'node:module';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {marketCarryEvidence} from '../lib/market-reference-carry.ts';
import {UK_SOFTWARE_PAY_REFERENCE as uk,TORONTO_SOFTWARE_VACANCY_REFERENCE as toronto} from '../lib/external-workforce-evidence.ts';
const require=createRequire(import.meta.url),goal='Review hiring options';
function load(refs=[]){
 const exports={},code=ts.transpileModule(fs.readFileSync(new URL('../components/decision-brief.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>name==='@/lib/market-reference-carry'?{marketCarryEvidence}:name==='@/components/decision-store'?{useDecisionStorage:()=>({data:{workspaces:{a:{fields:{evidence:refs}}}}}),decisionStore:{}}:name==='@/lib/decision-brief'?{briefFields:{observed:'Observed'},emptyDecisionBrief:()=>({observed:'',approvals:[]})}:name==='@/components/attached-action-plans-brief'?{AttachedActionPlansBrief:()=>null}:name==='@/components/capability-journey'?{CapabilityJourney:()=>null}:name==='@/lib/workforce-solution-review'?{selectedWorkforceBrief:()=>null}:name==='@/lib/development-costs'?{}:require(name)});
 return exports;
}
const external=id=>marketCarryEvidence({version:1,kind:'external-workforce-reference',referenceId:id,goal});
test('decision brief identifies canonical UK, Toronto and legacy BLS publishers with their own dates and geography',()=>{
 const sources=[external(uk.id),external(toronto.id),marketCarryEvidence({soc:'15-1252',area:'99',goal})],refs=sources.map(evidence=>({page:'labor-market',schemaVersion:1,capturedAt:'2026-10-27T12:00:00.000Z',evidence})),before=JSON.stringify(refs),component=load(refs);
 const html=renderToStaticMarkup(React.createElement(component.DecisionBrief,{conversation:{activeGoalId:'a',focusedIssue:goal},onNavigate:()=>{}}));
 assert.match(html,/ONS ASHE public pay reference/);assert.match(html,/2025-04-06 to 2026-04-05/);assert.match(html,/released 2026-10-22/);assert.match(html,/United Kingdom \(national\)/);
 assert.match(html,/Statistics Canada JVWS public vacancy and offered-pay reference/);assert.match(html,/2026-04-01 to 2026-06-30/);assert.match(html,/released 2026-09-15/);assert.match(html,/Toronto, Ontario \(economic region\)/);
 assert.equal((html.match(/Real public BLS reference/g)||[]).length,1);assert.doesNotMatch(html,/BLS observations are real public data/);assert.match(html,/Company evidence is synthetic/);assert.equal(JSON.stringify(refs),before);
});
test('unknown or malformed history receives a generic label rather than invented publisher attribution',()=>{
 const {laborMarketReferencePresentation:present}=load();
 for(const source of [null,{}, {source:'ONS'}, {kind:'external-workforce-reference',version:2,reference:{id:uk.id},goal}, {kind:'external-workforce-reference',version:1,reference:{id:'unknown',source:{publisher:'BLS'}},goal}, {source:'U.S. Bureau of Labor Statistics, OEWS',selected:{OCC_CODE:'invalid',AREA:'99'},goal}]){
  const result=present(source);assert.equal(result.label,'Saved labor-market reference; source details unavailable');assert.equal(result.period,'');assert.equal(result.geography,'');
 }
 const forged=external(toronto.id);forged.reference.source.publisher='BLS';forged.reference.source.url='https://evil.invalid';const result=present(forged);assert.match(result.label,/Statistics Canada/);assert.doesNotMatch(JSON.stringify(result),/evil.invalid|BLS/);
});

test('rendered unknown market history never falls back to unverified saved dates',()=>{
 const evidence={kind:'external-workforce-reference',version:1,goal,reference:{id:'unknown'},period:'forged-period-2099',releaseDate:'2099-12-31'};
 const component=load([{page:'labor-market',schemaVersion:1,capturedAt:'2026-10-27T12:00:00.000Z',evidence}]);
 const html=renderToStaticMarkup(React.createElement(component.DecisionBrief,{conversation:{activeGoalId:'a',focusedIssue:goal},onNavigate:()=>{}}));
 assert.match(html,/Saved labor-market reference; source details unavailable/);assert.doesNotMatch(html,/forged-period-2099|2099-12-31/);assert.match(html,/saved reference 1/);
});

import {SOFTWARE_TRAINING_REFERENCE as training} from '../lib/market-skills-reference.ts';
test('decision brief attributes canonical optional skills evidence without accepting forged profile IDs',()=>{
 const {laborMarketReferencePresentation:present}=load();
 const evidence=marketCarryEvidence({soc:'15-1252',area:'35620',goal,skillComparisonId:training.id});
 assert.match(present(evidence).label,/BLS reference \+ O\*NET qualitative skills/);
 assert.equal(present({...evidence,skillComparison:{id:'forged'}}).label,'Saved labor-market reference; source details unavailable');
 assert.doesNotMatch(present(marketCarryEvidence({soc:'15-1252',area:'35620',goal})).label,/O\*NET/);
});
