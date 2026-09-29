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
import { SkillsPage } from "@/components/pages/skills-page";
import { WorkforcePlanningPage } from "@/components/pages/workforce-planning-page";
import { TalentAcquisitionPage } from "@/components/pages/talent-acquisition-page";
import { AiPanel } from "@/components/ai-panel";
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
  TalentAcquisitionResponse,
  WorkforcePlanningResponse,
} from "@/lib/types";

const EMPTY_FILTER_OPTIONS: DashboardFilterOptions = {
  countries: [],
  business_units: [],
  levels: [],
};

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

  const [talentAcquisitionData, setTalentAcquisitionData] =
    useState<TalentAcquisitionResponse | null>(null);
  const [talentAcquisitionLoading, setTalentAcquisitionLoading] =
    useState(false);
  const [talentAcquisitionError, setTalentAcquisitionError] =
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
    if (activePage !== "talent-acquisition" || talentAcquisitionData) {
      return;
    }

    async function loadTalentAcquisition() {
      try {
        setTalentAcquisitionLoading(true);
        setTalentAcquisitionError(null);
        const response = await fetch("/api/talent-acquisition", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load Talent Acquisition data.");
        }
        setTalentAcquisitionData(payload as TalentAcquisitionResponse);
      } catch (error) {
        console.error(error);
        setTalentAcquisitionError(error instanceof Error ? error.message : "Failed to load Talent Acquisition data.");
      } finally {
        setTalentAcquisitionLoading(false);
      }
    }

    loadTalentAcquisition();
  }, [activePage, talentAcquisitionData]);
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
          : activePage === "talent-acquisition"
            ? [
                "Where is the recruiting funnel weakest?",
                "Which business units have the greatest hiring pressure?",
                "Which recruiting sources are most effective?",
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

            talentAcquisitionContext:
              activePage ===
                "talent-acquisition" &&
              talentAcquisitionData
                ? {
                    summary:
                      talentAcquisitionData.summary,
                    businessUnits:
                      talentAcquisitionData.business_units,
                    sources:
                      talentAcquisitionData.sources,
                    recruiters:
                      talentAcquisitionData.recruiters.slice(
                        0,
                        10
                      ),
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
          <TalentAcquisitionPage
            data={talentAcquisitionData}
            loading={talentAcquisitionLoading}
            error={talentAcquisitionError}
          />        ) : activePage ===
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
          <SkillsPage
            skillsData={skillsData}
            skillsLoading={skillsLoading}
            skillsError={skillsError}
            blsData={blsData}
            blsLoading={blsLoading}
            blsError={blsError}
            maxSkillDemand={maxSkillDemand}
          />
        ) : (
          <WorkforcePlanningPage
            planningScenarios={planningScenarios}
            planningLoading={planningLoading}
            planningError={planningError}
            activePlanningScenario={activePlanningScenario}
            activePlanningStart={activePlanningStart}
            activePlanningEnd={activePlanningEnd}
            baselinePlanningEnd={baselinePlanningEnd}
            planningNetChange={planningNetChange}
            planningHeadcountDeltaVsBaseline={planningHeadcountDeltaVsBaseline}
            planningTotalHires={planningTotalHires}
            planningTotalExits={planningTotalExits}
            selectedPlanningScenario={selectedPlanningScenario}
            positionModelingData={positionModelingData}
            positionModelingLoading={positionModelingLoading}
            positionModelingError={positionModelingError}
            activePositionScenario={activePositionScenario}
            topPositionBusinessUnits={topPositionBusinessUnits}
            positionLevels={positionLevels}
            onScenarioChange={setSelectedPlanningScenario}
          />
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
