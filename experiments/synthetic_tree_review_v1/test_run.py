import unittest
from .run import verify_splits,build_review_cases,PROTOCOL
from .boundary import annotate_case

class RunnerTests(unittest.TestCase):
    def test_disjoint_preregistered_seed_splits(self):
        verify_splits()

    def test_calibration_does_not_extract_target_outcomes(self):
        rows=build_review_cases([17],'reference',['2024-06'],calibration=True)
        self.assertEqual(len(rows),21)
        for row in rows:
            self.assertEqual(row['scoring']['labels'],[])
            self.assertEqual(row['scoring']['status'],'blocked')
            self.assertNotIn('groups',row)
            self.assertEqual(row['metrics'],{})

    def test_delayed_feature_inputs_are_asof_and_groups_never_use_future_labels(self):
        bounds={'exposure':{d:{'cuts':[100,1000]}for d in PROTOCOL['domains']},'survey':{'threshold':2}}
        rows=build_review_cases([17],'delayed-predictors',['2026-06'],boundaries=bounds)
        for row in rows:
            if row['status']=='predicted':
                self.assertLessEqual(row['audit']['predictorRelease']['availableAt'],row['cutoff'])
                self.assertTrue(row['groups']['stale'])
                original=row['groups'].copy(),row['gate'].copy()
                for label in row['scoring']['labels']:label['value']=999999;label['denominator']=999999
                annotate_case(row,bounds,PROTOCOL)
                self.assertEqual(original,(row['groups'],row['gate']))

if __name__=='__main__':unittest.main()
