"""Run frozen native-gated hiring-duration experiment; no product imports or services."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile
from datetime import date, timedelta
import numpy as np
import sklearn
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'docs/evidence/hiring-duration-trees-v1'
P = json.loads((HERE / 'protocol.json').read_text())
D = timedelta(days=1)
CALENDAR = np.array([[0,1],[.5,math.sqrt(3)/2],[math.sqrt(3)/2,.5],[1,0],[math.sqrt(3)/2,-.5],[.5,-math.sqrt(3)/2],[0,-1],[-.5,-math.sqrt(3)/2],[-math.sqrt(3)/2,-.5],[-1,0],[-math.sqrt(3)/2,.5],[-.5,math.sqrt(3)/2]])


def sha(data):
    return hashlib.sha256(data).hexdigest()


def custody():
    return {str(p.relative_to(ROOT)): sha(p.read_bytes()) for p in sorted(HERE.rglob('*')) if p.is_file() and p.suffix in ['.py','.mjs','.ts','.json']}


def generate(seed, scenario):
    """Invented all-opening history; hidden duration mechanism never becomes a feature."""
    if scenario not in P['scenarios']:
        raise ValueError('Unknown scenario')
    rng = np.random.default_rng(seed)
    rows = []
    for month in range(69):
        year, mon = 2021 + month // 12, month % 12 + 1
        for index in range(4 if scenario == 'small-support' else 20):
            opened = date(year, mon, index + 1)
            sine, cosine = CALENDAR[mon-1]
            signal = .27*sine + .15*cosine
            if scenario == 'nonlinear-seasonal':
                signal = .36 * (mon in [2,3,8,9]) - .18
            if scenario == 'no-signal':
                signal = 0
            drift = .018*max(0,month-48) if scenario == 'gradual-drift' else 0
            elapsed = int(np.clip(round(np.expm1(3.8 + signal + drift + rng.normal(0,.12))), 8, 120))
            cancelled = index == 0 and month % 3 == 0
            start, close = opened + elapsed*D, opened + (elapsed-5)*D
            observed = start + (30 if scenario == 'delayed-labels' else 2)*D
            missing = scenario == 'missing-labels' and index % 6 == 0 and not cancelled
            rows.append(dict(requisitionId=f'synthetic-{seed}-{month}-{index}',jobProfileCode='SYNTHETIC_ROLE',externalInternal='external',status='cancelled' if cancelled else 'filled',openedDate=opened.isoformat(),closedDate=close.isoformat(),startDate=None if cancelled else start.isoformat(),timeToFillDays=5,labelFirstObservedAt=None if cancelled or missing else observed.isoformat()+'T00:00:00.000Z'))
    return rows


def native(rows):
    manifest = dict(source='invented-duration-calendar-history',sourceDefinitionVersion=P['version'],provenance='synthetic',purpose='method-validation-only',jobProfileCode='SYNTHETIC_ROLE',asOf=P['asOf'],openingCoverageStart=P['openingCoverageStart'],cohortCoverage='all-openings',openingScopeVerified=True,statusHistoryVerified=True)
    provenance = dict(experimentId=P['version'],sourceDefinitionSha256=sha((HERE/'run.py').read_bytes()),candidateCodeSha256=sha((HERE/'run.py').read_bytes()),evaluatorGitSha=P['referenceCommit'])
    result = subprocess.run(['node','--disable-warning=ExperimentalWarning',str(HERE/'reference_bridge.mjs')],input=json.dumps(dict(manifest=manifest,rows=rows,provenance=provenance)),text=True,capture_output=True,check=True)
    return json.loads(result.stdout)


def xy(rows):
    return np.array([CALENDAR[int(r['openedDate'][5:7])-1] for r in rows]), np.array([(date.fromisoformat(r['startDate'])-date.fromisoformat(r['openedDate'])).days for r in rows])


def metrics(y, pred):
    error = np.asarray(pred)-y
    return dict(count=len(y),maeDays=float(np.mean(abs(error))),medianAbsoluteErrorDays=float(np.median(abs(error))),p90AbsoluteErrorDays=float(np.quantile(abs(error),.9)),meanSignedErrorDays=float(np.mean(error)))


def fit_predictions(training, scoring, penalty):
    x, y = xy(training)
    sx, _ = xy(scoring)
    center, scale = x.mean(axis=0), x.std(axis=0)
    scale[scale == 0] = 1
    z, sz = (x-center)/scale, (sx-center)/scale
    models = {'ridge':Ridge(alpha=penalty),'random-forest':RandomForestRegressor(**P['models']['random-forest']),'gradient-boosting':GradientBoostingRegressor(**P['models']['gradient-boosting'])}
    predictions = {}
    for name, model in models.items():
        model.fit(z,np.log1p(y))
        predictions[name] = np.maximum(0,np.expm1(model.predict(sz)))
    return predictions


def assess_case(seed, scenario):
    rows = generate(seed,scenario)
    ref = native(rows)
    report = ref['report']
    summary = dict(seed=seed,scenario=scenario,datasetFingerprint=report['datasetFingerprint'],qualified=report['candidateReviewGatesPassed'],folds=[],ridgeParityMaximumAbsoluteDays=0)
    if not summary['qualified']:
        summary['blockedGates'] = {f['name']:f['failedGates'] for f in report['folds']}
        return summary
    by_id = {r['requisitionId']:r for r in rows}
    for audit, fold, model in zip(ref['audit']['folds'],report['folds'],ref['models']):
        # Native Ridge sorts IDs before fitting; equal order fixes numerical audit.
        train = [by_id[i] for i in sorted(audit['trainIds'])]
        score = [by_id[i] for i in sorted(audit['scoreIds'])]
        predictions = fit_predictions(train,score,ref['penalty'])
        sx,y = xy(score)
        columns = model['columns']
        native_z = np.array([[(v-c['mean'])/c['scale'] if c['active'] else 0 for v,c in zip(row,columns)] for row in sx])
        native_pred = np.maximum(0,np.expm1(model['intercept']+native_z @ np.array(model['coefficients'])))
        discrepancy = float(np.max(abs(predictions['ridge']-native_pred)))
        if discrepancy > 1e-8:
            raise AssertionError(f'Native Ridge parity failed: {discrepancy}')
        summary['ridgeParityMaximumAbsoluteDays'] = max(summary['ridgeParityMaximumAbsoluteDays'],discrepancy)
        scores = {name:metrics(y,pred) for name,pred in predictions.items()}
        for name in ['expanding','rolling']:
            scores[name] = fold[name]['metrics']
        summary['folds'].append(dict(name=fold['name'],origin=fold['trainBefore'],cohortCount=fold['cohortCount'],scoredCount=fold['scoredCount'],observedFraction=fold['observedFraction'],trainingCount=len(train),unavailableTrainingCount=fold['unavailableTrainingCount'],ridgePenalty=ref['penalty'],metrics=scores))
    return summary


def bootstrap(differences):
    rng=np.random.default_rng(P['criteria']['bootstrap']['random_state'])
    values=np.array(differences)
    return np.quantile(values[rng.integers(0,len(values),(2000,len(values)))].mean(axis=1),[.025,.975]).tolist()


def assess(cases):
    criteria=P['criteria']
    summaries={}
    for scenario in P['scenarios']:
        valid=[c for c in cases if c['scenario']==scenario and c['qualified']]
        summaries[scenario]=dict(qualifiedSeeds=len(valid),blockedSeeds=sum(c['scenario']==scenario and not c['qualified'] for c in cases),folds={})
        if valid:
            for idx in range(4):
                summaries[scenario]['folds'][valid[0]['folds'][idx]['name']]={m:{k:float(np.mean([c['folds'][idx]['metrics'][m][k] for c in valid])) for k in ['maeDays','p90AbsoluteErrorDays','meanSignedErrorDays']} for m in valid[0]['folds'][idx]['metrics']}
    decisions={}
    for method in ['random-forest','gradient-boosting']:
        failures=[]
        intervals={}
        for scenario,s in summaries.items():
            if scenario in ['missing-labels','small-support']:
                if s['qualifiedSeeds']:
                    failures.append(f'{scenario}:expected-qualification-block')
                continue
            if s['qualifiedSeeds']<criteria['qualifiedScenarioSeedMinimum']:
                failures.append(f'{scenario}:unsupported-seed-coverage')
                continue
            for comparator in criteria['referenceComparators']:
                h=s['folds']['holdout']
                candidate,baseline=h[method],h[comparator]
                if candidate['p90AbsoluteErrorDays'] > 1.05*baseline['p90AbsoluteErrorDays']:
                    failures.append(f'{scenario}:{comparator}:holdout-p90')
                if scenario=='seasonal':
                    if baseline['maeDays']-candidate['maeDays']<2 or candidate['maeDays']>.9*baseline['maeDays']:
                        failures.append(f'{scenario}:{comparator}:holdout-mae-improvement')
                    values=[c['folds'][3]['metrics'][method]['maeDays']-c['folds'][3]['metrics'][comparator]['maeDays'] for c in cases if c['scenario']==scenario and c['qualified']]
                    intervals[comparator]=bootstrap(values)
                    if intervals[comparator][1]>=0:
                        failures.append(f'{scenario}:{comparator}:bootstrap')
                    improved=0
                    for name,fold in s['folds'].items():
                        if name=='holdout': continue
                        c,b=fold[method]['maeDays'],fold[comparator]['maeDays']
                        if b-c>=2 and c<=.9*b: improved+=1
                        if c>1.05*b:
                            failures.append(f'{scenario}:{comparator}:{name}:development-worsening')
                    if improved<2:
                        failures.append(f'{scenario}:{comparator}:development-improvement')
                elif candidate['maeDays']>1.1*baseline['maeDays']:
                    failures.append(f'{scenario}:{comparator}:stress-mae')
        decisions[method]=dict(decision='reject' if failures else 'adopt-for-synthetic-demo',failures=failures,referencePairedSeedBootstrap95=intervals)
    return dict(scenarios=summaries,decisions=decisions)


def run(destination):
    cases=[]
    for scenario in P['scenarios']:
        for seed in range(P['seeds']['start'],P['seeds']['stopExclusive']):
            cases.append(assess_case(seed,scenario))
        print(f'{scenario}: {sum(c["qualified"] for c in cases if c["scenario"]==scenario)} qualified',flush=True)
    report=dict(protocol=P,sourceSha256=custody(),runtime=dict(numpy=np.__version__,sklearn=sklearn.__version__,node=subprocess.check_output(['node','--version'],text=True).strip()),caseCount=len(cases),maximumNativeRidgeParityAbsoluteDays=max(c['ridgeParityMaximumAbsoluteDays'] for c in cases),**assess(cases))
    destination.mkdir(parents=True,exist_ok=True)
    for name,data in [('cases.json',cases),('report.json',report)]:
        (destination/name).write_text(json.dumps(data,indent=2,sort_keys=True,allow_nan=False)+'\n')
    return report


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['evaluate','check'])
    args=parser.parse_args()
    if args.action=='check':
        with tempfile.TemporaryDirectory() as temp:
            run(Path(temp))
            for name in ['cases.json','report.json']:
                if (Path(temp)/name).read_bytes() != (OUT/name).read_bytes():
                    raise AssertionError(f'Reproduction mismatch: {name}')
        print('Both evidence artifacts reproduced byte for byte.')
    else:
        if any((OUT/f).exists() for f in ['cases.json','report.json']):
            raise FileExistsError('Preserved evidence exists; use check for reproduction')
        run(OUT)

if __name__=='__main__':
    main()
