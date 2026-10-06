"""Separate invented dated aggregates, not PR156's three annual chart points.

Ratings stay ordinal: the performance target is the fraction rated 4 or 5.
All auxiliary features replay release clocks; simulation states never enter them.
"""
from __future__ import annotations

import hashlib
import math
from datetime import timedelta

import numpy as np

from experiments.synthetic_tree_v1.data import _iso, _month
from experiments.synthetic_tree_v1.features import date, digest, month_add, month_index, replay, stamp

DOMAINS = ("performance", "promotion")
SCENARIOS = ("stable", "gradual-drift", "reversal", "missingness", "small-sample", "no-signal", "instrument-break", "delayed-predictors")
AUXILIARY_NAMES = ("performance_favorable_share", "promotion_rate")
IDENTITY_KEYS = ("instrument", "population", "eligibilityRule", "scoring", "horizonDays")


def _rng(seed, stream):
    entropy = int.from_bytes(hashlib.sha256(f"performance-promotion-v1:{seed}:{stream}".encode()).digest()[:16], "big")
    return np.random.default_rng(entropy)


def synthetic_states(seed, months=105):
    """Hypothetical shared auxiliary driver; independent of old domain generators."""
    rng = _rng(seed, "states")
    state = rng.normal(size=2)
    result = []
    for _ in range(months + 3):
        state = .90 * state + math.sqrt(1 - .90**2) * rng.normal(size=2)
        result.append(state.copy())
    return result


def _identity(domain, broken=False):
    return {
        "instrument": "ordinal-five-v2" if broken and domain == "performance" else "ordinal-five-v1" if domain == "performance" else "promotion-cohort-v1",
        "population": "separate-synthetic-career-panel",
        "eligibilityRule": "active-at-quarter-close-valid-single-rating" if domain == "performance" else "active-at-month-open-at-least-12-months-in-level",
        "scoring": "share-rating-4-or-5" if domain == "performance" else "first-higher-level-event-within-90-days-per-opening-eligible-person",
        "horizonDays": 0 if domain == "performance" else 90,
    }


def _record(period, effective, available, status, value, denominator, domain, revision=1, broken=False):
    return dict(period=period, effectiveAt=_iso(effective), availableAt=_iso(available), status=status,
                value=value, denominator=denominator, revision=revision, **_identity(domain, broken))


def generate_history(seed: int, scenario: str) -> dict:
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise ValueError("seed must be a nonnegative integer")
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario: {scenario}")
    states = synthetic_states(seed)
    domains = {}
    stress = scenario == "missingness"
    start = 60 if scenario == "small-sample" else 0
    for domain in DOMAINS:
        outcomes, support = _rng(seed, domain + ":outcomes"), _rng(seed, domain + ":support")
        observations = []
        for index in range(105):
            first, end = _month(index)
            if domain == "performance" and first.month % 3:
                continue
            period = first.strftime("%Y-%m")
            a, b = map(lambda x: float(np.tanh(x)), states[index])
            effect = .8 * (a > 0) + .55 * math.tanh(3 * a * b)
            if scenario == "no-signal":
                effect = 0
            drift = .8 * index / 104 if scenario == "gradual-drift" else 0
            if scenario == "reversal" and index >= 102:
                effect = -1.1 - effect
            season = .10 * math.sin(2 * math.pi * first.month / 12)
            broken = scenario == "instrument-break" and index >= 102 and domain == "performance"
            releases = []
            if domain == "performance":
                eligible = 1600
                rated = int(support.integers(1000, 1401))
                logit = -.2 + effect + drift + season - (.8 if broken else 0)
                probability = 1 / (1 + math.exp(-logit))
                counts = outcomes.multinomial(rated, [(1-probability)*.1, (1-probability)*.3, (1-probability)*.6, probability*.7, probability*.3]).tolist()
                if scenario == "small-sample":
                    eligible, rated = 16, 12
                    counts = outcomes.multinomial(rated, [.1,.2,.3,.3,.1]).tolist()
                suppressed = rated < 20 or any(0 < n < 5 for n in counts)
                status = "suppressed" if suppressed else "partial" if stress and (index // 3) % 5 == 2 else "complete"
                details = dict(eligible=eligible, rated=rated, ratingCounts=counts, favorableCount=counts[3]+counts[4], missingRatings=eligible-rated)
                row = _record(period, end, end + timedelta(days=45 if stress else 15), status,
                              (counts[3]+counts[4])/rated if status == "complete" else None,
                              rated if status == "complete" else None, domain, broken=broken)
                row.update(details if status == "complete" else {key: None for key in details})
                releases.append(row)
                if status == "partial":
                    correction = _record(period, end, end + timedelta(days=95), "complete", (counts[3]+counts[4])/rated, rated, domain, 2, broken)
                    correction.update(details)
                    releases.append(correction)
            else:
                eligible = int(support.integers(400, 601))
                probability = 1 / (1 + math.exp(-(-2.3 + .7*effect + .4*drift + season)))
                promoted = int(outcomes.binomial(eligible, probability))
                # A competing exit event excludes later promotion, but never leaves the opening denominator.
                exited = int(outcomes.binomial(eligible-promoted, .025))
                if scenario == "small-sample":
                    eligible = 14
                    promoted = int(outcomes.binomial(eligible, probability))
                    exited = int(outcomes.binomial(eligible-promoted, .025))
                suppressed = eligible < 20 or 0 < promoted < 5 or 0 < eligible-promoted < 5
                details = dict(promotedWithin90=promoted, exitsBeforePromotion=exited, noPromotionBy90=eligible-promoted-exited,
                               knownOutcomeThrough=_iso(first+timedelta(days=90)), eligibleKnownAt=_iso(first+timedelta(days=3)))
                initial = _record(period, first, first+timedelta(days=3), "suppressed" if suppressed else "partial", None, None if suppressed else eligible, domain)
                initial.update({key: None for key in details})
                if not suppressed:
                    initial["eligibleKnownAt"] = details["eligibleKnownAt"]
                releases.append(initial)
                status = "suppressed" if suppressed else "missing" if stress and index % 9 == 2 else "complete"
                complete = _record(period, first, first+timedelta(days=135 if stress else 105), status,
                                   promoted/eligible if status == "complete" else None, eligible if status == "complete" else None, domain, 2)
                complete.update(details if status == "complete" else {key: None for key in details})
                releases.append(complete)
                if status == "missing":
                    correction = _record(period, first, first+timedelta(days=165), "complete", promoted/eligible, eligible, domain, 3)
                    correction.update(details)
                    releases.append(correction)
            if index >= start:
                observations.extend(releases)
        # The auxiliary analytics feed may be published later than the native outcome feed.
        auxiliary = []
        for row in observations:
            release = dict(row)
            if scenario == "delayed-predictors":
                release["availableAt"] = _iso(date(row["availableAt"]) + timedelta(days=60))
            auxiliary.append(release)
        domains[domain] = {"observations": observations, "auxiliary": auxiliary,
                           "maximumReportingLagDays": 45 if stress else 15,
                           "auxiliaryPublicationDelayDays": 60 if scenario == "delayed-predictors" else 0}
    return dict(seed=seed, scenario=scenario, dataClass="constructed-synthetic", operationallyQualified=False,
                domains=domains, constructionAssumptions={"version":"performance-promotion-v1", "timeline":["2023-01" if start else "2018-01","2026-09"],
                "ratingTarget":"fraction ordinal ratings4/5; no mean rating", "promotionTarget":"90-day first-promotion cohort fraction; exits remain denominator",
                "independence":"Independent of existing turnover/hiring/survey simulator; not evidence that performance predicts those outcomes",
                "driver":"hypothetical shared AR1(.90) state drives same-month auxiliary outcomes; historical persistence, not a demonstrated causal lead; state never exposed as a feature",
                "smallCells":"withhold all outcome details if denominator<20 or any relevant positive category count<5",
                "delayedAuxiliary":"delayed-predictors adds60days only to auxiliary-feed publication, leaving native outcome release intact"})


def _same_identity(a, b):
    return all(a.get(key) == b.get(key) for key in IDENTITY_KEYS)


def valid_record(row, domain, cutoff):
    if row.get("status") != "complete" or row["effectiveAt"] > cutoff or row["availableAt"] > cutoff:
        return False
    n, value = row.get("denominator"), row.get("value")
    if isinstance(n, bool) or not isinstance(n, int) or n < 20 or isinstance(value, bool) or not isinstance(value, (int,float)) or not math.isfinite(value) or not 0 <= value <= 1:
        return False
    if any(row.get(key) is None for key in IDENTITY_KEYS):
        return False
    expected = _identity(domain)
    if any(row.get(key) != value for key,value in expected.items() if key != "instrument"):
        return False
    if row["instrument"] not in ({"ordinal-five-v1","ordinal-five-v2"} if domain == "performance" else {"promotion-cohort-v1"}):
        return False
    if domain == "performance":
        counts = row.get("ratingCounts")
        return (isinstance(counts,list) and len(counts)==5 and all(type(c) is int and c>=0 and not 0<c<5 for c in counts)
                and sum(counts)==n and row.get("rated")==n and type(row.get("eligible")) is int and row["eligible"]>=n and row.get("missingRatings")==row["eligible"]-n
                and row.get("favorableCount")==sum(counts[3:]) and abs(value-sum(counts[3:])/n)<1e-12
                and row.get("scoring")=="share-rating-4-or-5")
    promoted, exited, remaining = (row.get(k) for k in ("promotedWithin90","exitsBeforePromotion","noPromotionBy90"))
    return (all(type(v) is int and v>=0 for v in (promoted,exited,remaining)) and promoted+exited+remaining==n
            and not 0<promoted<5 and not 0<n-promoted<5 and abs(value-promoted/n)<1e-12 and row.get("horizonDays")==90
            and row.get("knownOutcomeThrough") is not None and row.get("eligibleKnownAt") is not None
            and date(row["knownOutcomeThrough"])>=date(row["effectiveAt"])+timedelta(days=90)
            and row["knownOutcomeThrough"]<=row["availableAt"] and row["eligibleKnownAt"]<=row["availableAt"])


def aux_features(history, cutoff):
    result = {}
    for domain, name in zip(DOMAINS, AUXILIARY_NAMES):
        rows = replay(history["domains"][domain]["auxiliary"], cutoff)
        # A latest suppressed/missing release does not silently fall back to a favorable older value.
        latest = rows[-1] if rows else None
        if domain == "promotion":
            lag = history["domains"][domain]["maximumReportingLagDays"]
            end = cutoff[:7]
            delay = history["domains"][domain]["auxiliaryPublicationDelayDays"]
            while date(stamp(end))+timedelta(days=90+lag+delay)>date(cutoff):
                end = month_add(end,-1)
            latest = next((row for row in reversed(rows) if row["period"]<=end),None)
        valid = latest is not None and valid_record(latest,domain,cutoff)
        # Cross-instrument auxiliary values cannot be assumed comparable with the frozen v1 feature.
        valid = valid and latest["instrument"] == _identity(domain)["instrument"]
        result[name] = latest["value"] if valid else None
        result[name+"_missing"] = float(not valid)
        result[name+"_age_days"] = (date(cutoff)-date(latest["effectiveAt"])).total_seconds()/86400 if latest else None
    return result


def make_case(history, domain, origin):
    if domain not in DOMAINS:
        raise ValueError("unknown domain")
    cutoff = stamp(origin,True)
    source = history["domains"][domain]
    rows = replay(source["observations"],cutoff)
    size, step = (8,3) if domain=="performance" else (24,1)
    if domain=="promotion":
        end = origin
        while date(stamp(end))+timedelta(days=90+source["maximumReportingLagDays"])>date(cutoff):
            end = month_add(end,-1)
    else:
        end = rows[-1]["period"] if rows else origin
    expected = [month_add(end, step*(i-size+1)) for i in range(size)]
    indexed = {row["period"]:row for row in rows}
    support = [indexed.get(period) for period in expected]
    reason = "missing-calendar-history" if any(row is None for row in support) else "incomplete-released-history" if any(not valid_record(row,domain,cutoff) for row in support) else "incomparable-instrument-history" if any(not _same_identity(row,support[-1]) for row in support) else None
    months = [month_add(origin,i) for i in ([3] if domain=="performance" else [1,2,3])]
    case = dict(id=f"{history['seed']}:{history['scenario']}:{domain}:{origin}", seed=history["seed"],scenario=history["scenario"],domain=domain,origin=origin,cutoff=cutoff,months=months,
                status="blocked" if reason else "predicted",reasons=[reason] if reason else [],history=[],features=[],identity=None,
                audit=dict(cutoff=cutoff,inputSha256=digest(rows),requiredPeriods=size,trainingEnd=end))
    if reason:
        return case
    case["identity"] = {key:support[-1][key] for key in IDENTITY_KEYS}
    case["history"] = [dict(month=row["period"],value=row["value"],denominator=row["denominator"],successes=row["favorableCount"] if domain=="performance" else row["promotedWithin90"]) for row in support]
    case["audit"]["selectedReleases"] = [{key:row[key] for key in ("period","effectiveAt","availableAt","revision")} for row in support]
    aux = aux_features(history,cutoff)
    for target in months:
        lags = {f"lag_{i+1}":float(row["value"]) for i,row in enumerate(reversed(support))}
        lags.update(target_sin=math.sin(2*math.pi*int(target[5:])/12),target_cos=math.cos(2*math.pi*int(target[5:])/12),calendar_time=float(month_index(target)-month_index("2018-01")),lead_months=float(month_index(target)-month_index(support[-1]["period"])))
        enriched = dict(lags, **aux, historical_denominator_last=float(support[-1]["denominator"]),historical_denominator_mean3=sum(row["denominator"] for row in support[-3:])/3)
        case["features"].append(dict(month=target,lags=lags,enriched=enriched))
    return case


def labels_for(history, case, cutoff):
    if case["status"]!="predicted":
        return dict(status="blocked",reasons=["forecast-abstained"],labels=[])
    domain = case["domain"]
    rows = {row["period"]:row for row in replay(history["domains"][domain]["observations"],cutoff)}
    labels = [rows.get(month) for month in case["months"]]
    if any(row is None or not valid_record(row,domain,cutoff) for row in labels):
        return dict(status="blocked",reasons=["incomplete-target-labels"],labels=[])
    if any(not _same_identity(row,case["identity"]) for row in labels):
        return dict(status="blocked",reasons=["future-instrument-identity-mismatch"],labels=[])
    return dict(status="scored",reasons=[],labels=[{key:row.get(key) for key in ("period","value","denominator","effectiveAt","availableAt","knownOutcomeThrough","promotedWithin90","ratingCounts")} | {"month":row["period"],"successes":row["favorableCount"] if domain=="performance" else row["promotedWithin90"]} for row in labels],labelsSha256=digest(labels),labelsAsOf=cutoff)
