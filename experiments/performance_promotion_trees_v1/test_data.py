"""Boundary tests use only development seed17, never intended study seeds."""
import copy
import unittest

from .data import AUXILIARY_NAMES, DOMAINS, SCENARIOS, aux_features, generate_history, labels_for, make_case, valid_record
from experiments.synthetic_tree_v1.features import stamp


class DataBoundaryTests(unittest.TestCase):
    def test_determinism_validation_and_inventory(self):
        a = generate_history(17,"stable")
        self.assertEqual(a,generate_history(17,"stable"))
        self.assertEqual(len(a["domains"]["performance"]["observations"]),35)
        self.assertEqual(len(a["domains"]["promotion"]["observations"]),210)
        for seed in (-1,True,2.5):
            with self.assertRaises(ValueError): generate_history(seed,"stable")
        with self.assertRaises(ValueError): generate_history(17,"unknown")

    def test_complete_rows_have_reconciled_counts_and_maturity(self):
        history = generate_history(17,"stable")
        for domain in DOMAINS:
            for row in history["domains"][domain]["observations"]:
                if row["status"]=="complete":
                    self.assertTrue(valid_record(row,domain,"2027-02-28T23:59:59.999Z"))
                    malformed = dict(row,denominator=row["denominator"]+1)
                    self.assertFalse(valid_record(malformed,domain,"2027-02-28T23:59:59.999Z"))
                else:
                    self.assertIsNone(row["value"])
                    self.assertIsNone(row.get("promotedWithin90"))

    def test_target_shapes_and_prior_denominators(self):
        history = generate_history(17,"stable")
        for domain,size,horizons in (("performance",8,1),("promotion",24,3)):
            case = make_case(history,domain,"2025-06")
            self.assertEqual(case["status"],"predicted")
            self.assertEqual(len(case["history"]),size)
            self.assertEqual(len(case["features"]),horizons)
            labels = labels_for(history,case,"2027-02-28T23:59:59.999Z")
            self.assertEqual(labels["status"],"scored")
            for row in labels["labels"]:
                self.assertEqual(row["value"],row["successes"]/row["denominator"])
            self.assertEqual(case["features"][0]["enriched"]["historical_denominator_last"],case["history"][-1]["denominator"])

    def test_unreleased_or_future_mutation_cannot_change_features(self):
        original = generate_history(17,"missingness")
        changed = copy.deepcopy(original)
        cutoff = stamp("2025-06",True)
        for source in changed["domains"].values():
            for key in ("observations","auxiliary"):
                for row in source[key]:
                    if row["availableAt"]>cutoff or row["effectiveAt"]>cutoff:
                        row["value"],row["denominator"] = .99999,999999
        for domain in DOMAINS:
            self.assertEqual(make_case(original,domain,"2025-06"),make_case(changed,domain,"2025-06"))
        self.assertEqual(aux_features(original,cutoff),aux_features(changed,cutoff))

    def test_maturity_and_available_clocks_enforced(self):
        history = generate_history(17,"stable")
        case = make_case(history,"promotion","2025-06")
        self.assertEqual(labels_for(history,case,stamp("2025-09",True))["status"],"blocked")
        row = next(r for r in history["domains"]["promotion"]["observations"] if r["status"]=="complete")
        self.assertFalse(valid_record(dict(row,knownOutcomeThrough=row["effectiveAt"]),"promotion","2027-01-01T00:00:00.000Z"))
        self.assertFalse(valid_record(row,"promotion",row["effectiveAt"]))
        self.assertFalse(valid_record(dict(row,knownOutcomeThrough="2028-01-01T00:00:00.000Z"),"promotion","2029-01-01T00:00:00.000Z"))
        self.assertFalse(valid_record(dict(row,eligibleKnownAt="2028-01-01T00:00:00.000Z"),"promotion","2029-01-01T00:00:00.000Z"))

    def test_full_identity_rejected_and_auxiliary_selection_ignores_scenario(self):
        history = generate_history(17,"stable")
        cutoff = "2027-02-28T23:59:59.999Z"
        for domain in DOMAINS:
            row = next(r for r in history["domains"][domain]["observations"] if r["status"]=="complete")
            for key in ("instrument","population","eligibilityRule","scoring","horizonDays"):
                self.assertFalse(valid_record(dict(row,**{key:"unknown"}),domain,cutoff))
        changed = copy.deepcopy(history)
        changed["scenario"] = "delayed-predictors"
        changed["seed"] = 999
        self.assertEqual(aux_features(history,stamp("2025-06",True)),aux_features(changed,stamp("2025-06",True)))

    def test_each_published_promotion_disposition_respects_small_cell_rule(self):
        history=generate_history(17,"stable")
        cutoff="2027-02-28T23:59:59.999Z"
        complete=[]
        for row in history["domains"]["promotion"]["observations"]:
            if row["status"]=="complete":
                complete.append(row)
                for key in ("promotedWithin90","nonPromotedBy90"):
                    self.assertFalse(0<row[key]<5)
            elif row["status"]=="suppressed":
                self.assertIsNone(row["denominator"])
                for key in ("promotedWithin90","nonPromotedBy90"):
                    self.assertIsNone(row[key])
            self.assertNotIn("exitsBeforePromotion",row)
            self.assertNotIn("noPromotionBy90",row)
        row=complete[0]
        malformed=dict(row,nonPromotedBy90=3,promotedWithin90=row["denominator"]-3,value=(row["denominator"]-3)/row["denominator"])
        self.assertFalse(valid_record(malformed,"promotion",cutoff))

    def test_promotion_cohort_denominator_and_identity_frozen_at_opening(self):
        history=generate_history(17,"stable")
        for mutation in ("denominator","eligibleKnownAt","identity"):
            changed=copy.deepcopy(history)
            for key in ("observations","auxiliary"):
                for row in changed["domains"]["promotion"][key]:
                    if row["period"]=="2025-01" and row["status"]=="complete":
                        if mutation=="denominator":
                            row["denominator"]+=1
                            row["nonPromotedBy90"]+=1
                            row["value"]=row["promotedWithin90"]/row["denominator"]
                        elif mutation=="eligibleKnownAt":
                            row["eligibleKnownAt"]="2025-03-01T00:00:00.000Z"
                    if mutation=="identity" and row["period"]=="2025-01" and row["revision"]==1:
                        row["eligibilityRule"]="different-opening-cohort"
            self.assertEqual(make_case(changed,"promotion","2025-06")["status"],"blocked")
        changed=copy.deepcopy(history)
        for row in changed["domains"]["promotion"]["observations"]:
            if row["period"]=="2025-07" and row["revision"]==1:
                row["denominator"]+=1
        case=make_case(changed,"promotion","2025-06")
        self.assertEqual(labels_for(changed,case,"2027-02-28T23:59:59.999Z")["status"],"blocked")

    def test_small_cells_withhold_outcomes_and_block_history(self):
        history = generate_history(17,"small-sample")
        for domain in DOMAINS:
            for row in history["domains"][domain]["observations"]:
                self.assertEqual(row["status"],"suppressed")
                self.assertIsNone(row["value"])
                self.assertIsNone(row["denominator"])
            self.assertEqual(make_case(history,domain,"2025-06")["status"],"blocked")
        features = aux_features(history,stamp("2025-06",True))
        for name in AUXILIARY_NAMES:
            self.assertIsNone(features[name])
            self.assertEqual(features[name+"_missing"],1)

    def test_instrument_change_is_unscorable_and_auxiliary_unavailable(self):
        history = generate_history(17,"instrument-break")
        case = make_case(history,"performance","2026-06")
        labels = labels_for(history,case,"2027-02-28T23:59:59.999Z")
        self.assertEqual(labels["reasons"],["future-instrument-identity-mismatch"])
        self.assertIsNone(aux_features(history,"2026-12-31T23:59:59.999Z")["performance_favorable_share"])

    def test_missing_releases_and_corrections_obey_cutoff(self):
        history = generate_history(17,"missingness")
        rows = history["domains"]["performance"]["observations"]
        partial = next(row for row in rows if row["status"]=="partial")
        corrected = next(row for row in rows if row["period"]==partial["period"] and row["revision"]==2)
        self.assertFalse(valid_record(corrected,"performance",partial["availableAt"]))
        self.assertTrue(valid_record(corrected,"performance",corrected["availableAt"]))

    def test_auxiliary_delay_preserves_native_outcomes_and_reduces_information(self):
        normal, delayed = (generate_history(17,s) for s in ("stable","delayed-predictors"))
        for domain in DOMAINS:
            self.assertEqual(normal["domains"][domain]["observations"],delayed["domains"][domain]["observations"])
        a,b = (aux_features(h,stamp("2025-06",True)) for h in (normal,delayed))
        self.assertGreater(b["promotion_rate_age_days"],a["promotion_rate_age_days"])
        self.assertGreaterEqual(b["performance_favorable_share_age_days"],a["performance_favorable_share_age_days"])

    def test_all_scenarios_generate_without_private_rows(self):
        for scenario in SCENARIOS:
            history=generate_history(17,scenario)
            self.assertFalse(history["operationallyQualified"])
            for domain in DOMAINS:
                case=make_case(history,domain,"2025-06")
                for vector in case["features"]:
                    for tier in ("lags","enriched"):
                        self.assertFalse({"seed","scenario","state","employee_id"}&vector[tier].keys())


if __name__=="__main__": unittest.main()
