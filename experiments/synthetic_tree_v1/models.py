"""Established sklearn estimators with training-only preprocessing and fixed grids."""
from __future__ import annotations
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor


def grid_for(arm, protocol):
    return protocol['ridgeGrid'] if arm.startswith('ridge-') else protocol['randomForestGrid'] if arm.startswith('random-forest-') else protocol['gradientBoostingGrid']


def feature_tier(arm):
    return 'enriched' if 'enriched' in arm else 'lags'


def matrix(cases, arm, names=None, training=False):
    tier = feature_tier(arm)
    eligible = [case for case in cases if case['status'] == 'predicted' and (not training or case['scoring']['status'] == 'scored')]
    if names is None:
        names = sorted(eligible[0]['features'][0][tier]) if eligible else []
    x, y, weights, locations = [], [], [], []
    for case in eligible:
        for index, feature in enumerate(case['features']):
            assert sorted(feature[tier]) == names, 'Feature schema drift'
            x.append([np.nan if feature[tier][key] is None else feature[tier][key] for key in names])
            locations.append((case['id'], index))
            if training:
                label = case['scoring']['labels'][index]
                assert label['month'] == feature['month']
                y.append(label['value'])
                weights.append(label['denominator'] if case['domain'] == 'hiring' else 1.0)
    values = np.asarray(x, dtype=float).reshape((len(x), len(names)))
    return values, np.asarray(y, dtype=float), np.asarray(weights, dtype=float), locations, names


def fit_model(cases, arm, params, protocol, cutoff):
    for case in cases:
        if case['status'] == 'predicted' and case['scoring']['status'] == 'scored':
            assert case['cutoff'] <= cutoff
            assert case['scoring']['labelsAsOf'] <= cutoff
            assert all(label['availableAt'] <= cutoff and label['effectiveAt'] <= cutoff for label in case['scoring']['labels']), 'Unreleased fit label'
    x, y, weights, _, names = matrix(cases, arm, training=True)
    usable = weights > 0
    x, y, weights = x[usable], y[usable], weights[usable]
    if len(y) < protocol['minimumTrainingRows']:
        raise ValueError('insufficient-training-rows')
    assert np.isfinite(y).all() and np.isfinite(weights).all()
    steps = [('imputer', SimpleImputer(strategy='median', keep_empty_features=True))]
    if arm.startswith('ridge-'):
        steps += [('scale', StandardScaler()), ('model', Ridge(**params))]
    elif arm.startswith('random-forest-'):
        steps += [('model', RandomForestRegressor(**params, random_state=protocol['randomState'], n_jobs=1))]
    else:
        steps += [('model', GradientBoostingRegressor(**params, random_state=protocol['randomState']))]
    pipeline = Pipeline(steps)
    pipeline.fit(x, y, model__sample_weight=weights)
    audit = {'arm': arm, 'params': params, 'fitCutoff': cutoff, 'trainingRows': len(y), 'trainingWeight': float(weights.sum()),
             'trainingSeeds': sorted({case['seed'] for case in cases if case['status'] == 'predicted' and case['scoring']['status'] == 'scored'}),
             'featureNames': names, 'imputerStatistics': pipeline.named_steps['imputer'].statistics_.tolist(),
             'trainingPredictionsSha256': __import__('hashlib').sha256(pipeline.predict(x).astype('<f8').tobytes()).hexdigest()}
    return pipeline, names, audit


def predict_model(fitted, cases, arm, domain):
    pipeline, names, _ = fitted
    x, _, _, locations, _ = matrix(cases, arm, names=names)
    if not len(x):
        return {}
    values = pipeline.predict(x)
    if domain == 'hiring':
        values = np.clip(values, 1e-6, 1-1e-6)
    elif domain == 'satisfaction':
        values = np.clip(values, 0, 100)
    else:
        values = np.maximum(values, 0)
    assert np.isfinite(values).all()
    predictions = {}
    for (case_id, _), value in zip(locations, values):
        predictions.setdefault(case_id, []).append(float(value))
    return predictions
