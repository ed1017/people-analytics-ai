import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as m from '../lib/synthetic-workforce-history.ts';
import certificate from '../lib/data/synthetic-workforce-history-v1.json' with {type:'json'};
import marginals from '../lib/data/company-position-marginals-v2.json' with {type:'json'};

const context={datasetToken:m.HISTORY_DATASET_TOKEN,bundleDigest:m.HISTORY_BUNDLE_DIGEST};
const query=patch=>m.queryWorkforceHistory({...m.defaultHistoryFilters(),...patch},context);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const small=n=>n>0&&n<10;
const checkHidden=result=>{assert.equal(result.status,'suppressed');assert.ok(Object.values(result.totals).every(v=>v===null));for(const key of ['ratings','sentiments','businessUnits','countries','levels'])assert.deepEqual(result[key],[]);};

test('versioned certificate pins fresh-process reproducibility and does not write old releases',()=>{
 const originals=['lib/data/company-position-marginals-v2.json','lib/data/position-inventory-constraints-v1.json','lib/workforce-performance.ts','lib/dataset-local-api.mjs'];
 const before=originals.map(path=>fs.readFileSync(new URL('../'+path,import.meta.url)));
 assert.equal(certificate.version,m.HISTORY_VERSION);assert.equal(certificate.seed,m.HISTORY_SEED);assert.equal(certificate.datasetToken,context.datasetToken);assert.equal(certificate.bundleDigest,context.bundleDigest);
 for(const p of certificate.periods)assert.equal(digest(m.generateSyntheticHistory(p.id)),p.recordDigest);
 const stdout=execFileSync(process.execPath,['--experimental-strip-types',new URL('./manual/generate-synthetic-workforce-history.mjs',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),'--check'],{encoding:'utf8'});
 assert.match(stdout,/"status":"verified"/);
 originals.forEach((path,i)=>assert.deepEqual(fs.readFileSync(new URL('../'+path,import.meta.url)),before[i]));
});

test('matched periods use current-company populations and exact valid respondent counts',()=>{
 assert.deepEqual(m.HISTORY_PERIODS.map(p=>[p.id,p.snapshotDate,p.surveyDate,p.population,p.respondents]),[
  ['2024','2024-12-31','2024-12-31',8636,6687],['2025','2025-12-31','2025-12-31',8831,6987],['2026','2026-09-30','2026-09-30',9037,7028],
 ]);
 const allIds=new Set();
 for(const p of certificate.periods){const rows=m.generateSyntheticHistory(p.id),r=query({period:p.id});
  assert.equal(rows.length,p.population);assert.equal(r.status,'available');assert.equal(r.totals.people,p.population);assert.equal(r.totals.respondents,p.respondents);
  assert.equal(rows.filter(x=>x.rating!==null).length,p.rated);assert.equal(r.totals.rated+r.totals.notRated,r.totals.people);assert.equal(r.totals.respondents+r.totals.nonrespondents,r.totals.people);
  assert.deepEqual(r.ratings.map(x=>x.count),p.ratings);assert.equal(r.ratings.reduce((n,x)=>n+x.count,0),p.rated);assert.equal(r.sentiments.reduce((n,x)=>n+x.count,0),p.respondents);
  for(const row of rows){assert.match(row.id,new RegExp('^HIST-'+p.id+'-'));assert.ok(!allIds.has(row.id));allIds.add(row.id);assert.ok(Object.isFrozen(row));assert.ok(Object.isFrozen(row.answers));
   assert.ok(row.rating===null||Number.isInteger(row.rating)&&row.rating>=1&&row.rating<=5);
   if(row.sentiment===null)assert.ok(row.answers.every(x=>x===null));else assert.ok(row.answers.filter(x=>x!==null).length>=2);
  }
 }
});

test('current modeled dimensions exactly reconcile while historical joint attributes remain generated',()=>{
 const rows=m.generateSyntheticHistory('2026');
 for(const b of marginals.business_units)assert.equal(rows.filter(p=>p.org===b.org_code).length,b.headcount);
 for(const c of marginals.countries)assert.equal(rows.filter(p=>p.country===c.country_code).length,c.headcount);
 for(const l of marginals.levels)assert.equal(rows.filter(p=>p.level===l.level_code).length,l.headcount);
 assert.deepEqual(m.HISTORY_OPTIONS.levels.map(l=>l.value),Array.from({length:11},(_,i)=>`L${i+1}`));
 assert.match(m.HISTORY_METHOD.population,/not employee or position identifiers/);
 assert.match(m.HISTORY_METHOD.protection,/not anonymization/);
 assert.match(m.HISTORY_METHOD.survey,/invalid respondents are not generated/);
});

test('reverse coding and answered-item denominator classify respondents without answer-share subtraction',()=>{
 assert.equal(m.classifyHistoryAnswers([1,1,5,null,null]),'unfavorable');
 assert.equal(m.classifyHistoryAnswers([5,5,1,null,null]),'favorable');
 assert.equal(m.classifyHistoryAnswers([3,3,3,null,null]),'neutral');
 assert.equal(m.classifyHistoryAnswers([2,2,null,null,null]),'unfavorable');
 assert.equal(m.classifyHistoryAnswers([4,4,null,null,null]),'favorable');
 assert.equal(m.classifyHistoryAnswers([1,null,null,null,null]),null);
 for(const values of [[0,1,2,3,4],[6,1,2,3,4],[1.5,1,2,3,4],[1,2]])assert.equal(m.classifyHistoryAnswers(values),null);
 assert.equal(query({}).sentiments.find(x=>x.id==='favorable').count,2405);
 assert.notEqual(query({}).sentiments.find(x=>x.id==='favorable').percent,40.4);
});

test('unfavorable filter selects same-period valid generated respondents and their ratings',()=>{
 for(const p of m.HISTORY_PERIODS){const rows=m.generateSyntheticHistory(p.id).filter(x=>x.sentiment==='unfavorable'),r=query({period:p.id,sentiment:'unfavorable'});
  assert.equal(r.status,'available');assert.equal(r.totals.people,rows.length);assert.equal(r.totals.respondents,rows.length);assert.equal(r.totals.nonrespondents,0);
  assert.deepEqual(r.ratings.map(c=>c.count),[1,2,3,4,5].map(n=>rows.filter(x=>x.rating===n).length));
  assert.equal(r.sentiments.find(x=>x.id==='neutral').count,0);assert.equal(r.sentiments.find(x=>x.id==='favorable').count,0);
 }
});

test('multiselect is deduplicated OR within dimensions and AND across dimensions',()=>{
 const patch={orgs:['BU-CLIENTOPS','BU-CONS'],countries:['US','GB'],levels:['L2','L3']},r=query(patch);
 const raw=m.generateSyntheticHistory('2026').filter(p=>patch.orgs.includes(p.org)&&patch.countries.includes(p.country)&&patch.levels.includes(p.level));
 assert.equal(r.status,'available');assert.equal(r.totals.people,166);assert.equal(r.totals.people,raw.length);assert.equal(r.totals.rated,152);assert.equal(r.totals.respondents,118);
 assert.deepEqual(query({...patch,orgs:['BU-CONS','BU-CLIENTOPS','BU-CONS'],countries:['GB','US','US'],levels:['L3','L2']}),r);
 assert.equal(query({orgs:['BU-CLIENTOPS','BU-CONS']}).totals.people,2278);
 assert.ok(Object.isFrozen(r.filters));assert.ok(Object.isFrozen(r.filters.orgs));
});

test('empty selection and genuine empty intersections stay known empty, not missing or suppressed',()=>{
 for(const key of ['orgs','countries','levels']){const r=query({[key]:[]});assert.equal(r.status,'empty');assert.ok(Object.values(r.totals).every(x=>x===0));assert.deepEqual(r.ratings,[]);}
 const rows=m.generateSyntheticHistory('2026'),missing=m.HISTORY_OPTIONS.orgs.flatMap(o=>m.HISTORY_OPTIONS.countries.map(c=>({orgs:[o.value],countries:[c.value],levels:['L11']}))).find(f=>!rows.some(p=>f.orgs.includes(p.org)&&f.countries.includes(p.country)&&p.level==='L11'));
 assert.ok(missing);assert.equal(query(missing).status,'empty');
});

test('small selected cohorts, their complements and linked nonresponse/not-rated differences are withheld',()=>{
 const raw=m.generateSyntheticHistory('2026');assert.equal(raw.filter(p=>p.level==='L11').length,4);
 checkHidden(query({levels:['L11']}));checkHidden(query({levels:m.HISTORY_OPTIONS.levels.map(l=>l.value).filter(l=>l!=='L11')}));
 const candidates=m.HISTORY_OPTIONS.orgs.flatMap(o=>m.HISTORY_OPTIONS.countries.map(c=>({orgs:[o.value],countries:[c.value]})));
 for(const f of candidates){const selected=raw.filter(p=>f.orgs.includes(p.org)&&f.countries.includes(p.country));const missingRated=selected.filter(p=>p.rating===null).length,missingResponses=selected.filter(p=>p.sentiment===null).length;
  if(selected.length>=10&&(small(missingRated)||small(missingResponses)))checkHidden(query(f));
 }
});

test('chart primary and complementary suppression never expose hidden counts or percentages',()=>{
 const r=query({orgs:['BU-CLIENTOPS'],countries:['AU']});assert.equal(r.status,'available');
 assert.equal(r.ratings.filter(x=>x.status==='suppressed').length,3);
 for(const cell of r.ratings.filter(x=>x.status==='suppressed')){assert.equal(cell.count,null);assert.equal(cell.percent,null);}
 const current=query({});for(const id of ['L10','L11'])assert.deepEqual({...current.levels.find(x=>x.id===id)},{id,label:id,count:null,percent:null,status:'suppressed'});
 for(const list of ['ratings','sentiments','businessUnits','countries','levels'])for(const cell of current[list])if(cell.status==='available')assert.ok(cell.count===0||cell.count>=10);
});

test('strict input/source validation prevents forged scopes, coercion, stale datasets and unsupported periods',()=>{
 for(const patch of [{period:'2023'},{period:2024},{period:['2024','2025']},{orgs:['all']},{levels:['L12']},{countries:['ZZ']},{orgs:'BU-TECH'},{countries:[1]},{sentiment:{toString:()=> 'all'}},{sentiment:'negative'},{extra:true}])assert.equal(query(patch).status,'invalid');
 for(const source of [null,undefined,{...context,datasetToken:'legacy'},{...context,bundleDigest:'0'.repeat(64)}]){const r=m.queryWorkforceHistory(m.defaultHistoryFilters(),source);assert.equal(r.status,'unavailable');assert.ok(Object.values(r.totals).every(x=>x===null));assert.deepEqual(r.ratings,[]);}
 const filters=m.defaultHistoryFilters(),before=structuredClone(filters);query(filters);assert.deepEqual(filters,before);assert.throws(()=>m.generateSyntheticHistory('2023'));
});

test('repeated year/filter transitions return the exact current query and do not mutate old results',()=>{
 const first=query({period:'2024'}),copy=structuredClone(first);for(const year of ['2025','2026','2024'])for(const sentiment of ['all','unfavorable','neutral','favorable'])query({period:year,sentiment});assert.deepEqual(first,copy);assert.deepEqual(query({period:'2024'}),first);
});
