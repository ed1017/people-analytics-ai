"""Audit preserved count predictions only; never import generators or estimators."""
import argparse
from collections import Counter
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
PROTOCOL=json.loads((HERE/'protocol.json').read_text())
OUTPUT=ROOT/'docs/evidence/company-count-rf-final-review-v1/report.json'


def sha(content):return hashlib.sha256(content).hexdigest()


def near(a,b):
    assert math.isclose(a,b,rel_tol=1e-11,abs_tol=1e-11),(a,b)


def metrics(actual,predicted):
    assert len(actual)==len(predicted)==3
    assert all(math.isfinite(p) and p>=0 for p in predicted)
    error=[p-y for p,y in zip(predicted,actual)]
    return dict(mae=statistics.mean(abs(e) for e in error),quarterTotalAbsoluteError=abs(sum(error)))


def build():
    source=ROOT/PROTOCOL['inputDirectory']
    for name,expected in PROTOCOL['inputs'].items():assert sha((source/name).read_bytes())==expected,name
    training=json.loads((source/'training.json').read_text())
    original=json.loads((source/'test.json').read_text())
    source_hashes={**training['custody']['files'],**training['custody']['original']['implementationFiles']}
    for name,expected in source_hashes.items():assert sha((ROOT/name).read_bytes())==expected,name
    fit=next(f for f in training['fits'] if f['domain']=='turnover' and f['estimator']=='random-forest' and f['tier']=='base')
    assert fit['predictionsSha256']==PROTOCOL['candidateTrainingPredictionSha256']
    assert fit['inputSha256']==PROTOCOL['candidateInputSha256']
    assert fit['params']==dict(n_estimators=100,max_depth=4,min_samples_leaf=20,max_features=1.0)
    assert fit['trainingRows']==8190 and fit['trainingWeight']==8190
    assert not any(k.startswith(('performance_','promotion_')) for k in fit['names'])
    all_cases=json.loads(gzip.decompress((source/'test-cases.json.gz').read_bytes()))
    cases=[c for c in all_cases if c['domain']=='turnover']
    del all_cases
    assert len(cases)==1400 and len({c['id'] for c in cases})==1400
    methods=[PROTOCOL['candidate'],*PROTOCOL['comparators']]
    scored=[]
    for c in cases:
        assert c['seed'] in range(19301,19341)
        assert c['origin'] in original['protocol']['testOrigins']
        if c['status']!='predicted':
            assert c['scoring']['status']=='blocked' and not c['predictions']
            continue
        assert c['scoring']['status']=='scored' and all(m in c['predictions'] for m in methods)
        assert len(c['history'])==24
        assert all(r['effectiveAt']<=c['cutoff'] and r['availableAt']<=c['cutoff'] for r in c['audit']['selectedReleases'])
        assert c['audit']['predictorRelease']['effectiveAt']<=c['cutoff'] and c['audit']['predictorRelease']['availableAt']<=c['cutoff']
        known={r['month']:r['value'] for r in c['history']}
        assert max(known)<c['months'][0]
        seasonal=[known[f"{int(m[:4])-1:04d}{m[4:]}"] for m in c['months']]
        assert seasonal==c['predictions']['seasonal-naive-12']
        recent=statistics.mean(list(known.values())[-3:])
        for p in c['predictions']['recent-mean-3']:near(p,recent)
        labels=c['scoring']['labels']
        assert [r['month'] for r in labels]==c['months']
        assert all(r['availableAt']<=original['protocol']['testLabelsAsOf'] for r in labels)
        actual=[r['value'] for r in labels]
        values={m:metrics(actual,c['predictions'][m]) for m in methods}
        for m in methods:
            for key,value in values[m].items():near(value,c['metrics'][m][key])
        scored.append(dict(id=c['id'],seed=c['seed'],scenario=c['scenario'],origin=c['origin'],months=c['months'],
                           cutoff=c['cutoff'],trainingEnd=c['audit']['trainingEnd'],actual=actual,
                           predictions={m:c['predictions'][m] for m in methods},metrics=values))
    assert len(scored)==1360
    aggregate={m:{k:statistics.mean(r['metrics'][m][k] for r in scored) for k in PROTOCOL['metrics']} for m in methods}
    previous=next(d for d in original['domains'] if d['domain']=='turnover')
    for m in methods:
        for k in PROTOCOL['metrics']:near(aggregate[m][k],previous['methods'][m][k])
    cells=[];failures=[]
    for scenario in original['protocol']['scenarios']:
        for origin in original['protocol']['testOrigins']:
            intended=[r for r in cases if r['scenario']==scenario and r['origin']==origin]
            rows=[r for r in scored if r['scenario']==scenario and r['origin']==origin]
            assert len(intended)==40
            if not rows:
                assert scenario=='missingness' and origin=='2025-12'
                cells.append(dict(scenario=scenario,origin=origin,intended=40,scored=0,status='native-history-blocked'))
                continue
            assert len(rows)==len({r['seed'] for r in rows})==40
            summary={m:{k:statistics.mean(r['metrics'][m][k] for r in rows) for k in PROTOCOL['metrics']} for m in methods}
            cells.append(dict(scenario=scenario,origin=origin,intended=40,scored=40,status='scored',methods=summary))
            for comparator in PROTOCOL['comparators']:
                for metric in PROTOCOL['metrics']:
                    a=summary[PROTOCOL['candidate']][metric];b=summary[comparator][metric]
                    near(a,previous['scenarioOrigins'][f'{scenario}:{origin}'][PROTOCOL['candidate']][metric])
                    near(b,previous['scenarioOrigins'][f'{scenario}:{origin}'][comparator][metric])
                    if a>PROTOCOL['maximumScenarioOriginRatio']*max(b,1e-8):
                        deltas=[r['metrics'][PROTOCOL['candidate']][metric]-r['metrics'][comparator][metric] for r in rows]
                        failures.append(dict(scenario=scenario,origin=origin,metric=metric,comparator=comparator,
                                             candidateError=a,comparatorError=b,ratio=a/b,relativeWorsening=a/b-1,
                                             seeds=40,meanPairedErrorDifference=statistics.mean(deltas),
                                             wins=sum(d<0 for d in deltas),ties=sum(d==0 for d in deltas),losses=sum(d>0 for d in deltas)))
    assert failures,'No supported existing failure: this audit cannot justify adoption or invent a rejection.'
    decisive=next(f for f in failures if f['scenario']=='no-signal' and f['origin']=='2025-09' and f['comparator']=='seasonal-naive-12' and f['metric']=='quarterTotalAbsoluteError')
    evidence=[r for r in scored if r['scenario']==decisive['scenario'] and r['origin']==decisive['origin']]
    old_decision=next(d for d in previous['decisions'] if d['method']==PROTOCOL['candidate'])
    assert old_decision['decision']=='adopt-for-synthetic-demo' and old_decision['failures']==[]
    return dict(protocol=PROTOCOL,decision='reject',decisionFinal=True,priorNarrowGate=old_decision,
                reason='Existing seasonal-naive quarter-total failure closes broader review; no new holdout necessary.',
                candidateFit=fit,fitCutoff=training['protocol']['fitLabelsAsOf'],trainingSeeds=training['protocol']['trainSeeds'],
                sourceFilesVerified=len(source_hashes),sourceHashes=source_hashes,
                reviewFiles={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sorted(HERE.glob('*')) if p.suffix in ('.py','.json')},
                coverage=dict(intended=1400,scored=1360,blocked=40,independentSeedClusters=40,
                              nativeBlockedReasonCounts=dict(Counter(r for c in cases if c['status']=='blocked' for r in c['reasons'])),
                              commonAvailability=True,changedSupport=False),
                aggregate=aggregate,scenarioOrigins=cells,failures=failures,decisiveFailure=decisive,decisiveCases=evidence,
                newSeedsGenerated=0,newFits=0,newHoldout=False,operationallyQualified=False,publishedInterval=None)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['write','check']);args=p.parse_args()
    report=build();content=(json.dumps(report,indent=2,sort_keys=True,allow_nan=False)+'\n').encode()
    if args.mode=='check':assert OUTPUT.read_bytes()==content,'Final review differs'
    else:
        assert not OUTPUT.exists(),'Preserve existing evidence; use check'
        OUTPUT.parent.mkdir(parents=True,exist_ok=True);OUTPUT.write_bytes(content)
    print(json.dumps(dict(status='verified' if args.mode=='check' else 'written',decision=report['decision'],decisiveFailure=report['decisiveFailure'],newSeedsGenerated=0,newFits=0,sha256=sha(content))))
