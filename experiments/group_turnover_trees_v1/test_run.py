import copy,unittest
import numpy as np
from .run import P,ARMS,TARGETS,xrow,metric,assess,predict,fit
class Constant:
 def __init__(self,value):self.value=value
 def predict(self,X):return np.array([self.value]*len(X))
class Tests(unittest.TestCase):
 def row(self):return {'seed':18301,'scenario':'informative','groupId':'group-a','origin':P['testOrigin'],'trainingEnd':'2026-05','trainingMonths':65,'labelAvailableAt':P['testLabelsAsOf'],'inputFingerprint':'fixture','signal':None,'reasons':[],'features':dict.fromkeys(P['features'],12),'baselines':{'recent-mean-3':[12,12,12,36],'seasonal-naive-12':[10,10,10,30]},'actual':[14,15,16,45]}
 def test_exact_feature_allowlist(self):
  row=self.row();self.assertEqual(xrow(row,'lag-only'),[12]*6)
  row['features']['future-exits']=999
  with self.assertRaises(AssertionError):xrow(row,'lag-only')
 def test_missing_signal_cannot_be_model_feature(self):
  with self.assertRaises(AssertionError):xrow(self.row(),'released-signal')
 def test_late_missing_exact_lag_fallback(self):
  models={}
  for target in TARGETS:
   for arm in ARMS:models[('informative','group-a',target,arm)]={'models':{m:Constant(2 if arm=='lag-only' else 999) for m in ['ridge','random-forest','gradient-boosting']},'intercept':3,'cells':{'0':50,'1':100}}
  rows=predict([self.row()],models)
  for t in TARGETS:
   relevant=[r for r in rows if r['target']==t]
   self.assertEqual(relevant[0]['predictions'],relevant[1]['predictions'])
 def test_outcomes_and_metadata_do_not_enter_predictions(self):
  fits={('informative','group-a',t,a):{'models':{m:Constant(2) for m in ['ridge','random-forest','gradient-boosting']},'intercept':3,'cells':{'0':4,'1':5}} for t in TARGETS for a in ARMS}
  row=self.row();before=predict([row],fits);row['actual']=[99999]*4;row['seed']=99999;row['inputFingerprint']='changed'
  self.assertEqual([r['predictions'] for r in before],[r['predictions'] for r in predict([row],fits)])
 def test_blocked_row_never_exposes_actual(self):
  row=self.row();row['features']=None
  for out in predict([row],{}):self.assertIsNone(out['actual']);self.assertEqual(out['predictions'],{})
 def test_independent_metric_values(self):
  rows=[{'seed':1,'actual':2,'predictions':{'x':5}},{'seed':2,'actual':10,'predictions':{'x':6}},{'seed':3,'actual':None,'predictions':{'x':9}},{'seed':4,'actual':9,'predictions':{}}]
  m=metric(rows,'x');self.assertEqual(m,{'intended':4,'forecasted':3,'scored':2,'seedCount':2,'mae':3.5,'rmse':np.sqrt(12.5),'bias':-.5})
 def test_future_training_label_rejected_before_fitting(self):
  rows=[]
  for seed in range(P['trainSeeds'][0],P['trainSeeds'][1]+1):
   row=self.row();row.update(seed=seed,origin=P['trainOrigin'],labelsAsOf=P['trainLabelsAsOf'],labelAvailableAt=P['testOrigin'],signal=seed%2);rows.append(row)
  with self.assertRaises(AssertionError):fit(rows)
 def make_predictions(self):
  rows=[]
  for g in P['groups']:
   for t in TARGETS:
    for a in ARMS:
     for s in P['scenarios']:
      for seed in range(18301,18361):
       blocked=g in ['group-c','group-d'] or s in ['reporting-incomplete','short-history']
       rows.append({'groupId':g,'target':t,'arm':a,'scenario':s,'seed':seed,'actual':None if blocked else 10,'predictions':{} if blocked else {'recent-mean-3':20,'seasonal-naive-12':20,'ridge':20,'simple-residual':20,'random-forest':19,'gradient-boosting':21}})
  return rows
 def test_decision_support_and_fixed_thresholds(self):
  report=assess(self.make_predictions());counts={k:sum(r['decision']==k for r in report['decisions']) for k in ['adopt-for-synthetic-demo','reject','unsupported']}
  self.assertEqual(counts,{'adopt-for-synthetic-demo':16,'reject':16,'unsupported':32})
 def test_stress_failure_prevents_average_gain_adoption(self):
  rows=self.make_predictions()
  for r in rows:
   if r['scenario']=='reversed' and r['predictions']:r['predictions']['random-forest']=30
  decisions=assess(rows)['decisions'];self.assertEqual(sum(r['decision']=='adopt-for-synthetic-demo' for r in decisions),0)
 def test_missing_seed_is_not_silently_dropped(self):
  with self.assertRaises(AssertionError):assess(self.make_predictions()[1:])
if __name__=='__main__':unittest.main()
