"use client";

import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { OverviewPage } from "@/components/pages/overview-page";
import { FinancePage } from "@/components/pages/finance-page";
import { AiPanel } from "@/components/ai-panel";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  AppPage,
  BlsResponse,
  ChatMessage,
  DashboardFilterOptions,
  DashboardResponse,
  FinanceResponse,
  HeadcountTrendPoint,
  OverviewData,
  Persona,
  PositionModelingResponse,
  SkillsResponse,
  WorkforcePlanningResponse,
} from "@/lib/types";

const EMPTY_FILTER_OPTIONS: DashboardFilterOptions = {
  countries: [],
  business_units: [],
  levels: [],
};

function formatMonth(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function formatLongDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}


function formatCurrencyCompact(
  value: number
) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(
      value / 1_000_000_000
    ).toFixed(2)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${(
      value / 1_000_000
    ).toFixed(1)}M`;
  }

  return `$${Math.round(
    value
  ).toLocaleString()}`;
}

function formatAssumptionName(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default function Home() {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [aiWidth, setAiWidth] = useState(320);

  const [overviewData, setOverviewData] =
    useState<OverviewData | null>(null);
  const [headcountTrend, setHeadcountTrend] =
    useState<HeadcountTrendPoint[]>([]);
  const [filterOptions, setFilterOptions] =
    useState<DashboardFilterOptions>(EMPTY_FILTER_OPTIONS);

  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");

  const [selectedPersona, setSelectedPersona] =
    useState<Persona>("HR");

  const [activePage, setActivePage] =
    useState<AppPage>("overview");

  const [planningData, setPlanningData] =
    useState<WorkforcePlanningResponse | null>(
      null
    );
  const [
    selectedPlanningScenario,
    setSelectedPlanningScenario,
  ] = useState("Baseline");
  const [
    planningLoading,
    setPlanningLoading,
  ] = useState(false);
  const [
    planningError,
    setPlanningError,
  ] = useState<string | null>(null);

  const [
    positionModelingData,
    setPositionModelingData,
  ] = useState<PositionModelingResponse | null>(
    null
  );
  const [
    positionModelingLoading,
    setPositionModelingLoading,
  ] = useState(false);
  const [
    positionModelingError,
    setPositionModelingError,
  ] = useState<string | null>(null);

  const [financeData, setFinanceData] =
    useState<FinanceResponse | null>(null);
  const [financeLoading, setFinanceLoading] =
    useState(false);
  const [financeError, setFinanceError] =
    useState<string | null>(null);

  const [skillsData, setSkillsData] =
    useState<SkillsResponse | null>(null);
  const [skillsLoading, setSkillsLoading] =
    useState(false);
  const [skillsError, setSkillsError] =
    useState<string | null>(null);

  const [blsData, setBlsData] =
    useState<BlsResponse | null>(null);
  const [blsLoading, setBlsLoading] =
    useState(false);
  const [blsError, setBlsError] =
    useState<string | null>(null);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] =
    useState<string | null>(null);

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setDashboardLoading(true);
        setDashboardError(null);

        const params = new URLSearchParams();

        if (selectedCountry !== "all") {
          params.set("country", selectedCountry);
        }

        if (selectedOrg !== "all") {
          params.set("org", selectedOrg);
        }

        if (selectedLevel !== "all") {
          params.set("level", selectedLevel);
        }

        const queryString = params.toString();
        const url = queryString
          ? `/api/dashboard?${queryString}`
          : "/api/dashboard";

        const response = await fetch(url, {
          cache: "no-store",
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ?? "Failed to load dashboard data."
          );
        }

        const data = payload as DashboardResponse;

        setOverviewData(data.overview);
        setHeadcountTrend(data.trend ?? []);
        setFilterOptions(
          data.filter_options ?? EMPTY_FILTER_OPTIONS
        );
      } catch (error) {
        console.error(error);
        setDashboardError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data."
        );
      } finally {
        setDashboardLoading(false);
      }
    }

    loadDashboard();
  }, [selectedCountry, selectedOrg, selectedLevel]);

  useEffect(() => {
    if (
      activePage !==
        "workforce-planning" ||
      planningData
    ) {
      return;
    }

    async function loadPlanning() {
      try {
        setPlanningLoading(true);
        setPlanningError(null);

        const response = await fetch(
          "/api/workforce-planning",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load workforce planning data."
          );
        }

        setPlanningData(
          payload as WorkforcePlanningResponse
        );
      } catch (error) {
        console.error(error);
        setPlanningError(
          error instanceof Error
            ? error.message
            : "Failed to load workforce planning data."
        );
      } finally {
        setPlanningLoading(false);
      }
    }

    loadPlanning();
  }, [activePage, planningData]);

  useEffect(() => {
    if (
      activePage !==
        "workforce-planning" ||
      positionModelingData
    ) {
      return;
    }

    async function loadPositionModeling() {
      try {
        setPositionModelingLoading(true);
        setPositionModelingError(null);

        const response = await fetch(
          "/api/position-modeling",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load position modeling data."
          );
        }

        setPositionModelingData(
          payload as PositionModelingResponse
        );
      } catch (error) {
        console.error(error);
        setPositionModelingError(
          error instanceof Error
            ? error.message
            : "Failed to load position modeling data."
        );
      } finally {
        setPositionModelingLoading(false);
      }
    }

    loadPositionModeling();
  }, [
    activePage,
    positionModelingData,
  ]);

  useEffect(() => {
    if (
      activePage !== "finance" ||
      financeData
    ) {
      return;
    }

    async function loadFinance() {
      try {
        setFinanceLoading(true);
        setFinanceError(null);

        const response = await fetch(
          "/api/finance",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load finance data."
          );
        }

        setFinanceData(
          payload as FinanceResponse
        );
      } catch (error) {
        console.error(error);
        setFinanceError(
          error instanceof Error
            ? error.message
            : "Failed to load finance data."
        );
      } finally {
        setFinanceLoading(false);
      }
    }

    loadFinance();
  }, [activePage, financeData]);

  useEffect(() => {
    if (
      activePage !== "skills" ||
      skillsData
    ) {
      return;
    }

    async function loadSkills() {
      try {
        setSkillsLoading(true);
        setSkillsError(null);

        const response = await fetch(
          "/api/skills",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load skills data."
          );
        }

        setSkillsData(
          payload as SkillsResponse
        );
      } catch (error) {
        console.error(error);
        setSkillsError(
          error instanceof Error
            ? error.message
            : "Failed to load skills data."
        );
      } finally {
        setSkillsLoading(false);
      }
    }

    loadSkills();
  }, [activePage, skillsData]);

  useEffect(() => {
    if (
      activePage !== "skills" ||
      blsData
    ) {
      return;
    }

    async function loadBls() {
      try {
        setBlsLoading(true);
        setBlsError(null);

        const response = await fetch(
          "/api/bls",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load BLS data."
          );
        }

        setBlsData(
          payload as BlsResponse
        );
      } catch (error) {
        console.error(error);
        setBlsError(
          error instanceof Error
            ? error.message
            : "Failed to load BLS data."
        );
      } finally {
        setBlsLoading(false);
      }
    }

    loadBls();
  }, [activePage, blsData]);

  const aiExpanded = aiWidth >= 520;

  const filtersActive =
    selectedCountry !== "all" ||
    selectedOrg !== "all" ||
    selectedLevel !== "all";

  const selectedCountryLabel = useMemo(
    () =>
      filterOptions.countries.find(
        (option) => option.value === selectedCountry
      )?.label ?? "Global workforce",
    [filterOptions.countries, selectedCountry]
  );

  const selectedOrgLabel = useMemo(
    () =>
      filterOptions.business_units.find(
        (option) => option.value === selectedOrg
      )?.label ?? "All business units",
    [filterOptions.business_units, selectedOrg]
  );

  const selectedLevelLabel = useMemo(
    () =>
      filterOptions.levels.find(
        (option) => option.value === selectedLevel
      )?.label ?? "All levels",
    [filterOptions.levels, selectedLevel]
  );

  const headcountGrowthPct =
    headcountTrend.length >= 2 &&
    headcountTrend[0].headcount > 0
      ? ((headcountTrend[headcountTrend.length - 1].headcount -
          headcountTrend[0].headcount) /
          headcountTrend[0].headcount) *
        100
      : null;


  const planningScenarios =
    planningData?.scenarios ?? [];

  const baselineScenario =
    planningScenarios.find(
      (scenario) =>
        scenario.scenario_name ===
        "Baseline"
    ) ?? planningScenarios[0];

  const activePlanningScenario =
    planningScenarios.find(
      (scenario) =>
        scenario.scenario_name ===
        selectedPlanningScenario
    ) ?? baselineScenario;

  const activePlanningStart =
    activePlanningScenario?.points[0] ??
    null;

  const activePlanningEnd =
    activePlanningScenario?.points[
      activePlanningScenario.points.length -
        1
    ] ?? null;

  const baselinePlanningEnd =
    baselineScenario?.points[
      baselineScenario.points.length - 1
    ] ?? null;

  const planningNetChange =
    activePlanningStart &&
    activePlanningEnd
      ? activePlanningEnd.planned_headcount -
        activePlanningStart.planned_headcount
      : null;

  const planningHeadcountDeltaVsBaseline =
    activePlanningEnd &&
    baselinePlanningEnd
      ? activePlanningEnd.planned_headcount -
        baselinePlanningEnd.planned_headcount
      : null;

  const planningTotalHires =
    activePlanningScenario?.points.reduce(
      (sum, point) =>
        sum + point.planned_hires,
      0
    ) ?? 0;

  const planningTotalExits =
    activePlanningScenario?.points.reduce(
      (sum, point) =>
        sum + point.planned_exits,
      0
    ) ?? 0;

  const activePositionScenario =
    positionModelingData?.scenarios.find(
      (scenario) =>
        scenario.scenario_name ===
        selectedPlanningScenario
    ) ??
    positionModelingData?.scenarios[0] ??
    null;

  const topPositionBusinessUnits =
    activePositionScenario
      ? [...activePositionScenario.by_business_unit]
          .sort(
            (a, b) =>
              Math.abs(
                b.net_position_change
              ) -
              Math.abs(
                a.net_position_change
              )
          )
          .slice(0, 8)
      : [];

  const positionLevels =
    activePositionScenario?.by_level ?? [];

  const financeBusinessUnits =
    financeData?.by_business_unit ?? [];

  const financeScenarios =
    financeData?.scenarios ?? [];

  const maxFinanceLaborCost =
    financeBusinessUnits.length > 0
      ? Math.max(
          ...financeBusinessUnits.map(
            (row) => row.labor_cost_usd
          )
        )
      : 0;

  const maxSkillDemand =
    skillsData?.highest_demand.length
      ? Math.max(
          ...skillsData.highest_demand.map(
            (row) =>
              row.employees_in_roles_requiring_skill
          )
        )
      : 0;

  const previewPage =
    activePage ===
      "talent-acquisition" ||
    activePage ===
      "survey-sentiment";

  const suggestedPrompts =
    previewPage
      ? []
      : activePage === "workforce-planning"
      ? [
          "Compare all four workforce scenarios",
          "What stands out in this scenario?",
          "What are the labor cost implications?",
        ]
      : activePage === "finance"
        ? [
            "Where are workforce costs highest?",
            "Compare 2027 labor cost scenarios",
            "What is our vacancy cost exposure?",
          ]
        : activePage === "skills"
          ? [
              "What are our largest skill gaps?",
              "Which skills have the highest demand?",
              "Where should we build versus hire capability?",
            ]
          : [
              "Summarize this workforce",
              "What stands out?",
              "Are there workforce risks?",
            ];

  const resetFilters = () => {
    setSelectedCountry("all");
    setSelectedOrg("all");
    setSelectedLevel("all");
  };

  const sendChatMessage = async (
    suggestedMessage?: string
  ) => {
    const message = (
      suggestedMessage ?? chatInput
    ).trim();

    if (
      !message ||
      !overviewData ||
      chatLoading
    ) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };

    const nextMessages = [
      ...chatMessages,
      userMessage,
    ];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message,
            persona: selectedPersona,
            page: activePage,
            planningContext:
              activePage ===
                "workforce-planning" &&
              activePlanningScenario
                ? {
                    selectedScenario:
                      activePlanningScenario.scenario_name,
                    selectedScenarioType:
                      activePlanningScenario.scenario_type,
                    selectedScenarioDescription:
                      activePlanningScenario.description,
                    selectedScenarioAssumptions:
                      activePlanningScenario.assumptions,
                    selectedScenarioStart:
                      activePlanningStart,
                    selectedScenarioEnd:
                      activePlanningEnd,
                    selectedScenarioTotalHires:
                      planningTotalHires,
                    selectedScenarioTotalExits:
                      planningTotalExits,
                    scenarios:
                      planningScenarios.map(
                        (scenario) => {
                          const end =
                            scenario.points[
                              scenario.points.length -
                                1
                            ];

                          return {
                            scenario_name:
                              scenario.scenario_name,
                            scenario_type:
                              scenario.scenario_type,
                            year_end_headcount:
                              end?.planned_headcount ??
                              null,
                            year_end_fte:
                              end?.planned_fte ??
                              null,
                            year_end_labor_cost_usd:
                              end?.planned_labor_cost_usd ??
                              null,
                          };
                        }
                      ),
                  }
                : null,

            positionContext:
              activePage ===
                "workforce-planning" &&
              positionModelingData &&
              activePositionScenario
                ? {
                    current:
                      positionModelingData.current,
                    selectedScenario:
                      activePositionScenario.scenario_name,
                    totals:
                      activePositionScenario.totals,
                    byBusinessUnit:
                      activePositionScenario.by_business_unit,
                    byLevel:
                      activePositionScenario.by_level,
                  }
                : null,

            financeContext:
              activePage === "finance" &&
              financeData
                ? {
                    current:
                      financeData.current,
                    byBusinessUnit:
                      financeData.by_business_unit,
                    scenarios:
                      financeData.scenarios,
                  }
                : null,

            skillsContext:
              activePage === "skills" &&
              skillsData
                ? {
                    summary:
                      skillsData.summary,
                    largestGaps:
                      skillsData.largest_gaps,
                    highestDemand:
                      skillsData.highest_demand,
                    strongestCoverage:
                      skillsData.strongest_coverage,
                  }
                : null,

            history:
              nextMessages.slice(-8),
            context: {
              snapshotDate:
                overviewData.snapshot_date,
              country:
                selectedCountryLabel,
              businessUnit:
                selectedOrgLabel,
              level:
                selectedLevelLabel,
              headcount:
                overviewData.headcount,
              fte:
                overviewData.fte,
              voluntaryTurnoverYtdPct:
                overviewData.voluntary_turnover_ytd_pct,
              laborCostUsd:
                overviewData.labor_cost_usd,
              openPositions:
                overviewData.open_positions,
              headcountGrowthPct,
              trendStart:
                headcountTrend[0] ?? null,
              trendEnd:
                headcountTrend[
                  headcountTrend.length - 1
                ] ?? null,
            },
          }),
        }
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "AI request failed."
        );
      }

      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            payload.answer ??
            "No response returned.",
        },
      ]);
    } catch (error) {
      console.error(error);
      setChatError(
        error instanceof Error
          ? error.message
          : "AI request failed."
      );
    } finally {
      setChatLoading(false);
    }
  };

  // Expand AI to approximately 40% of the browser width.
  const toggleAiExpanded = () => {
    if (aiExpanded) {
      setAiWidth(320);
    } else {
      const expandedWidth = Math.round(
        window.innerWidth * 0.4
      );
      setAiWidth(expandedWidth);
    }
  };

  // Drag the divider to manually resize the AI panel.
  const startAiResize = (
    event: ReactMouseEvent<HTMLDivElement>
  ) => {
    if (aiCollapsed) return;

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = aiWidth;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (
      moveEvent: MouseEvent
    ) => {
      const movement =
        startX - moveEvent.clientX;
      const newWidth =
        startWidth + movement;

      const minimumWidth = 280;
      const maximumWidth =
        window.innerWidth * 0.5;

      setAiWidth(
        Math.min(
          maximumWidth,
          Math.max(minimumWidth, newWidth)
        )
      );
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top header */}
      <AppHeader
        selectedPersona={selectedPersona}
        onPersonaChange={setSelectedPersona}
      />

      {/* Main application */}
      <div
        className="grid min-h-[calc(100vh-4rem)]"
        style={{
          gridTemplateColumns: `${
            navCollapsed ? 70 : 220
          }px minmax(0, 1fr) ${
            aiCollapsed ? 0 : 6
          }px ${
            aiCollapsed ? 64 : aiWidth
          }px`,
        }}
      >
        {/* Left navigation */}
        <AppSidebar
          activePage={activePage}
          navCollapsed={navCollapsed}
          onToggle={() => setNavCollapsed(!navCollapsed)}
          onPageChange={setActivePage}
        />

        {/* Dashboard area */}
        {activePage === "overview" ? (
          <OverviewPage
            overviewData={overviewData}
            headcountTrend={headcountTrend}
            filterOptions={filterOptions}
            selectedCountry={selectedCountry}
            selectedOrg={selectedOrg}
            selectedLevel={selectedLevel}
            selectedCountryLabel={selectedCountryLabel}
            selectedOrgLabel={selectedOrgLabel}
            selectedLevelLabel={selectedLevelLabel}
            dashboardLoading={dashboardLoading}
            dashboardError={dashboardError}
            filtersActive={filtersActive}
            headcountGrowthPct={headcountGrowthPct}
            onCountryChange={setSelectedCountry}
            onOrgChange={setSelectedOrg}
            onLevelChange={setSelectedLevel}
            onResetFilters={resetFilters}
          />
        ) : activePage ===
          "talent-acquisition" ? (
          <section className="min-w-0 p-6">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  Talent Acquisition
                </h2>
                <p className="text-muted-foreground">
                  Recruiting funnel, hiring velocity, source effectiveness, and quality-of-hire analytics.
                </p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                In Development
              </span>
            </div>

            <div className="rounded-xl border bg-muted/10 p-6">
              <div className="mb-6 max-w-2xl">
                <p className="text-lg font-semibold">
                  Talent Acquisition Intelligence
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  This module is being built on top of the existing synthetic recruiting data model.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-background p-5">
                  <p className="text-sm font-semibold">
                    Recruiting Funnel
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Requisitions, applications, interviews, offers, hires, and conversion rates.
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-5">
                  <p className="text-sm font-semibold">
                    Hiring Velocity
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Time to fill, aging requisitions, hiring demand, and recruiter workload.
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-5">
                  <p className="text-sm font-semibold">
                    Source & Quality
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Source effectiveness, internal versus external hiring, and downstream quality signals.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Planned AI capability: ask questions such as “Where is the hiring funnel breaking down?” and “Which business units have the greatest recruiting demand?”
              </div>
            </div>
          </section>
        ) : activePage ===
          "survey-sentiment" ? (
          <section className="min-w-0 p-6">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  Survey & Sentiment
                </h2>
                <p className="text-muted-foreground">
                  Engagement, onboarding, exit feedback, sentiment trends, and employee-listening analytics.
                </p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                In Development
              </span>
            </div>

            <div className="rounded-xl border bg-muted/10 p-6">
              <div className="mb-6 max-w-2xl">
                <p className="text-lg font-semibold">
                  Employee Listening Intelligence
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  This module will connect structured survey results with workforce context and AI-assisted theme analysis.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-background p-5">
                  <p className="text-sm font-semibold">
                    Engagement
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Favorability, drivers, trends, participation, and population comparisons.
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-5">
                  <p className="text-sm font-semibold">
                    Onboarding
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    New-hire experience, early sentiment, enablement, and manager effectiveness.
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-5">
                  <p className="text-sm font-semibold">
                    Exit & Sentiment
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Exit themes, sentiment shifts, retention signals, and qualitative feedback.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Planned AI capability: summarize themes, compare populations, and connect listening signals with workforce outcomes.
              </div>
            </div>
          </section>
        ) : activePage === "finance" ? (
          <FinancePage
            financeData={financeData}
            financeLoading={financeLoading}
            financeError={financeError}
            financeBusinessUnits={financeBusinessUnits}
            financeScenarios={financeScenarios}
            maxFinanceLaborCost={maxFinanceLaborCost}
          />
        ) : activePage === "skills" ? (
          <section className="min-w-0 p-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  Workforce Skills
                </h2>
                <p className="text-muted-foreground">
                  Compare observed employee proficiency with job-required proficiency and external job-skill context.
                </p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {skillsLoading
                  ? "Loading skills…"
                  : "As of September 30, 2026"}
              </span>
            </div>

            {skillsError && (
              <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {skillsError}
              </div>
            )}

            {skillsData ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Active Skills
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {skillsData.summary.active_skills.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Internal skills taxonomy
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Skills Below 60%
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {skillsData.summary.skills_below_60_pct.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requirement attainment below 60%
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Requirement Met
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {skillsData.summary.weighted_requirement_met_pct.toFixed(
                        1
                      )}
                      %
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Weighted across required skill assignments
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      O*NET Mapping
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {skillsData.summary.onet_mapped_job_profiles.toLocaleString()}
                      /
                      {skillsData.summary.total_job_profiles.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Internal job profiles enriched
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  Apparent proficiency gaps compare observed employee proficiency with the proficiency required by the employee&apos;s current job profile. Missing or stale skill records should not be interpreted as proof that an employee lacks a capability.
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
                  <div className="rounded-lg border p-4">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">
                          Largest Apparent Proficiency Gaps
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Lowest share of employees meeting current job proficiency requirements
                        </p>
                      </div>

                      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        {skillsData.summary.average_profile_coverage_pct.toFixed(
                          1
                        )}
                        % profile coverage
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-3 pr-4">
                              Skill
                            </th>
                            <th className="pb-3 pr-4">
                              Category
                            </th>
                            <th className="pb-3 pr-4 text-right">
                              Required
                            </th>
                            <th className="pb-3 pr-4 text-right">
                              Observed
                            </th>
                            <th className="pb-3 pr-4 text-right">
                              Meet %
                            </th>
                            <th className="pb-3 text-right">
                              Below / Missing
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {skillsData.largest_gaps.map(
                            (row) => (
                              <tr
                                key={String(
                                  row.skill_id
                                )}
                                className="border-b last:border-0"
                              >
                                <td className="py-3 pr-4 font-medium">
                                  {row.skill_name}
                                </td>
                                <td className="py-3 pr-4 text-muted-foreground">
                                  {row.skill_category}
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums">
                                  {row.avg_required_proficiency.toFixed(
                                    2
                                  )}
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums">
                                  {row.avg_observed_proficiency.toFixed(
                                    2
                                  )}
                                </td>
                                <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                                  {row.requirement_met_pct.toFixed(
                                    1
                                  )}
                                  %
                                </td>
                                <td className="py-3 text-right tabular-nums">
                                  {row.employees_below_or_missing_requirement.toLocaleString()}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Highest-Demand Skills
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Employees currently sitting in roles requiring each skill
                      </p>
                    </div>

                    <div className="space-y-4">
                      {skillsData.highest_demand.map(
                        (row) => (
                          <div
                            key={String(
                              row.skill_id
                            )}
                            className="space-y-2"
                          >
                            <div className="flex items-end justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium">
                                  {row.skill_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.skill_category} ·{" "}
                                  {row.requirement_met_pct.toFixed(
                                    1
                                  )}
                                  % meeting requirement
                                </p>
                              </div>

                              <p className="text-sm font-semibold tabular-nums">
                                {row.employees_in_roles_requiring_skill.toLocaleString()}
                              </p>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-foreground"
                                style={{
                                  width: `${
                                    maxSkillDemand > 0
                                      ? Math.max(
                                          3,
                                          (row.employees_in_roles_requiring_skill /
                                            maxSkillDemand) *
                                            100
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">
                      AI Capability Watchlist
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      AI-related skills currently showing the largest apparent proficiency gaps
                    </p>

                    <div className="space-y-3">
                      {skillsData.largest_gaps
                        .filter(
                          (row) =>
                            row.skill_category ===
                            "AI"
                        )
                        .slice(0, 6)
                        .map((row) => (
                          <div
                            key={String(
                              row.skill_id
                            )}
                            className="flex items-center justify-between gap-4 rounded-md border p-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {row.skill_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Required{" "}
                                {row.avg_required_proficiency.toFixed(
                                  1
                                )}{" "}
                                · Observed{" "}
                                {row.avg_observed_proficiency.toFixed(
                                  1
                                )}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {row.requirement_met_pct.toFixed(
                                  1
                                )}
                                %
                              </p>
                              <p className="text-xs text-muted-foreground">
                                meeting requirement
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">
                      External Skills Intelligence
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Internal job architecture is linked to O*NET occupation and skills data.
                    </p>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Job profiles mapped
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {skillsData.summary.onet_mapped_job_profiles.toLocaleString()}
                        /
                        {skillsData.summary.total_job_profiles.toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        This gives the model an external occupation and skills reference layer alongside internal workforce data.
                      </p>
                    </div>

                    <div className="mt-4 rounded-lg border p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Current workforce
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {skillsData.summary.current_workforce.toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Employees in the September 2026 workforce snapshot.
                      </p>
                    </div>


                <div className="mt-6 rounded-lg border p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        External Labor Market
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        National labor-market context from the U.S. Bureau of Labor Statistics.
                      </p>
                    </div>

                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {blsLoading
                        ? "Refreshing BLS…"
                        : "Live BLS data"}
                    </span>
                  </div>

                  {blsError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                      {blsError}
                    </div>
                  )}

                  {blsData ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        {blsData.metrics.map(
                          (metric) => (
                            <div
                              key={
                                metric.series_id
                              }
                              className="rounded-lg border p-4"
                            >
                              <p className="text-xs font-medium text-muted-foreground">
                                {metric.short_name}
                              </p>

                              <p className="mt-2 text-3xl font-semibold">
                                {metric.display_value}
                              </p>

                              <p className="mt-2 text-xs text-muted-foreground">
                                {metric.observation_date
                                  ? `Latest observation: ${formatLongDate(
                                      metric.observation_date
                                    )}`
                                  : "Latest observation unavailable"}
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      <p className="mt-4 text-xs text-muted-foreground">
                        BLS provides macro labor-market context. These national indicators should inform workforce assumptions, not be treated as company-specific talent or wage measures.
                      </p>
                    </>
                  ) : (
                    !blsLoading && (
                      <p className="text-sm text-muted-foreground">
                        No BLS data returned.
                      </p>
                    )
                  )}
                </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                {skillsLoading
                  ? "Loading workforce skills…"
                  : "No skills data returned."}
              </div>
            )}
          </section>
        ) : (
          <section className="min-w-0 p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Workforce Planning
              </h2>
              <p className="text-muted-foreground">
                Compare 2027 workforce scenarios, headcount trajectories, and labor cost implications.
              </p>
            </div>

            <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {planningLoading
                ? "Loading plan…"
                : "2027 Enterprise Workforce Plan"}
            </span>
          </div>

          {planningError && (
            <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {planningError}
            </div>
          )}

          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {planningScenarios.map(
              (scenario) => {
                const end =
                  scenario.points[
                    scenario.points.length -
                      1
                  ];

                const baselineEnd =
                  baselinePlanningEnd
                    ?.planned_headcount ??
                  null;

                const delta =
                  end && baselineEnd !== null
                    ? end.planned_headcount -
                      baselineEnd
                    : null;

                const selected =
                  activePlanningScenario
                    ?.scenario_name ===
                  scenario.scenario_name;

                return (
                  <button
                    key={
                      scenario.scenario_name
                    }
                    type="button"
                    onClick={() =>
                      setSelectedPlanningScenario(
                        scenario.scenario_name
                      )
                    }
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      selected
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {scenario.scenario_name}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {end
                        ? end.planned_headcount.toLocaleString()
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dec 2027 headcount
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {delta === null
                        ? "—"
                        : delta === 0
                          ? "Baseline"
                          : `${
                              delta > 0
                                ? "+"
                                : ""
                            }${delta.toLocaleString()} vs Baseline`}
                    </p>
                  </button>
                );
              }
            )}
          </div>

          {planningLoading &&
          planningScenarios.length === 0 ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Loading workforce planning scenarios…
            </div>
          ) : activePlanningScenario &&
            activePlanningEnd ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Starting Headcount
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {activePlanningStart
                      ? activePlanningStart.planned_headcount.toLocaleString()
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Beginning of planning horizon
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Dec 2027 Headcount
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {activePlanningEnd.planned_headcount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {planningNetChange === null
                      ? "—"
                      : `${
                          planningNetChange >= 0
                            ? "+"
                            : ""
                        }${planningNetChange.toLocaleString()} across horizon`}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Year-End Labor Cost
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatCurrencyCompact(
                      activePlanningEnd.planned_labor_cost_usd
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Planned annualized labor cost
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Net vs Baseline
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {planningHeadcountDeltaVsBaseline ===
                    null
                      ? "—"
                      : `${
                          planningHeadcountDeltaVsBaseline >=
                          0
                            ? "+"
                            : ""
                        }${planningHeadcountDeltaVsBaseline.toLocaleString()}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dec 2027 headcount difference
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        {activePlanningScenario.scenario_name} Headcount Plan
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Monthly planned headcount through December 2027
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Planned hires / exits
                      </p>
                      <p className="font-semibold">
                        {planningTotalHires.toLocaleString()} /{" "}
                        {planningTotalExits.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart
                        data={
                          activePlanningScenario.points
                        }
                        margin={{
                          top: 8,
                          right: 16,
                          left: 8,
                          bottom: 8,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          opacity={0.25}
                        />
                        <XAxis
                          dataKey="planning_month"
                          tickFormatter={
                            formatMonth
                          }
                          minTickGap={24}
                          tick={{
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          domain={[
                            (
                              dataMin: number
                            ) =>
                              Math.max(
                                0,
                                Math.floor(
                                  dataMin *
                                    0.97
                                )
                              ),
                            (
                              dataMax: number
                            ) =>
                              Math.ceil(
                                dataMax *
                                  1.03
                              ),
                          ]}
                          tickFormatter={(
                            value: number
                          ) =>
                            value.toLocaleString()
                          }
                          width={64}
                          tick={{
                            fontSize: 12,
                          }}
                        />
                        <Tooltip
                          labelFormatter={(
                            value
                          ) =>
                            formatLongDate(
                              String(value)
                            )
                          }
                          formatter={(
                            value
                          ) => [
                            Number(
                              value
                            ).toLocaleString(),
                            "Planned headcount",
                          ]}
                          contentStyle={{
                            backgroundColor:
                              "var(--background)",
                            border:
                              "1px solid var(--border)",
                            borderRadius:
                              "0.5rem",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="planned_headcount"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{
                            r: 5,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">
                    Scenario Assumptions
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Inputs stored with the{" "}
                    {activePlanningScenario.scenario_name} scenario
                  </p>

                  <div className="space-y-3">
                    {activePlanningScenario
                      .assumptions.length >
                    0 ? (
                      activePlanningScenario.assumptions.map(
                        (assumption) => (
                          <div
                            key={
                              assumption.assumption_name
                            }
                            className="rounded-md border p-3"
                          >
                            <p className="text-xs font-medium text-muted-foreground">
                              {formatAssumptionName(
                                assumption.assumption_name
                              )}
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {assumption.assumption_text ??
                                (assumption.assumption_value !==
                                null
                                  ? assumption.assumption_value.toLocaleString()
                                  : "—")}
                            </p>
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No stored assumptions were returned for this scenario.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="font-semibold">
                    Scenario Comparison
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    December 2027 outcomes across the enterprise plan
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-3 pr-4">
                          Scenario
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          Headcount
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          FTE
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          vs Baseline
                        </th>
                        <th className="pb-3 text-right">
                          Labor Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {planningScenarios.map(
                        (scenario) => {
                          const end =
                            scenario.points[
                              scenario.points
                                .length - 1
                            ];
                          const baselineHC =
                            baselinePlanningEnd
                              ?.planned_headcount ??
                            null;
                          const delta =
                            end &&
                            baselineHC !== null
                              ? end.planned_headcount -
                                baselineHC
                              : null;

                          return (
                            <tr
                              key={
                                scenario.scenario_name
                              }
                              className="border-b last:border-0"
                            >
                              <td className="py-3 pr-4 font-medium">
                                {scenario.scenario_name}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                {end
                                  ? end.planned_headcount.toLocaleString()
                                  : "—"}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                {end
                                  ? end.planned_fte.toLocaleString()
                                  : "—"}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                {delta === null
                                  ? "—"
                                  : `${
                                      delta > 0
                                        ? "+"
                                        : ""
                                    }${delta.toLocaleString()}`}
                              </td>
                              <td className="py-3 text-right">
                                {end
                                  ? formatCurrencyCompact(
                                      end.planned_labor_cost_usd
                                    )
                                  : "—"}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>


              <div className="mt-6 rounded-lg border p-4">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      Position Modeling
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Authorized positions today versus December 2027 under the selected scenario
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {positionModelingLoading
                      ? "Loading positions…"
                      : selectedPlanningScenario}
                  </span>
                </div>

                {positionModelingError && (
                  <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {positionModelingError}
                  </div>
                )}

                {positionModelingData &&
                activePositionScenario ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                          Current Positions
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {positionModelingData.current.current_positions.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {positionModelingData.current.filled_positions.toLocaleString()} filled ·{" "}
                          {positionModelingData.current.vacant_positions.toLocaleString()} vacant
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                          Vacancy Rate
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {positionModelingData.current.vacancy_rate_pct.toFixed(
                            1
                          )}
                          %
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Current authorized positions
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                          Dec 2027 Planned Positions
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {activePositionScenario.totals.planned_positions.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activePositionScenario.scenario_name} scenario
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                          Net Position Change
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {activePositionScenario.totals.net_position_change >=
                          0
                            ? "+"
                            : ""}
                          {activePositionScenario.totals.net_position_change.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Planned positions vs current
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                      Positions represent authorized roles, while headcount represents people.
                      Planned position totals can therefore differ slightly from planned headcount.
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                      <div className="rounded-lg border p-4">
                        <div className="mb-4">
                          <h4 className="font-semibold">
                            Position Change by Business Unit
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Largest absolute changes under{" "}
                            {activePositionScenario.scenario_name}
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[520px] text-sm">
                            <thead>
                              <tr className="border-b text-left text-xs text-muted-foreground">
                                <th className="pb-3 pr-4">
                                  Business Unit
                                </th>
                                <th className="pb-3 pr-4 text-right">
                                  Current
                                </th>
                                <th className="pb-3 pr-4 text-right">
                                  Planned
                                </th>
                                <th className="pb-3 text-right">
                                  Change
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {topPositionBusinessUnits.map(
                                (row) => (
                                  <tr
                                    key={row.org_code}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-3 pr-4 font-medium">
                                      {row.org_name}
                                    </td>
                                    <td className="py-3 pr-4 text-right">
                                      {row.current_positions.toLocaleString()}
                                    </td>
                                    <td className="py-3 pr-4 text-right">
                                      {row.planned_positions.toLocaleString()}
                                    </td>
                                    <td className="py-3 text-right font-semibold">
                                      {row.net_position_change >
                                      0
                                        ? "+"
                                        : ""}
                                      {row.net_position_change.toLocaleString()}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="mb-4">
                          <h4 className="font-semibold">
                            Position Change by Level
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Current versus Dec 2027 planned structure
                          </p>
                        </div>

                        <div className="max-h-[360px] overflow-y-auto overflow-x-hidden pr-1">
                          <table className="w-full table-fixed text-sm">
                            <colgroup>
                              <col className="w-[42%]" />
                              <col className="w-[18%]" />
                              <col className="w-[18%]" />
                              <col className="w-[22%]" />
                            </colgroup>

                            <thead className="sticky top-0 z-10 bg-background">
                              <tr className="border-b text-left text-[11px] text-muted-foreground">
                                <th className="pb-3 pr-2">
                                  Level
                                </th>
                                <th className="pb-3 px-1 text-right">
                                  Current
                                </th>
                                <th className="pb-3 px-1 text-right">
                                  Planned
                                </th>
                                <th className="pb-3 pl-1 text-right">
                                  Change
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {positionLevels.map(
                                (row) => (
                                  <tr
                                    key={row.level_code}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-3 pr-2 font-medium leading-tight">
                                      {row.level_name}
                                    </td>
                                    <td className="px-1 py-3 text-right tabular-nums whitespace-nowrap">
                                      {row.current_positions.toLocaleString()}
                                    </td>
                                    <td className="px-1 py-3 text-right tabular-nums whitespace-nowrap">
                                      {row.planned_positions.toLocaleString()}
                                    </td>
                                    <td className="py-3 pl-1 text-right font-semibold tabular-nums whitespace-nowrap">
                                      {row.net_position_change >
                                      0
                                        ? "+"
                                        : ""}
                                      {row.net_position_change.toLocaleString()}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {positionModelingLoading
                      ? "Loading position modeling…"
                      : "No position modeling data returned."}
                  </div>
                )}
              </div>
              </div>
            </>
          ) : (
            !planningLoading && (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                No workforce planning scenarios were returned.
              </div>
            )
          )}
        </section>
        )}

        <AiPanel
          aiCollapsed={aiCollapsed}
          aiExpanded={aiExpanded}
          previewPage={previewPage}
          suggestedPrompts={suggestedPrompts}
          chatMessages={chatMessages}
          chatInput={chatInput}
          chatLoading={chatLoading}
          chatError={chatError}
          dashboardReady={Boolean(overviewData)}
          onResizeStart={startAiResize}
          onToggleExpanded={toggleAiExpanded}
          onToggleCollapsed={() =>
            setAiCollapsed(!aiCollapsed)
          }
          onSuggestedPrompt={(prompt) =>
            sendChatMessage(prompt)
          }
          onChatInputChange={setChatInput}
          onSend={() => sendChatMessage()}
        />
      </div>
    </main>
  );
}
