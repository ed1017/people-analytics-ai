import copy
import unittest
import numpy as np
from .models import fit_model, predict_model

PROTOCOL = {'minimumTrainingRows': 3, 'randomState': 1729}

def cases():
    output=[]
    for n in range(12):
        output.append({'id':str(n),'seed':17,'domain':'turnover','status':'predicted','cutoff':'2023-01-31T23:59:59.999Z',
         'features':[{'month':'2023-02','enriched':{'lag':float(n), 'indicator':None if n%3==0 else float(n)}}],
         'scoring':{'status':'scored','labelsAsOf':'2024-01-01T00:00:00.000Z','labels':[{'month':'2023-02','value':float(n+1),'denominator':100,
         'effectiveAt':'2023-02-28T23:59:59.999Z','availableAt':'2023-03-03T23:59:59.999Z'}]}})
    return output

class ModelsTest(unittest.TestCase):
    def test_empty_training_abstains_explicitly(self):
        with self.assertRaisesRegex(ValueError, 'insufficient-training-rows'):
            fit_model([], 'ridge-enriched', {'alpha':1}, PROTOCOL, '2024-01-01T00:00:00.000Z')

    def test_preprocessing_fits_only_training(self):
        data=cases(); fitted=fit_model(data,'ridge-enriched',{'alpha':1},PROTOCOL,'2024-01-01T00:00:00.000Z')
        medians=fitted[2]['imputerStatistics'].copy()
        evaluation=copy.deepcopy(data);evaluation[0]['features'][0]['enriched']['indicator']=1e9
        predict_model(fitted,evaluation,'ridge-enriched','turnover')
        np.testing.assert_array_equal(fitted[0].named_steps['imputer'].statistics_,medians)
        self.assertEqual(medians,[6.0,5.5])

    def test_released_fit_labels_required(self):
        data=cases();data[0]['scoring']['labels'][0]['availableAt']='2025-01-01T00:00:00.000Z'
        with self.assertRaises(AssertionError):fit_model(data,'ridge-enriched',{'alpha':1},PROTOCOL,'2024-01-01T00:00:00.000Z')

    def test_rf_and_boosting_deterministic_and_clipped(self):
        for arm,params in [('random-forest-enriched',{'n_estimators':5,'max_depth':2}),('gradient-boosting-enriched',{'n_estimators':5,'max_depth':2})]:
            a=fit_model(cases(),arm,params,PROTOCOL,'2024-01-01T00:00:00.000Z')
            b=fit_model(cases(),arm,params,PROTOCOL,'2024-01-01T00:00:00.000Z')
            self.assertEqual(predict_model(a,cases(),arm,'hiring'),predict_model(b,cases(),arm,'hiring'))
            self.assertTrue(all(0 < value < 1 for values in predict_model(a,cases(),arm,'hiring').values() for value in values))

    def test_zero_hiring_target_exposure_excluded_from_all_fits(self):
        for arm,params in [('ridge-enriched',{'alpha':1}),('random-forest-enriched',{'n_estimators':5}),('gradient-boosting-enriched',{'n_estimators':5})]:
            data=cases()
            for row in data:row['domain']='hiring';row['scoring']['labels'][0]['value']=.5
            data[0]['scoring']['labels'][0]['denominator']=0
            fitted=fit_model(data,arm,params,PROTOCOL,'2024-01-01T00:00:00.000Z')
            self.assertEqual(fitted[2]['trainingRows'],11)
            self.assertEqual(fitted[2]['trainingWeight'],1100)

if __name__=='__main__':unittest.main()
