import copy
import unittest
from .evaluation import score, reliability, summarize
from .run import PROTOCOL


class EvaluationTests(unittest.TestCase):
    def test_probability_scores_match_expanded_events(self):
        labels=[dict(value=.25,denominator=4,successes=1),dict(value=.5,denominator=2,successes=1)]
        result=score('promotion',labels,[.2,.8])
        self.assertAlmostEqual(result['mae'],100*(4*.05+2*.3)/6)
        self.assertAlmostEqual(result['brier'],(.8**2+3*.2**2+.2**2+.8**2)/6)

    def test_count_total_error_is_not_sum_absolute_monthly_error(self):
        result=score('turnover',[dict(value=10),dict(value=20),dict(value=30)],[15,15,30])
        self.assertEqual(result['quarterTotalAbsoluteError'],0)
        self.assertAlmostEqual(result['mae'],10/3)

    def test_corrupt_fraction_or_success_counts_rejected(self):
        for label in [dict(value=.2,denominator=10,successes=3),dict(value=.5,denominator=10,successes=11)]:
            with self.assertRaises(AssertionError):score('performance',[label],[.5])

    def test_pooled_reliability_respects_denominator(self):
        rows=[dict(seed=17,scoring=dict(labels=[dict(value=0,denominator=10),dict(value=1,denominator=30)]),predictions={'m':[.2,.8]})]
        result=reliability(rows,'m')
        self.assertAlmostEqual(result['biasPercentagePoints'],-10)
        self.assertAlmostEqual(result['ecePercentagePoints'],20)

    def sample_cases(self):
        protocol=copy.deepcopy(PROTOCOL)
        protocol.update(domains=['performance'],scenarios=['stable'],testOrigins=['2025-06','2025-09'])
        methods=[f'{e}-{t}' for e in protocol['estimators'] for t in protocol['featureTiers']]+['recent-mean-3']
        rows=[]
        for seed in range(20):
            predictions={m:[.5] if m.startswith('ridge') or m=='recent-mean-3' else [.55] for m in methods}
            labels=[dict(value=.6,denominator=100,successes=60)]
            rows.append(dict(domain='performance',seed=seed,scenario='stable',origin='2025-06',months=['2025-09'],status='predicted',reasons=[],predictions=predictions,
                             scoring=dict(status='scored',labels=labels,reasons=[]),metrics={m:score('performance',labels,p) for m,p in predictions.items()}))
        return rows,protocol

    def test_missing_entire_intended_cell_rejects(self):
        rows,p=self.sample_cases();result=summarize(rows,p)[0]
        self.assertEqual(result['cellScope']['stable:2025-09']['status'],'unexpected-no-support')
        self.assertTrue(all(any(f['gate']=='unexpected-empty-cell' for f in d['failures']) for d in result['decisions']))

    def test_native_unsupported_cell_is_explicit(self):
        rows,p=self.sample_cases()
        rows.append(dict(domain='performance',seed=17,scenario='stable',origin='2025-09',months=['2025-12'],status='blocked',reasons=['incomplete-released-history'],
                         predictions={},metrics={},scoring=dict(status='blocked',reasons=['forecast-abstained'],labels=[])))
        result=summarize(rows,p)[0]
        self.assertEqual(result['cellScope']['stable:2025-09']['status'],'native-unsupported')

    def test_low_seed_cell_rejects_despite_good_aggregate(self):
        rows,p=self.sample_cases();p['testOrigins']=['2025-06']
        result=summarize(rows[:3],p)[0]
        self.assertTrue(all(any(f['gate']=='insufficient-cell-seeds' for f in d['failures']) for d in result['decisions']))


if __name__=='__main__':unittest.main()
