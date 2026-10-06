"""Frozen offline group count residual models. No production imports or writes."""
import argparse,gzip,hashlib,json,platform,subprocess
from pathlib import Path
import numpy as np
import sklearn
from sklearn.ensemble import RandomForestRegressor,GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
ROOT=Path(__file__).resolve().parents[2]
OWN=Path(__file__).resolve().parent
OUT=ROOT/'docs/evidence/group-turnover-trees-v1'
P=json.loads((OWN/'protocol.json').read_text())
TARGETS=P['targets']; ARMS=P['arms']; METHODS=['ridge','random-forest','gradient-boosting']
def sha(b):return hashlib.sha256(b).hexdigest()
def encoded(obj):return (json.dumps(obj,sort_keys=True,indent=2,allow_nan=False)+'\n').encode()
def custody():
 paths=sorted([*OWN.glob('*.py'),*OWN.glob('*.json'),*OWN.glob('*.mjs'),*ROOT.glob('lib/ml/synthetic-workforce/*.mjs'),ROOT/'lib/ml/synthetic-workforce/protocol.json',ROOT/'lib/ml/group-turnover/evaluation.mjs',ROOT/'lib/ml/group-turnover/protocol.json',ROOT/'lib/ml/observable-turnover-signals/model.mjs',ROOT/'lib/ml/observable-turnover-signals/protocol.json',ROOT/'lib/ml/turnover-vintage-evaluation.mjs'])
 return {str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in paths}
def runtime():return {'python':platform.python_version(),'numpy':np.__version__,'sklearn':sklearn.__version__,'node':subprocess.check_output(['node','--version'],text=True).strip()}
def write(name,obj,zipped=False):
 data=encoded(obj)
 if zipped:data=gzip.compress(data,mtime=0)
 (OUT/name).write_bytes(data)
 return sha(data)
def read(name,zipped=False):
 data=(OUT/name).read_bytes()
 return json.loads(gzip.decompress(data) if zipped else data)
def xrow(row,arm):
 assert row['features'] is not None
 assert set(row['features'])==set(P['features']),'Unexpected features'
 values=[row['features'][name] for name in P['features']]
 assert all(isinstance(v,(int,float)) and np.isfinite(v) and v>=0 for v in values)
 if arm=='released-signal':
  assert row['signal'] in [0,1];values.append(row['signal'])
 return values
def model(method):
 cfg=dict(P['models'][method]);cfg.pop('standardize',None)
 if method=='ridge':return make_pipeline(StandardScaler(),Ridge(**cfg))
 return {'random-forest':RandomForestRegressor,'gradient-boosting':GradientBoostingRegressor}[method](**cfg)
def fit(rows):
 fits={};audit=[]
 expected=set(range(P['trainSeeds'][0],P['trainSeeds'][1]+1))
 for scenario in ['informative','no-signal']:
  for group in P['groups']:
   allrows=[r for r in rows if r['scenario']==scenario and r['groupId']==group]
   assert len(allrows)==len(expected) and {r['seed'] for r in allrows}==expected
   selected=[r for r in allrows if r['features'] is not None and r['actual'] is not None]
   for r in selected:
    assert r['origin']==P['trainOrigin'] and r['labelsAsOf']==P['trainLabelsAsOf']
    assert r['origin']<r['labelAvailableAt']<=P['trainLabelsAsOf']<P['testOrigin']
   if len(selected)<P['decisions']['minimumTrainingHistories']:
    audit.append({'scenario':scenario,'groupId':group,'n':len(selected),'status':'unsupported'})
    continue
   for target,tname in enumerate(TARGETS):
    y=np.array([r['actual'][target]-r['baselines']['recent-mean-3'][target] for r in selected],float)
    intercept=float(y.mean());cells={str(v):float(np.mean([res for r,res in zip(selected,y) if r['signal']==v])) for v in [0,1]}
    support={str(v):sum(r['signal']==v for r in selected) for v in [0,1]}
    assert min(support.values())>=10
    for arm in ARMS:
     X=np.array([xrow(r,arm) for r in selected],float)
     key=(scenario,group,tname,arm)
     models={method:model(method).fit(X,y) for method in METHODS}
     fits[key]={'models':models,'intercept':intercept,'cells':cells}
     audit.append({'scenario':scenario,'groupId':group,'target':tname,'arm':arm,'n':len(selected),'signalSupport':support,'intercept':intercept,'cells':cells,'featureNames':P['features']+(['released-signal'] if arm=='released-signal' else []),'featureSha256':sha(X.tobytes()),'residualSha256':sha(y.tobytes()),'trainingPredictionsSha256':{m:sha(np.asarray(f.predict(X),dtype=np.float64).tobytes()) for m,f in models.items()}})
 return fits,audit
def predict(rows,fits):
 results=[]
 for row in rows:
  for target,tname in enumerate(TARGETS):
   for arm in ARMS:
    output={k:row[k] for k in ['seed','scenario','groupId','origin','trainingEnd','trainingMonths','labelAvailableAt','inputFingerprint','signal','reasons']}
    output.update(target=tname,arm=arm,actual=None,predictions={})
    key=(row['scenario'] if row['scenario']=='no-signal' else 'informative',row['groupId'],tname,arm)
    if row['features'] is not None and key in fits:
     f=fits[key];chosen=arm
     if arm=='released-signal' and row['signal'] is None:
      chosen='lag-only';f=fits[(*key[:3],chosen)]
     base=row['baselines']['recent-mean-3'][target]
     output['predictions']={m:float(max(0,base+trained.predict(np.array([xrow(row,chosen)],float))[0])) for m,trained in f['models'].items()}
     correction=f['cells'][str(row['signal'])] if chosen=='released-signal' else f['intercept']
     output['predictions'].update({'recent-mean-3':base,'seasonal-naive-12':row['baselines']['seasonal-naive-12'][target],'simple-residual':max(0,base+correction)})
     output['actual']=row['actual'][target] if row['actual'] is not None else None
    results.append(output)
 return results
def metric(rows,method):
 valid=[r for r in rows if r['actual'] is not None and method in r['predictions']]
 errors=[r['predictions'][method]-r['actual'] for r in valid]
 return {'intended':len(rows),'forecasted':sum(method in r['predictions'] for r in rows),'scored':len(valid),'seedCount':len({r['seed'] for r in valid}),'mae':float(np.mean(np.abs(errors))) if errors else None,'rmse':float(np.sqrt(np.mean(np.square(errors)))) if errors else None,'bias':float(np.mean(errors)) if errors else None}
def assess(rows):
 metrics=[];decisions=[];comparators=['recent-mean-3','seasonal-naive-12','ridge','simple-residual']
 n=P['testSeeds'][1]-P['testSeeds'][0]+1
 for group in P['groups']:
  for target in TARGETS:
   for arm in ARMS:
    subset=[r for r in rows if r['groupId']==group and r['target']==target and r['arm']==arm]
    cells={}
    for scenario in P['scenarios']:
     cell=[r for r in subset if r['scenario']==scenario]
     assert len(cell)==n and len({r['seed'] for r in cell})==n
     cells[scenario]={method:metric(cell,method) for method in METHODS+comparators[:2]+['simple-residual']}
     metrics.append({'groupId':group,'target':target,'arm':arm,'scenario':scenario,'methods':cells[scenario]})
    for candidate in ['random-forest','gradient-boosting']:
     failures=[];unsupported=False;paired=[]
     for scenario,methods in cells.items():
      if scenario in ['reporting-incomplete','short-history']:
       if any(m['forecasted'] for m in methods.values()):failures.append({'scenario':scenario,'reason':'blocked-control-produced-forecast'})
       continue
      if any(m['scored']!=n or m['seedCount']!=n for m in methods.values()):unsupported=True;continue
      for comp in comparators:
       delta=methods[candidate]['mae']-methods[comp]['mae']
       paired.append({'scenario':scenario,'comparator':comp,'commonScored':n,'maeDelta':delta})
       limit=methods[comp]['mae']*(.95 if scenario=='informative' else 1.1)
       if methods[candidate]['mae']>limit:failures.append({'scenario':scenario,'comparator':comp,'candidateMae':methods[candidate]['mae'],'limit':limit,'reason':'informative-benefit' if scenario=='informative' else 'stress-degradation'})
     decisions.append({'groupId':group,'target':target,'arm':arm,'method':candidate,'decision':'unsupported' if unsupported else 'reject' if failures else 'adopt-for-synthetic-demo','failures':failures,'pairedComparisons':paired})
 return {'metrics':metrics,'decisions':decisions,'unit':'60 distinct seed histories per scenario; groups/targets/arms/scenarios are correlated','uncertainty':None,'productionChange':False}
def generate(split):
 result=subprocess.run(['node',str(OWN/'extract.mjs'),split],cwd=ROOT,check=True,capture_output=True,text=True)
 print(result.stderr,end='',flush=True)
 return json.loads(result.stdout)
def train():
 rows=generate('training');_,audit=fit(rows)
 trainsha=write('training-rows.json.gz',rows,True)
 report={'protocolSha256':sha((OWN/'protocol.json').read_bytes()),'custody':custody(),'runtime':runtime(),'trainingRowsSha256':trainsha,'fits':audit}
 write('training-fit.json',report);print('Training audit frozen; commit it before evaluate.',flush=True)
def evaluate(check=False):
 frozen=read('training-fit.json');assert frozen['custody']==custody();assert frozen['runtime']==runtime()
 assert sha((OUT/'training-rows.json.gz').read_bytes())==frozen['trainingRowsSha256']
 fits,audit=fit(read('training-rows.json.gz',True));assert audit==frozen['fits'],'Refit parity failed'
 test=generate('test');predictions=predict(test,fits)
 report={'protocolSha256':sha((OWN/'protocol.json').read_bytes()),'trainingFitSha256':sha((OUT/'training-fit.json').read_bytes()),'custody':custody(),'runtime':runtime(),'caseRows':len(test),'predictionRows':len(predictions),**assess(predictions)}
 payloads={'test-cases.json.gz':gzip.compress(encoded({'rows':test,'predictions':predictions}),mtime=0),'report.json':encoded(report)}
 for name,data in payloads.items():
  if check:assert (OUT/name).read_bytes()==data,f'Reproduction failed: {name}'
  else:(OUT/name).write_bytes(data)
 print(json.dumps({'status':'verified' if check else 'evaluated','decisions':{d:sum(r['decision']==d for r in report['decisions']) for d in ['adopt-for-synthetic-demo','reject','unsupported']},'reportSha256':sha(payloads['report.json'])}),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['train','evaluate','check']);args=parser.parse_args()
 OUT.mkdir(parents=True,exist_ok=True)
 if args.phase=='train':train()
 else:evaluate(args.phase=='check')
