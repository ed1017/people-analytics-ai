"""As-of aggregate boundary; construction metadata never enters feature vectors."""
from __future__ import annotations
import calendar
import hashlib
import json
import math
from datetime import datetime, timedelta, timezone
from .data import PREDICTOR_NAMES

IDENTITY = ('instrument', 'itemSet', 'scoring', 'population', 'eligibilityRule', 'responseUnit', 'itemsPerRespondent')


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def month_add(month, offset):
    index = int(month[:4])*12 + int(month[5:])-1 + offset
    return f'{index//12:04d}-{index%12+1:02d}'


def month_index(month):
    return int(month[:4])*12+int(month[5:])-1


def stamp(month, end=False):
    year, number = int(month[:4]), int(month[5:])
    day = calendar.monthrange(year, number)[1] if end else 1
    return f'{month}-{day:02d}T23:59:59.999Z' if end else f'{month}-01T00:00:00.000Z'


def date(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def replay(records, cutoff):
    selected = {}
    for record in records:
        if record['effectiveAt'] > cutoff or record['availableAt'] > cutoff:
            continue
        previous = selected.get(record['period'])
        if previous is None or record.get('revision', 1) > previous.get('revision', 1):
            selected[record['period']] = record
    return sorted(selected.values(), key=lambda row: row['period'])


def identity(record):
    return {key: record.get(key) for key in IDENTITY}


def mature(record, cutoff):
    return record['status'] == 'complete' and record.get('horizonDays') == 90 and record.get('knownOutcomeThrough') is not None and date(record['knownOutcomeThrough']) >= date(record['effectiveAt'])+timedelta(days=90) and record['availableAt'] <= cutoff


def valid_label(record, domain):
    value, denominator = record.get('value'), record.get('denominator')
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
        return False
    if not isinstance(denominator, int) or isinstance(denominator, bool) or denominator < 0:
        return False
    if domain == 'turnover':
        return isinstance(value, int) and 0 <= value <= denominator and denominator > 0
    if domain == 'hiring':
        started = record.get('startsWithin90')
        return isinstance(started, int) and 0 <= started <= denominator and 0 <= value <= 1 and abs(value-(started/denominator if denominator else 0)) < 1e-12
    return 0 <= value <= 100 and denominator > 0 and all(record.get(key) is not None for key in IDENTITY)


def qualify_history(source, domain, cutoff):
    records = replay(source['observations'], cutoff)
    audit = {'cutoff': cutoff, 'releasedRecords': len(records), 'inputSha256': digest(records)}
    if domain == 'hiring':
        # This is a declared source reporting bound, not estimated from eventual outcomes.
        lag = source['maximumReportingLagDays']
        end = cutoff[:7]
        while date(stamp(end))+timedelta(days=90+lag) > date(cutoff):
            end = month_add(end, -1)
        candidates = {row['period']: row for row in records}
        expected = [month_add(end, i-35) for i in range(36)]
        support = [candidates.get(month) for month in expected]
        audit.update(trainingEnd=end, requiredPeriods=36)
        if any(row is None for row in support):
            return [], audit, 'missing-calendar-cohort'
        if any(not mature(row, cutoff) or not valid_label(row, domain) for row in support):
            return [], audit, 'incomplete-horizon-labels'
        if sum(row['denominator'] > 0 for row in support) < 24:
            return [], audit, 'insufficient-positive-cohorts'
    else:
        size, step = (24, 1) if domain == 'turnover' else (8, 3)
        support = records[-size:]
        audit.update(requiredPeriods=size, trainingEnd=support[-1]['period'] if support else None)
        if len(support) != size or any(row['period'] != month_add(support[0]['period'], i*step) for i, row in enumerate(support)):
            return [], audit, 'incomplete-calendar-window'
        if any(row['status'] != 'complete' or not valid_label(row, domain) for row in support):
            return [], audit, 'incomplete-released-labels'
        if domain == 'satisfaction' and any(identity(row) != identity(support[-1]) for row in support):
            return [], audit, 'incomparable-wave-history'
    audit['selectedReleases'] = [{key: row[key] for key in ('period','effectiveAt','availableAt','revision')} for row in support]
    return support, audit, None


def make_case(history, domain, origin):
    cutoff = stamp(origin, True)
    source = history['domains'][domain]
    months = [month_add(origin, n) for n in (range(1, 4) if domain != 'satisfaction' else [3])]
    support, audit, reason = qualify_history(source, domain, cutoff)
    case = {'id': f"{history['seed']}:{history['scenario']}:{domain}:{origin}", 'seed': history['seed'], 'scenario': history['scenario'], 'domain': domain,
            'origin': origin, 'cutoff': cutoff, 'months': months, 'status': 'blocked' if reason else 'predicted', 'reasons': [reason] if reason else [], 'audit': audit,
            'features': [], 'history': [], 'identity': identity(support[-1]) if support and domain == 'satisfaction' else None}
    if reason:
        return case
    case['history'] = [dict(month=row['period'], openings=row['denominator'], started=row['startsWithin90']) if domain == 'hiring' else dict(month=row['period'], value=row['value']) for row in support]
    released = replay(source['predictors'], cutoff)
    latest = released[-1] if released else None
    audit['predictorSha256'] = digest(released)
    audit['predictorRelease'] = {key: latest[key] for key in ('period','effectiveAt','availableAt','status')} if latest else None
    # NaNs stay null in evidence; imputation occurs within a fitted training-only pipeline.
    known_values = [row['value'] if row['value'] is not None else 0.0 for row in support]
    for target in months:
        vector = {f'lag_{i+1}': float(value) for i, value in enumerate(reversed(known_values))}
        vector.update(target_sin=math.sin(2*math.pi*int(target[5:])/12), target_cos=math.cos(2*math.pi*int(target[5:])/12),
                      calendar_time=float(month_index(target)-month_index('2018-01')), lead_months=float(month_index(target)-month_index(support[-1]['period'])))
        # Explicit known zero-opening cohorts remain calendar positions, not dropped periods.
        if domain == 'hiring':
            vector.update({f'zero_exposure_{i+1}': float(row['denominator']==0) for i,row in enumerate(reversed(support))})
        enriched = dict(vector)
        for name in PREDICTOR_NAMES[domain]:
            value = latest['values'][name] if latest and latest['status'] == 'complete' else None
            enriched[name] = value
            enriched[name+'_missing'] = float(value is None)
        enriched['predictor_age_days'] = (date(cutoff)-date(latest['effectiveAt'])).total_seconds()/86400 if latest else None
        enriched['historical_denominator_last'] = float(support[-1]['denominator'])
        enriched['historical_denominator_mean3'] = sum(row['denominator'] for row in support[-3:])/3
        case['features'].append({'month': target, 'lags': vector, 'enriched': enriched})
    return case


def labels_for(history, case, cutoff):
    if case['status'] != 'predicted':
        return {'status': 'blocked', 'reasons': ['forecast-abstained'], 'labels': []}
    records = {row['period']: row for row in replay(history['domains'][case['domain']]['observations'], cutoff)}
    labels = [records.get(month) for month in case['months']]
    if any(row is None or row['status'] != 'complete' or not valid_label(row, case['domain']) for row in labels):
        return {'status': 'blocked', 'reasons': ['incomplete-target-labels'], 'labels': []}
    domain = case['domain']
    if domain == 'hiring' and any(not mature(row, cutoff) for row in labels):
        return {'status': 'blocked', 'reasons': ['incomplete-target-horizon'], 'labels': []}
    if domain == 'satisfaction' and any(identity(row) != case['identity'] for row in labels):
        return {'status': 'blocked', 'reasons': ['future-wave-identity-mismatch'], 'labels': []}
    if domain == 'hiring' and not sum(row['denominator'] for row in labels):
        return {'status': 'blocked', 'reasons': ['zero-target-exposure'], 'labels': []}
    return {'status': 'scored', 'reasons': [], 'labels': [{'month': row['period'], 'value': row['value'], 'denominator': row['denominator'],
           'availableAt': row['availableAt'], 'effectiveAt': row['effectiveAt'], 'knownOutcomeThrough': row.get('knownOutcomeThrough'),
           'startsWithin90': row.get('startsWithin90')} for row in labels], 'labelsSha256': digest(labels), 'labelsAsOf': cutoff}
