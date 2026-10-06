"""Hand-constructed scoring checks; no benchmark seeds are generated."""
import unittest
import numpy as np
from .metrics import score_case, summarize


TREE = "random-forest-enriched-full"
SMALL = "gradient-boosting-enriched-small"
BASE = "linear-trend"
PROTOCOL = {"domains": ["turnover"], "scenarios": ["stable", "reversal"], "testOrigins": ["2026-03", "2026-06"]}
COMPARATORS = {"turnover": {"lags": BASE, "enriched": BASE}}


def row(seed, error, baseline=10, scenario="stable", origin="2026-03"):
    metrics = lambda value: {"mae": value, "rmse": value, "brier": None, "logLoss": None}
    return {"seed": seed, "scenario": scenario, "domain": "turnover", "origin": origin,
            "status": "predicted", "reasons": [], "scoring": {"status": "scored", "reasons": [], "labels": []},
            "predictions": {BASE: [baseline], TREE: [error], SMALL: [error]},
            "metrics": {BASE: metrics(baseline), TREE: metrics(error), SMALL: metrics(error)}}


class MetricTests(unittest.TestCase):
    def test_counts_and_scores(self):
        score = score_case("turnover", [{"value": 1}, {"value": 5}], [3, 2])
        self.assertEqual(score["mae"], 2.5)
        self.assertAlmostEqual(score["rmse"], np.sqrt(6.5))
        self.assertIsNone(score["brier"])
        self.assertEqual(score_case("satisfaction", [{"value": 0}], [0])["mae"], 0)

    def test_hiring_binomial_and_zero_exposure(self):
        labels = [{"denominator": 10, "startsWithin90": 2}, {"denominator": 30, "startsWithin90": 24}, {"denominator": 0, "startsWithin90": 0}]
        result = score_case("hiring", labels, [0.5, 0.6, 0.99])
        expanded = np.array([1] * 2 + [0] * 8 + [1] * 24 + [0] * 6)
        probabilities = np.array([0.5] * 10 + [0.6] * 30)
        self.assertAlmostEqual(result["mae"], 22.5)
        self.assertAlmostEqual(result["rmse"], 100 * np.sqrt((10 * 0.3 ** 2 + 30 * 0.2 ** 2) / 40))
        self.assertAlmostEqual(result["brier"], np.mean((probabilities - expanded) ** 2))
        self.assertAlmostEqual(result["logLoss"], -np.mean(expanded * np.log(probabilities) + (1 - expanded) * np.log1p(-probabilities)))
        self.assertEqual(result, score_case("hiring", labels[:2], [0.5, 0.6]))
        with self.assertRaises(ValueError):
            score_case("hiring", labels[-1:], [0.5])

    def test_invalid_values(self):
        for labels, predictions in [([], []), ([{"value": None}], [1]), ([{"value": 1}], [float("nan")]), ([{"value": 1}], [])]:
            with self.assertRaises(ValueError):
                score_case("turnover", labels, predictions)
        with self.assertRaises(ValueError):
            score_case("hiring", [{"denominator": 2, "startsWithin90": 3}], [0.5])

    def test_cluster_bootstrap_uses_case_weights_not_equal_seed_means(self):
        rows = [row(1, 11), row(1, 11, origin="2026-06"), row(1, 11, scenario="reversal"), row(2, 7)]
        comparison = next(item for item in summarize(rows, COMPARATORS, PROTOCOL)["comparisons"] if item["method"] == TREE)
        self.assertEqual(comparison["meanMaeDifference"], 0)
        self.assertEqual([item["meanMaeDifference"] for item in comparison["seedDifferences"]], [1, -3])
        draws = np.random.default_rng(1729).integers(0, 2, size=(1000, 2))
        expected = np.array([3, -3])[draws].sum(axis=1) / np.array([3, 1])[draws].sum(axis=1)
        np.testing.assert_allclose([comparison["bootstrap95Percent"][key] for key in ["lower", "upper"]], np.quantile(expected, [0.025, 0.975]))

    def test_blocked_labels_are_not_zero_error(self):
        blocked = row(3, 0)
        blocked["scoring"] = {"status": "blocked", "reasons": ["future-wave-identity-mismatch", "zero-target-exposure"]}
        summary = summarize([row(1, 8), row(2, 8), blocked], COMPARATORS, PROTOCOL)
        self.assertEqual(summary["overall"][0]["commonScoredCases"], 2)
        self.assertEqual(summary["overall"][0]["methods"][TREE]["mae"], 8)
        self.assertEqual(summary["overall"][0]["blockedReasons"]["future-wave-identity-mismatch"], 1)

    def test_full_candidate_small_diagnostic_and_worst_stratum_guard(self):
        clean = summarize([row(1, 8), row(2, 8)], COMPARATORS, PROTOCOL)
        self.assertEqual(next(item for item in clean["comparisons"] if item["method"] == TREE)["recommendation"], "separate-review-only")
        self.assertEqual(next(item for item in clean["comparisons"] if item["method"] == SMALL)["recommendation"], "diagnostic-only")
        bad = summarize([row(1, 1), row(2, 11.1, scenario="reversal")], COMPARATORS, PROTOCOL)
        comparison = next(item for item in bad["comparisons"] if item["method"] == TREE)
        self.assertEqual(comparison["recommendation"], "reject-replacement")
        self.assertEqual(comparison["worstStratum"]["scenario"], "reversal")

    def test_ties_zero_baseline_and_availability_reject(self):
        for rows in [[row(1, 0, baseline=0)], [row(1, 1e-7, baseline=0)], [row(1, 10)]]:
            comparison = next(item for item in summarize(rows, COMPARATORS, PROTOCOL)["comparisons"] if item["method"] == TREE)
            self.assertEqual(comparison["recommendation"], "reject-replacement")
            self.assertIsNone(comparison["bootstrap95Percent"])
        rows = [row(1, 1), row(2, 1)]
        del rows[1]["predictions"][TREE]
        summary = summarize(rows, COMPARATORS, PROTOCOL)
        comparison = next(item for item in summary["comparisons"] if item["method"] == TREE)
        self.assertFalse(comparison["availabilitySame"])
        self.assertEqual(comparison["recommendation"], "reject-replacement")
        self.assertEqual(summary["overall"][0]["commonScoredCases"], 1)

    def test_exact_five_percent_gain_and_ten_percent_stratum_limit(self):
        summary = summarize([row(1, 9.5), row(2, 9.5)], COMPARATORS, PROTOCOL)
        comparison = next(item for item in summary["comparisons"] if item["method"] == TREE)
        self.assertEqual(comparison["recommendation"], "separate-review-only")
        summary = summarize([row(1, 7), row(2, 11, scenario="reversal")], COMPARATORS, PROTOCOL)
        comparison = next(item for item in summary["comparisons"] if item["method"] == TREE)
        self.assertEqual(comparison["recommendation"], "separate-review-only")
        self.assertEqual(comparison["worsenedOverTenPercent"], [])


if __name__ == "__main__":
    unittest.main()
