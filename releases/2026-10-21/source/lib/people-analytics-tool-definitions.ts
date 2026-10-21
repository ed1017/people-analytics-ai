import type { FunctionTool } from "openai/resources/responses/responses";

export const peopleAnalyticsTools: FunctionTool[] = [
  {
    type: "function",
    name: "get_workforce_overview",
    description:
      "Get current company workforce overview metrics, historical endpoints, and business-unit workforce summaries. Use for overall workforce size, turnover, growth, labor cost, vacancies, or BU comparisons.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_workforce_composition",
    description:
      "Get governed workforce composition analytics including headcount/FTE trend, business units, countries, career levels, tenure, manager span, and internal movement counts.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_attrition",
    description:
      "Get governed attrition analytics including YTD voluntary turnover, annualized voluntary turnover, regrettable exits, monthly trend, business-unit rates, career-level exits, tenure exits, and reported separation reasons.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_workforce_finance",
    description:
      "Get company workforce finance metrics, business-unit labor economics, vacancy cost exposure, and 2027 labor-cost scenario outcomes.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_workforce_skills",
    description:
      "Get governed company skills intelligence including apparent proficiency gaps, highest-demand skills, profile coverage, and O*NET mapping coverage. This tool is company-only and does not apply selected dashboard country, business-unit, or level filters.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_workforce_planning",
    description:
      "Get 2027 company workforce scenario outcomes and current authorized position totals. Use to compare Baseline, Growth, Hiring Freeze, and AI Productivity scenarios.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_workforce_scenario",
    description:
      "Run the approved deterministic workforce scenario engine for a new what-if. Use when the user changes growth, salary inflation, attrition, fill rate, or productivity-driven hiring demand. The result also includes a Baseline-mix segment breakdown by business unit and job family. Segment mix is held constant in this breakdown; do not describe it as an independent segment-specific rerun. Pass null for every lever the user did not change. If the user says attrition increases by X percentage points, use additional_attrition_pct_points rather than inventing an absolute rate.",
    parameters: {
      type: "object",
      properties: {
        annual_growth_pct: {
          type: ["number", "null"],
          description:
            "Custom annual company headcount growth percentage, or null to keep Baseline.",
        },
        salary_inflation_pct: {
          type: ["number", "null"],
          description:
            "Custom annual labor-cost inflation percentage, or null to keep Baseline.",
        },
        annual_attrition_pct: {
          type: ["number", "null"],
          description:
            "Custom total annual attrition percentage, or null if unchanged or expressed as additional points.",
        },
        additional_attrition_pct_points: {
          type: ["number", "null"],
          description:
            "Percentage-point change added to Baseline annual attrition, e.g. 2 means Baseline + 2 points.",
        },
        fill_rate_pct: {
          type: ["number", "null"],
          description:
            "Percent of modeled hiring demand filled, or null to keep Baseline.",
        },
        productivity_hiring_reduction_pct: {
          type: ["number", "null"],
          description:
            "Percent reduction in gross hiring demand from AI/productivity, or null to keep Baseline.",
        },
      },
      required: [
        "annual_growth_pct",
        "salary_inflation_pct",
        "annual_attrition_pct",
        "additional_attrition_pct_points",
        "fill_rate_pct",
        "productivity_hiring_reduction_pct",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_business_unit_scenario",
    description:
      "Run a true deterministic what-if for one business unit using that business unit's own current headcount and stored monthly Baseline plan. Use this instead of run_workforce_scenario when the user asks to change assumptions for a specific business unit. Other business units remain at Baseline when the response shows company implied impact.",
    parameters: {
      type: "object",
      properties: {
        business_unit: {
          type: "string",
          description:
            "Business-unit name or org code, such as Managed Services or BU-MGSVC.",
        },
        annual_growth_pct: {
          type: ["number", "null"],
          description:
            "Custom annual growth percentage for this business unit, or null to keep Baseline.",
        },
        salary_inflation_pct: {
          type: ["number", "null"],
          description:
            "Custom annual salary inflation percentage for this business unit, or null to keep Baseline.",
        },
        annual_attrition_pct: {
          type: ["number", "null"],
          description:
            "Custom total annual attrition percentage for this business unit, or null if unchanged or expressed as additional points.",
        },
        additional_attrition_pct_points: {
          type: ["number", "null"],
          description:
            "Percentage-point change added to Baseline annual attrition for this business unit.",
        },
        fill_rate_pct: {
          type: ["number", "null"],
          description:
            "Percent of modeled hiring demand filled for this business unit, or null to keep Baseline.",
        },
        productivity_hiring_reduction_pct: {
          type: ["number", "null"],
          description:
            "Percent reduction in gross hiring demand for this business unit from AI/productivity, or null to keep Baseline.",
        },
      },
      required: [
        "business_unit",
        "annual_growth_pct",
        "salary_inflation_pct",
        "annual_attrition_pct",
        "additional_attrition_pct_points",
        "fill_rate_pct",
        "productivity_hiring_reduction_pct",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_position_action_scenario",
    description:
      "Run a deterministic read-only position-inventory what-if. Use when the user asks about adding authorized positions, closing vacant positions, freezing vacancies, or filling open positions. This first position model does not close filled positions or calculate labor-cost effects.",
    parameters: {
      type: "object",
      properties: {
        add_positions: {
          type: ["number", "null"],
          description:
            "Number of new authorized positions to add. Added positions start vacant.",
        },
        close_vacant_positions: {
          type: ["number", "null"],
          description:
            "Number of currently vacant positions to close. Filled positions are not closed by this model.",
        },
        freeze_vacancies: {
          type: ["number", "null"],
          description:
            "Number of open vacancies to freeze. Frozen positions remain authorized but are removed from the fillable vacancy pool.",
        },
        vacancy_fill_pct: {
          type: ["number", "null"],
          description:
            "Percent of remaining fillable vacancies expected to be filled in the scenario.",
        },
      },
      required: [
        "add_positions",
        "close_vacant_positions",
        "freeze_vacancies",
        "vacancy_fill_pct",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_structural_position_scenario",
    description:
      "Run an ordered deterministic structural position scenario by business unit, career level, and optionally job profile. Use for scoped actions such as adding Manager positions in Data & AI, freezing Technology vacancies, closing Corporate vacancies, or filling a percentage of Consulting vacancies. Actions are applied in the order supplied. The model returns position inventory, authorized-position budget delta, annualized staffed labor-cost delta, recruiting-demand implications grounded in linked requisitions, position-based skill-demand impacts, and evidence for Build / Move / Buy / Borrow response paths on scenario-widened skill gaps. Borrow is unavailable when no contingent data is loaded, and Automate is intentionally unmodeled without a role/task automation signal.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "add_positions",
                  "close_vacant_positions",
                  "freeze_vacancies",
                  "fill_vacancies",
                ],
              },
              business_unit: {
                type: ["string", "null"],
                description:
                  "Business-unit name or code. Null means all business units.",
              },
              level: {
                type: ["string", "null"],
                description:
                  "Career-level name or code such as Manager or M1. Null means all levels.",
              },
              job_profile: {
                type: ["string", "null"],
                description:
                  "Job-profile name or code. Null means all job profiles.",
              },
              amount: {
                type: ["number", "null"],
                description:
                  "Position count for add, close, or freeze actions. Null for fill actions.",
              },
              fill_pct: {
                type: ["number", "null"],
                description:
                  "Percent of remaining matching vacancies to fill. Null for add, close, or freeze actions.",
              },
            },
            required: [
              "action_type",
              "business_unit",
              "level",
              "job_profile",
              "amount",
              "fill_pct",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["actions"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_workforce_response_plan",
    description:
      "Run a user-directed workforce response plan for one scenario-widened skill gap. Use only after structural position actions create a positive modeled skill gap and the user explicitly allocates that gap across Build, Move, Buy, Borrow, or Automate. This is not an optimizer. It reruns the structural scenario, validates the selected skill and evidence, calculates planned coverage if executed, remaining gap, and warnings. Separate skill plans must not be summed as unique people because skills overlap.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "add_positions",
                  "close_vacant_positions",
                  "freeze_vacancies",
                  "fill_vacancies",
                ],
              },
              business_unit: {
                type: ["string", "null"],
              },
              level: {
                type: ["string", "null"],
              },
              job_profile: {
                type: ["string", "null"],
              },
              amount: {
                type: ["number", "null"],
              },
              fill_pct: {
                type: ["number", "null"],
              },
            },
            required: [
              "action_type",
              "business_unit",
              "level",
              "job_profile",
              "amount",
              "fill_pct",
            ],
            additionalProperties: false,
          },
        },
        skill_code: {
          type: "string",
          description:
            "Skill code or exact skill name from the scenario response strategy, such as PYTHON or Python.",
        },
        allocation: {
          type: "object",
          properties: {
            build: {
              type: "number",
              description:
                "Planned people to cover through upskilling/reskilling if executed.",
            },
            move: {
              type: "number",
              description:
                "Planned internal mobility placements if executed.",
            },
            buy: {
              type: "number",
              description:
                "Planned external hires if executed.",
            },
            borrow: {
              type: "number",
              description:
                "Planned contingent capacity. Must be zero when no contingent evidence is loaded.",
            },
            automate: {
              type: "number",
              description:
                "Planned automated capacity units. Must be zero when no automation signal is loaded.",
            },
          },
          required: [
            "build",
            "move",
            "buy",
            "borrow",
            "automate",
          ],
          additionalProperties: false,
        },
      },
      required: [
        "actions",
        "skill_code",
        "allocation",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_internal_talent_readiness",
    description:
      "Evaluate aggregate company internal talent readiness for one governed job profile. Uses active employees who expressed preference for the target profile, excludes employees already in that role, and tests every required skill against required proficiency. Returns role-ready, near-ready, longer-term counts, common near-ready skill gaps, and whether those current gaps are covered by active mapped learning courses. Dashboard country, business-unit, and level filters are not applied. Course availability is pathway evidence, not a proficiency-gain forecast. Does not expose or rank individual employees.",
    parameters: {
      type: "object",
      properties: {
        job_profile: {
          type: "string",
          description:
            "Exact governed job-profile code or name, such as AI-ENG or AI Engineer.",
        },
      },
      required: ["job_profile"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_role_buy_feasibility",
    description:
      "Get descriptive company whole-role external recruiting evidence for one governed job profile. Returns current open ATS pipeline, historical external fills, trailing-12-month external fill volume, historical median time-to-fill, weighted offer acceptance, applicants per filled requisition, and requested Buy scale versus recent hiring volume. Dashboard country, business-unit, and level filters are not applied. This is not a hiring forecast or labor-market availability model.",
    parameters: {
      type: "object",
      properties: {
        job_profile: {
          type: "string",
          description:
            "Exact governed job-profile code or name.",
        },
        requested_buy: {
          type: "number",
          description:
            "User-requested external hire units for scale comparison. Use 0 when no numeric Buy target was supplied.",
        },
      },
      required: [
        "job_profile",
        "requested_buy",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_role_workforce_response_plan",
    description:
      "Run a user-directed workforce response plan for one job profile with positive scenario-created authorized-position demand. The planning unit is a role/person-position, so one Build, Move, or Buy unit covers the whole required skill bundle once rather than being counted separately for every skill. This is not an optimizer and allocations must come from the user.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "add_positions",
                  "close_vacant_positions",
                  "freeze_vacancies",
                  "fill_vacancies",
                ],
              },
              business_unit: { type: ["string", "null"] },
              level: { type: ["string", "null"] },
              job_profile: { type: ["string", "null"] },
              amount: { type: ["number", "null"] },
              fill_pct: { type: ["number", "null"] },
            },
            required: [
              "action_type",
              "business_unit",
              "level",
              "job_profile",
              "amount",
              "fill_pct",
            ],
            additionalProperties: false,
          },
        },
        job_profile: {
          type: "string",
          description:
            "Job-profile code or exact profile name with positive scenario-created role demand.",
        },
        allocation: {
          type: "object",
          properties: {
            build: { type: "number" },
            move: { type: "number" },
            buy: { type: "number" },
            borrow: { type: "number" },
            automate: { type: "number" },
          },
          required: [
            "build",
            "move",
            "buy",
            "borrow",
            "automate",
          ],
          additionalProperties: false,
        },
      },
      required: [
        "actions",
        "job_profile",
        "allocation",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_workforce_response_portfolio",
    description:
      "Run a user-directed multi-role workforce response portfolio for one structural scenario. Each role plan supplies explicit Build, Move, Buy, Borrow, and Automate allocations. The tool aggregates whole-role coverage, remaining gaps, internal readiness, development-pathway coverage, recruiting evidence, and signed business-unit demand ownership without double-counting internal talent across target roles. BU demand is descriptive ownership of modeled role deltas; response allocations remain role-level. It is not an optimizer and must not invent allocations.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "add_positions",
                  "close_vacant_positions",
                  "freeze_vacancies",
                  "fill_vacancies",
                ],
              },
              business_unit: { type: ["string", "null"] },
              level: { type: ["string", "null"] },
              job_profile: { type: ["string", "null"] },
              amount: { type: ["number", "null"] },
              fill_pct: { type: ["number", "null"] },
            },
            required: [
              "action_type",
              "business_unit",
              "level",
              "job_profile",
              "amount",
              "fill_pct",
            ],
            additionalProperties: false,
          },
        },
        plans: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: [
              "job_profile",
              "allocation",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["actions", "plans"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_business_unit_response_allocation",
    description:
      "Run explicit destination business-unit allocations of Build, Move, and Buy for net-positive job-profile demand in one structural scenario. BU allocations roll up to company role totals for whole-role evidence checks. Gross positive BU demand, contraction offsets, company net demand, destination gaps, and overallocations are reported separately. Move source BU is not inferred. This is not an optimizer and must not invent allocations.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "add_positions",
                  "close_vacant_positions",
                  "freeze_vacancies",
                  "fill_vacancies",
                ],
              },
              business_unit: { type: ["string", "null"] },
              level: { type: ["string", "null"] },
              job_profile: { type: ["string", "null"] },
              amount: { type: ["number", "null"] },
              fill_pct: { type: ["number", "null"] },
            },
            required: [
              "action_type",
              "business_unit",
              "level",
              "job_profile",
              "amount",
              "fill_pct",
            ],
            additionalProperties: false,
          },
        },
        allocations: {
          type: "array",
          minItems: 1,
          maxItems: 40,
          items: {
            type: "object",
            properties: {
              business_unit: { type: "string" },
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: [
              "business_unit",
              "job_profile",
              "allocation",
            ],
            additionalProperties: false,
          },
        },
        role_plans: {
          type: ["array", "null"],
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: [
              "job_profile",
              "allocation",
            ],
            additionalProperties: false,
          },
        },
      },
      required: [
        "actions",
        "allocations",
        "role_plans",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_time_phased_workforce_execution",
    description:
      "Run a deterministic monthly execution timeline for explicit BU Build / Move / Buy allocations. Every schedule entry has a user-supplied effective month. The tool reconciles scheduled capacity to approved BU/path targets, keeps unscheduled capacity visible, excludes over-scheduled excess from effective coverage, and calculates monthly cumulative coverage and remaining company net role gap. It does not infer timing from learning duration or recruiting history.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "add_positions",
                  "close_vacant_positions",
                  "freeze_vacancies",
                  "fill_vacancies",
                ],
              },
              business_unit: { type: ["string", "null"] },
              level: { type: ["string", "null"] },
              job_profile: { type: ["string", "null"] },
              amount: { type: ["number", "null"] },
              fill_pct: { type: ["number", "null"] },
            },
            required: [
              "action_type",
              "business_unit",
              "level",
              "job_profile",
              "amount",
              "fill_pct",
            ],
            additionalProperties: false,
          },
        },
        allocations: {
          type: "array",
          minItems: 1,
          maxItems: 40,
          items: {
            type: "object",
            properties: {
              business_unit: { type: "string" },
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: [
              "business_unit",
              "job_profile",
              "allocation",
            ],
            additionalProperties: false,
          },
        },
        role_plans: {
          type: ["array", "null"],
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: [
              "job_profile",
              "allocation",
            ],
            additionalProperties: false,
          },
        },
        schedule: {
          type: "array",
          minItems: 1,
          maxItems: 120,
          items: {
            type: "object",
            properties: {
              business_unit: { type: "string" },
              job_profile: { type: "string" },
              response_type: {
                type: "string",
                enum: ["build", "move", "buy"],
              },
              amount: { type: "number" },
              effective_month: {
                type: "string",
                description:
                  "Explicit effective month in YYYY-MM format. Must be after the workforce snapshot month.",
              },
            },
            required: [
              "business_unit",
              "job_profile",
              "response_type",
              "amount",
              "effective_month",
            ],
            additionalProperties: false,
          },
        },
      },
      required: [
        "actions",
        "allocations",
        "role_plans",
        "schedule",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_workforce_response_constraints",
    description:
      "Evaluate explicit hard constraints against a deterministic time-phased BU workforce response plan. Supports total Build/Move/Buy caps, monthly Build/Move/Buy caps, a combined monthly execution cap, deadline coverage requirements, and a requirement that all approved capacity be scheduled. Also returns separate evidence checks for Build pathway coverage, Move readiness, and descriptive Buy history. Evidence warnings do not become hard caps automatically. This tool evaluates feasibility; it does not optimize allocations.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "add_positions",
                  "close_vacant_positions",
                  "freeze_vacancies",
                  "fill_vacancies",
                ],
              },
              business_unit: { type: ["string", "null"] },
              level: { type: ["string", "null"] },
              job_profile: { type: ["string", "null"] },
              amount: { type: ["number", "null"] },
              fill_pct: { type: ["number", "null"] },
            },
            required: [
              "action_type",
              "business_unit",
              "level",
              "job_profile",
              "amount",
              "fill_pct",
            ],
            additionalProperties: false,
          },
        },
        allocations: {
          type: "array",
          minItems: 1,
          maxItems: 40,
          items: {
            type: "object",
            properties: {
              business_unit: { type: "string" },
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: [
              "business_unit",
              "job_profile",
              "allocation",
            ],
            additionalProperties: false,
          },
        },
        role_plans: {
          type: ["array", "null"],
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: ["job_profile", "allocation"],
            additionalProperties: false,
          },
        },
        schedule: {
          type: "array",
          minItems: 1,
          maxItems: 120,
          items: {
            type: "object",
            properties: {
              business_unit: { type: "string" },
              job_profile: { type: "string" },
              response_type: {
                type: "string",
                enum: ["build", "move", "buy"],
              },
              amount: { type: "number" },
              effective_month: { type: "string" },
            },
            required: [
              "business_unit",
              "job_profile",
              "response_type",
              "amount",
              "effective_month",
            ],
            additionalProperties: false,
          },
        },
        constraints: {
          type: "object",
          properties: {
            max_total_build: { type: ["number", "null"] },
            max_total_move: { type: ["number", "null"] },
            max_total_buy: { type: ["number", "null"] },
            max_monthly_build: { type: ["number", "null"] },
            max_monthly_move: { type: ["number", "null"] },
            max_monthly_buy: { type: ["number", "null"] },
            max_monthly_total: { type: ["number", "null"] },
            deadline_month: { type: ["string", "null"] },
            required_coverage_pct_by_deadline: { type: ["number", "null"] },
            require_all_approved_capacity_scheduled: { type: "boolean" },
          },
          required: [
            "max_total_build",
            "max_total_move",
            "max_total_buy",
            "max_monthly_build",
            "max_monthly_move",
            "max_monthly_buy",
            "max_monthly_total",
            "deadline_month",
            "required_coverage_pct_by_deadline",
            "require_all_approved_capacity_scheduled",
          ],
          additionalProperties: false,
        },
      },
      required: [
        "actions",
        "allocations",
        "role_plans",
        "schedule",
        "constraints",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_constraint_aware_workforce_scheduler",
    description:
      "Generate an earliest deterministic monthly schedule for already-approved BU Build / Move / Buy allocations under explicit user-supplied workforce constraints. The scheduler keeps the response mix fixed, applies monthly path and combined monthly caps, preserves fractional BU allocations, and verifies the generated schedule with the governed hard-constraint checker. It reports infeasibility instead of changing allocations. It is not a workforce-strategy optimizer.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "add_positions",
                  "close_vacant_positions",
                  "freeze_vacancies",
                  "fill_vacancies",
                ],
              },
              business_unit: { type: ["string", "null"] },
              level: { type: ["string", "null"] },
              job_profile: { type: ["string", "null"] },
              amount: { type: ["number", "null"] },
              fill_pct: { type: ["number", "null"] },
            },
            required: [
              "action_type",
              "business_unit",
              "level",
              "job_profile",
              "amount",
              "fill_pct",
            ],
            additionalProperties: false,
          },
        },
        allocations: {
          type: "array",
          minItems: 1,
          maxItems: 40,
          items: {
            type: "object",
            properties: {
              business_unit: { type: "string" },
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: [
              "business_unit",
              "job_profile",
              "allocation",
            ],
            additionalProperties: false,
          },
        },
        role_plans: {
          type: ["array", "null"],
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              job_profile: { type: "string" },
              allocation: {
                type: "object",
                properties: {
                  build: { type: "number" },
                  move: { type: "number" },
                  buy: { type: "number" },
                  borrow: { type: "number" },
                  automate: { type: "number" },
                },
                required: [
                  "build",
                  "move",
                  "buy",
                  "borrow",
                  "automate",
                ],
                additionalProperties: false,
              },
            },
            required: ["job_profile", "allocation"],
            additionalProperties: false,
          },
        },
        constraints: {
          type: "object",
          properties: {
            max_total_build: { type: ["number", "null"] },
            max_total_move: { type: ["number", "null"] },
            max_total_buy: { type: ["number", "null"] },
            max_monthly_build: { type: ["number", "null"] },
            max_monthly_move: { type: ["number", "null"] },
            max_monthly_buy: { type: ["number", "null"] },
            max_monthly_total: { type: ["number", "null"] },
            deadline_month: { type: ["string", "null"] },
            required_coverage_pct_by_deadline: { type: ["number", "null"] },
            require_all_approved_capacity_scheduled: { type: "boolean" },
          },
          required: [
            "max_total_build",
            "max_total_move",
            "max_total_buy",
            "max_monthly_build",
            "max_monthly_move",
            "max_monthly_buy",
            "max_monthly_total",
            "deadline_month",
            "required_coverage_pct_by_deadline",
            "require_all_approved_capacity_scheduled",
          ],
          additionalProperties: false,
        },
      },
      required: [
        "actions",
        "allocations",
        "role_plans",
        "constraints",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_talent_acquisition",
    description:
      "Get governed Talent Acquisition analytics including funnel conversion, requisition aging, time to fill, source effectiveness, recruiter workload, and business-unit hiring demand.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_survey_sentiment",
    description:
      "Get governed employee-listening analytics including engagement trend, participation, engagement dimensions, pulse, manager effectiveness, onboarding, business-unit comparisons, and exit reasons. Does not return raw comments.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
];
