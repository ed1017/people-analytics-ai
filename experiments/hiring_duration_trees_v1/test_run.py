import copy
import hashlib
import subprocess
import unittest
import numpy as np
from .run import ROOT,HERE,P,generate,native,xy,fit_predictions,assess_case,assess,metrics

class DurationAuditTests(unittest.TestCase):
    def test_reference_bytes_match_pinned_revision(self):
        for path in (HERE/'reference').glob('*.ts'):
            original=subprocess.check_output(['git','show',P['referenceCommit']+':lib/ml/'+path.name],cwd=ROOT)
            self.assertEqual(original,path.read_bytes())

    def test_generator_repeatable_and_synthetic(self):
        a=generate(17,'seasonal')
        self.assertEqual(a,generate(17,'seasonal'))
        self.assertEqual(len(a),69*20)
        self.assertTrue(all(r['requisitionId'].startswith('synthetic-17-') for r in a))
        self.assertTrue(any(r['status']=='cancelled' for r in a))

    def test_existing_gates_fail_closed(self):
        for scenario in ['missing-labels','small-support']:
            result=assess_case(17,scenario)
            self.assertFalse(result['qualified'])
            self.assertEqual(result['folds'],[])

    def test_label_availability_and_holdout_partition(self):
        rows=generate(17,'delayed-labels')
        r=native(rows)
        self.assertTrue(r['report']['candidateReviewGatesPassed'])
        byid={x['requisitionId']:x for x in rows}
        for fold,audit in zip(r['report']['folds'],r['audit']['folds']):
            cutoff=fold['trainBefore']+'T00:00:00.000Z'
            for key in audit['trainIds']:
                self.assertLess(byid[key]['openedDate'],fold['trainBefore'])
                self.assertLessEqual(byid[key]['labelFirstObservedAt'],cutoff)
            self.assertFalse(set(audit['trainIds'])&set(audit['scoreIds']))
            self.assertGreater(len(audit['unavailableTrainingIds']),0)

    def test_score_outcomes_cannot_change_predictions(self):
        rows=[r for r in generate(17,'seasonal') if r['status']=='filled']
        training=rows[:600]
        score=rows[-30:]
        changed=copy.deepcopy(score)
        for row in changed:
            row['startDate']='2030-01-01'
            row['closedDate']='2030-01-01'
            row['labelFirstObservedAt']='2031-01-01T00:00:00.000Z'
        a,b=fit_predictions(training,score,1),fit_predictions(training,changed,1)
        for key in a:
            np.testing.assert_array_equal(a[key],b[key])

    def test_native_ridge_numerical_parity(self):
        result=assess_case(17,'seasonal')
        self.assertTrue(result['qualified'])
        self.assertEqual(len(result['folds']),4)
        self.assertLess(result['ridgeParityMaximumAbsoluteDays'],1e-8)

    def test_fixed_calendar_and_aligned_metrics(self):
        rows=[r for r in generate(17,'seasonal') if r['status']=='filled']
        x,y=xy(rows)
        self.assertEqual(x.shape,(len(rows),2))
        np.testing.assert_allclose(np.sum(x*x,axis=1),1)
        self.assertEqual(metrics(np.array([1,3]),np.array([2,5]))['maeDays'],1.5)

    def test_empty_evidence_cannot_adopt(self):
        result=assess([])
        for decision in result['decisions'].values():
            self.assertEqual(decision['decision'],'reject')
            self.assertTrue(any('unsupported' in f for f in decision['failures']))

if __name__=='__main__': unittest.main()
