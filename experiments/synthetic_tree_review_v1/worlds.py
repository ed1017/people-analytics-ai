"""Independent sensitivity worlds around the frozen synthetic-tree-v1 generator.

Reference is exactly the original generator, including metadata. Weak signal uses
0.5 * original scenario probability + 0.5 * the same scenario probability
at a zero predictor state before drawing outcomes. This halves predictor effects
on the probability scale relative to the neutral state, preserving scenario
drift/reversal/intercept effects, instrument identity and publication schedules.
For hiring this is a probability mixture, not halving the logit coefficients. Fast predictors change only AR(1) rho from .94 to .5, preserving unit
stationary variance, initial draw, innovation stream and three-month lead law.
Delayed predictors change only predictor availableAt by +60 calendar days.

All worlds remain constructed aggregate simulations. World labels are metadata,
never predictor values. Local module namespaces prevent changes to the original
generator, including during exceptions or concurrent calls.
"""

from __future__ import annotations

import importlib.util
import math
from datetime import datetime, timedelta

from experiments.synthetic_tree_v1 import data

WORLDS = ("reference", "weak-signal", "fast-predictors", "delayed-predictors")


def _generator_for_world(world):
    """Return a fresh private namespace; do not register or patch global modules."""
    if world not in WORLDS:
        raise ValueError(f"unknown review world: {world}")
    spec = importlib.util.spec_from_file_location("_synthetic_tree_review_generator", data.__file__)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if world == "weak-signal":
        original_probability = module._probability

        def probability(domain, state, index, scenario):
            return (.5 * original_probability(domain, state, index, scenario)
                    + .5 * original_probability(domain, module.np.zeros(3), index, scenario))

        module._probability = probability
    elif world == "fast-predictors":
        def states(seed, domain, months):
            rng = module._rng(seed, domain, "predictors")
            state = rng.normal(size=3)
            history = []
            for _ in range(months + module.PREDICTOR_LAG_MONTHS):
                state = .5 * state + math.sqrt(1 - .5**2) * rng.normal(size=3)
                history.append(state.copy())
            return history

        module._states = states
    return module


def generate_review_history(seed: int, scenario: str, world: str) -> dict:
    """Generate native-shape releases; these still require ordinary as-of replay."""
    module = _generator_for_world(world)
    history = module.generate_history(seed, scenario)
    if world == "reference":
        return history
    if world == "delayed-predictors":
        for domain in history["domains"].values():
            for row in domain["predictors"]:
                published = datetime.fromisoformat(row["availableAt"].replace("Z", "+00:00"))
                row["availableAt"] = module._iso(published + timedelta(days=60))
    assumptions = history["constructionAssumptions"]
    history["reviewWorld"] = world
    assumptions["reviewWorld"] = world
    assumptions["reviewVersion"] = "synthetic-tree-review-worlds-v1"
    if world == "weak-signal":
        assumptions["reviewProbabilityLaw"] = (
            "0.5 * original scenario probability + 0.5 * same-scenario zero-state probability; "
            "halves probability-scale predictor effects relative to neutral state; "
            "scenario drift, reversals, instrument shifts and identity unchanged"
        )
    elif world == "fast-predictors":
        assumptions["predictorAR1"] = .5
        assumptions["reviewPredictorLaw"] = (
            "AR(1) rho 0.5 with innovation SD sqrt(1-rho^2); original RNG prefix, "
            "seed/domain streams, initial unit-normal state and three-month lead law"
        )
    else:
        assumptions["reviewPredictorPublicationDelayDays"] = 60
        assumptions["reviewPublicationLaw"] = (
            "every predictor availableAt +60 days; effectiveAt, values and outcome releases unchanged"
        )
    return history
