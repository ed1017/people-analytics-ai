"""Offline paired aggregate scoring; error-comparison intervals are not forecasts."""
from collections import Counter
import math

import numpy as np


def _number(value):
    return isinstance(value, (int, float, np.number)) and not isinstance(value, bool) and math.isfinite(value)


def score_case(domain, labels, values):
    """Score one history/origin; hiring counts supply all-opening weights."""
    if domain not in ("turnover", "hiring", "satisfaction"):
        raise ValueError("Unknown domain")
    if not labels or len(labels) != len(values) or not all(_number(value) for value in values):
        raise ValueError("Nonempty aligned finite predictions required")
    predictions = np.asarray(values, dtype=float)
    if np.any(predictions < 0) or (domain == "satisfaction" and np.any(predictions > 100)):
        raise ValueError("Predictions outside domain range")
    if domain == "hiring":
        if np.any(predictions > 1):
            raise ValueError("Hiring probabilities must be in [0, 1]")
        for label in labels:
            denominator, started = label.get("denominator"), label.get("startsWithin90")
            if (not _number(denominator) or denominator < 0 or denominator != int(denominator)
                    or not _number(started) or started < 0 or started != int(started) or started > denominator):
                raise ValueError("Complete integer all-opening and 90-day start counts required")
        weights = np.asarray([label["denominator"] for label in labels], dtype=float)
        if not np.any(weights > 0):
            raise ValueError("No positive target exposure")
        positive = weights > 0
        weights, predictions = weights[positive], predictions[positive]
        started = np.asarray([label["startsWithin90"] for label in labels], dtype=float)[positive]
        errors = predictions - started / weights
        # Only log-loss is numerically clipped; raw probabilities define MAE/Brier.
        clipped = np.clip(predictions, 1e-12, 1 - 1e-12)
        return {"mae": float(100 * np.average(np.abs(errors), weights=weights)),
                "rmse": float(100 * np.sqrt(np.average(errors ** 2, weights=weights))),
                "brier": float(np.sum(started * (1 - predictions) ** 2 + (weights - started) * predictions ** 2) / weights.sum()),
                "logLoss": float(-np.sum(started * np.log(clipped) + (weights - started) * np.log1p(-clipped)) / weights.sum())}
    actual = [label.get("value") for label in labels]
    if not all(_number(value) and value >= 0 and (domain != "satisfaction" or value <= 100) for value in actual):
        raise ValueError("Complete finite target values required")
    errors = predictions - np.asarray(actual, dtype=float)
    return {"mae": float(np.mean(np.abs(errors))), "rmse": float(np.sqrt(np.mean(errors ** 2))),
            "brier": None, "logLoss": None}


def _predicted(row, method):
    return row.get("status") == "predicted" and method in row.get("predictions", {})


def _scored(row, method):
    return (_predicted(row, method) and row.get("scoring", {}).get("status") == "scored"
            and method in row.get("metrics", {}))


def _mean_metrics(rows, method):
    return {key: float(np.mean([row["metrics"][method][key] for row in rows]))
            if rows and all(row["metrics"][method].get(key) is not None for row in rows) else None
            for key in ("mae", "rmse", "brier", "logLoss")}


def _group_summary(rows, methods, metadata):
    blocked = Counter()
    for row in rows:
        if row.get("status") != "predicted" or row.get("scoring", {}).get("status") != "scored":
            reasons = set(row.get("reasons", []) + row.get("scoring", {}).get("reasons", []))
            blocked.update(reasons or {"unspecified-abstention"})
    # One common intersection for the displayed method table prevents differing
    # denominators from looking like an improvement. Availability remains visible.
    common = [row for row in rows if all(_scored(row, method) for method in methods)]
    return {**metadata, "cases": len(rows),
            "predicted": sum(row.get("status") == "predicted" for row in rows),
            "scored": sum(row.get("scoring", {}).get("status") == "scored" for row in rows),
            "commonScoredCases": len(common), "blockedReasons": dict(sorted(blocked.items())),
            "methods": {method: {"predicted": sum(_predicted(row, method) for row in rows),
                                  "scored": sum(_scored(row, method) for row in rows),
                                  "pairedCases": len(common), **_mean_metrics(common, method)} for method in methods}}


def _paired_summary(rows, method, comparator):
    pairs = [row for row in rows if _scored(row, method) and _scored(row, comparator)]
    baseline = float(np.mean([row["metrics"][comparator]["mae"] for row in pairs])) if pairs else None
    candidate = float(np.mean([row["metrics"][method]["mae"] for row in pairs])) if pairs else None
    return {"pairedCases": len(pairs), "comparatorMae": baseline, "methodMae": candidate,
            "meanMaeDifference": candidate - baseline if pairs else None}, pairs


def _bootstrap(pairs, method, comparator, resamples=1000, random_state=1729):
    clusters = []
    for seed in sorted({row["seed"] for row in pairs}):
        differences = [row["metrics"][method]["mae"] - row["metrics"][comparator]["mae"] for row in pairs if row["seed"] == seed]
        clusters.append({"seed": seed, "pairedCases": len(differences), "sumMaeDifference": float(sum(differences)),
                         "meanMaeDifference": float(np.mean(differences))})
    interval = None
    if len(clusters) >= 2:
        sums = np.asarray([row["sumMaeDifference"] for row in clusters])
        counts = np.asarray([row["pairedCases"] for row in clusters])
        draws = np.random.default_rng(random_state).integers(0, len(clusters), size=(resamples, len(clusters)))
        samples = sums[draws].sum(axis=1) / counts[draws].sum(axis=1)
        low, high = np.quantile(samples, [0.025, 0.975])
        interval = {"lower": float(low), "upper": float(high), "resamples": resamples,
                    "randomState": random_state, "cluster": "independent-test-seed",
                    "estimand": "paired-per-history-origin-mean-MAE-difference",
                    "interpretation": "error-comparison-only-not-forecast-uncertainty"}
    return clusters, interval


def summarize(rows, comparators, protocol):
    """Summarize held-out cases without choosing comparators from their results."""
    domains = protocol.get("domains", ["turnover", "hiring", "satisfaction"])
    scenarios = protocol.get("scenarios", sorted({row["scenario"] for row in rows}))
    origins = protocol.get("testOrigins", sorted({row["origin"] for row in rows}))
    floor = protocol.get("relativeDegradationFloor", 1e-8)
    if not _number(floor) or floor <= 0:
        raise ValueError("Positive relative-degradation floor required")
    result = {"overall": [], "scenarios": [], "strata": [], "comparisons": [], "interval": None,
              "operationallyQualified": False, "realWorldPerformanceValidated": False,
              "aggregation": "Equal history-origin cases; hiring opening-weighted within each case; RMSE is mean case RMSE, not pooled RMSE."}
    for domain in domains:
        selected = [row for row in rows if row["domain"] == domain]
        methods = sorted({method for row in selected for method in row.get("predictions", {})})
        for row in selected:
            for method in methods:
                if _scored(row, method) and not all(_number(row["metrics"][method].get(key)) and row["metrics"][method][key] >= 0 for key in ("mae", "rmse")):
                    raise ValueError("Finite nonnegative scored metrics required")
        overall = _group_summary(selected, methods, {"domain": domain})
        scenario_summaries = [_group_summary([row for row in selected if row["scenario"] == scenario], methods,
                                            {"domain": domain, "scenario": scenario}) for scenario in scenarios]
        strata = [_group_summary([row for row in selected if row["scenario"] == scenario and row["origin"] == origin], methods,
                                {"domain": domain, "scenario": scenario, "origin": origin}) for scenario in scenarios for origin in origins]
        overall["worstStratum"] = {method: max((stratum for stratum in strata if stratum["methods"][method]["mae"] is not None),
                                               key=lambda stratum: stratum["methods"][method]["mae"], default=None) for method in methods}
        result["overall"].append(overall)
        result["scenarios"].extend(scenario_summaries)
        result["strata"].extend(strata)
        for method in methods:
            if not method.startswith(("random-forest-", "gradient-boosting-")):
                continue
            tier, size = method.split("-")[-2:]
            if tier not in ("lags", "enriched") or size not in ("full", "small"):
                raise ValueError("Tree method must identify its feature tier and training size")
            comparator = comparators[domain][tier]
            if comparator not in methods:
                raise ValueError("Frozen comparator absent from evaluation methods")
            summary, pairs = _paired_summary(selected, method, comparator)
            per_seed, interval = _bootstrap(pairs, method, comparator)
            comparison_strata = []
            for scenario in scenarios:
                for origin in origins:
                    subset = [row for row in selected if row["scenario"] == scenario and row["origin"] == origin]
                    stratum, _ = _paired_summary(subset, method, comparator)
                    stratum.update(scenario=scenario, origin=origin)
                    stratum["relativeDegradation"] = stratum["meanMaeDifference"] / max(stratum["comparatorMae"], floor) if stratum["pairedCases"] else None
                    comparison_strata.append(stratum)
            availability_same = all(_predicted(row, method) == _predicted(row, comparator)
                                    and _scored(row, method) == _scored(row, comparator) for row in selected)
            improvement = -summary["meanMaeDifference"] / max(summary["comparatorMae"], floor) if pairs else None
            worsened = [stratum for stratum in comparison_strata if stratum["relativeDegradation"] is not None and stratum["relativeDegradation"] > 0.10]
            candidate = bool(pairs and improvement >= 0.05 and not worsened and availability_same)
            recommendation = "diagnostic-only" if size == "small" else "separate-review-only" if candidate else "reject-replacement"
            result["comparisons"].append({"domain": domain, "method": method, "comparator": comparator,
                                         "tier": tier, "size": size, **summary, "relativeImprovement": improvement,
                                         "availabilitySame": availability_same, "seedDifferences": per_seed,
                                         "bootstrap95Percent": interval, "strata": comparison_strata,
                                         "worstStratum": max((stratum for stratum in comparison_strata if stratum["pairedCases"]),
                                                             key=lambda stratum: stratum["methodMae"], default=None),
                                         "worsenedOverTenPercent": worsened, "recommendation": recommendation,
                                         "interval": None, "operationallyQualified": False})
    return result
