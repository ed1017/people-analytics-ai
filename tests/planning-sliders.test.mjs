import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import ts from 'typescript';
import * as adapter from '../lib/swp-capacity-draft.ts';
import * as engine from '../lib/swp-monthly-workload.ts';
const require=createRequire(import.meta.url);
function load(file,mocks={}){const filename=path.resolve(file),m=new Module(filename);m.filename=filename;m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const sliders=load('lib/planning-slider.ts');
const {capacityPreview}=load('lib/capacity-preview.ts',{'./swp-capacity-draft':adapter,'./swp-monthly-workload':engine});
const {PlanningAssumptionSlider}=load('components/planning-assumption-slider.tsx',{'@/lib/planning-slider':sliders,'./planning-assumption-slider.module.css':{default:{}},react:{...React,useId:()=> 'control'}});
function nodes(tree){return !tree||typeof tree!=='object'?[]:[tree,...React.Children.toArray(tree.props?.children).flatMap(nodes)];}
test('number edits and range/keyboard edits synchronize without snapping typed precision',()=>{
 let value='33.3333';const spec=sliders.capacitySliders.productivity;
 const inputs=()=>nodes(PlanningAssumptionSlider({label:'Productivity',value,spec,onChange:next=>value=next})).filter(n=>n.type==='input');
 assert.equal(inputs()[0].props.value,33.3333);assert.equal(inputs()[0].props.step,'any');
 inputs()[1].props.onChange({target:{value:'12.3456'}});assert.equal(inputs()[0].props.value,12.3456);
 inputs()[0].props.onChange({target:{value:'76.54321'}});assert.equal(inputs()[1].props.value,'76.5432');
 inputs()[0].props.onKeyDown({key:'ArrowRight',preventDefault(){}});assert.equal(value,'77.5432');
 inputs()[0].props.onKeyDown({key:'Home',preventDefault(){}});assert.equal(value,'0');
 inputs()[0].props.onKeyDown({key:'End',preventDefault(){}});assert.equal(value,'100');
 inputs()[0].props.onKeyDown({key:'ArrowRight',preventDefault(){}});assert.equal(value,'100');
 for(const raw of ['', '-', 'abc','100.0001','1.12345']){inputs()[1].props.onChange({target:{value:raw}});assert.equal(inputs()[1].props.value,raw);assert.equal(inputs()[0].props['aria-valuetext'],'Not set — edit the number or move the slider');}
});
test('supported bounds, people integers, expanded ranges and decimal workload are retained',()=>{
 const {sliderNumber,sliderExtent,capacitySliders:s}=sliders;
 assert.equal(sliderNumber('1.2',s.hires),null);assert.equal(sliderNumber('1000000',s.hires),1e6);assert.equal(sliderNumber('1000001',s.hires),null);
 assert.equal(sliderExtent('75000',s.volume),100000);assert.equal(sliderExtent('1000000',s.volume),1e6);
 assert.equal(sliderNumber('8000.123456',s.volume),8000.123456);assert.equal(sliderNumber('8000.1234567',s.volume),null);
 assert.equal(sliderNumber('0',s.volume),0);assert.equal(sliderNumber('',s.volume),null);
});
const draft={...adapter.emptyCapacityDraft,scope:'Service desk - tickets',openingDate:'2026-09-30',months:'3',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true};
test('local preview recalculates independently without confirming or mutating a saveable draft',()=>{
 const before=structuredClone(draft),base=capacityPreview(draft);assert.equal(base.result.points[0].gapFte,1);
 assert.equal(capacityPreview({...draft,productivity:'25'}).result.points[0].gapFte,0);
 assert.equal(capacityPreview({...draft,volume:'0'}).result.points[0].requiredFte,0);
 assert.equal(capacityPreview({...draft,volume:''}).result.points[0].requiredFte,null);
 for(const patch of [{hires:'0.5'},{exits:'11'},{allocation:'100.0001'},{volume:'abc'},{fte:'11'}])assert.equal(capacityPreview({...draft,...patch}).result,null);
 assert.deepEqual(draft,before);assert.equal(draft.confirmed,false);assert.throws(()=>adapter.capacitySpec(draft),/Confirm/);
});
