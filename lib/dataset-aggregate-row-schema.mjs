/** Closed schema for the reviewed synthetic aggregate query projections.
 * No inferred fields, arbitrary nested objects or employee records are accepted.
 * Enumerated text is the constructed catalog vocabulary, not an open text channel.
 * A changed projection/catalog requires an explicit contract revision. */
export const AGGREGATE_ROW_SCHEMAS = {
  "attrition_business_unit_summary": {
    "exits": "integer",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "regrettable_exits": "integer",
    "voluntary_exits": "integer",
    "voluntary_turnover_ytd_pct": "number"
  },
  "attrition_current_summary": {
    "annualized_voluntary_turnover_pct": "number",
    "as_of": "date",
    "involuntary_exits": "integer",
    "regrettable_exits": "integer",
    "regrettable_share_of_voluntary_pct": "integer",
    "retirements": "integer",
    "total_exits": "integer",
    "total_turnover_ytd_pct": "number",
    "voluntary_exits": "integer",
    "voluntary_turnover_ytd_pct": "number"
  },
  "attrition_level_summary": {
    "exits": "integer",
    "level_code": {
      "enum": [
        "L1",
        "L10",
        "L11",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "level_name": {
      "enum": [
        "Demo level 1",
        "Demo level 10",
        "Demo level 11",
        "Demo level 2",
        "Demo level 3",
        "Demo level 4",
        "Demo level 5",
        "Demo level 6",
        "Demo level 7",
        "Demo level 8",
        "Demo level 9"
      ]
    },
    "level_rank": "integer",
    "regrettable_exits": "integer",
    "voluntary_exits": "integer"
  },
  "attrition_monthly_trend": {
    "involuntary_exits": "integer",
    "month": "date",
    "monthly_turnover_pct": "number",
    "monthly_voluntary_turnover_pct": "number",
    "regrettable_exits": "integer",
    "total_exits": "integer",
    "voluntary_exits": "integer"
  },
  "attrition_reason_summary": {
    "exits": "integer",
    "pct_of_exits": "number",
    "separation_reason": {
      "enum": [
        "Constructed demo involuntary",
        "Constructed demo voluntary"
      ]
    },
    "separation_type": {
      "enum": [
        "involuntary",
        "voluntary"
      ]
    }
  },
  "attrition_tenure_summary": {
    "exits": "integer",
    "regrettable_exits": "integer",
    "tenure_band": {
      "enum": [
        "1-2 years",
        "10+ years",
        "3-4 years",
        "5-9 years",
        "<1 year"
      ]
    },
    "tenure_sort": "integer",
    "voluntary_exits": "integer"
  },
  "career_monthly": {
    "events": "integer",
    "is_partial": "boolean",
    "lateral_moves": "integer",
    "month": "date",
    "promotions": "integer",
    "transfers": "integer"
  },
  "career_summary": {
    "currently_active_linked_employees": "integer",
    "currently_nonactive_linked_employees": "integer",
    "destination_position_recorded_events": "integer",
    "distinct_recorded_employees": "integer",
    "first_recorded_date": "date",
    "last_recorded_date": "date",
    "latest_month_partial": "boolean",
    "origin_position_missing_events": "integer",
    "origin_position_recorded_events": "integer",
    "recorded_months": "integer",
    "synthetic_linked_events": "integer",
    "total_recorded_events": "integer"
  },
  "career_transitions": {
    "events": "integer",
    "from_level": {
      "enum": [
        "L1",
        "L10",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "from_rank": "integer",
    "movement_type": {
      "enum": [
        "promotion",
        "transfer"
      ]
    },
    "to_level": {
      "enum": [
        "L1",
        "L10",
        "L11",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "to_rank": "integer"
  },
  "dashboard": {
    "payload": {
      "filter_options": {
        "business_units": {
          "array": {
            "label": {
              "enum": [
                "Demo BU-CLIENTOPS",
                "Demo BU-CONS",
                "Demo BU-CORP",
                "Demo BU-DATAAI",
                "Demo BU-DIGITAL",
                "Demo BU-MGSVC",
                "Demo BU-SALES",
                "Demo BU-TECH"
              ]
            },
            "value": {
              "enum": [
                "BU-CLIENTOPS",
                "BU-CONS",
                "BU-CORP",
                "BU-DATAAI",
                "BU-DIGITAL",
                "BU-MGSVC",
                "BU-SALES",
                "BU-TECH"
              ]
            }
          }
        },
        "countries": {
          "array": {
            "label": {
              "enum": [
                "Demo AU",
                "Demo BR",
                "Demo CA",
                "Demo DE",
                "Demo FR",
                "Demo GB",
                "Demo IN",
                "Demo JP",
                "Demo SG",
                "Demo US"
              ]
            },
            "value": {
              "enum": [
                "AU",
                "BR",
                "CA",
                "DE",
                "FR",
                "GB",
                "IN",
                "JP",
                "SG",
                "US"
              ]
            }
          }
        },
        "levels": {
          "array": {
            "label": {
              "enum": [
                "Demo level 1",
                "Demo level 10",
                "Demo level 11",
                "Demo level 12",
                "Demo level 2",
                "Demo level 3",
                "Demo level 4",
                "Demo level 5",
                "Demo level 6",
                "Demo level 7",
                "Demo level 8",
                "Demo level 9"
              ]
            },
            "value": {
              "enum": [
                "L1",
                "L10",
                "L11",
                "L12",
                "L2",
                "L3",
                "L4",
                "L5",
                "L6",
                "L7",
                "L8",
                "L9"
              ]
            }
          }
        }
      },
      "overview": {
        "fte": "number",
        "headcount": "integer",
        "labor_cost_usd": "number",
        "open_positions": "integer",
        "snapshot_date": "date",
        "voluntary_turnover_ytd_pct": "number"
      },
      "trend": {
        "array": {
          "fte": "number",
          "headcount": "integer",
          "snapshot_date": "date"
        }
      }
    }
  },
  "dashboard_headcount_trend": {
    "fte": "number",
    "headcount": "integer",
    "snapshot_date": "date"
  },
  "finance_current_summary": {
    "cost_per_fte_usd": "number",
    "estimated_vacancy_cost_exposure_usd": "number",
    "fte": "number",
    "headcount": "integer",
    "labor_cost_usd": "number",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "org_type": {
      "enum": [
        "business_unit"
      ]
    },
    "org_unit_id": "uuid",
    "vacant_positions": "integer"
  },
  "job_catalog": {
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "job_profile_name": {
      "enum": [
        "Demo AI-ARCH",
        "Demo AI-ENG",
        "Demo BI-ANA",
        "Demo BI-DEV",
        "Demo CLOUD-ARCH",
        "Demo CLOUD-ENG",
        "Demo COMMS-GEN",
        "Demo CONS-MGMT",
        "Demo CONS-TECH",
        "Demo CONS-TRANS",
        "Demo CORPDEV-ANA",
        "Demo CSM-GEN",
        "Demo CYBER-ANA",
        "Demo CYBER-ENG",
        "Demo DE-ARCH",
        "Demo DE-ENG",
        "Demo DS-APPLIED",
        "Demo DS-SCI",
        "Demo FIN-ACC",
        "Demo FIN-FPNA",
        "Demo FIN-TREAS",
        "Demo HR-HRBP",
        "Demo HR-HRIS",
        "Demo HR-PA",
        "Demo HR-TA",
        "Demo HR-TM",
        "Demo HR-TR",
        "Demo INFOSEC-ANA",
        "Demo INFRA-ENG",
        "Demo IT-ENG",
        "Demo LEGAL-COUNSEL",
        "Demo LEGAL-PRIV",
        "Demo MKT-BRAND",
        "Demo MKT-GROWTH",
        "Demo ML-ENG",
        "Demo OPS-BUS",
        "Demo OPS-CLIENT",
        "Demo PMO-PGM",
        "Demo PMO-PM",
        "Demo PROC-SOURCING",
        "Demo PROD-PM",
        "Demo QA-ENG",
        "Demo SALES-AE",
        "Demo SALES-OPS",
        "Demo STRAT-ANA",
        "Demo SWE-BACK",
        "Demo SWE-FRONT",
        "Demo SWE-FULL",
        "Demo SWE-GEN",
        "Demo UX-DES"
      ]
    }
  },
  "learning_courses": {
    "active_course_count": "integer",
    "avg_catalog_duration_hours": "integer",
    "shortest_catalog_duration_hours": "integer",
    "skill_code": {
      "enum": [
        "DEMO-SKILL-1",
        "DEMO-SKILL-2",
        "DEMO-SKILL-3",
        "DEMO-SKILL-4",
        "DEMO-SKILL-5"
      ]
    },
    "skill_id": "uuid"
  },
  "learning_jobs": {
    "active_course_count": "integer",
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "job_profile_name": {
      "enum": [
        "Demo AI-ARCH",
        "Demo AI-ENG",
        "Demo BI-ANA",
        "Demo BI-DEV",
        "Demo CLOUD-ARCH",
        "Demo CLOUD-ENG",
        "Demo COMMS-GEN",
        "Demo CONS-MGMT",
        "Demo CONS-TECH",
        "Demo CONS-TRANS",
        "Demo CORPDEV-ANA",
        "Demo CSM-GEN",
        "Demo CYBER-ANA",
        "Demo CYBER-ENG",
        "Demo DE-ARCH",
        "Demo DE-ENG",
        "Demo DS-APPLIED",
        "Demo DS-SCI",
        "Demo FIN-ACC",
        "Demo FIN-FPNA",
        "Demo FIN-TREAS",
        "Demo HR-HRBP",
        "Demo HR-HRIS",
        "Demo HR-PA",
        "Demo HR-TA",
        "Demo HR-TM",
        "Demo HR-TR",
        "Demo INFOSEC-ANA",
        "Demo INFRA-ENG",
        "Demo IT-ENG",
        "Demo LEGAL-COUNSEL",
        "Demo LEGAL-PRIV",
        "Demo MKT-BRAND",
        "Demo MKT-GROWTH",
        "Demo ML-ENG",
        "Demo OPS-BUS",
        "Demo OPS-CLIENT",
        "Demo PMO-PGM",
        "Demo PMO-PM",
        "Demo PROC-SOURCING",
        "Demo PROD-PM",
        "Demo QA-ENG",
        "Demo SALES-AE",
        "Demo SALES-OPS",
        "Demo STRAT-ANA",
        "Demo SWE-BACK",
        "Demo SWE-FRONT",
        "Demo SWE-FULL",
        "Demo SWE-GEN",
        "Demo UX-DES"
      ]
    },
    "required_skill_count": "integer",
    "required_skills_with_active_pathway": "integer",
    "shortest_catalog_duration_hours": "integer"
  },
  "planning_catalog": {
    "assumptions": {
      "array": {
        "assumption_name": {
          "enum": [
            "Annual enterprise headcount growth",
            "Annual labor cost inflation"
          ]
        },
        "assumption_text": {
          "enum": [
            "Explicit flat planning assumption; not a learned value"
          ]
        },
        "assumption_value": "integer"
      }
    },
    "description": {
      "enum": [
        "Constructed flat v2 baseline; not an estimated forecast or approved budget"
      ]
    },
    "scenario_name": {
      "enum": [
        "Baseline"
      ]
    },
    "scenario_type": {
      "enum": [
        "draft_assumption"
      ]
    }
  },
  "position_action_structural_inventory": {
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "level_code": {
      "enum": [
        "L1",
        "L10",
        "L11",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "level_rank": "integer",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    }
  },
  "position_current": {
    "closed_positions": "integer",
    "current_positions": "integer",
    "filled_positions": "integer",
    "frozen_positions": "integer",
    "level_code": {
      "enum": [
        "L1",
        "L10",
        "L11",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "level_name": {
      "enum": [
        "Demo level 1",
        "Demo level 10",
        "Demo level 11",
        "Demo level 2",
        "Demo level 3",
        "Demo level 4",
        "Demo level 5",
        "Demo level 6",
        "Demo level 7",
        "Demo level 8",
        "Demo level 9"
      ]
    },
    "level_rank": "integer",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "planned_positions": "integer",
    "vacant_positions": "integer"
  },
  "position_integrity": {
    "active_employees": "integer",
    "assignment_mismatches": "integer",
    "chronology_errors": "integer",
    "closed_positions": "integer",
    "distinct_incumbents": "integer",
    "distinct_positions": "integer",
    "filled_positions": "integer",
    "inventory_mismatches": "integer",
    "snapshot_positions": "integer",
    "vacant_positions": "integer"
  },
  "position_plan": {
    "level_code": {
      "enum": [
        "L1",
        "L10",
        "L11",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "level_name": {
      "enum": [
        "Demo level 1",
        "Demo level 10",
        "Demo level 11",
        "Demo level 2",
        "Demo level 3",
        "Demo level 4",
        "Demo level 5",
        "Demo level 6",
        "Demo level 7",
        "Demo level 8",
        "Demo level 9"
      ]
    },
    "level_rank": "integer",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "planned_exits": "integer",
    "planned_fte": "number",
    "planned_hires": "integer",
    "planned_labor_cost_usd": "number",
    "planned_positions": "integer",
    "planning_month": "date",
    "scenario_name": {
      "enum": [
        "Baseline"
      ]
    },
    "scenario_type": {
      "enum": [
        "draft_assumption"
      ]
    }
  },
  "preferences_interests": {
    "code": {
      "enum": [
        "Constructed demo interest"
      ]
    },
    "employees": "integer",
    "label": {
      "enum": [
        "Constructed demo interest"
      ]
    }
  },
  "preferences_locations": {
    "city": "null",
    "country_code": {
      "enum": [
        "AU",
        "BR",
        "CA",
        "DE",
        "FR",
        "GB",
        "IN",
        "JP",
        "SG",
        "US"
      ]
    },
    "employees": "integer",
    "location_code": {
      "enum": [
        "DEMO-AU",
        "DEMO-BR",
        "DEMO-CA",
        "DEMO-DE",
        "DEMO-FR",
        "DEMO-GB",
        "DEMO-IN",
        "DEMO-JP",
        "DEMO-SG",
        "DEMO-US"
      ]
    },
    "location_name": {
      "enum": [
        "Demo location AU",
        "Demo location BR",
        "Demo location CA",
        "Demo location DE",
        "Demo location FR",
        "Demo location GB",
        "Demo location IN",
        "Demo location JP",
        "Demo location SG",
        "Demo location US"
      ]
    }
  },
  "preferences_orgs": {
    "active_employees": "integer",
    "employees_with_preference": "integer",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "preference_coverage_pct": "number"
  },
  "preferences_roles": {
    "code": {
      "enum": [
        "CLOUD-ENG",
        "CONS-MGMT",
        "CYBER-ANA",
        "DE-ENG",
        "DS-SCI",
        "FIN-FPNA",
        "HR-HRIS",
        "INFRA-ENG",
        "IT-ENG",
        "MKT-BRAND",
        "ML-ENG",
        "PROD-PM",
        "QA-ENG",
        "STRAT-ANA",
        "UX-DES"
      ]
    },
    "employees": "integer",
    "label": {
      "enum": [
        "Demo CLOUD-ENG",
        "Demo CONS-MGMT",
        "Demo CYBER-ANA",
        "Demo DE-ENG",
        "Demo DS-SCI",
        "Demo FIN-FPNA",
        "Demo HR-HRIS",
        "Demo INFRA-ENG",
        "Demo IT-ENG",
        "Demo MKT-BRAND",
        "Demo ML-ENG",
        "Demo PROD-PM",
        "Demo QA-ENG",
        "Demo STRAT-ANA",
        "Demo UX-DES"
      ]
    }
  },
  "preferences_summary": {
    "active_employees": "integer",
    "earliest_preference_update": "date",
    "employees_with_multiple_preference_rows": "integer",
    "employees_with_preference": "integer",
    "known_relocation_records": "integer",
    "latest_preference_update": "date",
    "missing_career_interest": "integer",
    "missing_desired_location": "integer",
    "missing_desired_profile": "integer",
    "missing_relocation_willingness": "integer",
    "preference_rows": "integer",
    "relocation_willing_employees": "integer",
    "unmatched_current_org_references": "integer",
    "unmatched_location_references": "integer",
    "unmatched_profile_references": "integer"
  },
  "projection_monthly": {
    "exits": "integer",
    "external_starts": "integer",
    "headcount": "integer",
    "promotions": "integer",
    "snapshot_date": "date",
    "transfers": "integer"
  },
  "range_bands": {
    "common_country_policy": "boolean",
    "effectivefrom": "date",
    "job": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "level": {
      "enum": [
        "L1",
        "L10",
        "L11",
        "L12",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "maximum": "integer",
    "midpoint": "integer",
    "minimum": "integer"
  },
  "response_recruiting": {
    "external_filled_requisitions": "integer",
    "internal_fills_excluded": "integer",
    "median_open_to_accepted_days": {
      "nullable": "integer"
    },
    "skill_code": {
      "enum": [
        "DEMO-SKILL-1",
        "DEMO-SKILL-2",
        "DEMO-SKILL-3",
        "DEMO-SKILL-4",
        "DEMO-SKILL-5"
      ]
    }
  },
  "response_requirements": {
    "importance": {
      "enum": [
        "required"
      ]
    },
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "required_proficiency": "integer",
    "skill_category": {
      "enum": [
        "AI",
        "Demo general"
      ]
    },
    "skill_code": {
      "enum": [
        "DEMO-SKILL-1",
        "DEMO-SKILL-2",
        "DEMO-SKILL-3"
      ]
    },
    "skill_name": {
      "enum": [
        "Constructed DEMO-SKILL-1",
        "Constructed DEMO-SKILL-2",
        "Constructed DEMO-SKILL-3"
      ]
    },
    "weight": "integer"
  },
  "role_recruiting": {
    "evidence_start": "date",
    "external_accepted_offers": "integer",
    "external_applicants": "integer",
    "external_fills": "integer",
    "external_offers": "integer",
    "internal_fills": "integer",
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "median_time_to_fill_days": "integer",
    "open_advanced_candidates": "integer",
    "open_applicants": "integer",
    "open_interviews": "integer",
    "open_offers": "integer",
    "open_requisitions": "integer",
    "recent_external_fills": "integer",
    "requisitions": "integer"
  },
  "role_recruiting_integrity": {
    "chronology_errors": "integer",
    "distinct_requisitions": "integer",
    "invalid_metrics": "integer",
    "metric_rows": "integer",
    "unknown_fill_class": "integer"
  },
  "role_recruiting_monthly": {
    "external_fills": "integer",
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "month": "date"
  },
  "role_recruiting_timing": {
    "accepted_offer_to_start": {
      "median_days": "integer",
      "p25_days": "integer",
      "p75_days": "integer",
      "valid_sample_count": "integer"
    },
    "distinct_requisitions": "integer",
    "duplicate_requisitions_excluded": "integer",
    "eligible_rows": "integer",
    "future_starts_excluded": "integer",
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "missing_or_invalid_acceptance": "integer",
    "missing_or_invalid_start": "integer",
    "opening_to_accepted_offer": {
      "median_days": "integer",
      "p25_days": "integer",
      "p75_days": "integer",
      "valid_sample_count": "integer"
    },
    "opening_to_start": {
      "median_days": "integer",
      "p25_days": "integer",
      "p75_days": "integer",
      "valid_sample_count": "integer"
    }
  },
  "scenario_defaults": {
    "as_of": "date",
    "baseline_annual_attrition_pct": "number",
    "baseline_annual_growth_pct": "integer",
    "baseline_fill_rate_pct": "integer",
    "baseline_productivity_hiring_reduction_pct": "integer",
    "baseline_salary_inflation_pct": "integer"
  },
  "scenario_family": {
    "family_code": {
      "enum": [
        "AI",
        "BI",
        "CLOUD",
        "COMMS",
        "CONS",
        "CORPDEV",
        "CSM",
        "CYBER",
        "DE",
        "DS",
        "FIN",
        "HR",
        "INFOSEC",
        "INFRA",
        "IT",
        "LEGAL",
        "MKT",
        "ML",
        "OPS",
        "PMO",
        "PROC",
        "PROD",
        "QA",
        "SALES",
        "STRAT",
        "SWE",
        "UX"
      ]
    },
    "family_name": {
      "enum": [
        "Demo family AI",
        "Demo family BI",
        "Demo family CLOUD",
        "Demo family COMMS",
        "Demo family CONS",
        "Demo family CORPDEV",
        "Demo family CSM",
        "Demo family CYBER",
        "Demo family DE",
        "Demo family DS",
        "Demo family FIN",
        "Demo family HR",
        "Demo family INFOSEC",
        "Demo family INFRA",
        "Demo family IT",
        "Demo family LEGAL",
        "Demo family MKT",
        "Demo family ML",
        "Demo family OPS",
        "Demo family PMO",
        "Demo family PROC",
        "Demo family PROD",
        "Demo family QA",
        "Demo family SALES",
        "Demo family STRAT",
        "Demo family SWE",
        "Demo family UX"
      ]
    },
    "planned_headcount": "integer",
    "planned_labor_cost_usd": "number",
    "planning_month": "date"
  },
  "scenario_history": {
    "average_headcount": "number",
    "exits": "integer",
    "first_date": "date",
    "last_date": "date",
    "months": "integer"
  },
  "scenario_org": {
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "planned_exits": "integer",
    "planned_fte": "number",
    "planned_headcount": "integer",
    "planned_hires": "integer",
    "planned_labor_cost_usd": "number",
    "planning_month": "date"
  },
  "skill_catalog_counts": {
    "active_skills": "integer",
    "onet_mapped_job_profiles": "integer",
    "total_job_profiles": "integer"
  },
  "structural_inventory": {
    "annual_cost_per_position": {
      "nullable": "number"
    },
    "current_positions": "integer",
    "filled_positions": "integer",
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "job_profile_name": {
      "enum": [
        "Demo AI-ARCH",
        "Demo AI-ENG",
        "Demo BI-ANA",
        "Demo BI-DEV",
        "Demo CLOUD-ARCH",
        "Demo CLOUD-ENG",
        "Demo COMMS-GEN",
        "Demo CONS-MGMT",
        "Demo CONS-TECH",
        "Demo CONS-TRANS",
        "Demo CORPDEV-ANA",
        "Demo CSM-GEN",
        "Demo CYBER-ANA",
        "Demo CYBER-ENG",
        "Demo DE-ARCH",
        "Demo DE-ENG",
        "Demo DS-APPLIED",
        "Demo DS-SCI",
        "Demo FIN-ACC",
        "Demo FIN-FPNA",
        "Demo FIN-TREAS",
        "Demo HR-HRBP",
        "Demo HR-HRIS",
        "Demo HR-PA",
        "Demo HR-TA",
        "Demo HR-TM",
        "Demo HR-TR",
        "Demo INFOSEC-ANA",
        "Demo INFRA-ENG",
        "Demo IT-ENG",
        "Demo LEGAL-COUNSEL",
        "Demo LEGAL-PRIV",
        "Demo MKT-BRAND",
        "Demo MKT-GROWTH",
        "Demo ML-ENG",
        "Demo OPS-BUS",
        "Demo OPS-CLIENT",
        "Demo PMO-PGM",
        "Demo PMO-PM",
        "Demo PROC-SOURCING",
        "Demo PROD-PM",
        "Demo QA-ENG",
        "Demo SALES-AE",
        "Demo SALES-OPS",
        "Demo STRAT-ANA",
        "Demo SWE-BACK",
        "Demo SWE-FRONT",
        "Demo SWE-FULL",
        "Demo SWE-GEN",
        "Demo UX-DES"
      ]
    },
    "level_code": {
      "enum": [
        "L1",
        "L10",
        "L11",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "level_name": {
      "enum": [
        "Demo level 1",
        "Demo level 10",
        "Demo level 11",
        "Demo level 2",
        "Demo level 3",
        "Demo level 4",
        "Demo level 5",
        "Demo level 6",
        "Demo level 7",
        "Demo level 8",
        "Demo level 9"
      ]
    },
    "level_rank": "integer",
    "on_hold_requisition_vacancies": "integer",
    "open_requisition_vacancies": "integer",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "planned_headcount": "integer",
    "planned_labor_cost_usd": "number",
    "uncovered_vacancies": "integer",
    "vacant_positions": "integer"
  },
  "structural_requirements": {
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "skill_category": {
      "enum": [
        "AI",
        "Demo general"
      ]
    },
    "skill_code": {
      "enum": [
        "DEMO-SKILL-1",
        "DEMO-SKILL-2",
        "DEMO-SKILL-3"
      ]
    },
    "skill_name": {
      "enum": [
        "Constructed DEMO-SKILL-1",
        "Constructed DEMO-SKILL-2",
        "Constructed DEMO-SKILL-3"
      ]
    }
  },
  "structural_signals": {
    "active_contingent_workers": "integer",
    "active_course_count": "integer",
    "avg_active_bill_rate": "null",
    "avg_course_duration_hours": "integer",
    "completed_learners_ytd": "integer",
    "enrolled_learners": "integer",
    "historical_filled_requisitions": "integer",
    "in_progress_learners": "integer",
    "median_time_to_fill_days": {
      "nullable": "integer"
    },
    "mobility_candidates": "integer",
    "skill_code": {
      "enum": [
        "DEMO-SKILL-1",
        "DEMO-SKILL-2",
        "DEMO-SKILL-3",
        "DEMO-SKILL-4",
        "DEMO-SKILL-5"
      ]
    },
    "total_contingent_records": "integer"
  },
  "structural_supply": {
    "employees_with_skill": "integer",
    "skill_code": {
      "enum": [
        "DEMO-SKILL-1",
        "DEMO-SKILL-2",
        "DEMO-SKILL-3",
        "DEMO-SKILL-4",
        "DEMO-SKILL-5"
      ]
    }
  },
  "succession_counts": {
    "critical_job_profiles": "integer",
    "filled_critical_positions": "integer",
    "flag_rows": "integer",
    "invalid_flag_labels": "integer",
    "invalid_plans": "integer",
    "plan_rows": "integer",
    "positions_with_ready_now": "integer",
    "positions_with_recorded_plan": "integer"
  },
  "survey_business_units": {
    "avg_score": "number",
    "favorable_pct": "number",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "respondents": "integer"
  },
  "survey_dimensions": {
    "avg_score": "number",
    "candidate_respondents": "integer",
    "dimension": {
      "enum": [
        "Demo engagement"
      ]
    },
    "employee_respondents": "integer",
    "favorable_pct": "number",
    "question_code": {
      "enum": [
        "Q1",
        "Q2",
        "Q3",
        "Q4",
        "Q5"
      ]
    },
    "question_text": {
      "enum": [
        "Constructed demonstration item 1",
        "Constructed demonstration item 2",
        "Constructed demonstration item 3",
        "Constructed demonstration item 4",
        "Constructed demonstration item 5"
      ]
    },
    "separation_respondents": "integer",
    "survey_code": {
      "enum": [
        "DEMO2-ENG-2026-09"
      ]
    },
    "survey_name": {
      "enum": [
        "Constructed quarterly engagement 2026-09-30"
      ]
    },
    "survey_type": {
      "enum": [
        "engagement"
      ]
    }
  },
  "survey_inventory": {
    "response_items": "integer",
    "survey_type": {
      "enum": [
        "engagement"
      ]
    },
    "waves": "integer"
  },
  "survey_waves": {
    "avg_score": "number",
    "close_date": "date",
    "denominator_snapshot_date": "date",
    "eligible_population": "integer",
    "favorable_pct": "number",
    "invalid_respondents": "integer",
    "launch_date": "date",
    "participation_pct": "number",
    "respondents": "integer",
    "response_records": "integer",
    "survey_code": {
      "enum": [
        "DEMO2-ENG-2024-03",
        "DEMO2-ENG-2024-06",
        "DEMO2-ENG-2024-09",
        "DEMO2-ENG-2024-12",
        "DEMO2-ENG-2025-03",
        "DEMO2-ENG-2025-06",
        "DEMO2-ENG-2025-09",
        "DEMO2-ENG-2025-12",
        "DEMO2-ENG-2026-03",
        "DEMO2-ENG-2026-09",
        "ENG-2026"
      ]
    },
    "survey_name": {
      "enum": [
        "Constructed quarterly engagement 2024-03-31",
        "Constructed quarterly engagement 2024-06-30",
        "Constructed quarterly engagement 2024-09-30",
        "Constructed quarterly engagement 2024-12-31",
        "Constructed quarterly engagement 2025-03-31",
        "Constructed quarterly engagement 2025-06-30",
        "Constructed quarterly engagement 2025-09-30",
        "Constructed quarterly engagement 2025-12-31",
        "Constructed quarterly engagement 2026-03-31",
        "Constructed quarterly engagement 2026-06-30",
        "Constructed quarterly engagement 2026-09-30"
      ]
    }
  },
  "talent_acquisition_business_unit_summary": {
    "application_to_hire_pct": "integer",
    "applications": "integer",
    "avg_time_to_fill_days": "integer",
    "hires": "integer",
    "open_positions": "integer",
    "open_requisitions": "integer",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    }
  },
  "talent_acquisition_current_summary": {
    "application_to_hire_pct": "integer",
    "application_to_interview_pct": "integer",
    "applications": "integer",
    "as_of": "date",
    "avg_open_req_age_days": "number",
    "avg_time_to_fill_days": "integer",
    "external_hires": "integer",
    "hires": "integer",
    "internal_hires": "integer",
    "interview_to_offer_pct": "integer",
    "interviewed_applications": "integer",
    "median_open_req_age_days": "integer",
    "median_time_to_fill_days": "integer",
    "offer_acceptance_pct": "integer",
    "offer_to_hire_pct": "integer",
    "offered_applications": "integer",
    "open_positions": "integer",
    "open_reqs_over_60_days": "integer",
    "open_requisitions": "integer"
  },
  "talent_acquisition_monthly_summary": {
    "applications": "integer",
    "hires": "integer",
    "interviewed_applications": "integer",
    "month": "date",
    "offers": "integer"
  },
  "talent_acquisition_recruiter_summary": {
    "avg_time_to_fill_days": "integer",
    "filled_requisitions": "integer",
    "open_positions": "integer",
    "open_requisitions": "integer",
    "recruiter_name": {
      "enum": [
        "Demo recruiting team"
      ]
    },
    "region": "null",
    "specialty": "null",
    "total_requisitions": "integer"
  },
  "talent_acquisition_source_summary": {
    "application_to_hire_pct": "integer",
    "applications": "integer",
    "hires": "integer",
    "source_category": {
      "enum": [
        "external",
        "internal"
      ]
    },
    "source_code": {
      "enum": [
        "DEMO-EXTERNAL",
        "DEMO-INTERNAL"
      ]
    },
    "source_name": {
      "enum": [
        "Constructed external path",
        "Constructed internal path"
      ]
    }
  },
  "talent_catalog": {
    "active": "boolean",
    "code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "current_headcount": "integer",
    "description": "null",
    "id": "uuid",
    "name": {
      "enum": [
        "Demo AI-ARCH",
        "Demo AI-ENG",
        "Demo BI-ANA",
        "Demo BI-DEV",
        "Demo CLOUD-ARCH",
        "Demo CLOUD-ENG",
        "Demo COMMS-GEN",
        "Demo CONS-MGMT",
        "Demo CONS-TECH",
        "Demo CONS-TRANS",
        "Demo CORPDEV-ANA",
        "Demo CSM-GEN",
        "Demo CYBER-ANA",
        "Demo CYBER-ENG",
        "Demo DE-ARCH",
        "Demo DE-ENG",
        "Demo DS-APPLIED",
        "Demo DS-SCI",
        "Demo FIN-ACC",
        "Demo FIN-FPNA",
        "Demo FIN-TREAS",
        "Demo HR-HRBP",
        "Demo HR-HRIS",
        "Demo HR-PA",
        "Demo HR-TA",
        "Demo HR-TM",
        "Demo HR-TR",
        "Demo INFOSEC-ANA",
        "Demo INFRA-ENG",
        "Demo IT-ENG",
        "Demo LEGAL-COUNSEL",
        "Demo LEGAL-PRIV",
        "Demo MKT-BRAND",
        "Demo MKT-GROWTH",
        "Demo ML-ENG",
        "Demo OPS-BUS",
        "Demo OPS-CLIENT",
        "Demo PMO-PGM",
        "Demo PMO-PM",
        "Demo PROC-SOURCING",
        "Demo PROD-PM",
        "Demo QA-ENG",
        "Demo SALES-AE",
        "Demo SALES-OPS",
        "Demo STRAT-ANA",
        "Demo SWE-BACK",
        "Demo SWE-FRONT",
        "Demo SWE-FULL",
        "Demo SWE-GEN",
        "Demo UX-DES"
      ]
    },
    "requirements": {
      "array": {
        "importance": {
          "enum": [
            "required"
          ]
        },
        "name": {
          "enum": [
            "Constructed DEMO-SKILL-1",
            "Constructed DEMO-SKILL-2",
            "Constructed DEMO-SKILL-3"
          ]
        },
        "requiredProficiency": "integer",
        "skill_code": {
          "enum": [
            "DEMO-SKILL-1",
            "DEMO-SKILL-2",
            "DEMO-SKILL-3"
          ]
        }
      }
    }
  },
  "talent_fit": {
    "active_preferences": "integer",
    "all_thresholds_met": "integer",
    "beyond_gap_rule": "integer",
    "eligible": "integer",
    "fully_course_covered": "integer",
    "incumbents": "integer",
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "no_course_coverage": "integer",
    "partly_course_covered": "integer",
    "unknown_profiles": "integer",
    "within_gap_rule": "integer"
  },
  "talent_gaps": {
    "active_course_count": "integer",
    "candidates_below_requirement": "integer",
    "job_profile_code": {
      "enum": [
        "AI-ARCH",
        "AI-ENG",
        "BI-ANA",
        "BI-DEV",
        "CLOUD-ARCH",
        "CLOUD-ENG",
        "COMMS-GEN",
        "CONS-MGMT",
        "CONS-TECH",
        "CONS-TRANS",
        "CORPDEV-ANA",
        "CSM-GEN",
        "CYBER-ANA",
        "CYBER-ENG",
        "DE-ARCH",
        "DE-ENG",
        "DS-APPLIED",
        "DS-SCI",
        "FIN-ACC",
        "FIN-FPNA",
        "FIN-TREAS",
        "HR-HRBP",
        "HR-HRIS",
        "HR-PA",
        "HR-TA",
        "HR-TM",
        "HR-TR",
        "INFOSEC-ANA",
        "INFRA-ENG",
        "IT-ENG",
        "LEGAL-COUNSEL",
        "LEGAL-PRIV",
        "MKT-BRAND",
        "MKT-GROWTH",
        "ML-ENG",
        "OPS-BUS",
        "OPS-CLIENT",
        "PMO-PGM",
        "PMO-PM",
        "PROC-SOURCING",
        "PROD-PM",
        "QA-ENG",
        "SALES-AE",
        "SALES-OPS",
        "STRAT-ANA",
        "SWE-BACK",
        "SWE-FRONT",
        "SWE-FULL",
        "SWE-GEN",
        "UX-DES"
      ]
    },
    "required_proficiency": "integer",
    "shortest_active_course_hours": "integer",
    "skill_code": {
      "enum": [
        "DEMO-SKILL-1",
        "DEMO-SKILL-2",
        "DEMO-SKILL-3"
      ]
    },
    "skill_name": {
      "enum": [
        "Constructed DEMO-SKILL-1",
        "Constructed DEMO-SKILL-2",
        "Constructed DEMO-SKILL-3"
      ]
    },
    "total_shortfall": "integer"
  },
  "talent_integrity": {
    "active_headcount": "integer",
    "active_skill_profiles": "integer",
    "duplicate_preferences": "integer",
    "duplicate_requirements": "integer",
    "duplicate_snapshot_people": "integer",
    "external_skill_ratings": "integer",
    "external_software_examples": "integer",
    "invalid_preferences": "integer",
    "invalid_requirements": "integer",
    "invalid_skill_profiles": "integer",
    "mappings": "integer",
    "occupations": "integer",
    "preferences": "integer"
  },
  "workforce_business_unit_summary": {
    "as_of": "date",
    "avg_span_of_control": "number",
    "avg_tenure_years": "number",
    "fte": "number",
    "headcount": "integer",
    "org_code": {
      "enum": [
        "BU-CLIENTOPS",
        "BU-CONS",
        "BU-CORP",
        "BU-DATAAI",
        "BU-DIGITAL",
        "BU-MGSVC",
        "BU-SALES",
        "BU-TECH"
      ]
    },
    "org_name": {
      "enum": [
        "Demo BU-CLIENTOPS",
        "Demo BU-CONS",
        "Demo BU-CORP",
        "Demo BU-DATAAI",
        "Demo BU-DIGITAL",
        "Demo BU-MGSVC",
        "Demo BU-SALES",
        "Demo BU-TECH"
      ]
    },
    "people_managers": "integer"
  },
  "workforce_country_summary": {
    "as_of": "date",
    "avg_tenure_years": "number",
    "country_code": {
      "enum": [
        "AU",
        "BR",
        "CA",
        "DE",
        "FR",
        "GB",
        "IN",
        "JP",
        "SG",
        "US"
      ]
    },
    "country_name": {
      "enum": [
        "Demo AU",
        "Demo BR",
        "Demo CA",
        "Demo DE",
        "Demo FR",
        "Demo GB",
        "Demo IN",
        "Demo JP",
        "Demo SG",
        "Demo US"
      ]
    },
    "fte": "number",
    "headcount": "integer"
  },
  "workforce_current_summary": {
    "as_of": "date",
    "avg_span_of_control": "number",
    "avg_tenure_years": "number",
    "fte": "number",
    "full_time_headcount": "integer",
    "headcount": "integer",
    "hybrid_headcount": "integer",
    "non_full_time_headcount": "integer",
    "onsite_headcount": "integer",
    "people_managers": "integer",
    "remote_headcount": "integer"
  },
  "workforce_level_summary": {
    "as_of": "date",
    "avg_tenure_years": "number",
    "fte": "number",
    "headcount": "integer",
    "level_code": {
      "enum": [
        "L1",
        "L10",
        "L11",
        "L2",
        "L3",
        "L4",
        "L5",
        "L6",
        "L7",
        "L8",
        "L9"
      ]
    },
    "level_name": {
      "enum": [
        "Demo level 1",
        "Demo level 10",
        "Demo level 11",
        "Demo level 2",
        "Demo level 3",
        "Demo level 4",
        "Demo level 5",
        "Demo level 6",
        "Demo level 7",
        "Demo level 8",
        "Demo level 9"
      ]
    },
    "level_rank": "integer",
    "people_managers": "integer"
  },
  "workforce_movement_summary": {
    "month": "date",
    "movement_type": {
      "enum": [
        "promotion",
        "transfer"
      ]
    },
    "movements": "integer"
  },
  "workforce_tenure_summary": {
    "as_of": "date",
    "fte": "number",
    "headcount": "integer",
    "tenure_band": {
      "enum": [
        "1-2 years",
        "10+ years",
        "3-4 years",
        "5-9 years",
        "<1 year"
      ]
    },
    "tenure_sort": "integer"
  }
};
