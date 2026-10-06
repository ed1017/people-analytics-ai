// Offline constructed-synthetic aggregate adapter. No individual employment scores.
import assert from 'node:assert/strict';
import {assertSnapshot} from './boundary.mjs';
import {dayAdd, firstDay, monthAdd, DAY} from '../synthetic-workforce/common.mjs';
import {fitHiringCohorts, predictHiringCohorts, scoreHiringCohorts} from '../hiring-cohort-model.mjs';

const methods = ['pooled-fraction', 'recent-3-fraction', 'logistic-trend'];
const timestamp = x => typeof x === 'string' && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
const count = x => Number.isSafeInteger(x) && x >= 0 && x <= 10000000;
const keys = (value, expected) => assert(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(','), 'Unexpected hiring fields');
const envelope = {interval:null, operationallyQualified:false};
const blocked = (reason, audit, scoring=false) => ({status:'blocked', reasons:[reason], ...(scoring ? {metrics:null} : {predictions:[]}), audit, ...envelope});

function rowsFrom(snapshot) {
  assertSnapshot(snapshot, 'hiring');
  const rows = new Map();
  for (const row of snapshot.records) {
    const v = row.value;
    keys(v, ['month','openingCount','dispositions','actualStartEvents','plannedStartEvents','followupDays','horizonDays','horizonMature','horizonLabelsComplete','knownOutcomeThrough','maximumReportingLagDays','rightCensoredCount','correction']);
    assert(/^\d{4}-(0[1-9]|1[0-2])$/.test(v.month) && row.effectiveAt === firstDay(v.month));
    assert.equal(row.recordKey, `hiring:${v.month}`);
    assert(!rows.has(v.month), 'One selected revision per cohort required');
    assert.equal(v.horizonDays, 90);
    // These are the frozen generator's declared reporting bounds, not estimated lags.
    assert([3,39].includes(v.maximumReportingLagDays));
    assert.equal(v.followupDays, Math.floor((Date.parse(row.simulatedAvailableAt)-Date.parse(row.effectiveAt))/DAY));
    assert.equal(typeof v.horizonMature, 'boolean');
    assert.equal(typeof v.horizonLabelsComplete, 'boolean');
    assert.equal(typeof v.correction, 'boolean');
    if (row.status !== 'complete') {
      for (const field of ['openingCount','dispositions','actualStartEvents','plannedStartEvents','rightCensoredCount','knownOutcomeThrough']) assert.equal(v[field], null);
      assert.equal(v.horizonLabelsComplete, false);
    } else {
      assert(count(v.openingCount));
      keys(v.dispositions, ['open','accepted','started','cancelled','noShow']);
      assert(Object.values(v.dispositions).every(count));
      assert.equal(Object.values(v.dispositions).reduce((a,b)=>a+b,0), v.openingCount);
      assert.equal(v.rightCensoredCount, v.dispositions.open + v.dispositions.accepted);
      assert(Array.isArray(v.actualStartEvents) && Array.isArray(v.plannedStartEvents));
      const dates = new Set();
      for (const event of v.actualStartEvents) {
        keys(event, ['at','count']);
        assert(timestamp(event.at) && event.at >= row.effectiveAt && event.at <= row.simulatedAvailableAt && count(event.count));
        assert(!dates.has(event.at), 'Actual starts must be aggregated by date'); dates.add(event.at);
      }
      assert.equal(v.actualStartEvents.reduce((sum,e)=>sum+e.count,0), v.dispositions.started);
      for (const event of v.plannedStartEvents) {
        keys(event, ['at','count','acceptedAt']);
        assert(timestamp(event.at) && timestamp(event.acceptedAt) && event.acceptedAt >= row.effectiveAt && event.acceptedAt <= row.simulatedAvailableAt && event.at >= event.acceptedAt && count(event.count));
      }
      assert(timestamp(v.knownOutcomeThrough) && v.knownOutcomeThrough <= row.simulatedAvailableAt);
      assert.equal(v.knownOutcomeThrough, dayAdd(row.simulatedAvailableAt, -v.maximumReportingLagDays));
      assert.equal(v.horizonMature, v.followupDays >= 90);
      // A false completion declaration is permitted and must abstain when due.
      if (v.horizonLabelsComplete) assert(v.horizonMature && v.knownOutcomeThrough >= dayAdd(row.effectiveAt,90));
    }
    rows.set(v.month, row);
  }
  return rows;
}
function mature(row) {
  return row.status === 'complete' && row.value.horizonMature && row.value.horizonLabelsComplete && row.value.knownOutcomeThrough >= dayAdd(row.effectiveAt,90);
}
function cohort(row) {
  return {month:row.value.month, openings:row.value.openingCount,
    started:row.value.actualStartEvents.filter(e=>e.at<=dayAdd(row.effectiveAt,90)).reduce((sum,e)=>sum+e.count,0)};
}
function checkMonths(months, after=null) {
  assert(Array.isArray(months) && months.length > 0 && months.length <= 12, 'One to twelve future months required');
  months.forEach((month,i)=>assert(typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && (!after || month>after) && (!i || month>months[i-1]), 'Unique chronological future months required'));
}

/** Estimate fraction of future openings starting within 90 days, without future opening counts. */
export function forecastHiring(snapshot, months) {
  const rows = rowsFrom(snapshot);
  checkMonths(months, snapshot.cutoff.slice(0,7));
  const ordered = [...rows.values()].sort((a,b)=>a.effectiveAt.localeCompare(b.effectiveAt));
  const due = ordered.filter(row=>dayAdd(row.effectiveAt,90+row.value.maximumReportingLagDays)<=snapshot.cutoff);
  const audit = {cutoff:snapshot.cutoff, target:'fraction-of-all-openings-started-within-90-days', trainingCalendarMonths:36,
    trainingStart:null, trainingEnd:null, positiveCohorts:0, zeroOpeningMonths:[], excludedImmatureMonths:ordered.filter(r=>!due.includes(r)).map(r=>r.value.month),
    selectedRevisions:[], denominator:'all-openings-including-cancelled-no-show-and-unresolved', recentBaseline:'last-three-positive-exposure-cohorts'};
  if (!due.length) return blocked('insufficient-mature-history',audit);
  const end = due.at(-1).value.month, start = monthAdd(end,-35);
  audit.trainingStart=start; audit.trainingEnd=end;
  // Include the as-of tail so a missing due cohort cannot silently move the anchor back.
  for (let month=start; month<=snapshot.cutoff.slice(0,7); month=monthAdd(month,1)) {
    if (!rows.has(month)) return blocked('missing-calendar-cohort', {...audit, missingMonth:month});
  }
  const selected = Array.from({length:36},(_,i)=>rows.get(monthAdd(start,i)));
  for (const row of selected) if (!mature(row)) return blocked('incomplete-horizon-labels', {...audit, incompleteMonth:row.value.month});
  const all = selected.map(cohort), positive = all.filter(row=>row.openings>0);
  audit.zeroOpeningMonths=all.filter(row=>row.openings===0).map(row=>row.month);
  audit.positiveCohorts=positive.length;
  audit.trainingOpenings=positive.reduce((sum,row)=>sum+row.openings,0);
  audit.selectedRevisions=selected.map(row=>({month:row.value.month,revision:row.revision,simulatedAvailableAt:row.simulatedAvailableAt,knownOutcomeThrough:row.value.knownOutcomeThrough}));
  if (positive.length<24) return blocked('insufficient-positive-cohorts',audit);
  const model=fitHiringCohorts(positive);
  return {status:'predicted', reasons:[], predictions:predictHiringCohorts(model,months), audit:{...audit,model}, ...envelope};
}

/** Score only complete 90-day labels at the scoring cutoff; zero cohorts have no likelihood. */
export function scoreHiring(snapshot, predictions) {
  const rows=rowsFrom(snapshot);
  assert(Array.isArray(predictions));
  checkMonths(predictions.map(row=>row.month));
  for (const row of predictions) {
    keys(row,['month',...methods]);
    for (const method of methods) assert(Number.isFinite(row[method]) && row[method]>0 && row[method]<1, 'Interior probabilities required');
  }
  const audit={cutoff:snapshot.cutoff, targetMonths:predictions.map(row=>row.month), zeroOpeningMonths:[], scoredCohorts:0, scoredOpenings:0, selectedRevisions:[]};
  const actual=[];
  for (const prediction of predictions) {
    const row=rows.get(prediction.month);
    if (!row) return blocked('missing-target-cohort',audit,true);
    if (!mature(row)) return blocked('incomplete-target-horizon-labels',audit,true);
    actual.push(cohort(row));
    audit.selectedRevisions.push({month:prediction.month,revision:row.revision,simulatedAvailableAt:row.simulatedAvailableAt,knownOutcomeThrough:row.value.knownOutcomeThrough});
  }
  audit.zeroOpeningMonths=actual.filter(row=>row.openings===0).map(row=>row.month);
  const positive=actual.filter(row=>row.openings>0);
  audit.scoredCohorts=positive.length; audit.scoredOpenings=positive.reduce((sum,row)=>sum+row.openings,0);
  if (!positive.length) return blocked('zero-target-exposure',audit,true);
  const positiveMonths=new Set(positive.map(row=>row.month));
  return {status:'scored', reasons:[], metrics:scoreHiringCohorts(positive,predictions.filter(row=>positiveMonths.has(row.month))),audit,...envelope};
}
