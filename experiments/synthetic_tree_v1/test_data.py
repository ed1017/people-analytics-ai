"""Generator invariants; all smoke histories use non-reserved seed 17."""

import copy
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

import numpy as np

from experiments.synthetic_tree_v1 import data


def parsed(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class GeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.histories = {scenario: data.generate_history(17, scenario) for scenario in data.SCENARIOS}

    def test_deterministic_and_explicit_synthetic_boundary(self):
        self.assertEqual(self.histories["stable"], data.generate_history(17, "stable"))
        for history in self.histories.values():
            self.assertEqual(history["dataClass"], "constructed-synthetic")
            self.assertIs(history["operationallyQualified"], False)
            self.assertEqual(set(history["domains"]), set(data.DOMAINS))
        for seed, scenario in [(True, "stable"), (-1, "stable"), (17, "unknown")]:
            with self.assertRaises(ValueError):
                data.generate_history(seed, scenario)

    def test_timeline_cadence_and_publication(self):
        for scenario, history in self.histories.items():
            for domain, body in history["domains"].items():
                self.assertEqual(len(body["predictors"]), 45 if scenario == "small-sample" else 105)
                expected_start = "2023-01" if scenario == "small-sample" else "2018-01"
                self.assertEqual(body["predictors"][0]["period"], expected_start)
                self.assertEqual(body["predictors"][-1]["period"], "2026-09")
                for row in body["predictors"]:
                    self.assertTrue(row["availableAt"].endswith(".000Z"))
                    self.assertEqual(parsed(row["availableAt"])-parsed(row["effectiveAt"]),
                                     timedelta(days=45 if scenario == "missingness" else 7))
                    self.assertEqual(set(row["values"]), set(data.PREDICTOR_NAMES[domain]))
                for row in body["observations"]:
                    self.assertGreaterEqual(row["availableAt"], row["effectiveAt"])
                    if domain == "satisfaction":
                        self.assertEqual(int(row["period"][-2:]) % 3, 0)

    def test_count_stock_reconciliation_and_historical_denominator(self):
        complete = [r for r in self.histories["stable"]["domains"]["turnover"]["observations"]
                    if r["status"] == "complete"]
        for index, row in enumerate(complete):
            self.assertEqual(row["value"], row["voluntaryExits"])
            self.assertEqual(row["denominator"], row["startHeadcount"])
            self.assertEqual(row["endHeadcount"], row["startHeadcount"] + row["starts"]
                             - row["voluntaryExits"] - row["otherExits"])
            if index:
                self.assertEqual(row["startHeadcount"], complete[index-1]["endHeadcount"])

    def test_hiring_all_openings_and_maturity(self):
        for scenario in ("stable", "missingness"):
            body = self.histories[scenario]["domains"]["hiring"]
            lag = 39 if scenario == "missingness" else 3
            self.assertEqual(body["maximumReportingLagDays"], lag)
            saw_zero = False
            for row in body["observations"]:
                if row["status"] == "partial":
                    self.assertIsNone(row["value"])
                    self.assertIsNone(row["started"])
                    self.assertIsNone(row["knownOutcomeThrough"])
                    continue
                self.assertEqual(row["horizonDays"], 90)
                self.assertEqual(parsed(row["knownOutcomeThrough"]), parsed(row["effectiveAt"]) + timedelta(days=90))
                self.assertEqual(parsed(row["availableAt"]), parsed(row["knownOutcomeThrough"]) + timedelta(days=lag))
                self.assertEqual(row["started"] + row["cancelled"] + row["noShows"]
                                 + row["openOrUnresolved"], row["denominator"])
                self.assertEqual(row["value"], row["started"]/row["denominator"] if row["denominator"] else 0)
                saw_zero |= row["denominator"] == 0
            self.assertTrue(saw_zero)

    def test_unavailable_revisions_mask_outcomes_and_recover_later(self):
        observations = self.histories["missingness"]["domains"]["turnover"]["observations"]
        for row in observations:
            if row["status"] == "complete":
                continue
            self.assertIsNone(row["value"])
            self.assertIsNone(row["voluntaryExits"])
            self.assertIsNone(row["endHeadcount"])
            correction = next(r for r in observations if r["period"] == row["period"] and r["revision"] == 2)
            self.assertEqual(correction["status"], "complete")
            self.assertGreater(correction["availableAt"], row["availableAt"])

    def test_survey_score_support_and_identity_break(self):
        observations = self.histories["instrument-break"]["domains"]["satisfaction"]["observations"]
        for row in observations:
            self.assertEqual(row["instrument"], "v2" if row["period"] >= "2026-07" else "v1")
            if row["status"] != "complete":
                self.assertIsNone(row["value"])
                self.assertIsNone(row["respondents"])
                continue
            self.assertEqual(row["denominator"], row["respondents"])
            self.assertGreaterEqual(row["respondents"], 30)
            self.assertLessEqual(row["respondents"], row["eligible"])
            self.assertEqual(row["value"], 100*row["favorableAnswers"]/(5*row["respondents"]))
            self.assertTrue(0 <= row["value"] <= 100)
        self.assertEqual(next(r for r in observations if r["period"] == "2020-03")["status"], "missing")
        self.assertEqual(next(r for r in observations if r["period"] == "2020-06")["status"], "suppressed")

    def test_predictors_do_not_encode_scenario_or_outcomes(self):
        reference = self.histories["stable"]
        for scenario in ("gradual-drift", "reversal", "no-signal", "instrument-break"):
            for domain in data.DOMAINS:
                self.assertEqual(reference["domains"][domain]["predictors"],
                                 self.histories[scenario]["domains"][domain]["predictors"])

    def test_no_signal_outcomes_independent_of_predictor_stream(self):
        with patch.object(data, "_states", side_effect=lambda seed, domain, months:
                          [np.array([100., -100., 100.])] * (months + 3)):
            perturbed = data.generate_history(17, "no-signal")
        for domain in data.DOMAINS:
            original = self.histories["no-signal"]["domains"][domain]
            self.assertEqual(original["observations"], perturbed["domains"][domain]["observations"])
            self.assertNotEqual(original["predictors"], perturbed["domains"][domain]["predictors"])

    def test_future_predictor_innovations_cannot_change_earlier_outcomes(self):
        original_states = data._states
        def changed_states(seed, domain, months):
            states = copy.deepcopy(original_states(seed, domain, months))
            # State index99 is predictor period2026-01, first used for April2026 label.
            for index in range(99, len(states)):
                states[index] = np.array([100., -100., 100.])
            return states
        with patch.object(data, "_states", side_effect=changed_states):
            perturbed = data.generate_history(17, "stable")
        for domain in data.DOMAINS:
            before = lambda history: [r for r in history["domains"][domain]["observations"] if r["period"] < "2026-04"]
            self.assertEqual(before(self.histories["stable"]), before(perturbed))


if __name__ == "__main__":
    unittest.main()
