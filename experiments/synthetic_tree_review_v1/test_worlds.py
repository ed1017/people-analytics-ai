"""Review-world invariants using only non-reserved smoke seed 17."""

import copy
import math
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

import numpy as np

from experiments.synthetic_tree_v1 import data
from experiments.synthetic_tree_review_v1 import worlds


def parsed(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class ReviewWorldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.histories = {
            (world, scenario): worlds.generate_review_history(17, scenario, world)
            for world in worlds.WORLDS for scenario in data.SCENARIOS
        }

    def test_reference_exactly_matches_original(self):
        for scenario in data.SCENARIOS:
            self.assertEqual(self.histories["reference", scenario], data.generate_history(17, scenario))

    def test_weak_probability_is_exact_probability_mixture(self):
        generator = worlds._generator_for_world("weak-signal")
        for domain in data.DOMAINS:
            for scenario in data.SCENARIOS:
                for index in (0, 50, 102, 104):
                    for state in ([0., 0., 0.], [2., -1., 1.], [-1., 2., -2.]):
                        self.assertEqual(generator._probability(domain, state, index, scenario),
                                         .5 * data._probability(domain, state, index, scenario)
                                         + .5 * data._probability(domain, np.zeros(3), index, scenario))
        for domain in data.DOMAINS:
            for scenario in data.SCENARIOS:
                for index in (0, 50, 102, 104):
                    neutral = data._probability(domain, np.zeros(3), index, scenario)
                    self.assertEqual(generator._probability(domain, np.zeros(3), index, scenario), neutral)
                    state = np.array([2., -1., 1.])
                    original_effect = data._probability(domain, state, index, scenario) - neutral
                    weak_effect = generator._probability(domain, state, index, scenario) - neutral
                    self.assertAlmostEqual(weak_effect, .5 * original_effect, places=15)
        for domain in data.DOMAINS:
            original = self.histories["reference", "no-signal"]["domains"][domain]
            self.assertEqual(original, self.histories["weak-signal", "no-signal"]["domains"][domain])
            for scenario in data.SCENARIOS:
                self.assertEqual(self.histories["reference", scenario]["domains"][domain]["predictors"],
                                 self.histories["weak-signal", scenario]["domains"][domain]["predictors"])

    def test_fast_predictor_law_and_original_rng_stream(self):
        generator = worlds._generator_for_world("fast-predictors")
        for domain in data.DOMAINS:
            rng = data._rng(17, domain, "predictors")
            state = rng.normal(size=3)
            expected = []
            for _ in range(108):
                state = .5 * state + math.sqrt(1 - .5**2) * rng.normal(size=3)
                expected.append(state.copy())
            actual = generator._states(17, domain, 105)
            np.testing.assert_array_equal(actual, expected)
            self.assertFalse(np.array_equal(actual, data._states(17, domain, 105)))
            predictors = self.histories["fast-predictors", "stable"]["domains"][domain]["predictors"]
            for index, row in enumerate(predictors):
                self.assertEqual(row["values"], data._predictor_values(domain, actual[index + 3]))
            self.assertEqual(self.histories["fast-predictors", "no-signal"]["domains"][domain]["observations"],
                             self.histories["reference", "no-signal"]["domains"][domain]["observations"])

    def test_fast_future_states_do_not_change_earlier_outcomes(self):
        generator = worlds._generator_for_world("fast-predictors")
        original_states = generator._states

        def change_states(seed, domain, months):
            states = copy.deepcopy(original_states(seed, domain, months))
            # State 99 is the January 2026 predictor, used for April 2026 outcomes.
            for index in range(99, len(states)):
                states[index] = np.array([100., -100., 100.])
            return states

        generator._states = change_states
        changed = generator.generate_history(17, "stable")
        original = self.histories["fast-predictors", "stable"]
        for domain in data.DOMAINS:
            before = lambda history: [row for row in history["domains"][domain]["observations"]
                                      if row["period"] < "2026-04"]
            self.assertEqual(before(original), before(changed))
            self.assertNotEqual(original["domains"][domain]["observations"],
                                changed["domains"][domain]["observations"])

    def test_delayed_changes_only_predictor_publication(self):
        for scenario in data.SCENARIOS:
            for domain in data.DOMAINS:
                reference = self.histories["reference", scenario]["domains"][domain]
                delayed = copy.deepcopy(self.histories["delayed-predictors", scenario]["domains"][domain])
                for original, row in zip(reference["predictors"], delayed["predictors"]):
                    self.assertEqual(parsed(row["availableAt"]) - parsed(original["availableAt"]), timedelta(days=60))
                    row["availableAt"] = original["availableAt"]
                self.assertEqual(reference, delayed)

    def test_original_generator_unchanged_in_success_and_failure(self):
        original_functions = data._states, data._probability, data.generate_history
        expected = data.generate_history(17, "stable")
        for world in worlds.WORLDS:
            worlds.generate_review_history(17, "stable", world)
            with self.assertRaises(ValueError):
                worlds.generate_review_history(17, "unknown", world)
            generator = worlds._generator_for_world(world)
            with patch.object(generator, "generate_history", side_effect=RuntimeError("smoke failure")):
                with patch.object(worlds, "_generator_for_world", return_value=generator):
                    with self.assertRaisesRegex(RuntimeError, "smoke failure"):
                        worlds.generate_review_history(17, "stable", world)
            self.assertEqual(original_functions, (data._states, data._probability, data.generate_history))
            self.assertEqual(expected, data.generate_history(17, "stable"))
        self.assertIsNot(worlds._generator_for_world("reference"), worlds._generator_for_world("reference"))

    def test_all_worlds_preserve_aggregate_stock_and_cohort_accounting(self):
        for history in self.histories.values():
            self.assertEqual(history["dataClass"], "constructed-synthetic")
            self.assertIs(history["operationallyQualified"], False)
            previous_end = None
            for row in history["domains"]["turnover"]["observations"]:
                if row["status"] != "complete":
                    self.assertIsNone(row["voluntaryExits"])
                    continue
                self.assertEqual(row["denominator"], row["startHeadcount"])
                self.assertEqual(row["value"], row["voluntaryExits"])
                self.assertEqual(row["endHeadcount"], row["startHeadcount"] + row["starts"]
                                 - row["voluntaryExits"] - row["otherExits"])
                if previous_end is not None:
                    self.assertEqual(previous_end, row["startHeadcount"])
                previous_end = row["endHeadcount"]
            hiring = history["domains"]["hiring"]
            for row in hiring["observations"]:
                if row["status"] != "complete":
                    self.assertIsNone(row["startsWithin90"])
                    continue
                self.assertEqual(row["started"] + row["cancelled"] + row["noShows"]
                                 + row["openOrUnresolved"], row["denominator"])
                self.assertEqual(row["startsWithin90"], row["started"])
                self.assertEqual(parsed(row["knownOutcomeThrough"]) - parsed(row["effectiveAt"]), timedelta(days=90))
                self.assertEqual(parsed(row["availableAt"]) - parsed(row["knownOutcomeThrough"]),
                                 timedelta(days=hiring["maximumReportingLagDays"]))

    def test_instrument_break_identity_publication_and_score_support_preserved(self):
        original = self.histories["reference", "instrument-break"]["domains"]["satisfaction"]["observations"]
        identity_fields = ("period", "effectiveAt", "availableAt", "instrument", "itemSet", "scoring",
                           "population", "eligibilityRule", "responseUnit", "itemsPerRespondent", "status")
        for world in worlds.WORLDS:
            rows = self.histories[world, "instrument-break"]["domains"]["satisfaction"]["observations"]
            for reference, row in zip(original, rows):
                self.assertEqual({key: row[key] for key in identity_fields},
                                 {key: reference[key] for key in identity_fields})
                if row["status"] == "complete":
                    self.assertEqual(row["value"], 100 * row["favorableAnswers"] / (5 * row["respondents"]))
                    self.assertEqual(row["denominator"], row["respondents"])

    def test_metadata_is_outside_predictors_and_invalid_arguments_fail(self):
        for (world, _scenario), history in self.histories.items():
            if world != "reference":
                self.assertEqual(history["reviewWorld"], world)
                self.assertEqual(history["constructionAssumptions"]["reviewWorld"], world)
            for domain, body in history["domains"].items():
                self.assertEqual(set(body), {"observations", "predictors"} |
                                 ({"maximumReportingLagDays"} if domain == "hiring" else set()))
                for row in body["predictors"]:
                    self.assertEqual(set(row["values"]), set(data.PREDICTOR_NAMES[domain]))
        for seed, scenario, world in [(True, "stable", "reference"), (-1, "stable", "weak-signal"),
                                      (17, "unknown", "fast-predictors"), (17, "stable", "unknown")]:
            with self.assertRaises(ValueError):
                worlds.generate_review_history(seed, scenario, world)


if __name__ == "__main__":
    unittest.main()
