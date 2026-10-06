"""Train/freeze then evaluate fresh seeds. Existing app and previous evidence are inert."""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys

for key in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS'):
    os.environ[key]='1'
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from experiments.synthetic_tree_v1 import data as original_data, features as original_features
from experiments.synthetic_tree_v1.run import attach_baselines, source_custody as original_custody
from . import data
from .evaluation import score, summarize, PROBABILITY

ROOT=Path(__file__).resolve().parents[2]
DIRECTORY=Path(__file__).resolve().parent
EVIDENCE=ROOT/'docs/evidence/performance-promotion-trees-v1'
PROTOCOL=json.loads((DIRECTORY/'protocol.json').read_text())
ESTIMATORS=tuple(PROTOCOL['estimators'])
TIERS=tuple(PROTOCOL['featureTiers'])
canonical=original_features.canonical
digest=original_features.digest


def custody():
    return dict(original=original_custody(),protocolCommit='cd958ee',
                files={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(DIRECTORY.glob('*')) if p.suffix in ('.py','.json')})


def auxiliary_vectors(case, auxiliary):
    """The same observable auxiliary inputs are offered to every estimator."""
    if case['status']!='predicted':return
    for f in case['features']:
        if case['domain'] in ('performance','promotion'):
            base=dict(f['lags'])
            base.update({k:v for k,v in f['enriched'].items() if k.startswith('historical_denominator_')})
        else:base=dict(f['enriched'])
        f['tiers']={tier:dict(base) for tier in TIERS}
        for tier in ('performance','promotion','both'):
            f['tiers'][tier].update({k:v for k,v in auxiliary.items() if tier=='both' or k.startswith(tier+'_')})


def ses(values):
    best=(math_inf:=float('inf'),None,None)
    for alpha in (.2,.5,.8):
        level=values[0];sse=0.
        for y in values[1:]:
            sse+=(y-level)**2;level=alpha*y+(1-alpha)*level
        if sse<best[0]:best=(sse,alpha,level)
    assert best[0]<math_inf
    return {'alpha':best[1],'level':best[2],'sse':best[0]}


def own_baselines(case):
    case['predictions']={};case['metrics']={}
    if case['status']!='predicted':return
    history=case['history']; values=np.asarray([r['value'] for r in history],float)
    recent=float(np.mean(values[-3:]));last=float(values[-1])
    x=np.asarray([original_features.month_index(r['month']) for r in history],float)
    centered=x-x.mean()
    slope=float(np.dot(centered,values-values.mean())/np.dot(centered,centered))
    case['predictions']={
        'last-observation':[last]*len(case['months']),
        'recent-mean-3':[recent]*len(case['months']),
        'linear-trend':[float(np.clip(values.mean()+slope*(original_features.month_index(m)-x.mean()),0,1)) for m in case['months']]}
    if case['domain']=='promotion':
        for name,rows in [('pooled-fraction',history),('recent-3-pooled',history[-3:])]:
            denominator=sum(r['denominator'] for r in rows)
            assert denominator>0
            p=sum(r['successes'] for r in rows)/denominator
            case['predictions'][name]=[p]*len(case['months'])


def refresh(case):
    case['metrics']={m:score(case['domain'],case['scoring']['labels'],values) for m,values in case['predictions'].items()} if case['scoring']['status']=='scored' else {}


def build_cases(seeds, origins, labels_asof):
    cases=[]
    for seed in seeds:
        for scenario in PROTOCOL['scenarios']:
            old=original_data.generate_history(seed,scenario)
            new=data.generate_history(seed,scenario)
            pending=[]
            for origin in origins:
                aux=data.aux_features(new,original_features.stamp(origin,True))
                for domain in PROTOCOL['domains']:
                    history=new if domain in ('performance','promotion') else old
                    module=data if domain in ('performance','promotion') else original_features
                    case=module.make_case(history,domain,origin)
                    auxiliary_vectors(case,aux)
                    # Freeze all predictor vectors before touching target labels.
                    pending.append((case,history,module))
            for case,history,module in pending:
                case['scoring']=module.labels_for(history,case,labels_asof)
                cases.append(case)
        print(f'prepared aggregate seed {seed}',file=sys.stderr,flush=True)
    attach_baselines([c for c in cases if c['domain'] not in ('performance','promotion')])
    for c in cases:
        if c['domain'] in ('performance','promotion'):own_baselines(c)
        if c['domain']=='turnover' and c['status']=='predicted':
            c['sesAudit']=ses([r['value'] for r in c['history']])
            c['predictions']['simple-exponential-smoothing']=[c['sesAudit']['level']]*len(c['months'])
        refresh(c)
    return cases


def matrix(cases,tier,training=False,names=None):
    rows=[c for c in cases if c['status']=='predicted' and (not training or c['scoring']['status']=='scored')]
    assert rows or names, 'No eligible training rows'
    names=names or sorted(rows[0]['features'][0]['tiers'][tier])
    x=[];y=[];weights=[];locations=[]
    for case in rows:
        for index,f in enumerate(case['features']):
            vector=f['tiers'][tier]
            assert sorted(vector)==names
            x.append([np.nan if vector[k] is None else vector[k] for k in names]);locations.append((case['id'],index))
            if training:
                label=case['scoring']['labels'][index]
                assert label['month']==f['month']
                y.append(label['value']);weights.append(label['denominator'] if case['domain'] in PROBABILITY else 1.)
    return np.asarray(x,float).reshape((-1,len(names))),np.asarray(y,float),np.asarray(weights,float),locations,names


def fit(cases,domain,estimator,tier):
    for c in cases:
        if c['status']=='predicted' and c['scoring']['status']=='scored':
            assert c['cutoff']<=PROTOCOL['fitLabelsAsOf']
            assert c['scoring']['labelsAsOf']<=PROTOCOL['fitLabelsAsOf']
            assert all(l['effectiveAt']<=PROTOCOL['fitLabelsAsOf'] and l['availableAt']<=PROTOCOL['fitLabelsAsOf'] for l in c['scoring']['labels'])
    x,y,w,_,names=matrix(cases,tier,True)
    keep=w>0;x,y,w=x[keep],y[keep],w[keep]
    assert len(y)>=PROTOCOL['minimumTrainingRows'] and np.isfinite(y).all()
    params=PROTOCOL['estimators'][estimator]
    steps=[('imputer',SimpleImputer(strategy='median',keep_empty_features=True))]
    if estimator=='ridge':steps.extend([('scale',StandardScaler()),('model',Ridge(**params))])
    elif estimator=='random-forest':steps.append(('model',RandomForestRegressor(**params,random_state=PROTOCOL['randomState'],n_jobs=1)))
    else:steps.append(('model',GradientBoostingRegressor(**params,random_state=PROTOCOL['randomState'])))
    model=Pipeline(steps).fit(x,y,model__sample_weight=w)
    audit=dict(domain=domain,estimator=estimator,tier=tier,params=params,names=names,trainingRows=len(y),trainingWeight=float(w.sum()),
               inputSha256=hashlib.sha256(x.astype('<f8').tobytes()).hexdigest(),labelSha256=hashlib.sha256(y.astype('<f8').tobytes()).hexdigest(),
               predictionsSha256=hashlib.sha256(model.predict(x).astype('<f8').tobytes()).hexdigest(),imputer=model.named_steps['imputer'].statistics_.tolist())
    return model,audit


def predict(fitted,cases,domain,tier):
    model,audit=fitted;x,_,_,locations,_=matrix(cases,tier,names=audit['names'])
    values=model.predict(x) if len(x) else []
    upper=1 if domain in PROBABILITY else 100 if domain=='satisfaction' else np.inf
    values=np.clip(values,0,upper);assert np.isfinite(values).all()
    result={}
    for (cid,_),value in zip(locations,values):result.setdefault(cid,[]).append(float(value))
    return result


def train():
    origins=[];month=PROTOCOL['trainingOrigins']['first']
    while month<=PROTOCOL['trainingOrigins']['last']:
        origins.append(month);month=original_features.month_add(month,3)
    cases=build_cases(range(PROTOCOL['trainSeeds'][0],PROTOCOL['trainSeeds'][1]+1),origins,PROTOCOL['fitLabelsAsOf'])
    audits=[];models={}
    for domain in PROTOCOL['domains']:
        subset=[c for c in cases if c['domain']==domain]
        for estimator in ESTIMATORS:
            for tier in TIERS:
                fitted=fit(subset,domain,estimator,tier);models[(domain,estimator,tier)]=fitted;audits.append(fitted[1])
        print(f'fitted frozen models for {domain}',file=sys.stderr,flush=True)
    report=dict(protocol=PROTOCOL,custody=custody(),trainingCases=len(cases),caseSha256=digest(cases),fits=audits,
                testSeedsGenerated=False,selection='none-fixed-settings',operationallyQualified=False)
    return cases,report,models


def write_or_check(path,contents,check):
    if check:assert path.read_bytes()==contents, f'Artifact differs: {path}'
    else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(contents)


def artifacts(cases,report,phase,check):
    write_or_check(EVIDENCE/f'{phase}.json',(json.dumps(report,indent=2,sort_keys=True,allow_nan=False)+'\n').encode(),check)
    write_or_check(EVIDENCE/f'{phase}-cases.json.gz',gzip.compress(canonical(cases).encode(),mtime=0),check)


def execute(phase):
    check=phase=='check'
    cases,training,models=train()
    if phase=='train' or check:artifacts(cases,training,'training',check)
    if phase=='train':return
    saved=json.loads((EVIDENCE/'training.json').read_text())
    assert saved==training,'Training/source audit changed after freeze'
    assert gzip.decompress((EVIDENCE/'training-cases.json.gz').read_bytes()).decode()==canonical(cases)
    cases=build_cases(range(PROTOCOL['testSeeds'][0],PROTOCOL['testSeeds'][1]+1),PROTOCOL['testOrigins'],PROTOCOL['testLabelsAsOf'])
    for domain in PROTOCOL['domains']:
        subset=[c for c in cases if c['domain']==domain]
        for estimator in ESTIMATORS:
            for tier in TIERS:
                results=predict(models[(domain,estimator,tier)],subset,domain,tier)
                for c in subset:
                    if c['id'] in results:c['predictions'][f'{estimator}-{tier}']=results[c['id']]
        for c in subset:refresh(c)
    report=dict(protocol=PROTOCOL,custody=custody(),trainingReportSha256=hashlib.sha256((EVIDENCE/'training.json').read_bytes()).hexdigest(),
                caseSha256=digest(cases),cases=len(cases),domains=summarize(cases,PROTOCOL),
                operationallyQualified=False,publishedInterval=None)
    artifacts(cases,report,'test',check)
    print(json.dumps(dict(status='verified' if check else 'written',cases=len(cases),decisions={d['domain']:[x['decision'] for x in d['decisions']] for d in report['domains']})))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['train','evaluate','check']);execute(parser.parse_args().phase)
