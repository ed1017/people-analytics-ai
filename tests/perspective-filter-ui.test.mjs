import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function component(file, mocks = {}) {
  const filename = path.resolve(file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS}});
  const result = new Module(filename);
  result.require = id => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  result._compile(compiled.outputText, filename);
  return result.exports;
}
const options = {countries:[{value:'US',label:'United States'}],business_units:[],levels:[]};
const nodes = tree => React.isValidElement(tree) ? [tree, ...React.Children.toArray(tree.props.children).flatMap(nodes)] : [];

test('unsupported pages collapse and disable retained filters, preserving the selected-goal entry', () => {
  for (const phone of [false,true]) {
    const {GlobalWorkforceFilters} = component('components/global-workforce-filters.tsx', {react:{...React,useState:()=>[false,()=>{}]}, '@/components/use-phone-layout':{usePhoneLayout:()=>phone}});
    for (const page of ['planning-overview','scenario-modeling','position-workforce-design','workforce-response','execution-feasibility','attrition','development-planning','finance']) {
      const tree = GlobalWorkforceFilters({page,options,country:'US',org:'all',level:'all',focusedIssue:React.createElement('button',null,'Selected goal')});
      const all = nodes(tree), details = all.find(node=>node.type==='details');
      assert(details); assert(!details.props.open);
      assert.equal(all.find(node=>node.type==='fieldset').props.disabled,true);
      assert.equal(all.find(node=>node.type==='select').props.value,'US');
      const html = renderToStaticMarkup(tree);
      assert.match(html,/Selected goal/); assert.match(html,/not applied here/);
      if (page==='planning-overview') assert.match(html,/selected goal guides advice; capacity figures come from/);
    }
  }
});

test('supported pages retain enabled controls and exact change callbacks', () => {
  const {GlobalWorkforceFilters} = component('components/global-workforce-filters.tsx', {react:{...React,useState:()=>[false,()=>{}]}, '@/components/use-phone-layout':{usePhoneLayout:()=>false}});
  for (const page of ['home','overview','workforce','career-growth-mobility','compensation']) {
    let chosen;
    const tree = GlobalWorkforceFilters({page,options,country:'all',org:'all',level:'all',onCountry:value=>{chosen=value;}});
    assert.equal(nodes(tree).filter(node=>node.type==='fieldset').length,0);
    const select = nodes(tree).find(node=>node.type==='select');
    select.props.onChange({target:{value:'US'}}); assert.equal(chosen,'US');
  }
});

test('each perspective has a visible description linked to its selector', () => {
  const {AppHeader} = component('components/app-header.tsx', {
    '@/components/limited-preview-badge':{LimitedPreviewBadge:()=>null},
    '@/components/use-phone-layout':{usePhoneLayout:()=>false},
    '@/components/workspace-palette-control':{WorkspacePaletteControl:()=>null},
    '@/components/page-help':{PageHelp:()=>null},
    '@/lib/app-navigation':{getAppPageMetadata:()=>({label:'Overview'})},
  });
  for (const selectedPersona of ['HR','Leader','Finance']) {
    const html = renderToStaticMarkup(React.createElement(AppHeader,{activePage:'home',selectedPersona,onPersonaChange:()=>{}}));
    assert.match(html,/aria-describedby="perspective-effect"/);
    assert(html.includes(`${selectedPersona} perspective shapes AI explanations.`));
    assert.match(html,/Figures and calculations stay the same/);
  }
});


test('desktop Level and Business Unit keep readable nonshrinking widths and full native labels',()=>{
 const {GlobalWorkforceFilters}=component('components/global-workforce-filters.tsx',{react:{...React,useState:()=>[false,()=>{}]},'@/components/use-phone-layout':{usePhoneLayout:()=>false}});
 const label='L5 - Senior leadership';let selected;
 const tree=GlobalWorkforceFilters({page:'home',options:{...options,levels:[{value:'L5',label}]},country:'all',org:'all',level:'L5',onLevel:value=>{selected=value;}});
 const all=nodes(tree),level=all.find(n=>n.type==='select'&&n.props['aria-label']==='Level');
 assert.match(level.props.className,/lg:w-64/);assert.equal(level.props.title,label);
 assert.match(all.find(n=>n.type==='label'&&nodes(n).some(child=>child.props['aria-label']==='Level')).props.className,/lg:shrink-0/);
 assert.match(all.find(n=>n.type==='select'&&n.props['aria-label']==='Business Unit').props.className,/lg:w-64/);
 level.props.onChange({target:{value:'all'}});assert.equal(selected,'all');
 assert.match(renderToStaticMarkup(tree),/lg:flex-wrap/);
});
