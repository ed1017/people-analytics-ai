"""Frozen two-stage benchmark. Run tuning and commit choices before opening test seeds."""
from __future__ import annotations
import argparse
from collections import Counter
import gzip
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys

# Deterministic numeric runtime; established packages, no runtime downloads.
for name in ('OPENBLAS_NUM_THREADS', 'OMP_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ[name] = '1'
import numpy as np
import scipy
import sklearn
from .data import generate_history
from .features import canonical, digest, make_case, labels_for, month_add
from .models import fit_model, predict_model, grid_for, feature_tier
from .metrics import score_case, summarize

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT/'experiments/synthetic_tree_v1'
EVIDENCE = ROOT/'docs/evidence/synthetic-tree-benchmarks-v1'
PROTOCOL = json.loads((DIRECTORY/'protocol.json').read_text())
PROTOCOL_COMMIT = 'a387fec'


def sha(bytes_):
    return hashlib.sha256(bytes_).hexdigest()


def source_custody():
    paths = sorted([*DIRECTORY.glob('*.py'), *DIRECTORY.glob('*.mjs'), DIRECTORY/'protocol.json', DIRECTORY/'requirements.txt',
                    *ROOT.glob('lib/ml/*.mjs'), *ROOT.glob('lib/ml/*.ts'), *ROOT.glob('lib/ml/synthetic-domain-predictions/*.mjs'), ROOT/'lib/ml/synthetic-workforce/common.mjs', ROOT/'tests/synthetic-tree-baselines.test.mjs'])
    return {'implementationFiles': {str(path.relative_to(ROOT)):sha(path.read_bytes()) for path in paths}, 'protocolSha256':digest(PROTOCOL),
            'protocolFrozenCommit':PROTOCOL_COMMIT,'runtime':{'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__,
            'scikitLearn':sklearn.__version__,'node':subprocess.check_output(['node','--version'],text=True).strip(),'numericThreads':1}}


def check_custody(saved):
    assert saved == source_custody(), 'Source or runtime changed after tuning freeze'


def seeds(name):
    low, high = PROTOCOL[name+'Seeds']
    return list(range(low, high+1))


def origins(first, last):
    output=[]
    while first <= last:
        output.append(first); first=month_add(first,3)
    return output


def attach_baselines(cases):
    eligible = [case for case in cases if case['status']=='predicted']
    batch = {'cases':[{key:case[key] for key in ('id','domain','months','history')} for case in eligible]}
    process = subprocess.run(['node',str(DIRECTORY/'baselines.mjs')],input=canonical(batch),capture_output=True,text=True,check=True)
    returned = {row['id']:row['forecast'] for row in json.loads(process.stdout)['rows']}
    assert set(returned)=={case['id'] for case in eligible}
    for case in cases:
        case['predictions']={};case['metrics']={}
        if case['status']=='predicted':
            forecast=returned[case['id']];case['baselineAudit']=forecast['audit']
            if forecast['status']!='predicted':
                case['status']='blocked';case['reasons']=forecast['reasons'];case['scoring']={'status':'blocked','reasons':['forecast-abstained'],'labels':[]}
            else:
                for method in forecast['predictions'][0]:
                    if method!='month':case['predictions'][method]=[row[method] for row in forecast['predictions']]
        refresh_metrics(case)


def refresh_metrics(case):
    case['metrics']={method:score_case(case['domain'],case['scoring']['labels'],values) for method,values in case['predictions'].items()} if case['scoring']['status']=='scored' else {}


def build_cases(seed_values, case_origins, label_cutoff, scenarios=None):
    cases=[]
    for seed in seed_values:
        for scenario in scenarios or PROTOCOL['scenarios']:
            history=generate_history(seed,scenario)
            for domain in PROTOCOL['domains']:
                # All forecast inputs for the history are prepared before extracting target labels.
                prepared=[make_case(history,domain,origin) for origin in case_origins]
                for case in prepared:
                    case['scoring']=labels_for(history,case,label_cutoff)
                    cases.append(case)
        print(f'prepared seed {seed}',file=sys.stderr,flush=True)
    attach_baselines(cases)
    return cases


def add_predictions(cases, fitted, arm, size, domain):
    predicted=predict_model(fitted,cases,arm,domain)
    method=arm+'-'+size
    for case in cases:
        if case['id'] in predicted:
            case['predictions'][method]=predicted[case['id']]
            refresh_metrics(case)


def mae(cases, method):
    values=[case['metrics'][method]['mae'] for case in cases if method in case['metrics']]
    assert values, f'No scored tuning cases: {method}'
    return float(np.mean(values))


def compressed(value):
    return gzip.compress((canonical(value)+'\n').encode(),compresslevel=9,mtime=0)


def json_bytes(value):
    return (json.dumps(value,sort_keys=True,indent=2,allow_nan=False)+'\n').encode()


def write_or_check(files, check=False):
    if not check:EVIDENCE.mkdir(parents=True,exist_ok=True)
    for path,content in files.items():
        if check:assert (EVIDENCE/path).read_bytes()==content, f'Artifact not reproducible: {path}'
        else:(EVIDENCE/path).write_bytes(content)


def tune(check=False):
    assert not set(seeds('train')) & set(seeds('tuning'))
    assert not (set(seeds('train'))|set(seeds('tuning'))) & set(seeds('test'))
    custody=source_custody()
    train=build_cases(seeds('train'),origins(PROTOCOL['firstTrainingOrigin'],PROTOCOL['lastInitialTrainingOrigin']),PROTOCOL['initialFitCutoff'])
    tuning=build_cases(seeds('tuning'),PROTOCOL['tuningOrigins'],PROTOCOL['selectionAndRefitCutoff'])
    choices={};comparators={};candidate_results=[]
    for domain in PROTOCOL['domains']:
        training=[case for case in train if case['domain']==domain]
        validation=[case for case in tuning if case['domain']==domain]
        assert {case['seed'] for case in training} <= set(seeds('train'))
        choices[domain]={};comparators[domain]={}
        for arm in PROTOCOL['modelArms']:
            options=[]
            for index,params in enumerate(grid_for(arm,PROTOCOL)):
                fitted=fit_model(training,arm,params,PROTOCOL,PROTOCOL['initialFitCutoff'])
                add_predictions(validation,fitted,arm,'full',domain)
                error=mae(validation,arm+'-full')
                options.append((error,index,params,fitted))
                candidate_results.append({'domain':domain,'arm':arm,'gridIndex':index,'params':params,'mae':error,'fit':fitted[2]})
            best=min(options,key=lambda item:(item[0],item[1]))
            choices[domain][arm]={'gridIndex':best[1],'params':best[2],'tuningMae':best[0]}
            add_predictions(validation,best[3],arm,'full',domain)
            print(f'tuned {domain} {arm}',file=sys.stderr,flush=True)
        local_methods=sorted({method for case in validation for method in case['predictions'] if not method.endswith('-full')})
        for tier in ('lags','enriched'):
            simple=local_methods+['ridge-'+tier+'-full']
            comparators[domain][tier]=min(simple,key=lambda method:(mae(validation,method),simple.index(method)))
    artifact=compressed({'training':train,'tuning':tuning})
    report={'phase':'tuning-only-no-test-seeds','protocol':PROTOCOL,'custody':custody,'choices':choices,'comparators':comparators,
            'candidates':candidate_results,'trainCases':len(train),'tuningCases':len(tuning),
            'caseCounts':dict(Counter(domain+':'+stage+':'+status for stage,rows in [('train',train),('tuning',tuning)] for domain in PROTOCOL['domains'] for status in ['predicted','blocked'] for case in rows if case['domain']==domain and case['status']==status)),
            'artifact':{'path':'tuning-cases.json.gz','sha256':sha(artifact),'bytes':len(artifact)},'publishedInterval':None,'operationallyQualified':False}
    files={'tuning-cases.json.gz':artifact,'tuning.json':json_bytes(report)}
    write_or_check(files,check)
    return {'phase':'tuning','status':'verified' if check else 'written','reportSha256':sha(files['tuning.json']),'comparators':comparators}


def evaluate(check=False):
    tuning_bytes=(EVIDENCE/'tuning.json').read_bytes();tuning=json.loads(tuning_bytes)
    check_custody(tuning['custody'])
    assert sha((EVIDENCE/tuning['artifact']['path']).read_bytes())==tuning['artifact']['sha256']
    # A separate saved/committed tuning artifact is required; never select parameters here.
    train=build_cases(seeds('train'),origins(PROTOCOL['firstTrainingOrigin'],PROTOCOL['lastRefitTrainingOrigin']),PROTOCOL['selectionAndRefitCutoff'])
    fits={};audits=[]
    for domain in PROTOCOL['domains']:
        for arm in PROTOCOL['modelArms']:
            for size,count in PROTOCOL['trainingSizes'].items():
                allowed=set(seeds('train')[:count]);training=[case for case in train if case['domain']==domain and case['seed'] in allowed]
                assert {case['seed'] for case in training} <= allowed and not allowed & set(seeds('test'))
                fitted=fit_model(training,arm,tuning['choices'][domain][arm]['params'],PROTOCOL,PROTOCOL['selectionAndRefitCutoff'])
                fits[(domain,arm,size)]=fitted;audits.append({'domain':domain,'size':size,**fitted[2]})
        print(f'final refit {domain}',file=sys.stderr,flush=True)
    # No test history is generated until all models and preprocessors have been fit.
    test=build_cases(seeds('test'),PROTOCOL['testOrigins'],PROTOCOL['testLabelsAsOf'])
    for (domain,arm,size),fitted in fits.items():
        add_predictions([case for case in test if case['domain']==domain],fitted,arm,size,domain)
    artifact=compressed({'rows':test,'refitAudits':audits,'refitTrainingCasesSha256':digest(train)})
    report={'kind':'synthetic-random-forest-gradient-boosting-benchmark','protocol':PROTOCOL,'custody':source_custody(),
            'tuningSha256':sha(tuning_bytes),'comparators':tuning['comparators'],'testHistories':len(seeds('test'))*len(PROTOCOL['scenarios']),
            'testCases':len(test),'refitTrainingCases':len(train),'refitAudits':audits,'summaries':summarize(test,tuning['comparators'],PROTOCOL),
            'artifact':{'path':'test-cases.json.gz','sha256':sha(artifact),'bytes':len(artifact)},
            'units':{'turnover':'monthly voluntary-exit count','hiring':'opening-weighted MAE percentage points; all-opening 90-day start fraction','satisfaction':'quarterly respondent-favorable-share score points'},
            'publishedInterval':None,'rateForecast':None,'causalEffect':None,'reservedQuarterScore':None,'operationallyQualified':False,'realWorldPerformanceValidated':False}
    files={'test-cases.json.gz':artifact,'report.json':json_bytes(report)}
    write_or_check(files,check)
    return {'phase':'test','status':'verified' if check else 'written','reportSha256':sha(files['report.json']),'cases':len(test),
            'recommendations':[{'domain':row['domain'],'method':row['method'],'recommendation':row['recommendation']} for row in report['summaries']['comparisons'] if row['size']=='full']}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['tune','evaluate','check']);args=parser.parse_args()
    if args.phase=='tune':result=tune()
    elif args.phase=='evaluate':result=evaluate()
    else:
        print(canonical(tune(check=True)),flush=True);result=evaluate(check=True)
    print(canonical(result),flush=True)

if __name__=='__main__':main()
