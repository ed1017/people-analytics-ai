import test from 'node:test';
import assert from 'node:assert/strict';
import { marketComparisons, marketCarryEvidence, marketEvidence, oewsAreas, oewsOccupations } from '../lib/oews-reference.mjs';
import { nationalOutlookComparisons, nationalOutlookEvidence, outlookProvenance } from '../lib/labor-outlook.mjs';
import wages from '../lib/data/compensation-oews-may2025.json' with { type: 'json' };

test('every comparison holds period, industry and one dimension constant across the bounded extract', () => {
  for (const occupation of oewsOccupations) for (const area of oewsAreas) {
    const comparisons = marketComparisons({ soc: occupation.value, area: area.value });
    assert.equal(comparisons.occupations.length, 3);
    assert.equal(comparisons.locations.length, 3);
    for (const evidence of [...comparisons.occupations, ...comparisons.locations]) {
      assert.equal(evidence.period, 'May 2025');
      assert.equal(evidence.releaseDate, '2026-05-15');
      assert.equal(evidence.industryScope, 'All industries');
      assert.equal(evidence.currency, 'USD');
      assert.equal(evidence.national.OCC_CODE, evidence.selected.OCC_CODE);
    }
    assert.ok(comparisons.occupations.every(evidence => evidence.selected.AREA === area.value));
    assert.ok(comparisons.locations.every(evidence => evidence.selected.OCC_CODE === occupation.value));
  }
});

test('comparison wages and employment match the independently re-extracted workbook cells', () => {
  for (const published of wages.records) {
    const evidence = marketEvidence({ soc: published.OCC_CODE, area: published.AREA });
    for (const field of ['TOT_EMP', 'EMP_PRSE', 'A_PCT10', 'A_PCT25', 'A_MEDIAN', 'A_PCT75', 'A_PCT90']) {
      assert.equal(evidence.selected[field], published[field], `${published.OCC_CODE}/${published.AREA}/${field}`);
    }
    const workbook = wages.sources.find(source => source.name === published.source_workbook);
    assert.equal(evidence.sourceUrl, workbook.url);
  }
});

test('unknown or mismatched occupation and location never broaden into another market', () => {
  for (const selection of [null, undefined, {}, [], { soc: '15-1252.00', area: '99' }, { soc: '15-1252', area: 'NYC' }, { soc: 'executive', area: '36' }]) {
    assert.equal(marketComparisons(selection), null);
  }
});

test('outlook preserves the detailed occupation rows from BLS table 1.2', () => {
  const published = [
    ['15-1252', 1717.8, 1892.6, 174.7, 10.2, 95.3],
    ['15-2051', 275.6, 371.0, 95.4, 34.6, 24.8],
    ['29-1141', 3465.4, 3660.1, 194.7, 5.6, 180.8],
  ];
  for (const [soc, base, projected, change, growth, openings] of published) {
    const evidence = nationalOutlookEvidence(soc);
    assert.equal(evidence.selected.occupation_type, 'Line item');
    assert.deepEqual([
      evidence.selected.employment_base_thousands, evidence.selected.employment_projected_thousands,
      evidence.selected.employment_change_thousands, evidence.selected.employment_change_percent,
      evidence.selected.annual_openings_thousands,
    ], [base, projected, change, growth, openings]);
  }
  // The published change differs from subtraction of rounded endpoints.
  const software = nationalOutlookEvidence('15-1252').selected;
  assert.notEqual(software.employment_change_thousands, Math.round((software.employment_projected_thousands - software.employment_base_thousands) * 10) / 10);
});

test('outlook has explicit national scope, period, units and a distinct population', () => {
  assert.equal(outlookProvenance.period, '2025–2035');
  assert.equal(outlookProvenance.releaseDate, '2026-08-27');
  assert.equal(outlookProvenance.geography, 'United States');
  assert.equal(outlookProvenance.employmentUnit, 'thousands of jobs');
  assert.match(outlookProvenance.openingsUnit, /thousands of openings per year/);
  assert.match(outlookProvenance.population, /including self-employment/);
  for (const outlook of nationalOutlookComparisons()) {
    assert.match(outlook.limitations, /not a state or metro forecast/);
    assert.match(outlook.limitations, /not annual growth/);
    assert.match(outlook.limitations, /not only new jobs/);
    assert.match(outlook.limitations, /do not join/);
    assert.notEqual(outlook.selected.employment_base_thousands * 1000, marketEvidence({ soc: outlook.selected.soc, area: '99' }).selected.TOT_EMP);
    assert.equal(new URL(outlook.sourceUrl).hostname, 'www.bls.gov');
  }
});

test('outlook accepts exact reviewed codes only and cannot consume caller-supplied forecasts', () => {
  for (const input of [null, {}, [], 151252, '15-1252.00', 'Software developers', '15-1250', '11-1011', { soc: '15-1252', employment_change_percent: 999 }]) {
    assert.equal(nationalOutlookEvidence(input), null);
  }
  const evidence = nationalOutlookEvidence('15-1252');
  evidence.selected.employment_change_percent = 999;
  assert.equal(nationalOutlookEvidence('15-1252').selected.employment_change_percent, 10.2);
  assert.equal(nationalOutlookComparisons().length, 3);
});

test('market carry remains the selected canonical wage snapshot and never carries projected growth', () => {
  const carry = marketCarryEvidence({ soc: '15-1252', area: '35620', goal: 'Develop capability', nationalOutlook: nationalOutlookEvidence('15-1252'), A_MEDIAN: 1 });
  assert.equal(carry.selected.A_MEDIAN, 166830);
  assert.equal(carry.selected.TOT_EMP, 121000);
  assert.equal(carry.period, 'May 2025');
  assert.equal(carry.medianDifferencePct, 22.7);
  assert.equal(carry.nationalOutlook, undefined);
  assert.equal(carry.selected.employment_change_percent, undefined);
  assert.match(carry.planningStatus, /no model assumption/);
});
