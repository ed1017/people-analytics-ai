import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import protocol from '../lib/simulation/career-demo-protocol.json' with {type:'json'};
import artifact from '../lib/data/synthetic-career-demo-v1.json' with {type:'json'};
import {aggregateSyntheticCareer,buildSyntheticCareerDemo,completedMonths,durationSummary,careerDemoPath} from '../lib/simulation/career-demo.mjs';
import {resolveSyntheticCareerDemo,selectSyntheticCareerCohort} from '../lib/synthetic-career-demo.ts';
const p={...protocol,years:[2025],levels:[protocol.levels[0]]};
function rows(department='engineering',n=30,year=2025){return Array.from({length:n},(_,i)=>({id:department+'-'+i,department,level:'L2',year,activeAtStart:true,employment:'salaried',hireDate:'2019-01-01',levelStart:'2023-01-01',eventCoverage:'complete',exitDate:null,promotionDate:i<10?year+'-07-01':null,promotionLevel:i<10?3:null,rating:i%5+1,ratingDate:year+'-06-01',rubric:p.rubric}));}
const metric=(source,config=p)=>aggregateSyntheticCareer(source,config)[0].periods[0];
test('rating and promotion denominators are distinct, explicit, and exclude missing ratings only from ratings',()=>{
 const source=rows();source.push(...rows('engineering',5).map((row,i)=>({...row,id:'missing-'+i,promotionDate:null,promotionLevel:null,rating:null})));
 const result=metric(source);assert.equal(result.status,'published');assert.deepEqual(result.metrics,{eligible:35,promoted:10,promotionRatePct:28.57,rated:30,missingRatings:5,meets:18,meetsPct:60,ratingCounts:[6,6,6,6,6],timeToPromotion:{n:10,median:30,q1:30,q3:30}});
});
test('cohort rate retains exits while late entrants and incomplete or invalid annual inputs are excluded',()=>{
 const source=rows();source[29].exitDate='2025-08-31';
 for(const [i,edit] of [{activeAtStart:false},{employment:'contractor'},{hireDate:'2025-02-01'},{levelStart:'2024-08-01'},{eventCoverage:'unknown'},{promotionDate:'2026-01-01'},{promotionLevel:2},{exitDate:'2025-03-01'},{levelStart:'2025-02-30'},{hireDate:'2024-01-01'}].entries())source.push({...rows()[0],id:'excluded-'+i,...edit});
 assert.equal(metric(source).metrics.eligible,30);assert.equal(metric(source).metrics.promoted,10);
});
test('wrong rubric, out-of-range, noninteger, missing and after-exit ratings do not become zero',()=>{
 const source=rows();for(const [i,edit] of [{rubric:'other'},{rating:6},{rating:2.5},{rating:null},{exitDate:'2025-02-01'}].entries())source.push({...rows()[10],id:'unrated-'+i,...edit});
 const result=metric(source);assert.equal(result.metrics.rated,30);assert.equal(result.metrics.eligible,35);assert.equal(result.metrics.missingRatings,5);assert.deepEqual(result.metrics.ratingCounts,[6,6,6,6,6]);
});
test('zero promotions and absent ratings remain zero and unknown respectively, never invented time',()=>{
 const result=metric(rows().map(row=>({...row,rating:null,promotionDate:null,promotionLevel:null}))).metrics;
 assert.equal(result.promotionRatePct,0);assert.equal(result.promoted,0);assert.equal(result.timeToPromotion,null);assert.equal(result.meetsPct,null);assert.equal(result.ratingCounts,null);assert.equal(result.rated,0);
});
test('observed promotion duration uses completed calendar months and interpolated quartiles without censoring claims',()=>{
 assert.equal(completedMonths('2023-01-31','2025-01-30'),23);assert.equal(completedMonths('2024-02-29','2025-02-28'),11);assert.equal(completedMonths('2023-01-01','2025-07-01'),30);
 assert.deepEqual(durationSummary([12,18,24,30,36,48]),{n:6,median:27,q1:19.5,q3:34.5});assert.throws(()=>durationSummary([12,18,24,30]));assert.throws(()=>completedMonths('2025-02-30','2025-03-01'));assert.throws(()=>completedMonths('2025-01-01','2024-12-01'));
});
test('all sensitive small groups withhold the entire cell, including complementary promoted/nonpromoted groups',()=>{
 for(const source of [rows().slice(0,4),rows().map((row,i)=>({...row,promotionDate:i<4?'2025-07-01':null,promotionLevel:i<4?3:null})),rows().map((row,i)=>({...row,promotionDate:i<26?'2025-07-01':null,promotionLevel:i<26?3:null})),rows().map((row,i)=>({...row,rating:i<4?null:row.rating})),rows().map((row,i)=>({...row,rating:i<4?row.rating:null})),rows().map((row,i)=>({...row,rating:i===0?1:3}))])assert.deepEqual(metric(source),{year:2025,status:'suppressed',metrics:null});
});
test('complementary cells stay fixed across years and cannot be recovered with UI year changes',()=>{
 const config={...p,years:[2024,2025]},source=config.years.flatMap(year=>[...rows('engineering',year===2024?4:30,year),...rows('operations',35,year),...rows('commercial',40,year)]);
 const cells=aggregateSyntheticCareer(source,config);for(const cell of cells.slice(0,2))assert(cell.periods.every(period=>period.status==='suppressed'&&period.metrics===null));assert(cells[2].periods.every(period=>period.status==='published'));assert(!('total' in cells));
});
test('duplicate identities and unknown population dimensions fail rather than double count',()=>{
 assert.throws(()=>aggregateSyntheticCareer([...rows(),rows()[0]],p),/Unique/);assert.throws(()=>aggregateSyntheticCareer([{...rows()[0],department:'unknown'}],p),/Unknown/);assert.throws(()=>aggregateSyntheticCareer([{...rows()[0],year:2026}],p),/Unknown/);
});
test('artifact is deterministic, aggregate only, and the consumer rejects unverified values',async()=>{
 assert.equal(JSON.stringify(await buildSyntheticCareerDemo(),null,2)+'\n',await readFile(careerDemoPath,'utf8'));assert.deepEqual(await buildSyntheticCareerDemo(),artifact);assert.equal(artifact.cohorts.length,9);assert.equal(artifact.cohorts.filter(cell=>cell.periods.every(p=>p.status==='published')).length,7);
 assert.equal(artifact.evidence.rowRecordsPublished,false);assert.equal(artifact.evidence.overallTotalsPublished,false);assert(!/"(hireDate|ratingDate|promotionDate|levelStart|employee_id)"/.test(JSON.stringify(artifact)));
 assert.equal(resolveSyntheticCareerDemo().status,'ready');assert.equal(resolveSyntheticCareerDemo(null).status,'unavailable');const changed=structuredClone(artifact);changed.cohorts[0].periods[0].metrics.promotionRatePct=99;assert.equal(resolveSyntheticCareerDemo(changed).status,'unavailable');assert.equal(selectSyntheticCareerCohort(artifact,'All','L2'),null);
});
