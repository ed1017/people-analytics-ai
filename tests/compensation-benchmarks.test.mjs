import test from 'node:test';
import assert from 'node:assert/strict';
import wages from '../lib/data/compensation-oews-may2025.json' with {type:'json'};
import occupations from '../lib/data/compensation-onet31.json' with {type:'json'};
import existing from '../lib/data/bls-oews-may2025.json' with {type:'json'};
import {benchmarkAreas,benchmarkOccupations,compensationBenchmark,readOewsEstimate,formatOewsEstimate} from '../lib/compensation-benchmarks.ts';

test('all nine references preserve exact source percentiles and existing market values',()=>{
  assert.equal(wages.records.length,9);
  const keys=new Set();
  for(const occupation of benchmarkOccupations)for(const area of benchmarkAreas){
    const result=compensationBenchmark(occupation.onet_code,area.code);
    assert.ok(result);
    const source=wages.records.find(row=>row.OCC_CODE===occupation.soc_code&&row.AREA===area.code);
    const prior=existing.records.find(row=>row.OCC_CODE===source.OCC_CODE&&row.AREA===source.AREA);
    keys.add(source.AREA+source.OCC_CODE);
    for(const {field,estimate} of result.percentiles)assert.deepEqual(estimate,{status:'published',value:prior[field]});
    const values=result.percentiles.map(p=>p.estimate.value);
    assert.deepEqual(values,[...values].sort((a,b)=>a-b));
    assert.equal(result.employment.value,prior.TOT_EMP);
    assert.equal(result.employmentPrse.value,prior.EMP_PRSE);
    assert.equal(source.NAICS,'000000');assert.equal(source.OWN_CODE,'1235');assert.equal(source.O_GROUP,'detailed');
    assert.equal(source.I_GROUP,'cross-industry');
    assert.match(result.source.sha256,/^[a-f0-9]{64}$/);assert.ok(result.sourceRow>=2);
  }
  assert.equal(keys.size,9);
});

test('period, currency, ownership and vintage are explicit; source verification is not a live update',()=>{
  assert.equal(wages.period,'May 2025');assert.equal(wages.release_date,'2026-05-15');
  assert.equal(wages.verified_at,'2026-10-05');assert.equal(wages.currency,'USD');assert.equal(wages.wage_basis,'annual');
  assert.equal(occupations.database_version,'31.0');assert.equal(occupations.release_month,'August 2026');
  assert.equal(occupations.taxonomy,'O*NET-SOC 2019');assert.equal(occupations.target_taxonomy,'2018 SOC');
  assert.match(occupations.license,/creativecommons.org\/licenses\/by\/4.0/);
  assert.match(occupations.modifications,/condensed/);
});

test('only explicitly verified taxonomy pairs resolve, never arbitrary titles, suboccupations, areas or URLs',()=>{
  assert.deepEqual(benchmarkOccupations.map(row=>[row.onet_code,row.soc_code]),[['15-1252.00','15-1252'],['15-2051.00','15-2051'],['29-1141.00','29-1141']]);
  for(const code of ['', 'Software Engineer', 'Senior Data Scientist', '15-2051.01','29-1141.03','15-1252',null,{}])assert.equal(compensationBenchmark(code,'99'),null);
  for(const area of ['NYC','Australia','https://example.com','1',null,{}])assert.equal(compensationBenchmark('15-1252.00',area),null);
  assert.match(compensationBenchmark('15-2051.00','99').occupation.scope_note,/not specialty-specific/);
  assert.match(compensationBenchmark('29-1141.00','99').occupation.scope_note,/not specialty-specific/);
});

test('suppressed or absent estimates remain unavailable, not zero or interpolated',()=>{
  for(const value of [null,undefined,'',NaN,Infinity,-1,{},'unknown','120000']){
    assert.equal(readOewsEstimate(value,'annual_wage').status,'unavailable');
    assert.equal(formatOewsEstimate(readOewsEstimate(value,'annual_wage'),true),'Unavailable');
  }
  assert.equal(formatOewsEstimate(readOewsEstimate('*','annual_wage'),true),'Unavailable (*)');
  assert.equal(formatOewsEstimate(readOewsEstimate('**','employment')),'Unavailable (**)');
  assert.deepEqual(readOewsEstimate(0,'employment'),{status:'published',value:0});
  assert.equal(formatOewsEstimate(readOewsEstimate(0,'annual_wage'),true),'$0');
});

test('top-coded wages stay a lower bound, never an exact salary or an employment estimate',()=>{
  assert.deepEqual(readOewsEstimate('#','annual_wage'),{status:'top_coded',lowerBound:239200});
  assert.equal(formatOewsEstimate(readOewsEstimate('#','annual_wage'),true),'≥ $239,200');
  assert.equal(readOewsEstimate('#','employment').status,'unavailable');
  assert.equal(readOewsEstimate('#','prse').status,'unavailable');
});

test('all source URLs are static official sources and source hashes match existing workbook provenance',()=>{
  for(const source of wages.sources){
    assert.equal(new URL(source.url).hostname,'www.bls.gov');
    assert.equal(source.sha256,existing.original_workbooks.find(row=>row.name===source.name).sha256);
  }
  assert.equal(new URL(occupations.occupation_source).hostname,'www.onetcenter.org');
  assert.equal(new URL(occupations.crosswalk_source).hostname,'www.onetcenter.org');
});
