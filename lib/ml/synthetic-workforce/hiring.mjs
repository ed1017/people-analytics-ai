import {rng, integer, monthsFor, firstDay, dayAdd, release, DAY} from './common.mjs';

/** New aggregate experiment; dates below are simulated, never source observations. */
export function generateHiring(config, {seed, family}) {
  if (!config.seeds.includes(seed) || !config.families.includes(family)) throw Error('Unfrozen hiring scenario');
  const random = rng(seed, `hiring:${family}`);
  const truth = [], releases = [], coverage = [], starts = new Map();
  for (const [index, month] of monthsFor(config).entries()) {
    const openedAt = firstDay(month), recordKey = `hiring:${month}`;
    // Fixed, label-independent true-zero schedule; other cohorts retain unresolved openings.
    const openingCount = index % 24 === 10 ? 0 : integer(random, 110, 160);
    const counts = openingCount ? [0, 0, integer(random, 6, 12), integer(random, 5, 10), integer(random, 2, 5), integer(random, 2, 4), integer(random, 2, 4)] : [0,0,0,0,0,0,0];
    counts[0] = openingCount ? integer(random, 15, 25) : 0;
    counts[1] = openingCount - counts.reduce((sum,n) => sum+n,0);
    const improvement = family === 'gradual-improvement' ? Math.floor(index/12)*2 : 0;
    const reversal = family === 'regime-reversal' && month >= config.regimeChangeMonth ? 65 : 0;
    const stress = family === 'reporting-stress';
    const lag = stress ? integer(random, 5, 18) : integer(random, 1, 3);
    const maximumReportingLagDays = stress ? 39 : 3;
    const templates = [
      {kind:'quick-start', accepted:5, planned:18, actual:20},
      {kind:'standard-start', accepted:15, planned:40-improvement+reversal, actual:45-improvement+reversal},
      {kind:'late-start', accepted:25, planned:100, actual:115+reversal},
      {kind:'cancelled', cancelled:integer(random, 12, 25)},
      {kind:'no-show', accepted:12, planned:35, noShow:36},
      {kind:'open'},
      {kind:'accepted-unresolved', accepted:30, planned:70},
    ];
    const events = [];
    for (const [bucket, template] of templates.entries()) {
      const count = counts[bucket];
      const date = field => template[field] === undefined ? null : dayAdd(openedAt, template[field]);
      truth.push({recordKey, month, bucket:template.kind, count, openedAt, acceptedAt:date('accepted'), plannedStartAt:date('planned'), actualStartAt:date('actual'), cancelledAt:date('cancelled'), noShowAt:date('noShow')});
      if (!count) continue;
      if (template.accepted !== undefined) events.push({at:dayAdd(date('accepted'),lag), transition:'accept', count, eventAt:date('accepted'), plannedStartAt:date('planned')});
      if (template.actual !== undefined) {
        const actual = date('actual'); starts.set(actual, (starts.get(actual) ?? 0)+count);
        // Report one fewer start first, then correct it later. The remaining opening stays accepted.
        const split = stress && bucket === 1 && index % 3 === 0;
        events.push({at:dayAdd(actual,lag), transition:'start', count:count-(split?1:0), eventAt:actual});
        if (split) events.push({at:dayAdd(actual,lag+21), transition:'start', count:1, eventAt:actual, correction:true});
      }
      if (template.cancelled !== undefined) events.push({at:dayAdd(date('cancelled'),lag), transition:'cancel', count, eventAt:date('cancelled')});
      if (template.noShow !== undefined) events.push({at:dayAdd(date('noShow'),lag), transition:'noShow', count, eventAt:date('noShow')});
    }
    const missing = stress && index % 18 === 4;
    const partial = stress && index % 9 === 2;
    const availableOpening = missing ? dayAdd(openedAt,30) : partial ? dayAdd(openedAt,20) : openedAt;
    let revision = 0;
    const dispositions = {open:openingCount, accepted:0, started:0, cancelled:0, noShow:0};
    const actualStartEvents = [], plannedStartEvents = [];
    const emit = (at, status='complete', correction=false) => {
      const followupDays = Math.floor((Date.parse(at)-Date.parse(openedAt))/DAY);
      const value = status !== 'complete' ? {month, openingCount:null, dispositions:null, actualStartEvents:null, plannedStartEvents:null, followupDays, horizonDays:config.windows.hiringHorizonDays, horizonMature:false, horizonLabelsComplete:false, knownOutcomeThrough:null, maximumReportingLagDays, rightCensoredCount:null, correction:false}
        : {month, openingCount, dispositions:{...dispositions}, actualStartEvents:structuredClone(actualStartEvents), plannedStartEvents:structuredClone(plannedStartEvents), followupDays, horizonDays:config.windows.hiringHorizonDays,
          horizonMature:followupDays>=config.windows.hiringHorizonDays,
          horizonLabelsComplete:followupDays>=config.windows.hiringHorizonDays+maximumReportingLagDays,
          knownOutcomeThrough:dayAdd(at,-maximumReportingLagDays), maximumReportingLagDays,
          rightCensoredCount:dispositions.open+dispositions.accepted, correction};
      releases.push(release(recordKey,++revision,openedAt,at,value,status));
    };
    emit(openedAt, missing?'missing':partial?'partial':'complete');
    if (availableOpening !== openedAt) events.push({at:availableOpening, transition:'coverage',count:0});
    events.push({at:dayAdd(openedAt,config.windows.hiringHorizonDays),transition:'horizon',count:0});
    events.push({at:dayAdd(openedAt,config.windows.hiringHorizonDays+maximumReportingLagDays),transition:'horizon-label-completeness',count:0});
    events.push({at:config.finalScoringCutoff,transition:'administrative-cutoff',count:0});
    events.sort((a,b) => a.at.localeCompare(b.at) || a.transition.localeCompare(b.transition));
    for (const event of events) {
      if (event.at > config.finalScoringCutoff) continue;
      if (event.transition === 'accept') {
        dispositions.open -= event.count; dispositions.accepted += event.count;
        plannedStartEvents.push({at:event.plannedStartAt,count:event.count,acceptedAt:event.eventAt});
      } else if (event.transition === 'start') {
        dispositions.accepted -= event.count; dispositions.started += event.count;
        const existing = actualStartEvents.find(item => item.at === event.eventAt);
        if (existing) existing.count += event.count; else actualStartEvents.push({at:event.eventAt,count:event.count});
      } else if (event.transition === 'cancel') {dispositions.open-=event.count;dispositions.cancelled+=event.count;}
      else if (event.transition === 'noShow') {dispositions.accepted-=event.count;dispositions.noShow+=event.count;}
      emit(event.at, event.at<availableOpening ? (missing?'missing':'partial') : 'complete',event.correction===true);
    }
    coverage.push({recordKey,month,effectiveAt:openedAt,openingCount,cohortCoverage:'all-openings',sourceObservedAt:null,
      openingCoverageAvailableAt:availableOpening, horizonDays:config.windows.hiringHorizonDays,
      horizonAt:dayAdd(openedAt,config.windows.hiringHorizonDays), horizonLabelsCompleteAt:dayAdd(openedAt,config.windows.hiringHorizonDays+maximumReportingLagDays),
      statusCoverageThrough:dayAdd(config.finalScoringCutoff,-maximumReportingLagDays),
      simulatedAvailableAt:config.finalScoringCutoff, status:'complete'});
  }
  return {domain:'hiring', definitions:{population:'company-wide-external-opening-cohorts-v1', openingConvention:'All openings in a month occur at its first day (new simulation assumption).',
    durationTarget:'opening-to-actual-start', plannedStartIsOutcome:false, observedAtBasis:'simulated-event-reporting', sourceObservedAt:null,
    completeMeaning:'All generated openings accounted for; completion does not mean all openings have started.', censoring:'Open and accepted without a reported start are right censored at each release; cancelled and noShow are competing outcomes, not successful starts.',
    horizonDays:config.windows.hiringHorizonDays, operationallyQualified:false,
    constants:{openingCountRange:[110,160],zeroOpeningMonthIndexModulo24:10,
      quickCountRange:[15,25],lateCountRange:[6,12],cancelledCountRange:[5,10],noShowCountRange:[2,5],openCountRange:[2,4],acceptedUnresolvedCountRange:[2,4],standardCount:'remainder',
      quick:{acceptanceDay:5,plannedDay:18,actualDay:20},standard:{acceptanceDay:15,plannedDay:40,actualDay:45},late:{acceptanceDay:25,plannedDay:100,actualDay:115},
      cancelledDayRange:[12,25],noShow:{acceptanceDay:12,plannedDay:35,eventDay:36},acceptedUnresolved:{acceptanceDay:30,plannedDay:70},
      annualImprovementDays:2,reversalAdditionalDays:65,reversalAppliesTo:'standard planned/actual and late actual',
      ordinaryReportingLagRange:[1,3],stressReportingLagRange:[5,18],stressCorrectionAdditionalDays:21,stressMaximumReportingLagDays:39,
      stressCorrection:'One standard start delayed an additional 21 days when cohort index modulo 3 equals 0.',
      stressMissing:'Index modulo 18 equals 4; opening coverage recovers at day 30.',stressPartial:'Index modulo 9 equals 2; opening coverage recovers at day 20.'}}, truth,releases,coverage,
    startEvents:[...starts].sort(([a],[b])=>a.localeCompare(b)).map(([at,count])=>({at,count}))};
}
