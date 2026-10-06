"""Dated, aggregate, constructed-synthetic histories for offline tree benchmarks.

This generator is a fresh test world, not recovered operational history. Predictors
are generated without reading outcomes. Outcomes in signal scenarios use predictor
states from THREE MONTHS EARLIER; this deliberately constructed lead relationship
must not be represented as an empirically established workforce relationship.
"""

from __future__ import annotations

import calendar
import hashlib
import math
from datetime import datetime, timedelta, timezone

import numpy as np

SCENARIOS = (
    "stable", "gradual-drift", "reversal", "missingness", "small-sample",
    "no-signal", "instrument-break",
)
DOMAINS = ("turnover", "hiring", "satisfaction")
PREDICTOR_NAMES = {
    "turnover": ("overtime_hours", "pay_position_index", "manager_span"),
    "hiring": ("recruiter_load", "specialist_opening_share", "comp_offer_index"),
    "satisfaction": ("workload_index", "manager_support_index", "response_reach"),
}
PREDICTOR_LAG_MONTHS = 3
UTC = timezone.utc


def _rng(seed, domain, stream):
    # Scenario is deliberately excluded: matched stress scenarios share innovations.
    material = f"synthetic-tree-v1:{seed}:{domain}:{stream}".encode()
    entropy = int.from_bytes(hashlib.sha256(material).digest()[:16], "big")
    return np.random.default_rng(entropy)


def _iso(value):
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _month(index):
    year, month = 2018 + index // 12, 1 + index % 12
    first = datetime(year, month, 1, tzinfo=UTC)
    end = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59, tzinfo=UTC)
    return first, end


def _predictor_values(domain, state):
    a, b, c = (float(np.tanh(value)) for value in state)
    if domain == "turnover":
        return dict(zip(PREDICTOR_NAMES[domain], (8 + 6*a, 1 + .2*b, 8 + 4*c)))
    if domain == "hiring":
        return dict(zip(PREDICTOR_NAMES[domain], (25 + 15*a, .5 + .35*b, 1 + .2*c)))
    return dict(zip(PREDICTOR_NAMES[domain], (50 + 35*a, 50 + 35*b, .7 + .2*c)))


def _states(seed, domain, months):
    rng = _rng(seed, domain, "predictors")
    state = rng.normal(size=3)
    history = []
    # Stationary AR(1), with a three-month burn-in used for the first label.
    for _ in range(months + PREDICTOR_LAG_MONTHS):
        state = .94 * state + math.sqrt(1 - .94**2) * rng.normal(size=3)
        history.append(state.copy())
    return history


def _probability(domain, state, index, scenario):
    """Bounded synthetic response law. No-signal ignores state entirely."""
    a, b, c = (float(np.tanh(value)) for value in state)
    season = math.sin(2 * math.pi * (index % 12) / 12)
    signal = scenario != "no-signal"
    drift = index / 104 if scenario == "gradual-drift" else 0
    reversal = scenario == "reversal" and index >= 102  # July 2026, unannounced.
    if domain == "turnover":
        effect = .006*(a > 0) + .004*(b < -.2) + .004*math.tanh(3*a*c) if signal else 0
        value = .011 + .001*season - .003*drift
        value += .012 - effect if reversal else effect
        return float(np.clip(value, .002, .07))
    if domain == "hiring":
        effect = -.9*(a > 0) - .7*(b > .25) + .9*math.tanh(3*b*c) if signal else 0
        logit = 1.25 + .08*season + .6*drift
        logit += -1.7 - effect if reversal else effect
        return 1 / (1 + math.exp(-logit))
    effect = -.13*(a > 0) + .09*(b > .15) + .09*math.tanh(3*b*c) if signal else 0
    value = .76 + .008*season + .055*drift
    value += -.25 - effect if reversal else effect
    # An instrument break is a non-comparable scale discontinuity, not a trend.
    if scenario == "instrument-break" and index >= 102:
        value -= .12
    return float(np.clip(value, .1, .95))


def _base(period, effective, available, status, value, denominator, instrument="v1", revision=1):
    return {
        "period": period, "effectiveAt": _iso(effective), "availableAt": _iso(available),
        "status": status, "value": value, "denominator": denominator,
        "instrument": instrument, "revision": revision,
    }


def generate_history(seed: int, scenario: str) -> dict:
    """Generate Jan2018–Sep2026 releases (Jan2023+ for small-sample).

    Consumers must replay BOTH effectiveAt and availableAt at their cutoff,
    selecting the latest revision per period. The return includes future releases;
    it is not itself an as-of model input. Hiring zero-opening cohorts are retained
    with zero placeholders (exclude their zero weights), and incomplete releases never expose labels or outcome counts.
    """
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise ValueError("seed must be a nonnegative integer")
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario: {scenario}")
    months = 105
    start_index = 60 if scenario == "small-sample" else 0
    stress = scenario == "missingness"
    domains = {}
    for domain in DOMAINS:
        states = _states(seed, domain, months)
        outcome_rng = _rng(seed, domain, "outcomes")
        support_rng = _rng(seed, domain, "support")
        observations, predictors = [], []
        headcount = 8400
        wave = -1
        for index in range(months):
            first, end = _month(index)
            period = first.strftime("%Y-%m")
            predictor_missing = stress and index % 17 == 6
            if index >= start_index:
                predictors.append({
                    "period": period, "effectiveAt": _iso(end),
                    "availableAt": _iso(end + timedelta(days=45 if stress else 7)),
                    "status": "missing" if predictor_missing else "complete",
                    "values": {name: None for name in PREDICTOR_NAMES[domain]} if predictor_missing
                    else _predictor_values(domain, states[index + PREDICTOR_LAG_MONTHS]),
                })
            probability = _probability(domain, states[index], index, scenario)
            releases = []
            if domain == "turnover":
                voluntary = int(outcome_rng.binomial(headcount, probability))
                other = int(outcome_rng.binomial(headcount - voluntary, .003))
                # Replacement hiring controls stock drift; never supplied as predictors.
                starts = max(0, int(support_rng.poisson(145)) + round((8400-headcount)*.08))
                end_headcount = headcount + starts - voluntary - other
                details = {"startHeadcount": headcount, "starts": starts,
                           "voluntaryExits": voluntary, "otherExits": other,
                           "endHeadcount": end_headcount, "exposureDefinition": "start-of-month headcount"}
                partial = stress and index % 9 == 2
                missing = stress and index % 18 == 4
                initial = _base(period, end, end + timedelta(days=35 if stress else 3),
                                "missing" if missing else "partial" if partial else "complete",
                                None if partial or missing else voluntary, headcount)
                if partial or missing:
                    initial.update({key: None for key in details})
                    correction = _base(period, end, end + timedelta(days=95), "complete", voluntary, headcount, revision=2)
                    correction.update(details)
                    releases.extend((initial, correction))
                else:
                    initial.update(details)
                    releases.append(initial)
                headcount = end_headcount
            elif domain == "hiring":
                openings = 0 if index % 24 == 10 else int(support_rng.integers(110, 161))
                within = int(outcome_rng.binomial(openings, probability))
                remainder = outcome_rng.multinomial(openings-within, [.3, .15, .55])
                known_through = first + timedelta(days=90)
                opening_available = first + timedelta(days=39 if stress else 3)
                initial = _base(period, first, opening_available, "partial", None, openings)
                common = {"horizonDays": 90, "openingsKnownAt": _iso(opening_available),
                          "denominatorDefinition": "all openings created on cohort first day"}
                initial.update(common, knownOutcomeThrough=None, started=None, startsWithin90=None,
                               cancelled=None, noShows=None, openOrUnresolved=None)
                complete = _base(period, first, first + timedelta(days=129 if stress else 93),
                                 "complete", within/openings if openings else 0.0, openings, revision=2)
                complete.update(common, knownOutcomeThrough=_iso(known_through), started=within, startsWithin90=within,
                                cancelled=int(remainder[0]), noShows=int(remainder[1]),
                                openOrUnresolved=int(remainder[2]))
                releases.extend((initial, complete))
            elif first.month % 3 == 0:
                wave += 1
                respondents = int(support_rng.integers(600, 901))
                # All respondents answer five comparable items: this equals the
                # mean of their individual favorable-answer shares, times 100.
                favorable_answers = int(outcome_rng.binomial(5*respondents, probability))
                value = 100*favorable_answers/(5*respondents)
                instrument = "v2" if scenario == "instrument-break" and index >= 102 else "v1"
                identity = {"itemSet": f"five-items-{instrument}", "scoring": "mean-respondent-favorable-share",
                            "population": "synthetic-workforce", "eligibilityRule": "active-at-wave-close",
                            "eligibleCount": 8400, "eligible": 8400, "responseUnit": "respondent", "itemsPerRespondent": 5}
                unavailable = "missing" if period == "2020-03" else "suppressed" if period == "2020-06" else None
                partial = stress and wave % 4 == 2 and not unavailable
                initial = _base(period, end, end + timedelta(days=45 if stress else 10),
                                unavailable or ("partial" if partial else "complete"),
                                None if unavailable or partial else value,
                                None if unavailable or partial else respondents, instrument)
                initial.update(identity, respondents=None if unavailable or partial else respondents, favorableAnswers=None if unavailable or partial else favorable_answers)
                releases.append(initial)
                if partial:
                    correction = _base(period, end, end + timedelta(days=75), "complete", value,
                                       respondents, instrument, revision=2)
                    correction.update(identity, respondents=respondents, favorableAnswers=favorable_answers)
                    releases.append(correction)
            if index >= start_index:
                observations.extend(releases)
        domains[domain] = {"observations": observations, "predictors": predictors}
        if domain == "hiring":
            domains[domain]["maximumReportingLagDays"] = 39 if stress else 3
    return {
        "seed": seed, "scenario": scenario, "dataClass": "constructed-synthetic",
        "operationallyQualified": False, "domains": domains,
        "constructionAssumptions": {
            "version": "synthetic-tree-data-v1", "timeline": ["2023-01" if start_index else "2018-01", "2026-09"],
            "predictorLagMonths": PREDICTOR_LAG_MONTHS, "predictorAR1": .94,
            "signal": "bounded nonlinear hypothetical aggregate relationships; no empirical efficacy claim",
            "noSignal": "outcome probability ignores predictors; independent predictor/outcome/support RNG streams",
            "reversal": "unannounced July2026 coefficient reversal and intercept shift; no predictor regime flag",
            "hiring": "all openings dated cohort first day; realized starts within 90 days; zero cohorts retained",
            "survey": "five answers per respondent; mean favorable share; full instrument identity required",
            "turnover": "binomial voluntary exits against historical starting headcount, stock reconciled each month",
            "scenarioMatching": "same seed shares random innovations across scenarios; scenarios are not independent replications",
            "asOf": "filter effectiveAt AND availableAt; select latest released revision; never use unreleased target predictors",
        },
    }
