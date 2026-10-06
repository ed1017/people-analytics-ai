"""Preregistered, aggregate-only fresh-test assessment; no model selection here.

All error tables use a shared complete-method intersection after an optional
observable survey gate. Seed-cluster intervals compare errors; they are never
forecast intervals. Exposure groups describe operational coverage, not fairness.
"""
from collections import Counter
import math

import numpy as np

from experiments.synthetic_tree_v1.metrics import score_case


WORLDS = ('reference', 'weak-signal', 'fast-predictors', 'delayed-predictors')
DEFAULT_THRESHOLDS = {
    'referenceMinimumRelativeGain': .05,
    'referenceMaxStratumMaeRatio': 1.10,
    'referenceMaxExposureMaeRatio': 1.10,
    'transportMaxAggregateMaeRatio': 1.05,
    'transportMaxStratumMaeRatio': 1.20,
    'minimumUniqueSeeds': 20,
    'transportMinimumUniqueSeeds': 10,
    'surveyMinimumCoverage': .90,
    'surveyMinimumStratumCoverage': .80,
    'hiringMaxAbsBiasPp': 3,
    'hiringMaxEcePp': 5,
    'hiringMaxProperScoreRatio': 1.02,
    'hiringCalibrationMinimumSeeds': 5,
    'hiringCalibrationMinimumOpenings': 500,
    'turnoverMaxRelativeAbsBias': .10,
    'surveyMaxAbsBias': 2,
    'bootstrapResamples': 2000,
    'bootstrapSeed': 2718,
    'tolerance': 1e-12,
}


def _mean(values):
    values = list(values)
    return float(np.mean(values)) if values else None


def _source_scored(row):
    return row['status'] == 'predicted' and row['scoring']['status'] == 'scored'


def _accepted(row, domain):
    return domain != 'satisfaction' or row['gate']['accepted']


def _coverage(rows, domain, methods, gate_mode='retained'):
    source = [row for row in rows if _source_scored(row)]
    eligible = [row for row in rows if row['status'] == 'predicted']
    include = lambda row: gate_mode == 'all' or (_accepted(row, domain) if gate_mode == 'retained' else not _accepted(row, domain))
    complete = lambda row: all(method in row['predictions'] for method in methods)
    retained = [row for row in source if include(row) and complete(row)]
    blocked = Counter()
    for row in rows:
        if not _source_scored(row):
            blocked.update(set(row.get('reasons', []) + row['scoring'].get('reasons', [])) or ['unspecified-source-abstention'])
    return {
        'cases': len(rows), 'uniqueSeeds': len({row['seed'] for row in rows}),
        'sourcePredicted': sum(row['status'] == 'predicted' for row in rows),
        'sourceScored': len(source), 'retainedCommonScored': len(retained),
        'retainedUniqueSeeds': len({row['seed'] for row in retained}),
        'retainedFractionOfSourceScored': len(retained) / len(source) if source else None,
        'gateAcceptedSourcePredicted': sum(_accepted(row, domain) for row in eligible),
        'gateFractionOfSourcePredicted': sum(_accepted(row, domain) for row in eligible) / len(eligible) if eligible else None,
        'missingRequiredPredictionEligible': sum(not complete(row) for row in eligible),
        'gateRejectedScorable': sum(not _accepted(row, domain) for row in source),
        'missingRequiredPredictionScorable': sum(not complete(row) for row in source),
        'blockedReasons': dict(sorted(blocked.items())),
        'predictorMissingCases': sum(row['groups']['predictorMissing'] is True for row in rows),
        'stalePredictorCases': sum(row['groups']['stale'] is True for row in rows),
        'methods': {method: {
            'predicted': sum(row['status'] == 'predicted' and method in row['predictions'] for row in rows),
            'sourceScored': sum(_source_scored(row) and method in row['predictions'] for row in rows),
        } for method in methods},
    }, retained


def _pooled(rows, method, domain, thresholds):
    """Exact aggregate opening scores; count/survey bias equally weights targets."""
    if not rows:
        return None
    labels, predictions, seeds = [], [], []
    for row in rows:
        labels.extend(row['scoring']['labels'])
        predictions.extend(row['predictions'][method])
        seeds.extend([row['seed']] * len(row['scoring']['labels']))
    scored = score_case(domain, labels, predictions)
    if domain != 'hiring':
        actual = [label['value'] for label in labels]
        return {'targets': len(labels), 'meanObserved': _mean(actual),
                'signedBias': _mean(prediction - observed for prediction, observed in zip(predictions, actual)),
                'pooledRmse': scored['rmse']}
    denominators = np.asarray([label['denominator'] for label in labels], dtype=float)
    starts = np.asarray([label['startsWithin90'] for label in labels], dtype=float)
    predictions = np.asarray(predictions, dtype=float)
    bins = np.minimum((predictions * 10).astype(int), 9)
    positive = denominators > 0
    total = float(denominators.sum())
    bias = float(100 * ((denominators * predictions).sum() - starts.sum()) / total)
    calibration = []
    for index in range(10):
        mask = (bins == index) & positive
        openings = int(denominators[mask].sum())
        unique_seeds = len({seed for seed, selected in zip(seeds, mask) if selected})
        mean_prediction = float(np.average(predictions[mask], weights=denominators[mask])) if openings else None
        observed = float(starts[mask].sum() / openings) if openings else None
        calibration.append({'bin': index, 'lowerInclusive': index / 10,
                            'upper': (index + 1) / 10, 'upperInclusive': index == 9,
                            'openings': openings, 'cohortRows': int(mask.sum()), 'uniqueSeeds': unique_seeds,
                            'meanPredictedProbability': mean_prediction, 'observedStartFraction': observed,
                            'absGapPp': 100 * abs(mean_prediction - observed) if openings else None,
                            'support': 'sufficient' if unique_seeds >= thresholds['hiringCalibrationMinimumSeeds']
                            and openings >= thresholds['hiringCalibrationMinimumOpenings'] else 'insufficient-scope'})
    return {'openingObservations': int(total), 'positiveExposureCohortRows': int(positive.sum()), 'signedBiasPp': bias,
            'ecePp': float(sum(row['openings'] * (row['absGapPp'] or 0) for row in calibration) / total),
            'brier': scored['brier'], 'logLoss': scored['logLoss'], 'pooledRmsePp': scored['rmse'],
            'calibrationBins': calibration,
            'unit': 'aggregate opening observations; repeated forecast origins may overlap cohorts'}


def _summary(rows, domain, methods, thresholds, gate_mode='retained'):
    coverage, retained = _coverage(rows, domain, methods, gate_mode)
    result = {'coverage': coverage, 'methods': {}, 'support': 'scored' if retained else 'unscored'}
    for method in methods:
        result['methods'][method] = {
            'mae': _mean(row['_scores'][method]['mae'] for row in retained),
            'meanCaseRmse': _mean(row['_scores'][method]['rmse'] for row in retained),
            'pooled': _pooled(retained, method, domain, thresholds),
        }
    return result, retained


def _bootstrap(rows, candidate, comparator, thresholds):
    clusters = []
    for seed in sorted({row['seed'] for row in rows}):
        differences = [row['_scores'][candidate]['mae'] - row['_scores'][comparator]['mae']
                       for row in rows if row['seed'] == seed]
        clusters.append({'seed': seed, 'cases': len(differences), 'sumMaeDifference': float(sum(differences)),
                         'meanMaeDifference': _mean(differences)})
    interval = None
    if len(clusters) >= 2:
        sums = np.asarray([cluster['sumMaeDifference'] for cluster in clusters])
        counts = np.asarray([cluster['cases'] for cluster in clusters])
        draws = np.random.default_rng(thresholds['bootstrapSeed']).integers(
            0, len(clusters), size=(thresholds['bootstrapResamples'], len(clusters)))
        samples = sums[draws].sum(axis=1) / counts[draws].sum(axis=1)
        low, high = np.quantile(samples, [.025, .975])
        interval = {'lower': float(low), 'upper': float(high),
                    'resamples': thresholds['bootstrapResamples'], 'seed': thresholds['bootstrapSeed'],
                    'cluster': 'seed-across-all-scenarios-and-origins',
                    'interpretation': 'paired-error-comparison-only; not a forecast interval'}
    return {'seedDifferences': clusters, 'bootstrap95Percent': interval}


def _comparison(summary, candidate, comparator):
    candidate_mae = summary['methods'][candidate]['mae']
    comparator_mae = summary['methods'][comparator]['mae']
    return {'candidateMae': candidate_mae, 'comparatorMae': comparator_mae,
            'difference': candidate_mae - comparator_mae if candidate_mae is not None else None,
            'relativeGain': (1 - candidate_mae / comparator_mae) if comparator_mae else None}


def evaluate_domain(rows, domain, candidate, comparators, protocol):
    """Return a concrete synthetic-demo verdict against frozen co-primary methods.

    All predictions present in the domain are displayed on the same retained
    intersection. Only ``comparators`` drive acceptance; they must be selected
    before opening this test set. No target outcome is used to change the gate.
    """
    if domain not in ('turnover', 'hiring', 'satisfaction') or not comparators or candidate in comparators:
        raise ValueError('Valid domain and distinct nonempty frozen comparators required')
    thresholds = {**DEFAULT_THRESHOLDS, **protocol.get('thresholds', {})}
    if set(thresholds) != set(DEFAULT_THRESHOLDS):
        raise ValueError('Unrecognized acceptance threshold')
    if any(not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 for value in thresholds.values()):
        raise ValueError('Finite nonnegative thresholds required')
    methods = sorted({candidate, *comparators, *(method for row in rows if row['domain'] == domain for method in row['predictions'])})
    selected = []
    identifiers = set()
    for source in rows:
        if source['domain'] != domain:
            continue
        row = {**source}
        key = (row['world'], row['id'])
        if key in identifiers or row['world'] not in WORLDS:
            raise ValueError('Unique case identity and known world required')
        identifiers.add(key)
        if row['groups']['exposure'] not in ('low', 'middle', 'high') and not (row['status'] != 'predicted' and row['groups']['exposure'] is None):
            raise ValueError('Frozen historical exposure group required')
        if any(type(row['groups'][name]) is not bool and not (row['status'] != 'predicted' and row['groups'][name] is None)
               for name in ('predictorMissing', 'stale')):
            raise ValueError('Boolean missingness/staleness groups required')
        if domain == 'satisfaction' and type(row['gate']['accepted']) is not bool:
            raise ValueError('Observable boolean gate required for surveys')
        row['_scores'] = {method: score_case(domain, row['scoring']['labels'], values)
                          for method, values in row['predictions'].items()} if _source_scored(row) else {}
        selected.append(row)
    failures = []
    tolerance = thresholds['tolerance']

    def fail(code, **details):
        failures.append({'code': code, **details})

    def at_most(value, limit, code, **details):
        if value is None or value > limit + tolerance:
            fail(code, observed=value, limit=limit, **details)

    def support(summary, **details):
        n = summary['coverage']['retainedUniqueSeeds']
        minimum = thresholds['minimumUniqueSeeds'] if details.get('world') == 'reference' else thresholds['transportMinimumUniqueSeeds']
        if n < minimum:
            fail('insufficient-unique-seeds', observed=n, minimum=minimum, **details)

    def coverage_check(summary, overall=False, **details):
        coverage = summary['coverage']
        if not coverage['sourcePredicted']:
            return
        fraction = coverage['gateFractionOfSourcePredicted']
        minimum = (thresholds['surveyMinimumCoverage'] if overall else thresholds['surveyMinimumStratumCoverage']) if domain == 'satisfaction' else 1
        if fraction + tolerance < minimum:
            fail('retained-coverage-below-minimum', observed=fraction, minimum=minimum, **details)
        if coverage['missingRequiredPredictionEligible']:
            fail('missing-required-predictions', count=coverage['missingRequiredPredictionEligible'], **details)

    worlds = []
    for world in WORLDS:
        world_rows = [row for row in selected if row['world'] == world]
        overall, retained = _summary(world_rows, domain, methods, thresholds)
        entry = {'world': world, 'overall': overall, 'comparisons': [], 'strata': [], 'exposureGroups': [], 'featureGroups': []}
        entry['ungated'], _ = _summary(world_rows, domain, methods, thresholds, 'all')
        entry['excluded'], _ = _summary(world_rows, domain, methods, thresholds, 'excluded')
        if not retained:
            fail('no-scorable-world', world=world)
        support(overall, world=world, scope='overall')
        coverage_check(overall, overall=True, world=world, scope='overall')
        strata_keys = sorted({(row['scenario'], row['origin']) for row in world_rows})
        if protocol.get('scenarios') and protocol.get('testOrigins'):
            strata_keys = sorted(set(strata_keys) | {(scenario, origin) for scenario in protocol['scenarios'] for origin in protocol['testOrigins']})
        for scenario, origin in strata_keys:
            subset = [row for row in world_rows if (row['scenario'], row['origin']) == (scenario, origin)]
            summary, _ = _summary(subset, domain, methods, thresholds)
            summary.update(scenario=scenario, origin=origin)
            if not subset:
                fail('missing-prespecified-cell', world=world, scenario=scenario, origin=origin)
                summary['support'] = 'missing-required-test-cell'
            elif not summary['coverage']['sourceScored']:
                summary['support'] = 'unknown-outcome-no-accuracy-claim' if summary['coverage']['sourcePredicted'] else 'not-applicable-source-abstention'
                eligible = [row for row in subset if row['status'] == 'predicted']
                if eligible and not all('future-wave-identity-mismatch' in row['scoring'].get('reasons', []) for row in eligible):
                    fail('unscorable-noninstrument-cell', world=world, scenario=scenario, origin=origin)
            entry['strata'].append(summary)
            coverage_check(summary, world=world, scenario=scenario, origin=origin)
            # Structural absence (e.g. immature short hiring history) is reported,
            # never converted to zero error or invented required label support.
            if summary['coverage']['sourceScored']:
                support(summary, world=world, scenario=scenario, origin=origin)
        for group in ('low', 'middle', 'high'):
            summary, _ = _summary([row for row in world_rows if row['groups']['exposure'] == group], domain, methods, thresholds)
            summary['exposure'] = group
            entry['exposureGroups'].append(summary)
            if world == 'reference':
                support(summary, world=world, exposure=group)
        for name in ('predictorMissing', 'stale'):
            for value in (False, True):
                summary, _ = _summary([row for row in world_rows if row['groups'][name] == value], domain, methods, thresholds)
                summary.update(group=name, value=value)
                minimum = thresholds['minimumUniqueSeeds'] if world == 'reference' else thresholds['transportMinimumUniqueSeeds']
                summary['sampleCoverage'] = 'sufficient' if summary['coverage']['retainedUniqueSeeds'] >= minimum else 'insufficient-scope'
                entry['featureGroups'].append(summary)
        for comparator in comparators:
            comparison = {'comparator': comparator, **_comparison(overall, candidate, comparator)}
            if world == 'reference':
                comparison.update(_bootstrap(retained, candidate, comparator, thresholds))
                baseline = comparison['comparatorMae']
                limit = baseline * (1 - thresholds['referenceMinimumRelativeGain']) if baseline is not None else 0
                at_most(comparison['candidateMae'], limit, 'reference-gain-below-minimum', world=world, comparator=comparator)
                interval = comparison['bootstrap95Percent']
                if interval is None or interval['upper'] >= -tolerance:
                    fail('reference-bootstrap-not-strictly-below-zero', world=world, comparator=comparator,
                         upper=interval['upper'] if interval else None)
            else:
                baseline = comparison['comparatorMae']
                at_most(comparison['candidateMae'], baseline * thresholds['transportMaxAggregateMaeRatio'] if baseline is not None else 0,
                        'transport-aggregate-degradation', world=world, comparator=comparator)
            for stratum in entry['strata']:
                if not stratum['coverage']['sourceScored']:
                    continue
                ratio = thresholds['referenceMaxStratumMaeRatio'] if world == 'reference' else thresholds['transportMaxStratumMaeRatio']
                base = stratum['methods'][comparator]['mae']
                at_most(stratum['methods'][candidate]['mae'], base * ratio if base is not None else 0,
                        'scenario-origin-degradation', world=world, comparator=comparator,
                        scenario=stratum['scenario'], origin=stratum['origin'])
            if world == 'reference':
                for group in entry['exposureGroups']:
                    base = group['methods'][comparator]['mae']
                    at_most(group['methods'][candidate]['mae'], base * thresholds['referenceMaxExposureMaeRatio'] if base is not None else 0,
                            'exposure-group-degradation', world=world, comparator=comparator, exposure=group['exposure'])
            entry['comparisons'].append(comparison)
        pooled = overall['methods'][candidate]['pooled']
        if pooled:
            if domain == 'hiring':
                at_most(abs(pooled['signedBiasPp']), thresholds['hiringMaxAbsBiasPp'], 'hiring-bias', world=world)
                at_most(pooled['ecePp'], thresholds['hiringMaxEcePp'], 'hiring-calibration-error', world=world)
                for comparator in comparators:
                    for key in ('brier', 'logLoss'):
                        at_most(pooled[key], overall['methods'][comparator]['pooled'][key] * thresholds['hiringMaxProperScoreRatio'],
                                'hiring-proper-score-degradation', world=world, comparator=comparator, metric=key)
            elif domain == 'turnover':
                at_most(abs(pooled['signedBias']), pooled['meanObserved'] * thresholds['turnoverMaxRelativeAbsBias'], 'turnover-bias', world=world)
            else:
                at_most(abs(pooled['signedBias']), thresholds['surveyMaxAbsBias'], 'survey-bias', world=world)
        seed_means = [{'seed': seed, 'meanMae': _mean(row['_scores'][candidate]['mae'] for row in retained if row['seed'] == seed)}
                      for seed in sorted({row['seed'] for row in retained})]
        worst = max(retained, key=lambda row: row['_scores'][candidate]['mae'], default=None)
        entry['worstSeed'] = max(seed_means, key=lambda row: row['meanMae'], default=None)
        target_errors = []
        for row in retained:
            for index, (label, prediction) in enumerate(zip(row['scoring']['labels'], row['predictions'][candidate])):
                if domain == 'hiring' and not label['denominator']:
                    continue
                actual = label['startsWithin90'] / label['denominator'] if domain == 'hiring' else label['value']
                error = abs(prediction - actual) * (100 if domain == 'hiring' else 1)
                target_errors.append({'id': row['id'], 'targetIndex': index, 'month': label.get('month'),
                                      'seed': row['seed'], 'scenario': row['scenario'], 'origin': row['origin'], 'absoluteError': error})
        entry['worstTarget'] = max(target_errors, key=lambda row: row['absoluteError'], default=None)
        entry['worstCase'] = ({'id': worst['id'], 'seed': worst['seed'], 'scenario': worst['scenario'], 'origin': worst['origin'],
                               'mae': worst['_scores'][candidate]['mae']} if worst else None)
        scorable_strata = [row for row in entry['strata'] if row['methods'][candidate]['mae'] is not None]
        worst_stratum = max(scorable_strata, key=lambda row: row['methods'][candidate]['mae'], default=None)
        entry['worstScenarioOrigin'] = ({'scenario': worst_stratum['scenario'], 'origin': worst_stratum['origin'],
                                        'mae': worst_stratum['methods'][candidate]['mae']} if worst_stratum else None)
        worlds.append(entry)
    return {'domain': domain, 'candidate': candidate, 'comparators': list(comparators), 'thresholds': thresholds,
            'verdict': 'reject' if failures else 'adopt-for-synthetic-demo', 'failures': failures, 'worlds': worlds,
            'interval': None, 'operationallyQualified': False, 'realWorldPerformanceValidated': False,
            'aggregation': 'Equal retained history-origin case MAE; opening-weighted hiring MAE within case. Mean case RMSE is not pooled RMSE.',
            'gateCoverageDenominator': 'All source-predicted cases, including future unscorable instrument breaks; scored coverage is separate.',
            'coverageInterpretation': 'Historical exposure and availability groups are operational coverage, not demographic fairness.',
            'generalizationLimit': 'Transport tests are alternative synthetic worlds from this generator family, not independent real-world validation.'}
