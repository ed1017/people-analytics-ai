import copy
import json
import subprocess
import unittest
import numpy as np
from . import data
from .run import ROOT, PROTOCOL, auxiliary_vectors, ses, own_baselines, fit, predict, build_cases
from experiments.synthetic_tree_v1.features import stamp


class RunnerTests(unittest.TestCase):
    def test_ses_exact_native_parity_all_existing_fixture_windows(self):
        script="""import{readFileSync}from'node:fs';import{evaluateAggregateExitDemo}from'./lib/ml/aggregate-exit-forecast.ts';let fixture=JSON.parse(readFileSync('tests/fixtures/aggregate-exit-history.json'));console.log(JSON.stringify({fixture,result:evaluateAggregateExitDemo(fixture)}));"""
        result=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True,stderr=subprocess.DEVNULL))
        checked=0
        def walk(value):
            nonlocal checked
            if isinstance(value,dict):
                if value.get('method')=='simple-exponential-smoothing' and 'points' in value:
                    history=[r['voluntaryExits'] for r in result['fixture']['months'] if value['trainStart']<=r['month']<=value['origin']]
                    fitted=ses(history)
                    self.assertEqual(fitted['alpha'],value['alpha'])
                    self.assertEqual(fitted['level'],value['points'][0]['expectedExits']);checked+=1
                for v in value.values():walk(v)
            elif isinstance(value,list):
                for v in value:walk(v)
        walk(result['result']);self.assertGreater(checked,10)

    def test_auxiliary_tiers_do_not_change_base_or_leak_identity(self):
        history=data.generate_history(17,'stable');case=data.make_case(history,'performance','2024-12')
        auxiliary_vectors(case,data.aux_features(history,case['cutoff']))
        tiers=case['features'][0]['tiers']
        self.assertFalse(any(k.startswith('performance_') or k.startswith('promotion_') for k in tiers['base']))
        self.assertTrue('performance_favorable_share' in tiers['performance'])
        self.assertFalse('promotion_rate' in tiers['performance'])
        self.assertTrue(set(tiers['both'])==set(tiers['performance'])|set(tiers['promotion']))
        self.assertFalse({'seed','scenario','successes','target_denominator'} & set(tiers['both']))

    def test_predictions_ignore_scoring_labels(self):
        cases=build_cases([17],['2023-03','2023-06','2023-09','2023-12','2024-03','2024-06','2024-09','2024-12'],PROTOCOL['fitLabelsAsOf'])
        cases=[c for c in cases if c['domain']=='promotion']
        fitted=fit(cases,'promotion','random-forest','both')
        before=predict(fitted,cases,'promotion','both')
        mutated=copy.deepcopy(cases)
        for c in mutated:c['scoring']={'status':'blocked','labels':[]}
        self.assertEqual(before,predict(fitted,mutated,'promotion','both'))

    def test_fit_rejects_unreleased_labels(self):
        history=data.generate_history(17,'stable');case=data.make_case(history,'promotion','2024-12')
        auxiliary_vectors(case,data.aux_features(history,case['cutoff']))
        case['scoring']=data.labels_for(history,case,PROTOCOL['testLabelsAsOf'])
        with self.assertRaises(AssertionError):fit([case],'promotion','ridge','base')

    def test_ses_constant_tie_is_first_alpha(self):
        self.assertEqual(ses([10]*24),dict(alpha=.2,level=10.,sse=0.))


if __name__=='__main__':unittest.main()
