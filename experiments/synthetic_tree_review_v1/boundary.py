"""Observable review gates; neither target outcomes nor scenario IDs enter choices."""
from __future__ import annotations
import numpy as np
from ..synthetic_tree_v1.features import make_case
from ..synthetic_tree_v1.data import PREDICTOR_NAMES


def stability_score(case, floor=1.0):
    if case['domain'] != 'satisfaction' or case['status'] != 'predicted':
        return None
    ys=np.asarray([row['value'] for row in case['history'][-8:]],dtype=float)
    if len(ys)!=8 or not np.isfinite(ys).all():
        raise ValueError('Eight complete observable waves required')
    differences=np.diff(ys)
    mad=float(np.median(np.abs(differences-np.median(differences))))
    xs=np.arange(4,dtype=float); centered=xs-xs.mean()
    slope=float(np.sum(centered*(ys[-4:]-ys[-4:].mean()))/np.sum(centered**2))
    return abs(slope)/max(mad,floor)


def fit_boundaries(cases, protocol):
    # These cases contain no target scoring labels. Only prior released inputs.
    if any(case.get('scoring',{}).get('labels') for case in cases):
        raise ValueError('Calibration must not contain target labels')
    exposure={}
    for domain in protocol['domains']:
        selected=[row for row in cases if row['domain']==domain and row['status']=='predicted']
        if len(selected)<100 or len({row['seed'] for row in selected})<20:
            raise ValueError('Insufficient independent calibration support')
        values=[row['features'][0]['enriched']['historical_denominator_mean3'] for row in selected]
        cuts=np.quantile(values,[1/3,2/3],method='linear').tolist()
        exposure[domain]={'cuts':cuts,'cases':len(selected),'uniqueSeeds':len({row['seed']for row in selected})}
    survey=[row for row in cases if row['domain']=='satisfaction' and row['status']=='predicted']
    scores=[stability_score(row,protocol['gate']['differenceMadFloor']) for row in survey]
    return {'exposure':exposure,'survey':{'threshold':float(np.quantile(scores,protocol['gate']['quantile'],method=protocol['gate']['quantileMethod'])),
            'quantile':protocol['gate']['quantile'],'quantileMethod':protocol['gate']['quantileMethod'],'cases':len(survey),
            'uniqueSeeds':len({row['seed']for row in survey}),'minimum':min(scores),'maximum':max(scores)},
            'targetLabelsUsed':False,'operationallyQualified':False}


def annotate_case(case, boundaries, protocol):
    if case['status']!='predicted':
        case['groups']={'exposure':None,'predictorMissing':None,'stale':None}
        case['gate']={'accepted':False,'score':None,'threshold':None,'reason':'native-forecast-abstained'}
        return case
    features=case['features'][0]['enriched']
    cuts=boundaries['exposure'][case['domain']]['cuts']
    denominator=features['historical_denominator_mean3']
    case['groups']={'exposure':'low' if denominator<=cuts[0] else 'middle' if denominator<=cuts[1] else 'high',
       'predictorMissing':any(features[name] is None for name in PREDICTOR_NAMES[case['domain']]),
       'stale':features['predictor_age_days'] is None or features['predictor_age_days']>60}
    score=stability_score(case,protocol['gate']['differenceMadFloor'])
    threshold=boundaries['survey']['threshold'] if case['domain']=='satisfaction' else None
    accepted=score is None or score<=threshold
    case['gate']={'accepted':accepted,'score':score,'threshold':threshold,'reason':None if accepted else 'observable-survey-instability'}
    return case


def review_case(history, domain, origin, world, boundaries, protocol):
    case=make_case(history,domain,origin)
    case['id']=world+':'+case['id'];case['world']=world
    return annotate_case(case,boundaries,protocol)
