import copy
import unittest
from .run import build_cases, PROTOCOL, seeds, origins
from .models import fit_model, predict_model

class RunTests(unittest.TestCase):
    def test_seed_and_chronological_split_contract(self):
        self.assertFalse(set(seeds('train')) & set(seeds('tuning')))
        self.assertFalse(set(seeds('train')) & set(seeds('test')))
        self.assertFalse(set(seeds('tuning')) & set(seeds('test')))
        self.assertLess(PROTOCOL['lastInitialTrainingOrigin'], min(PROTOCOL['tuningOrigins']))
        self.assertLess(max(PROTOCOL['tuningOrigins']), min(PROTOCOL['testOrigins']))
        self.assertLess(PROTOCOL['lastRefitTrainingOrigin'], min(PROTOCOL['testOrigins']))
        self.assertEqual(origins('2024-03','2024-12'),['2024-03','2024-06','2024-09','2024-12'])

    def test_smoke_bridge_support_and_future_labels_cannot_change_predictions(self):
        cases=build_cases([17],['2024-06','2024-09','2024-12'],PROTOCOL['selectionAndRefitCutoff'],scenarios=['stable','missingness','small-sample','instrument-break'])
        training=[case for case in cases if case['domain']=='turnover']
        fit=fit_model(training,'ridge-enriched',{'alpha':1},{**PROTOCOL,'minimumTrainingRows':3},PROTOCOL['selectionAndRefitCutoff'])
        before=predict_model(fit,training,'ridge-enriched','turnover')
        changed=copy.deepcopy(training)
        for case in changed:
            for label in case['scoring']['labels']:label['value']=999999
        self.assertEqual(before,predict_model(fit,changed,'ridge-enriched','turnover'))
        for case in cases:
            self.assertEqual(case['status']=='predicted',bool(case['predictions']))
            if case['scoring']['status']=='scored':self.assertEqual(set(case['predictions']),set(case['metrics']))

if __name__=='__main__':unittest.main()
