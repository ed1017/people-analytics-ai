import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './fixtures/component-module.mjs';
import * as oews from '../lib/oews-reference.mjs';
import * as outlook from '../lib/labor-outlook.mjs';
import * as carry from '../lib/market-reference-carry.ts';
import * as skills from '../lib/market-skills-reference.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/external-workforce-evidence/onet-software-systems-source-extract.json',import.meta.url)));
const training=skills.SOFTWARE_TRAINING_REFERENCE;
const sorted=a=>[...a].sort();
test('reviewed skill groups exactly reconcile to official profile names, without ratings',()=>{
 const from=new Set(fixture.source.skillNames),to=new Set(fixture.target.skillNames);
 assert.deepEqual(sorted(training.shared),sorted([...to].filter(name=>from.has(name))));
 assert.deepEqual(sorted(training.targetOnly),sorted([...to].filter(name=>!from.has(name))));
 assert.deepEqual(sorted(training.sourceOnly),sorted([...from].filter(name=>!to.has(name))));
 assert.equal(training.source.url,fixture.source.sourceUrl);assert.equal(training.target.url,fixture.target.sourceUrl);
 assert.equal(training.checkedAt,fixture.checkedAt);assert.equal(training.licenseDetailsUrl,fixture.licenseUrl);
 assert.equal(skills.findMarketSkillsReference(training.id,'15-2051'),null);
 assert.match(training.limitation,/not an employee assessment/);
});
const aliases={'@/components/key-findings':componentModule('key-findings.tsx'),'@/components/market-evidence-bars':componentModule('market-evidence-bars.tsx'),'@/lib/oews-reference.mjs':oews,'@/lib/labor-outlook.mjs':outlook,'@/lib/market-reference-carry':carry,'@/lib/market-skills-reference':skills};
const market=componentModule('market-reference.tsx',aliases);
const nodes=tree=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];
test('all nine reviewed role/location selections render exact chart values and one plan action',()=>{
 for(const occupation of oews.oewsOccupations)for(const area of oews.oewsAreas){
  const selection={soc:occupation.value,area:area.value};
  const html=renderToStaticMarkup(React.createElement(market.MarketComparison,{selection,onChange:()=>{},goal:'Plan',onCarry:()=>{}}));
  const evidence=oews.marketEvidence(selection);
  assert.match(html,/Median annual pay by location/);assert.match(html,/Employed workforce by location/);
  assert.ok(html.includes(evidence.selected.TOT_EMP.toLocaleString('en-US')));
  assert.equal((html.match(/>Use in plan<\/button>/g)??[]).length,1);
  if(selection.soc==='15-1252')assert.match(html,/Explore a training alternative/);else assert.doesNotMatch(html,/Include this training comparison/);
 }
});
test('bar clicks, role changes and repeated carries use current selection and explicit skills choice',()=>{
 const states=[];let cursor=0,selection={soc:'15-1252',area:'35620'},saved=[];
 const react={...React,useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=value}];}};
 const {MarketComparison}=componentModule('market-reference.tsx',{...aliases,react});
 const render=()=>{cursor=0;return MarketComparison({selection,onChange:next=>{selection=next},goal:'Plan',onCarry:value=>saved.push(value)});};
 const save=()=>nodes(render()).find(n=>n.type==='button'&&n.props.children==='Use in plan').props.onClick();
 save();assert.equal(saved[0].skillComparisonId,undefined);
 nodes(render()).find(n=>n.type==='input').props.onChange({target:{checked:true}});
 save();save();assert.equal(saved[1].skillComparisonId,training.id);assert.deepEqual(saved[1],saved[2]);
 nodes(render()).find(n=>n.props?.title==='Median annual pay by location').props.onSelect('36');save();assert.equal(saved.at(-1).area,'36');
 nodes(render()).find(n=>n.type==='select'&&n.props['aria-label']==='Market occupation').props.onChange({target:{value:'15-2051'}});
 save();assert.equal(saved.at(-1).soc,'15-2051');assert.equal(saved.at(-1).skillComparisonId,undefined);
});
test('optional skills reference survives atomic save/reload and duplicate carry while model fields stay exact',()=>{
 let raw=null;const port={getItem:()=>raw,setItem:(_,v)=>{raw=v},removeItem:()=>{raw=null}};
 const store=new DecisionStore();store.initialize(port);store.saveGoals({version:1,activeId:'goal',goals:[{id:'goal',statement:'Plan'}]});
 store.setField('goal','planning.customScenario',{annualWage:123,hiringTime:null});
 const value={soc:'15-1252',area:'35620',goal:'Plan',skillComparisonId:training.id};
 const save=()=>carry.saveMarketReference({store,datasetToken:store.getDatasetToken(),goalId:'goal',goal:'Plan',revision:store.getSnapshot().data.revision,carry:value,at:'2026-10-29T00:00:00Z'});
 save();save();assert.equal(store.getField('goal','evidence',[]).length,1);
 const reopened=new DecisionStore();reopened.initialize(port);
 assert.deepEqual(reopened.getField('goal','marketCarry',null),value);
 assert.deepEqual(reopened.getField('goal','planning.customScenario',null),{annualWage:123,hiringTime:null});
 assert.deepEqual(carry.marketCarryEvidence(value).skillComparison,training);
 const invalid={...value,soc:'29-1141'};assert.equal(carry.canonicalMarketCarry(invalid),null);
 assert.equal(carry.canonicalMarketCarry({...value,skillComparisonId:'forged'}),null);
 const result=carry.marketCarryEvidence({...value,skillComparison:{target:{title:'CEO'}}});assert.equal(result.skillComparison.target.title,'Software Developers');
});
