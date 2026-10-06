"""Fabricated aggregate rows only; these tests never open benchmark test seeds."""
import copy
import unittest

import numpy as np

from .assessment import DEFAULT_THRESHOLDS, WORLDS, _bootstrap, _pooled, evaluate_domain
from experiments.synthetic_tree_v1.metrics import score_case


CANDIDATE = 'candidate-enriched-full'
BASE = 'frozen-current'
RIDGE = 'ridge-enriched-full'


def rows_for(domain='turnover', seeds=20):
    actual, candidate, baseline = {'turnover': (100., 102., 110.),
                                  'hiring': (.5, .52, .60),
                                  'satisfaction': (50., 51., 53.)}[domain]
    rows = []
    for world in WORLDS:
        for seed in range(seeds):
            for group in ('low', 'middle', 'high'):
                label = {'value': actual, 'denominator': 1000, 'startsWithin90': 500}
                rows.append({'id': f'{seed}-{group}', 'world': world, 'domain': domain,
                             'seed': seed, 'scenario': 'stable', 'origin': '2026-06',
                             'status': 'predicted', 'reasons': [],
                             'groups': {'exposure': group, 'predictorMissing': False, 'stale': False},
                             'gate': {'accepted': True, 'score': .1, 'threshold': .5},
                             'scoring': {'status': 'scored', 'labels': [label], 'reasons': []},
                             'predictions': {BASE: [baseline], RIDGE: [baseline], CANDIDATE: [candidate]},
                             # Deliberately wrong cached metrics: evaluation must recompute.
                             'metrics': {CANDIDATE: {'mae': 99999}}})
    return rows


def evaluate(rows, domain='turnover', protocol=None):
    return evaluate_domain(rows, domain, CANDIDATE, [BASE, RIDGE], protocol or {})


def world(report, name='reference'):
    return next(row for row in report['worlds'] if row['world'] == name)


def codes(report):
    return {row['code'] for row in report['failures']}


class AssessmentTests(unittest.TestCase):
    def test_fabricated_clear_winners_pass_all_domains(self):
        for domain in ('turnover', 'hiring', 'satisfaction'):
            with self.subTest(domain=domain):
                report = evaluate(rows_for(domain), domain)
                self.assertEqual(report['verdict'], 'adopt-for-synthetic-demo', report['failures'])
                self.assertIsNone(report['interval'])
                self.assertFalse(report['operationallyQualified'])
                self.assertFalse(report['realWorldPerformanceValidated'])
                self.assertIn('not demographic fairness', report['coverageInterpretation'])
                self.assertEqual(world(report)['overall']['coverage']['retainedCommonScored'], 60)

    def test_absent_prespecified_cell_is_not_hidden(self):
        report = evaluate(rows_for(), protocol={'scenarios': ['stable', 'missingness'], 'testOrigins': ['2026-06']})
        missing = [row for row in report['failures'] if row['code'] == 'missing-prespecified-cell']
        self.assertEqual(len(missing), 4)
        self.assertTrue(all(row['scenario'] == 'missingness' for row in missing))

    def test_unknown_threshold_and_invalid_identity_rejected(self):
        for changed in ({'thresholds': {'mystery': 1}}, {'thresholds': {'tolerance': float('nan')}}):
            with self.assertRaises(ValueError):
                evaluate(rows_for(), protocol=changed)
        rows = rows_for()
        rows.append(copy.deepcopy(rows[0]))
        with self.assertRaises(ValueError):
            evaluate(rows)
        rows = rows_for()
        rows[0]['groups']['exposure'] = 'target-derived'
        with self.assertRaises(ValueError):
            evaluate(rows)

    def test_common_intersection_and_missing_prediction_fail(self):
        rows = rows_for()
        del rows[0]['predictions'][CANDIDATE]
        report = evaluate(rows)
        self.assertIn('missing-required-predictions', codes(report))
        self.assertEqual(world(report)['overall']['coverage']['retainedCommonScored'], 59)
        for method in [BASE, RIDGE, CANDIDATE]:
            self.assertIsNotNone(world(report)['overall']['methods'][method]['mae'])

    def test_preserves_original_abstentions_and_unscorable_identity_breaks(self):
        rows = rows_for('satisfaction')
        rows[0]['status'] = 'blocked'
        rows[0]['reasons'] = ['insufficient-native-waves']
        rows[0]['scoring'] = {'status': 'blocked', 'reasons': ['forecast-abstained'], 'labels': []}
        rows[1]['scoring'] = {'status': 'blocked', 'reasons': ['future-wave-identity-mismatch'], 'labels': []}
        report = evaluate(rows, 'satisfaction')
        coverage = world(report)['overall']['coverage']
        self.assertEqual(coverage['sourcePredicted'], 59)
        self.assertEqual(coverage['sourceScored'], 58)
        self.assertEqual(coverage['gateFractionOfSourcePredicted'], 1)
        self.assertEqual(coverage['blockedReasons']['future-wave-identity-mismatch'], 1)
        self.assertEqual(coverage['retainedCommonScored'], 58)

    def test_gate_denominator_includes_eventually_unscorable_cases(self):
        rows = rows_for('satisfaction')
        for row in rows[:7]:
            row['gate']['accepted'] = False
            row['scoring'] = {'status': 'blocked', 'reasons': ['future-wave-identity-mismatch'], 'labels': []}
        report = evaluate(rows, 'satisfaction')
        coverage = world(report)['overall']['coverage']
        self.assertEqual(coverage['retainedFractionOfSourceScored'], 1)
        self.assertAlmostEqual(coverage['gateFractionOfSourcePredicted'], 53 / 60)
        self.assertIn('retained-coverage-below-minimum', codes(report))

    def test_gate_retained_ungated_excluded_report_selectivity(self):
        rows = rows_for('satisfaction')
        rows[0]['gate']['accepted'] = False
        rows[0]['predictions'][CANDIDATE] = [99]
        report = evaluate(rows, 'satisfaction')
        reference = world(report)
        self.assertEqual(reference['overall']['methods'][CANDIDATE]['mae'], 1)
        self.assertEqual(reference['excluded']['methods'][CANDIDATE]['mae'], 49)
        self.assertAlmostEqual(reference['ungated']['methods'][CANDIDATE]['mae'], 108 / 60)
        self.assertEqual(reference['excluded']['coverage']['retainedCommonScored'], 1)

    def test_five_percent_reference_gain_boundary_and_zero_gain(self):
        rows = rows_for()
        for row in rows:
            row['predictions'][CANDIDATE] = [109.5]
        report = evaluate(rows)
        self.assertEqual(report['verdict'], 'adopt-for-synthetic-demo', report['failures'])
        for row in rows:
            row['predictions'][CANDIDATE] = [109.50001]
        self.assertIn('reference-gain-below-minimum', codes(evaluate(rows)))
        for row in rows:
            row['predictions'][CANDIDATE] = [110]
        self.assertIn('reference-bootstrap-not-strictly-below-zero', codes(evaluate(rows)))

    def test_transport_aggregate_boundary_and_worst_stratum_failures(self):
        rows = rows_for()
        for row in rows:
            if row['world'] == 'weak-signal':
                row['scoring']['labels'][0]['value'] = 1000
                row['predictions'] = {BASE: [1010], RIDGE: [1010], CANDIDATE: [1010.5]}
        report = evaluate(rows)
        self.assertNotIn('transport-aggregate-degradation', codes(report))
        for row in rows:
            if row['world'] == 'weak-signal':
                row['predictions'][CANDIDATE] = [1010.50001]
        self.assertIn('transport-aggregate-degradation', codes(evaluate(rows)))
        for row in rows:
            if row['world'] == 'reference' and row['groups']['exposure'] == 'low':
                row['scenario'] = 'reversal'
                row['predictions'][CANDIDATE] = [112]
        report = evaluate(rows)
        self.assertIn('scenario-origin-degradation', codes(report))
        self.assertIn('exposure-group-degradation', codes(report))
        self.assertEqual(world(report)['worstScenarioOrigin']['scenario'], 'reversal')
        self.assertEqual(world(report)['worstCase']['scenario'], 'reversal')

    def test_reference_20_transport_10_unique_seeds_not_case_counts(self):
        rows = rows_for()
        rows = [row for row in rows if row['world'] == 'reference' or row['seed'] < 10]
        self.assertEqual(evaluate(rows)['verdict'], 'adopt-for-synthetic-demo')
        rows = [row for row in rows if row['world'] != 'weak-signal' or row['seed'] < 9]
        report = evaluate(rows)
        self.assertTrue(any(failure['code'] == 'insufficient-unique-seeds' and failure['world'] == 'weak-signal'
                            for failure in report['failures']))
        rows = rows_for(seeds=19)
        self.assertIn('insufficient-unique-seeds', codes(evaluate(rows)))

    def test_structural_zero_support_cells_are_not_invented_errors(self):
        rows = rows_for('hiring')
        for index in range(20):
            row = copy.deepcopy(rows[index])
            row.update(id=f'short-{index}', scenario='small-sample', status='blocked', predictions={}, reasons=['insufficient-mature-cohorts'])
            row['scoring'] = {'status': 'blocked', 'reasons': ['forecast-abstained'], 'labels': []}
            rows.append(row)
        report = evaluate(rows, 'hiring')
        self.assertEqual(report['verdict'], 'adopt-for-synthetic-demo', report['failures'])
        stratum = next(row for row in world(report)['strata'] if row['scenario'] == 'small-sample')
        self.assertEqual(stratum['support'], 'not-applicable-source-abstention')
        self.assertIsNone(stratum['methods'][CANDIDATE]['mae'])

    def test_blocked_cases_may_have_unknown_operational_groups(self):
        rows = rows_for('hiring')
        row = copy.deepcopy(rows[0])
        row.update(id='blocked-unknown-group', status='blocked', predictions={}, reasons=['insufficient-history'])
        row['scoring'] = {'status': 'blocked', 'reasons': ['forecast-abstained'], 'labels': []}
        row['groups'] = {'exposure': None, 'predictorMissing': None, 'stale': None}
        rows.append(row)
        report = evaluate(rows, 'hiring')
        self.assertEqual(report['verdict'], 'adopt-for-synthetic-demo', report['failures'])
        self.assertEqual(world(report)['overall']['coverage']['cases'], 61)
        row['status'] = 'predicted'
        with self.assertRaises(ValueError):
            evaluate(rows, 'hiring')

    def test_instrument_unknown_cell_has_no_accuracy_claim(self):
        rows = rows_for('satisfaction')
        for index in range(20):
            row = copy.deepcopy(rows[index])
            row.update(id=f'changed-{index}', scenario='instrument-break')
            row['scoring'] = {'status': 'blocked', 'reasons': ['future-wave-identity-mismatch'], 'labels': []}
            rows.append(row)
        report = evaluate(rows, 'satisfaction')
        stratum = next(row for row in world(report)['strata'] if row['scenario'] == 'instrument-break')
        self.assertEqual(stratum['support'], 'unknown-outcome-no-accuracy-claim')
        self.assertIsNone(stratum['methods'][CANDIDATE]['mae'])

    def test_entire_unscorable_noninstrument_cell_rejects(self):
        rows = rows_for()
        for index in range(20):
            row = copy.deepcopy(rows[index])
            row.update(id=f'unknown-{index}', scenario='unknown-labels')
            row['scoring'] = {'status': 'blocked', 'reasons': ['incomplete-target-labels'], 'labels': []}
            rows.append(row)
        report = evaluate(rows)
        self.assertIn('unscorable-noninstrument-cell', codes(report))

    def test_rare_missing_and_stale_groups_are_descriptive(self):
        rows = rows_for()
        rows[0]['groups'].update(predictorMissing=True, stale=True)
        report = evaluate(rows)
        self.assertEqual(report['verdict'], 'adopt-for-synthetic-demo')
        for summary in world(report)['featureGroups']:
            if summary['value']:
                self.assertEqual(summary['sampleCoverage'], 'insufficient-scope')
                self.assertEqual(summary['coverage']['retainedUniqueSeeds'], 1)

    def test_every_co_primary_comparator_must_pass(self):
        rows = rows_for()
        for row in rows:
            row['predictions'][RIDGE] = [101]
        report = evaluate(rows)
        self.assertTrue(any(row['code'] == 'reference-gain-below-minimum' and row['comparator'] == RIDGE for row in report['failures']))
        self.assertTrue(any(row['code'] == 'transport-aggregate-degradation' and row['comparator'] == RIDGE for row in report['failures']))

    def test_hiring_exact_global_weights_zero_exposure_and_bins(self):
        rows = rows_for('hiring')[:2]
        rows[0]['scoring']['labels'] = [{'denominator': 10, 'startsWithin90': 2}, {'denominator': 0, 'startsWithin90': 0}]
        rows[0]['predictions'][CANDIDATE] = [.1, 1]
        rows[1]['scoring']['labels'] = [{'denominator': 90, 'startsWithin90': 81}]
        rows[1]['predictions'][CANDIDATE] = [1]
        result = _pooled(rows, CANDIDATE, 'hiring', DEFAULT_THRESHOLDS)
        labels = rows[0]['scoring']['labels'] + rows[1]['scoring']['labels']
        scored = score_case('hiring', labels, [.1, 1, 1])
        self.assertEqual(result['openingObservations'], 100)
        self.assertAlmostEqual(result['signedBiasPp'], 8)
        self.assertAlmostEqual(result['ecePp'], 10)
        self.assertEqual(result['brier'], scored['brier'])
        self.assertEqual(result['logLoss'], scored['logLoss'])
        self.assertEqual(result['calibrationBins'][9]['openings'], 90)
        self.assertEqual(result['calibrationBins'][1]['openings'], 10)
        self.assertTrue(all(row['support'] == 'insufficient-scope' for row in result['calibrationBins']))

    def test_hiring_bias_ece_and_proper_scores_checked_in_each_world(self):
        rows = rows_for('hiring')
        for row in rows:
            if row['world'] == 'fast-predictors':
                row['predictions'][CANDIDATE] = [.70]
        report = evaluate(rows, 'hiring')
        self.assertTrue({'hiring-bias', 'hiring-calibration-error', 'hiring-proper-score-degradation'} <= codes(report))
        self.assertTrue(all(row['world'] == 'fast-predictors' for row in report['failures'] if row['code'].startswith('hiring-')))

    def test_bias_limits_count_and_survey(self):
        for domain, value, code in [('turnover', 111, 'turnover-bias'), ('satisfaction', 53, 'survey-bias')]:
            rows = rows_for(domain)
            for row in rows:
                if row['world'] == 'delayed-predictors':
                    row['predictions'][CANDIDATE] = [value]
            report = evaluate(rows, domain)
            self.assertTrue(any(row['code'] == code and row['world'] == 'delayed-predictors' for row in report['failures']))

    def test_bootstrap_clusters_all_seed_cases_and_uses_case_weighting(self):
        rows = rows_for()[:3]
        for index, row in enumerate(rows):
            row['seed'] = 1 if index < 2 else 2
            row['_scores'] = {CANDIDATE: {'mae': 11 if index < 2 else 7}, BASE: {'mae': 10}}
        report = _bootstrap(rows, CANDIDATE, BASE, DEFAULT_THRESHOLDS)
        draws = np.random.default_rng(2718).integers(0, 2, size=(2000, 2))
        values = np.array([2, -3])[draws].sum(axis=1) / np.array([2, 1])[draws].sum(axis=1)
        expected = np.quantile(values, [.025, .975])
        np.testing.assert_allclose([report['bootstrap95Percent'][key] for key in ('lower', 'upper')], expected)
        self.assertEqual([row['cases'] for row in report['seedDifferences']], [2, 1])
        self.assertEqual(report, _bootstrap(rows, CANDIDATE, BASE, DEFAULT_THRESHOLDS))

    def test_all_failures_collected_and_missing_world_rejects(self):
        rows = [row for row in rows_for() if row['world'] == 'reference']
        for row in rows:
            row['predictions'][CANDIDATE] = [150]
        report = evaluate(rows)
        self.assertIn('no-scorable-world', codes(report))
        self.assertIn('turnover-bias', codes(report))
        self.assertIn('reference-gain-below-minimum', codes(report))
        self.assertIn('scenario-origin-degradation', codes(report))
        self.assertEqual(report['verdict'], 'reject')


if __name__ == '__main__':
    unittest.main()
