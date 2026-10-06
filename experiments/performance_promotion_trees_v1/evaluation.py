"""Frozen comparisons of point forecasts; no operational qualification."""
from collections import Counter
import math
import numpy as np

PROBABILITY = ('performance', 'promotion', 'hiring')


def score(domain, labels, values):
    assert len(labels) == len(values) > 0
    p = np.asarray(values, float)
    assert np.isfinite(p).all()
    y = np.asarray([v['value'] for v in labels], float)
    assert np.isfinite(y).all()
    weights = np.asarray([v['denominator'] for v in labels], float) if domain in PROBABILITY else np.ones(len(y))
    assert (weights >= 0).all() and weights.sum() > 0
    e = p - y
    scale = 100 if domain in PROBABILITY else 1
    result = dict(mae=float(scale*np.average(abs(e), weights=weights)),
                  rmse=float(scale*np.sqrt(np.average(e*e, weights=weights))),
                  bias=float(scale*np.average(e, weights=weights)))
    if domain == 'turnover':
        result['quarterTotalAbsoluteError'] = float(abs(e.sum()))
    if domain in PROBABILITY:
        assert ((p >= 0) & (p <= 1)).all() and ((y >= 0) & (y <= 1)).all()
        success = np.asarray([v.get('successes', v.get('startsWithin90')) for v in labels], float)
        assert np.isfinite(success).all() and (success >= 0).all() and (success <= weights).all()
        assert np.allclose(success[weights>0]/weights[weights>0], y[weights>0], rtol=0, atol=1e-12)
        q = np.clip(p, 1e-12, 1-1e-12)
        result.update(brier=float(np.sum(success*(1-p)**2+(weights-success)*p*p)/weights.sum()),
                      logLoss=float(-np.sum(success*np.log(q)+(weights-success)*np.log1p(-q))/weights.sum()))
    return result


def means(rows, method):
    rows = [r for r in rows if method in r.get('metrics', {})]
    keys = sorted(rows[0]['metrics'][method]) if rows else []
    return dict(cases=len(rows), seeds=len({r['seed'] for r in rows}),
                **{k:float(np.mean([r['metrics'][method][k] for r in rows])) for k in keys})


def reliability(rows, method):
    points = [(r['seed'], p, y['value'], y['denominator']) for r in rows for y,p in zip(r['scoring']['labels'],r['predictions'][method]) if y['denominator'] > 0]
    bins=[]
    for b in range(10):
        selected=[x for x in points if min(9,int(x[1]*10)) == b]
        n=sum(x[3] for x in selected)
        predicted=sum(x[1]*x[3] for x in selected)/n if n else None
        observed=sum(x[2]*x[3] for x in selected)/n if n else None
        bins.append(dict(bin=b,denominator=n,rows=len(selected),seeds=len({x[0] for x in selected}),
                         predicted=predicted,observed=observed,
                         sparse=len({x[0] for x in selected})<5 or n<500))
    n=sum(b['denominator'] for b in bins)
    assert n > 0
    return dict(denominator=n,biasPercentagePoints=100*sum((p-y)*w for _,p,y,w in points)/n,
                ecePercentagePoints=100*sum(b['denominator']*abs(b['predicted']-b['observed']) for b in bins if b['denominator'])/n,bins=bins)


def summarize(cases, protocol):
    output=[]
    for domain in protocol['domains']:
        source=[r for r in cases if r['domain']==domain]
        rows=[r for r in source if r['scoring']['status']=='scored' and r['predictions']]
        methods=sorted(set.intersection(*(set(r['metrics']) for r in rows))) if rows else []
        groups={f"{s}:{o}":[r for r in rows if r['scenario']==s and r['origin']==o]
                for s in protocol['scenarios'] for o in protocol['testOrigins']}
        cell_scope={}
        native_reasons={'missing-calendar-history','incomplete-released-history','incomparable-instrument-history',
                        'missing-calendar-cohort','incomplete-horizon-labels','insufficient-positive-cohorts',
                        'incomplete-calendar-window','incomplete-released-labels','incomparable-wave-history','fixed-optimizer-failed'}
        identity_reasons={'future-instrument-identity-mismatch','future-wave-identity-mismatch'}
        for key,paired in groups.items():
            s,o=key.split(':');intended=[r for r in source if r['scenario']==s and r['origin']==o]
            native=bool(intended) and all(r['status']=='blocked' and set(r['reasons']) & native_reasons for r in intended)
            incomparable=bool(intended) and all(r['status']=='predicted' and set(r['scoring'].get('reasons',[])) & identity_reasons for r in intended)
            cell_scope[key]=dict(intended=len(intended),scored=len(paired),
                                 status='scored' if paired else 'native-unsupported' if native else 'instrument-incomparable' if incomparable else 'unexpected-no-support')
        strata={k:{m:means(v,m) for m in methods} for k,v in groups.items()}
        horizons={}
        for h in range(1,4):
            selected=[]
            for row in rows:
                for i,target in enumerate(row['months']):
                    # Calendar horizon, not distance from last released observation.
                    lead=(int(target[:4])-int(row['origin'][:4]))*12+int(target[5:])-int(row['origin'][5:])
                    if lead==h:
                        copy=dict(row,metrics={m:score(domain,[row['scoring']['labels'][i]],[row['predictions'][m][i]]) for m in methods})
                        selected.append(copy)
            if selected:horizons[str(h)]={m:means(selected,m) for m in methods}
        overall={m:means(rows,m) for m in methods}
        calibration={m:reliability(rows,m) for m in methods} if domain in PROBABILITY else {}
        decisions=[]
        for estimator in ('random-forest','gradient-boosting'):
            for tier in protocol['featureTiers']:
                method=f'{estimator}-{tier}'
                comparators=[f'ridge-{tier}',protocol['nativePrimary'][domain]]
                if domain=='turnover':comparators.append('simple-exponential-smoothing')
                fails=[]
                if method not in overall:
                    decisions.append(dict(method=method,decision='unsupported',failures=['no-scored-support']));continue
                fails.extend(dict(gate='unexpected-empty-cell',cell=k) for k,v in cell_scope.items() if v['status']=='unexpected-no-support')
                for comparator in comparators:
                    metrics=['mae']+(['quarterTotalAbsoluteError'] if domain=='turnover' else [])
                    for metric in metrics:
                        baseline=overall[comparator][metric]
                        if overall[method][metric] > .95*baseline:
                            fails.append(dict(gate='aggregate-five-percent',comparator=comparator,metric=metric,observed=overall[method][metric],limit=.95*baseline))
                        for key, values in strata.items():
                            if not groups[key]:continue
                            if values[method]['seeds']<20:
                                fails.append(dict(gate='insufficient-cell-seeds',cell=key,seeds=values[method]['seeds']))
                            if values[method][metric]>1.1*max(1e-8,values[comparator][metric]):
                                fails.append(dict(gate='scenario-origin',cell=key,comparator=comparator,metric=metric,observed=values[method][metric],limit=1.1*values[comparator][metric]))
                    for h,values in horizons.items():
                        if values[method]['mae']>1.1*max(1e-8,values[comparator]['mae']):
                            fails.append(dict(gate='horizon',horizon=h,comparator=comparator,observed=values[method]['mae'],limit=1.1*values[comparator]['mae']))
                    if domain in PROBABILITY:
                        for metric in ('brier','logLoss'):
                            if overall[method][metric]>1.02*overall[comparator][metric]:
                                fails.append(dict(gate='proper-score',metric=metric,comparator=comparator))
                if domain in PROBABILITY:
                    for key,limit in [('biasPercentagePoints',3),('ecePercentagePoints',5)]:
                        if abs(calibration[method][key])>limit:fails.append(dict(gate=key,observed=calibration[method][key],limit=limit))
                decisions.append(dict(method=method,decision='reject' if fails else 'adopt-for-synthetic-demo',failures=fails))
        ablations=[]
        for estimator in ('ridge','random-forest','gradient-boosting'):
            base=f'{estimator}-base'
            for tier in ('performance','promotion','both'):
                method=f'{estimator}-{tier}'
                if method not in overall:continue
                failures=[k for k,v in strata.items() if groups[k] and v[method]['mae']>1.1*max(1e-8,v[base]['mae'])]
                improvement=1-overall[method]['mae']/max(1e-8,overall[base]['mae'])
                ablations.append(dict(method=method,base=base,relativeMaeImprovement=improvement,failedCells=failures,
                                      decision='useful-for-this-simulation' if improvement>=.05 and not failures else 'no-demonstrated-robust-value'))
        output.append(dict(domain=domain,intended=len(source),forecasted=sum(bool(r['predictions']) for r in source),
                           scored=len(rows),independentSeedClusters=len({r['seed'] for r in rows}),
                           blockedReasons=dict(Counter(reason for r in source for reason in r['reasons']+r['scoring'].get('reasons',[]))),
                           methods=overall,scenarioOrigins=strata,cellScope=cell_scope,horizons=horizons,calibration=calibration,
                           decisions=decisions,ablations=ablations))
    return output
