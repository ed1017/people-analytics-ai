import test from 'node:test';import a from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {composerPromptHelpers,insertPromptHelper} from '../lib/composer-prompt-helpers.ts';
const require=createRequire(import.meta.url);
function component(){const exports={},frames=[];const js=ts.transpileModule(fs.readFileSync(new URL('../components/catalog-composer.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(js,{exports,requestAnimationFrame:fn=>frames.push(fn),require:name=>name==='react'?{...React,useEffect:()=>{},useId:()=>':test:',useState:v=>[v,()=>{}]}:name==='@/lib/dataset-client.mjs'?{datasetFetch:()=>{throw Error('Unexpected request')}}:name==='@/lib/composer-prompt-helpers'?{composerPromptHelpers,insertPromptHelper}:name==='@/lib/composer-catalog'?{composerCatalogMatch:()=>null,composerCatalogOptions:()=>[],filterComposerOptions:()=>[]}:require(name)});return {...exports,frames};}
const walk=node=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(walk)];
test('capacity template has optional blank fields and no invented quantity, salary or budget',()=>{const r=insertPromptHelper('','need');for(const label of ['Description: ','FTE needed: ','Budget (optional): ','Role: ','Business unit: ','Level: ','Location: ','Needed by: '])a.ok(r.value.includes(label));a.equal(r.value.slice(r.start,r.end),'');a.equal(r.value.slice(0,r.start).split('\n').at(-1),'Description: ');a.doesNotMatch(r.value,/\d/);});
test('all helpers preserve every draft byte and use only editable placeholders',()=>{for(const draft of ['','Existing draft','  keep spaces  ','first\nsecond\n'])for(const helper of composerPromptHelpers){const r=insertPromptHelper(draft,helper.id);a.ok(r.value.startsWith(draft));a.equal(r.value.slice(r.start,r.end),helper.id==='need'?'':'[role]');}a.equal(insertPromptHelper('draft','unknown'),null);});
test('real component button appends draft, focuses caret, and never submits or fetches',()=>{const {PromptTemplates,frames}=component();let result,focused=0,selection;const tree=PromptTemplates({value:'Existing question',onChange:v=>result=v,textareaRef:{current:{focus:()=>focused++,setSelectionRange:(...v)=>selection=v}},rows:4,workforce:null,datasetToken:'fixture'});const buttons=walk(tree).filter(n=>n.type==='button');a.equal(buttons.length,3);for(const b of buttons)a.equal(b.props.type,'button');buttons[0].props.onClick();a.ok(result.startsWith('Existing question\n'));a.equal(focused,0);frames[0]();a.equal(focused,1);a.equal(selection[0],selection[1]);const html=renderToStaticMarkup(tree);a.match(html,/Templates/);a.match(html,/grid-cols-1/);a.equal((html.match(/Edit prompt/g)??[]).length,3);a.match(html,/min-h-24/);});

test('real catalogue parser cannot consume another template line as role or level',()=>{
 const exports={};const js=ts.transpileModule(fs.readFileSync(new URL('../lib/composer-catalog.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>name==='./public-9037-contract.mjs'?{PUBLIC_9037:{}}:{catalogDisplayLabel:v=>v}});
 for(const draft of ['Role: \nDescription: Finance','Level: \nLocation: Canada','[role: \nLocation: Canada]'])a.equal(exports.composerCatalogMatch(draft,draft.length),null);
 for(const [draft,kind,query]of [['Role: Finance','role','Finance'],['Level: L8','level','L8'],['Role: ','role',''],['[role]','role','']]){const result=exports.composerCatalogMatch(draft,draft.length);a.equal(result.kind,kind);a.equal(result.query,query);}
 const template=insertPromptHelper('','need').value;const caret=template.indexOf('Role: ')+6;const match=exports.composerCatalogMatch(template,caret);a.equal(match.kind,'role');a.equal(match.query,'');const inserted=exports.insertComposerOption(template,match,{code:'R1',label:'Analyst'});a.ok(inserted.value.includes('Role: Analyst (R1)\nBusiness unit: '));
});

 test('complete catalogue filtering and role toggling retain all selections and other fields',()=>{
 const exports={};const js=ts.transpileModule(fs.readFileSync(new URL('../lib/composer-catalog.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>name==='./public-9037-contract.mjs'?{PUBLIC_9037:{}}:{catalogDisplayLabel:v=>v}});
 const options=Array.from({length:50},(_,i)=>({code:'R'+i,label:'Role '+i}));
 const typed='Role: Role';a.equal(exports.toggleComposerRole(typed,exports.composerCatalogMatch(typed,typed.length),options[49],true,options).value,'Role: Role 49 (R49)');const middle='Role: Ro, R1';a.equal(exports.toggleComposerRole(middle,exports.composerCatalogMatch(middle,8),options[49],true,options).value,'Role: R1, Role 49 (R49)');const labels=[{code:'A',label:'Analyst'},{code:'SA',label:'Senior Analyst'}];const bare='Role: Analyst';a.equal(exports.toggleComposerRole(bare,exports.composerCatalogMatch(bare,bare.length),labels[1],true,labels).value,'Role: Analyst, Senior Analyst (SA)');const existing='Role: R1';a.equal(exports.toggleComposerRole(existing,exports.composerCatalogMatch(existing,existing.length),options[10],true,options).value,'Role: R1, Role 10 (R10)');a.equal(exports.filterComposerOptions(options,'').length,50);a.equal(exports.filterComposerOptions(options,'R49')[0].code,'R49');
 let value='FTE needed: 12\nRole: \nBusiness unit: Finance\nBudget (optional): ';
 let caret=value.indexOf('Role: ')+6;
 for(const option of [options[0],options[49]]){const result=exports.toggleComposerRole(value,exports.composerCatalogMatch(value,caret),option);value=result.value;caret=result.caret;}
 a.match(value,/Role 0 \(R0\), Role 49 \(R49\)/);a.match(value,/FTE needed: 12/);a.match(value,/\nBusiness unit: Finance\nBudget \(optional\): $/);
 const result=exports.toggleComposerRole(value,exports.composerCatalogMatch(value,caret),options[0]);a.doesNotMatch(result.value,/Role 0/);a.match(result.value,/Role 49/);
 a.equal(exports.composerCatalogMatch('Business unit: ',15).kind,'business unit');
 });

test('readable titles, legacy codes and title/code pairs toggle one identity without duplicates',()=>{
 const exports={};const js=ts.transpileModule(fs.readFileSync(new URL('../lib/composer-catalog.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>name==='./public-9037-contract.mjs'?{PUBLIC_9037:{}}:{catalogDisplayLabel:v=>v}});
 const option={code:'AI-ENG',label:'AI Engineer'};
 for(const form of ['AI-ENG','AI Engineer','AI Engineer (AI-ENG)']){
  const value=`Role: ${form}, BI-ANA\nFTE needed: 12`;const caret=value.indexOf('\n');
  const removed=exports.toggleComposerRole(value,exports.composerCatalogMatch(value,caret),option);
  a.equal(removed.value,'Role: BI-ANA\nFTE needed: 12');
  const restored=exports.toggleComposerRole(removed.value,exports.composerCatalogMatch(removed.value,removed.caret),option);
  a.equal(restored.value,'Role: BI-ANA, AI Engineer (AI-ENG)\nFTE needed: 12');
 }
});


test('planning helper cards show complete prompts while preserving editable template behavior',()=>{
 a.deepEqual(composerPromptHelpers.map(h=>h.label),[
  'Help me estimate the FTE needed to close a capacity gap.',
  'Compare staffing options for a role.',
  'What if we change staffing for a role?'
 ]);
 for(const helper of composerPromptHelpers){
  const {PromptTemplates,frames}=component();let value,selection,focused=0;
  const tree=PromptTemplates({value:'Keep this draft',onChange:v=>value=v,textareaRef:{current:{focus:()=>focused++,setSelectionRange:(...v)=>selection=v}},rows:4,workforce:null,datasetToken:'fixture'});
  const button=walk(tree).find(n=>n.type==='button'&&walk(n).some(child=>child.props?.children===helper.label));
  a.ok(button,helper.label);a.equal(button.props.type,'button');button.props.onClick();
  a.equal(value,'Keep this draft\n'+helper.text);a.equal(focused,0);frames[0]();a.equal(focused,1);
  a.equal(value.slice(...selection),helper.id==='need'?'':'[role]');
 }
});

test('helper cards share centered sizing and center an odd final card only on desktop',()=>{
 const {PromptTemplates}=component();
 const tree=PromptTemplates({value:'',onChange:()=>{},textareaRef:{current:null}});
 const group=walk(tree).find(node=>node.props?.role==='group');
 a.match(group.props.className,/\bgrid-cols-1\b/);
 a.match(group.props.className,/\bauto-rows-fr\b/);
 a.match(group.props.className,/\bsm:grid-cols-4\b/);
 const buttons=walk(group).filter(node=>node.type==='button');
 a.equal(new Set(buttons.map(button=>button.props.className)).size,1);
 for(const button of buttons){
  a.match(button.props.className,/\bitems-center\b/);
  a.match(button.props.className,/\btext-center\b/);
  a.match(button.props.className,/\bsm:col-span-2\b/);
  a.ok(button.props.className.includes('sm:[&:last-child:nth-child(odd)]:col-start-2'));
  a.doesNotMatch(button.props.className,/items-start|text-left/);
 }
});

 test('position template opens shared planner without editing or sending the chat draft',()=>{
  const {PromptTemplates}=component();let opened=0,edited=0;const tree=PromptTemplates({value:'Keep my question',onChange:()=>edited++,textareaRef:{current:null},onPlanFromPositions:()=>opened++});const buttons=walk(tree).filter(n=>n.type==='button');a.equal(buttons.length,4);buttons.at(-1).props.onClick();a.equal(opened,1);a.equal(edited,0);a.equal(buttons.at(-1).props.type,'button');a.match(renderToStaticMarkup(tree),/\[Template\] Plan staffing from positions/);
 });
