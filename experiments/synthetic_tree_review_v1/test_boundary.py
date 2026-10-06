import copy
import json
from pathlib import Path
import unittest
from ..synthetic_tree_v1.features import make_case,stamp
from ..synthetic_tree_v1.data import generate_history
from .boundary import stability_score,fit_boundaries,annotate_case

PROTOCOL=json.loads((Path(__file__).parent/'protocol.json').read_text())
BOUNDS={'exposure':{domain:{'cuts':[100,1000]}for domain in PROTOCOL['domains']},'survey':{'threshold':2}}

class BoundaryTests(unittest.TestCase):
    def test_gate_ignores_future_predictors_labels_denominators_and_identity(self):
        h=generate_history(17,'instrument-break');cutoff=stamp('2026-06',True);changed=copy.deepcopy(h)
        for source in changed['domains'].values():
            source['observations']=[row for row in source['observations'] if row['availableAt']<=cutoff and row['effectiveAt']<=cutoff]
            source['predictors']=[row for row in source['predictors'] if row['availableAt']<=cutoff and row['effectiveAt']<=cutoff]
        for domain in PROTOCOL['domains']:
            a=annotate_case(make_case(h,domain,'2026-06'),BOUNDS,PROTOCOL)
            b=annotate_case(make_case(changed,domain,'2026-06'),BOUNDS,PROTOCOL)
            self.assertEqual(a,b)

    def test_observable_gate_score_and_boundary_equality(self):
        h=generate_history(17,'stable');c=make_case(h,'satisfaction','2026-06')
        for n,row in enumerate(c['history']):row['value']=10+2*n
        self.assertAlmostEqual(stability_score(c),2)
        self.assertTrue(annotate_case(c,BOUNDS,PROTOCOL)['gate']['accepted'])
        c['history'][-1]['value']+=10
        self.assertFalse(annotate_case(c,BOUNDS,PROTOCOL)['gate']['accepted'])

    def test_group_uses_published_history_not_target_exposure(self):
        c=make_case(generate_history(17,'stable'),'hiring','2026-06')
        a=annotate_case(copy.deepcopy(c),BOUNDS,PROTOCOL)
        c['scoring']={'labels':[{'denominator':99999999}]}
        b=annotate_case(c,BOUNDS,PROTOCOL)
        self.assertEqual(a['groups'],b['groups']);self.assertEqual(a['gate'],b['gate'])

    def test_missing_inputs_remain_explicit_and_native_abstention_survives(self):
        c=make_case(generate_history(17,'small-sample'),'hiring','2025-06')
        self.assertEqual(c['status'],'blocked')
        self.assertFalse(annotate_case(c,BOUNDS,PROTOCOL)['gate']['accepted'])
        c=make_case(generate_history(17,'stable'),'turnover','2026-06')
        c['features'][0]['enriched']['overtime_hours']=None;c['features'][0]['enriched']['predictor_age_days']=91
        annotated=annotate_case(c,BOUNDS,PROTOCOL)
        self.assertTrue(annotated['groups']['predictorMissing']);self.assertTrue(annotated['groups']['stale'])

    def test_calibration_rejects_target_labels_and_insufficient_support(self):
        c=make_case(generate_history(17,'stable'),'satisfaction','2024-06')
        c['scoring']={'labels':[{'value':50}]}
        with self.assertRaisesRegex(ValueError,'target labels'):fit_boundaries([c],PROTOCOL)
        c['scoring']={'labels':[]}
        with self.assertRaisesRegex(ValueError,'Insufficient'):fit_boundaries([c],PROTOCOL)

if __name__=='__main__':unittest.main()
