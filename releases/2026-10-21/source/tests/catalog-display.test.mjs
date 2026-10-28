import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as labels from '../lib/catalog-display.ts';
import * as display from '../lib/display-format.ts';
import * as findings from '../lib/key-findings.ts';
import * as contracts from '../lib/legacy-source-contracts.ts';
import * as period from '../lib/evidence-period-label.ts';
import {PUBLIC_9037} from '../lib/public-9037-contract.mjs';
const require=createRequire(import.meta.url);
function component(file,extra={}){const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:id=>id==='@/lib/catalog-display'?labels:extra[id]??require(id)});return exports;}
test('catalog prefix is display-only and non-prefix names stay intact',()=>{for(const [raw,shown]of [['Demo AI-ARCH','AI Architect'],['Demo AI-ENG','AI Engineer'],['Demo BI-ANA','Business Intelligence Analyst'],['Demo BI-DEV','Business Intelligence Developer'],['Demo level 11','level 11'],['Demo BU-DATAAI','Data & AI'],['Demography Lead','Demography Lead'],['Product Demo Lead','Product Demo Lead'],['Demo','Demo']])assert.equal(labels.catalogDisplayLabel(raw),shown);});
const countries={IN:'India',CA:'Canada',JP:'Japan',AU:'Australia',SG:'Singapore',BR:'Brazil',GB:'United Kingdom',US:'United States',DE:'Germany',FR:'France'};
test('country codes have recognizable display names and unknown labels are retained',()=>{for(const[code,name]of Object.entries(countries))assert.equal(labels.countryDisplayLabel('Demo '+code,code),name);assert.equal(labels.countryDisplayLabel('Ireland','IE'),'Ireland');assert.equal(labels.countryDisplayLabel('Demo XY','XY'),'XY');});
test('shared filter text and titles change while option values and input records stay exact',()=>{const {GlobalWorkforceFilters}=component('global-workforce-filters.tsx',{'@/components/use-phone-layout':{usePhoneLayout:()=>false}});const options={countries:[{value:'IN',label:'Demo IN'}],business_units:[{value:'BU-DATAAI',label:'Demo BU-DATAAI'}],levels:[{value:'L11',label:'Demo level 11'}]},before=JSON.stringify(options);const html=renderToStaticMarkup(React.createElement(GlobalWorkforceFilters,{page:'workforce',options,country:'IN',org:'BU-DATAAI',level:'L11',loading:false,onCountry:()=>{},onOrg:()=>{},onLevel:()=>{},onReset:()=>{}}));assert.match(html,/value="IN" selected="">India<\/option>/);assert.match(html,/title="India"/);assert.match(html,/value="L11" selected="">level 11<\/option>/);assert.match(html,/value="BU-DATAAI" selected="">Data &amp; AI<\/option>/);assert.doesNotMatch(html,/Demo /);assert.equal(JSON.stringify(options),before);});
test('Geographic Footprint shows all ten names without changing counts or source records',()=>{const {WorkforcePage}=component('pages/workforce-page.tsx',{'@/lib/evidence-period-label':period,'@/components/key-findings':component('key-findings.tsx'),'@/lib/key-findings':findings,'@/components/evidence-table-region':{EvidenceTableRegion:({children})=>React.createElement('div',null,children)},'@/lib/display-format':display,'@/lib/legacy-source-contracts':contracts,'@/lib/public-9037-contract.mjs':{PUBLIC_9037}});const data={as_of:'2026-09-30',summary:{headcount:10,fte:10,people_managers:1,avg_span_of_control:9,avg_tenure_years:2,full_time_headcount:10,hybrid_headcount:10,remote_headcount:0},trend:[],business_units:[],levels:[],movements:[],countries:Object.keys(countries).map(country_code=>({country_code,country_name:'Demo '+country_code,headcount:1,avg_tenure_years:2}))},before=JSON.stringify(data);const html=renderToStaticMarkup(React.createElement(WorkforcePage,{data,loading:false,error:null}));for(const name of Object.values(countries))assert.ok(html.includes(name),name);assert.doesNotMatch(html,/Demo (?:IN|CA|JP|AU|SG|BR|GB|US|DE|FR)/);assert.equal(JSON.stringify(data),before);});

test('fictional BU names are complete, reversible by stable codes and never source aliases',()=>{
 const expected={'BU-CLIENTOPS':'Client Operations','BU-CONS':'Consulting','BU-CORP':'Corporate Services','BU-DATAAI':'Data & AI','BU-DIGITAL':'Digital Services','BU-MGSVC':'Managed Services','BU-SALES':'Sales','BU-TECH':'Technology'};
 assert.deepEqual(labels.demoBusinessUnitNames,expected);
 for(const [code,name]of Object.entries(expected)){assert.equal(labels.catalogDisplayLabel(code),name);assert.equal(labels.catalogDisplayLabel('Demo '+code),name);assert.equal(labels.catalogSourceLabel('Demo '+code),code);}
 for(const raw of ['BU-UNKNOWN','Demo BU-UNKNOWN','toString','constructor'])assert.equal(labels.catalogDisplayLabel(raw),raw.replace(/^Demo /,''));
 const exports={},code=ts.transpileModule(fs.readFileSync(new URL('../lib/composer-catalog.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>id==='./catalog-display'?labels:{PUBLIC_9037}});
 const input={as_of:PUBLIC_9037.cutoff,data_meta:{...PUBLIC_9037,datasetId:PUBLIC_9037.datasetId,dataClass:'constructed-synthetic',datasetToken:PUBLIC_9037.token,contract:PUBLIC_9037.contract,cutoff:PUBLIC_9037.cutoff,publicationApproved:true,bundleDigest:'a'.repeat(64)},business_units:Object.keys(expected).map(org_code=>({org_code,org_name:'Demo '+org_code}))};
 const before=JSON.stringify(input),options=exports.composerCatalogOptions('business unit',input,null,PUBLIC_9037.token);assert.equal(options.length,8);
 for(const name of ['Data & AI','Corporate Services']){const option=exports.filterComposerOptions(options,name)[0],value='Business unit: \nBudget: 0',match=exports.composerCatalogMatch(value,15),inserted=exports.insertComposerOption(value,match,option);assert.equal(inserted.value,`Business unit: ${name} (${option.code})\nBudget: 0`);}
 assert.equal(JSON.stringify(input),before);
});
import {AGGREGATE_ROW_SCHEMAS} from '../lib/dataset-aggregate-row-schema.mjs';
test('all governed demo roles have unique readable display names and exact code round trips',()=>{
 const codes=[...new Set(Object.values(AGGREGATE_ROW_SCHEMAS).flatMap(row=>row.job_profile_code?.enum??[]))].sort();
 assert.equal(codes.length,50);assert.deepEqual(Object.keys(labels.demoRoleNames).sort(),codes);
 assert.equal(new Set(Object.values(labels.demoRoleNames)).size,50);
 for(const [code,name]of Object.entries(labels.demoRoleNames)){
  assert.equal(labels.catalogDisplayLabel('Demo '+code),name);assert.equal(labels.catalogSourceLabel('Demo '+code),code);
  for(const input of [code,name,`${name} (${code})`])assert.equal(labels.catalogRoleCode(input),code);
  assert.equal(labels.catalogRoleCode(`Not approved (${code})`),null);
  assert.equal(labels.catalogProseDisplay(`${name} (${code})`),name);
 }
 assert.equal(labels.catalogDisplayLabel('NEW-ROLE'),'NEW-ROLE');assert.equal(labels.catalogProseDisplay('X-AI-ENG-Y'),'X-AI-ENG-Y');
 assert.equal(labels.catalogProseDisplay('Client Operations (BU-CLIENTOPS)'), 'Client Operations');
 assert.equal(labels.catalogProseDisplay('AI-ENG and BI-ANA; BI-DEV'), 'AI Engineer and Business Intelligence Analyst; Business Intelligence Developer');
});
test('readable multi-role template retains allocation clarification and budget semantics',async()=>{
 const {staffingStarterIntake}=await import('../lib/home-staffing-intake.ts');const {confirmsBudgetAmount}=await import('../lib/hiring-budget-authority.ts');
 const role='AI Engineer (AI-ENG), Business Intelligence Analyst (BI-ANA), Business Intelligence Developer (BI-DEV)';
 const text=`Description:\nFTE needed: 12\nBudget (optional): $2M\nRole: ${role}\nBusiness unit: Client Operations (BU-CLIENTOPS)\nLevel: L2\nLocation:\nNeeded by:`;
 const req={message:{text},state:{}};const before=structuredClone(req),reply=staffingStarterIntake(req);
 assert.ok(reply);assert.match(reply.answer,/total 12 FTE/);assert.match(reply.answer,/AI Engineer, Business Intelligence Analyst, Business Intelligence Developer/);assert.deepEqual(req,before);
 assert.equal(confirmsBudgetAmount(text,2000000),true);assert.equal(confirmsBudgetAmount(text.replace('AI Engineer (AI-ENG)','Not approved (AI-ENG)'),2000000),false);
});

test('canonical label plus its demo code collapses without merging different entities or qualifications',()=>{
 for(const [code,name] of Object.entries({...labels.demoBusinessUnitNames,...labels.demoRoleNames})){
  assert.equal(labels.catalogProseDisplay(`${name} (Demo ${code})`),name);
  assert.equal(labels.catalogProseDisplay(`${name} (${code})`),name);
  assert.equal(labels.catalogProseDisplay(`${name} (provisional)`),`${name} (provisional)`);
 }
 assert.equal(labels.catalogProseDisplay('Managed Services (Demo BU-MGSVC) has 13.6% voluntary turnover YTD.'),'Managed Services has 13.6% voluntary turnover YTD.');
 assert.equal(labels.catalogProseDisplay('Managed Services (Demo BU-CONS)'),'Managed Services (Consulting)');
 assert.equal(labels.catalogProseDisplay('Managed Services (Demo BU-UNKNOWN)'),'Managed Services (Demo BU-UNKNOWN)');
 assert.equal(labels.catalogProseDisplay('Managed Services (Demo BU-MGSVC; provisional)'),'Managed Services (Managed Services; provisional)');
});
