"""Boundary checks use seed 17 only; reserved benchmark seeds are untouched."""
import copy
import unittest

from .data import DOMAINS, PREDICTOR_NAMES, _probability, generate_history
from .features import labels_for, make_case, qualify_history, replay, stamp


class FeatureBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.stable = generate_history(17, "stable")
        cls.missing = generate_history(17, "missingness")
        cls.small = generate_history(17, "small-sample")
        cls.instrument = generate_history(17, "instrument-break")

    def test_postcutoff_releases_cannot_change_forecasts(self):
        cutoff = stamp("2025-06", True)
        for domain in DOMAINS:
            expected = make_case(self.stable, domain, "2025-06")
            self.assertEqual(expected["status"], "predicted")
            for action in ("remove", "mutate"):
                with self.subTest(domain=domain, action=action):
                    changed = copy.deepcopy(self.stable)
                    for collection in ("observations", "predictors"):
                        rows = changed["domains"][domain][collection]
                        future = lambda row: row["effectiveAt"] > cutoff or row["availableAt"] > cutoff
                        if action == "remove":
                            changed["domains"][domain][collection] = [row for row in rows if not future(row)]
                        else:
                            for row in rows:
                                if future(row):
                                    row["status"] = "missing"
                                    row["value"] = -999999
                                    row["denominator"] = -999999
                                    row["values"] = {name: -999999 for name in PREDICTOR_NAMES[domain]}
                    self.assertEqual(make_case(changed, domain, "2025-06"), expected)

    def test_effective_and_available_dates_are_both_required(self):
        cutoff = stamp("2025-06", True)
        old = dict(period="2025-05", effectiveAt=stamp("2025-05"), availableAt=stamp("2025-06"), revision=1)
        late_revision = dict(old, revision=2, availableAt=stamp("2025-07"))
        future_effective = dict(old, period="2025-07", effectiveAt=stamp("2025-07"), revision=3)
        self.assertEqual(replay([old, late_revision, future_effective], cutoff), [old])

    def test_all_feature_tiers_share_the_qualified_source_history(self):
        for domain in DOMAINS:
            with self.subTest(domain=domain):
                case = make_case(self.stable, domain, "2026-06")
                support, _, reason = qualify_history(self.stable["domains"][domain], domain, case["cutoff"])
                self.assertIsNone(reason)
                self.assertEqual([row["month"] for row in case["history"]], [row["period"] for row in support])
                for features in case["features"]:
                    for key, value in features["lags"].items():
                        self.assertEqual(features["enriched"][key], value)
                    for index, row in enumerate(reversed(support), 1):
                        self.assertEqual(features["lags"][f"lag_{index}"], row["value"])
                    self.assertTrue(set(features["lags"]).isdisjoint({"seed", "scenario", "id", "target_value", "future_denominator"}))
                    self.assertEqual(features["enriched"]["historical_denominator_last"], support[-1]["denominator"])

    def test_immature_hiring_labels_do_not_enter_features(self):
        expected = make_case(self.stable, "hiring", "2026-06")
        self.assertEqual(expected["audit"]["trainingEnd"], "2026-03")
        self.assertTrue(all(row["month"] <= "2026-03" for row in expected["history"]))
        changed = copy.deepcopy(self.stable)
        for row in changed["domains"]["hiring"]["observations"]:
            if row["period"] in ("2026-04", "2026-05", "2026-06") and row["availableAt"] <= expected["cutoff"]:
                row.update(value=0.999, denominator=999999, startsWithin90=999998)
        actual = make_case(changed, "hiring", "2026-06")
        self.assertEqual(actual["features"], expected["features"])
        self.assertEqual(actual["history"], expected["history"])

    def test_missing_or_incomplete_due_hiring_cohort_cannot_move_anchor(self):
        for action in ("remove", "withhold_complete_revision"):
            with self.subTest(action=action):
                changed = copy.deepcopy(self.stable)
                rows = changed["domains"]["hiring"]["observations"]
                changed["domains"]["hiring"]["observations"] = [row for row in rows if not (
                    row["period"] == "2026-03" and (action == "remove" or row["status"] == "complete"))]
                case = make_case(changed, "hiring", "2026-06")
                self.assertEqual(case["status"], "blocked")
                self.assertEqual(case["audit"]["trainingEnd"], "2026-03")
                self.assertEqual(case["features"], [])

    def test_late_fit_labels_exclude_the_whole_hiring_quarter(self):
        case = make_case(self.missing, "hiring", "2024-12")
        self.assertEqual(case["status"], "predicted")
        unavailable = labels_for(self.missing, case, "2025-06-30T23:59:59.999Z")
        self.assertEqual(unavailable["status"], "blocked")
        self.assertEqual(unavailable["labels"], [])
        complete = labels_for(self.missing, case, "2025-07-09T23:59:59.999Z")
        self.assertEqual(complete["status"], "scored")
        self.assertEqual([row["month"] for row in complete["labels"]], ["2025-01", "2025-02", "2025-03"])
        self.assertTrue(all(row["availableAt"] <= complete["labelsAsOf"] for row in complete["labels"]))

    def test_survey_release_delay_and_instrument_break_are_respected(self):
        case = make_case(self.instrument, "satisfaction", "2026-06")
        self.assertEqual(case["audit"]["trainingEnd"], "2026-03")
        self.assertEqual(case["identity"]["instrument"], "v1")
        delayed = labels_for(self.instrument, case, "2026-09-30T23:59:59.999Z")
        self.assertEqual(delayed["status"], "blocked")
        changed = labels_for(self.instrument, case, "2027-02-28T23:59:59.999Z")
        self.assertEqual(changed["reasons"], ["future-wave-identity-mismatch"])
        self.assertEqual(changed["labels"], [])

    def test_missing_predictors_remain_null_without_imputing_outcomes(self):
        for domain in DOMAINS:
            with self.subTest(domain=domain):
                expected = make_case(self.stable, domain, "2026-06")
                changed = copy.deepcopy(self.stable)
                latest = replay(changed["domains"][domain]["predictors"], expected["cutoff"])[-1]
                latest.update(status="missing", values={name: None for name in PREDICTOR_NAMES[domain]})
                case = make_case(changed, domain, "2026-06")
                self.assertEqual(case["status"], "predicted")
                for actual, original in zip(case["features"], expected["features"]):
                    self.assertEqual(actual["lags"], original["lags"])
                    for name in PREDICTOR_NAMES[domain]:
                        self.assertIsNone(actual["enriched"][name])
                        self.assertEqual(actual["enriched"][name+"_missing"], 1.0)
                support, _, _ = qualify_history(changed["domains"][domain], domain, case["cutoff"])
                support[-1].update(status="partial", value=None)
                self.assertEqual(make_case(changed, domain, "2026-06")["status"], "blocked")

    def test_small_history_abstention_is_distinct_from_small_training_pool(self):
        for domain in DOMAINS:
            with self.subTest(domain=domain):
                case = make_case(self.small, domain, "2024-12")
                self.assertEqual(case["status"], "blocked")
                self.assertEqual(case["features"], [])
                scoring = labels_for(self.small, case, "2027-02-28T23:59:59.999Z")
                self.assertEqual(scoring["reasons"], ["forecast-abstained"])
                self.assertEqual(scoring["labels"], [])
                self.assertEqual(make_case(self.small, domain, "2026-06")["status"], "predicted")

    def test_invalid_complete_target_labels_never_score(self):
        for domain in DOMAINS:
            for bad_value in (None, float("nan"), float("inf"), -1, True, 999999):
                with self.subTest(domain=domain, value=bad_value):
                    changed = copy.deepcopy(self.stable)
                    case = make_case(changed, domain, "2026-06")
                    target = case["months"][0]
                    for row in changed["domains"][domain]["observations"]:
                        if row["period"] == target and row["status"] == "complete":
                            row["value"] = bad_value
                    result = labels_for(changed, case, "2027-02-28T23:59:59.999Z")
                    self.assertEqual(result["status"], "blocked")
                    self.assertEqual(result["labels"], [])

    def test_hiring_fraction_requires_all_opening_arithmetic(self):
        changed = copy.deepcopy(self.stable)
        case = make_case(changed, "hiring", "2026-06")
        for row in changed["domains"]["hiring"]["observations"]:
            if row["period"] == case["months"][0] and row["status"] == "complete":
                row["startsWithin90"] += 1
        result = labels_for(changed, case, "2027-02-28T23:59:59.999Z")
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["labels"], [])

    def test_survey_missing_identity_cannot_be_scored(self):
        changed = copy.deepcopy(self.stable)
        case = make_case(changed, "satisfaction", "2026-06")
        for row in changed["domains"]["satisfaction"]["observations"]:
            if row["period"] == case["months"][0]:
                del row["scoring"]
        self.assertEqual(labels_for(changed, case, "2027-02-28T23:59:59.999Z")["status"], "blocked")

    def test_invalid_complete_history_cannot_be_imputed(self):
        for domain in DOMAINS:
            with self.subTest(domain=domain):
                changed = copy.deepcopy(self.stable)
                support, _, _ = qualify_history(changed["domains"][domain], domain, stamp("2026-06", True))
                support[-1]["value"] = None
                case = make_case(changed, domain, "2026-06")
                self.assertEqual(case["status"], "blocked")
                self.assertEqual(case["features"], [])

    def test_no_signal_response_law_does_not_read_predictors(self):
        for domain in DOMAINS:
            with self.subTest(domain=domain):
                a = _probability(domain, [-2, -2, -2], 90, "no-signal")
                b = _probability(domain, [2, 2, 2], 90, "no-signal")
                self.assertEqual(a, b)
                self.assertNotEqual(_probability(domain, [-2, -2, -2], 90, "stable"),
                                    _probability(domain, [2, 2, 2], 90, "stable"))

    def test_turnover_stock_and_hiring_cohort_counts_reconcile(self):
        rows = replay(self.stable["domains"]["turnover"]["observations"], "2027-02-28T23:59:59.999Z")
        for index, row in enumerate(rows):
            self.assertEqual(row["endHeadcount"], row["startHeadcount"] + row["starts"] - row["voluntaryExits"] - row["otherExits"])
            self.assertGreater(row["endHeadcount"], 0)
            if index:
                self.assertEqual(row["startHeadcount"], rows[index-1]["endHeadcount"])
        cohorts = replay(self.stable["domains"]["hiring"]["observations"], "2027-02-28T23:59:59.999Z")
        self.assertTrue(any(row["denominator"] == 0 for row in cohorts))
        for row in cohorts:
            self.assertEqual(row["denominator"], sum(row[key] for key in ("startsWithin90", "cancelled", "noShows", "openOrUnresolved")))


if __name__ == "__main__":
    unittest.main()
