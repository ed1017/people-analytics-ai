import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
const require=createRequire(import.meta.url);
function load(file,modules={}){
 const exports={};const source=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,require:name=>Object.hasOwn(modules,name)?modules[name]:require(name)});return exports;
}
function nodes(tree){const out=[];function walk(n){if(!n||typeof n!=='object')return;if(typeof n.type==='function'){walk(n.type(n.props));return;}out.push(n);React.Children.forEach(n.props?.children,walk);}walk(tree);return out;}
function text(tree){if(typeof tree==='string'||typeof tree==='number')return String(tree);if(!tree)return '';if(Array.isArray(tree))return tree.map(text).join(' ');if(typeof tree.type==='function')return text(tree.type(tree.props));return text(tree.props?.children);}
const study=load('../components/project-case-study.tsx');
test('About exposes the case study while the shared header variant remains collapsed',()=>{
 const visible=study.ProjectCaseStudy({expanded:true});assert.equal(visible.type,'section');assert.equal(visible.props['aria-labelledby'],'about-case-study');
 const sections=nodes(visible).filter(n=>n.type==='h3').map(n=>text(n));assert.ok(sections.includes('Product and domain decisions'));assert.ok(sections.includes("Ed's role"));assert.ok(sections.includes('Try the workflow'));
 const menu=study.ProjectCaseStudy();assert.equal(menu.type,'details');assert.equal(menu.props.open,undefined);assert.equal(nodes(menu)[1].type,'summary');
 assert.match(text(visible),/AI assisted with implementation, design and testing/);assert.match(text(visible),/Missing values remain unknown/);
});
test('About includes verified public destinations without unverified resume links',()=>{
 const page=load('../app/about/page.tsx',{'next/link':{default:props=>React.createElement('a',props)},'@/components/project-case-study':study}).default();
 const all=nodes(page),links=all.filter(n=>n.type==='a');assert.deepEqual(links.map(n=>n.props.href),['/','mailto:edwinom.nyc@gmail.com','https://www.linkedin.com/in/ed-om-62a57818','https://github.com/ed1017/people-analytics-ai']);
 for(const link of links.filter(n=>n.props.target==='_blank')){assert.match(link.props.rel,/noopener/);assert.match(link.props.rel,/noreferrer/);assert.match(text(link),/opens a new tab/);}
 assert.equal(all.filter(n=>n.type==='h1').length,1);assert.ok(all.some(n=>n.type==='h2'&&n.props.id==='about-case-study'));assert.doesNotMatch(text(page),/resume|résumé|not verified business outcomes|does not approve/i);
});
