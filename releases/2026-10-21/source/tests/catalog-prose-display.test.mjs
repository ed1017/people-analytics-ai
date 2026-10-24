import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogProseDisplay,demoBusinessUnitNames} from '../lib/catalog-display.ts';
import {AGGREGATE_ROW_SCHEMAS} from '../lib/dataset-aggregate-row-schema.mjs';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..'),cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file);
 const exports={};cache.set(file,exports);
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:id=>{
  if(!id.startsWith('.')&&!id.startsWith('@/'))return require(id);
  const base=id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(file),id);
  const found=[base,base+'.ts',base+'.tsx'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
  return load(found);
 }});return exports;
}
const {ChatContent}=load(path.join(root,'components/chat-content.tsx'));
test('only validated public BU labels change and quantities stay exact',()=>{
 for(const label of AGGREGATE_ROW_SCHEMAS.attrition_business_unit_summary.org_name.enum)
  assert.equal(catalogProseDisplay(label+': $215,590,000; 2026-09-30'),demoBusinessUnitNames[label.slice(5)]+': $215,590,000; 2026-09-30');
 for(const value of ['Demo BU-NEW','Demo BU-TECH-OTHER','Demo BU-TECH_OLD','SomeDemo BU-TECH','Demo workforce'])assert.equal(catalogProseDisplay(value),value);
});
test('rendered captured-style prose, emphasis and tables display labels without mutating context',()=>{
 const message={role:'assistant',content:'**Demo BU-TECH**: $215.59m [F1]\n\n| Business unit | Cost |\n| --- | --- |\n| Demo BU-MGSVC | $206.11m |\n\nUnknown Demo BU-NEW remains unknown.'};
 const before=JSON.stringify(message),html=renderToStaticMarkup(React.createElement(ChatContent,{content:message.content}));
 assert.doesNotMatch(html,/Demo BU-TECH|Demo BU-MGSVC/);assert.match(html,/Technology/);assert.match(html,/215.59m/);assert.match(html,/206.11m/);assert.match(html,/Demo BU-NEW/);assert.match(html,/data-chat-citation="F1"/);assert.equal(JSON.stringify(message),before);
});
