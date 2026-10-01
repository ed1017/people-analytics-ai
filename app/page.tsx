"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { completeScopedChatTurn, getScopedChatHistory, type ScopedChatHistory } from "@/lib/chat-context-history";
import { AppHeader } from "@/components/app-header";
import { OverviewPage } from "@/components/pages/overview-page";
import { OverallOverviewPage } from "@/components/pages/overall-overview-page";
import { GuideDataPage } from "@/components/pages/guide-data-page";
import { WorkforcePage } from "@/components/pages/workforce-page";
import { AttritionPage } from "@/components/pages/attrition-page";
import { FinancePage } from "@/components/pages/finance-page";
import { SkillsPage } from "@/components/pages/skills-page";
import { LearningDevelopmentPage } from "@/components/pages/learning-development-page";
import { CareerMobilityPage } from "@/components/pages/career-mobility-page";
import { CareerGrowthMobilityPage } from "@/components/pages/career-growth-mobility-page";
import type { CareerGrowthMobilityResponse } from "@/lib/career-growth-mobility";
import { SuccessionPlanningPage } from "@/components/pages/succession-planning-page";
import { WorkforcePlanningPage } from "@/components/pages/workforce-planning-page";
import {
  PlanningSessionProvider,
  type PlanningWorkspaceView,
} from "@/components/workforce-planning/planning-session-context";
import { TalentAcquisitionPage } from "@/components/pages/talent-acquisition-page";
import { SurveySentimentPage } from "@/components/pages/survey-sentiment-page";
import { AiPanel } from "@/components/ai-panel";
import {
  assessSkillsEvidenceFreshness,
  type EvidenceFreshness,
  type PlanningEvidenceHandoff,
} from "@/lib/evidence-handoff";
import {
  getDefaultPageForWorkspace,
  getWorkspaceForPage,
  type AppWorkspaceKey,
} from "@/lib/app-navigation";
import {
  enterpriseTalentEvidenceScope,
  evidenceScopeForAi,
} from "@/lib/talent-evidence-scope";
import type {
  AppPage,
  BlsResponse,
  CareerMobilityResponse,
  ChatMessage,
  DashboardFilterOptions,
  DashboardResponse,
  FinanceResponse,
  HeadcountTrendPoint,
  LearningDevelopmentResponse,
  OverviewData,
  Persona,
  PositionModelingResponse,
  ScenarioModelResponse,
  SkillsResponse,
  SuccessionCoverageResponse,
  WorkforceResponse,
  AttritionResponse,
  TalentAcquisitionResponse,
  SurveySentimentResponse,
  WorkforcePlanningResponse,
} from "@/lib/types";

const EMPTY_FILTER_OPTIONS: DashboardFilterOptions = {
  countries: [],
  business_units: [],
  levels: [],
};

type AiSide = "left" | "right";

const AI_SIDE_STORAGE_KEY =
  "people-analytics.ai-side.v1";

const PLANNING_PAGE_TO_VIEW: Partial<
  Record<AppPage, PlanningWorkspaceView>
> = {
  "workforce-planning": "overview",
  "planning-overview": "overview",
  "scenario-modeling": "plan",
  "position-workforce-design": "design",
  "workforce-response": "respond",
  "execution-feasibility": "execute",
};

const PLANNING_VIEW_TO_PAGE: Record<
  PlanningWorkspaceView,
  AppPage
> = {
  overview: "planning-overview",
  plan: "scenario-modeling",
  design: "position-workforce-design",
  respond: "workforce-response",
  execute: "execution-feasibility",
};

export default function Home() {
  const [talentResponseEvidenceContext, setTalentResponseEvidenceContext] = useState<string | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [aiWidth, setAiWidth] = useState(460);
  const [aiSide, setAiSide] =
    useState<AiSide>("left");

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

  const [activePage, setActivePageState] =
    useState<AppPage>("home");

  const lastPageByWorkspaceRef = useRef<
    Record<AppWorkspaceKey, AppPage>
  >({
    analytics: "workforce",
    talent: "skills",
    strategy: "planning-overview",
  });

  const setActivePage = (page: AppPage) => setActivePageState(page === "overview" ? "workforce" : page);

  const activeWorkspace =
    getWorkspaceForPage(activePage);

  const planningRequestedView =
    PLANNING_PAGE_TO_VIEW[activePage] ?? null;
  const planningWorkspaceActive =
    planningRequestedView !== null;

  useEffect(() => {
    if (activePage === "home" || activePage === "guide-data") return;
    lastPageByWorkspaceRef.current[
      activeWorkspace
    ] = activePage;
  }, [activePage, activeWorkspace]);

  const changeWorkspace = (
    workspace: AppWorkspaceKey
  ) => {
    if (activePage !== "home" && activePage !== "guide-data" && workspace === activeWorkspace) {
      return;
    }

    setActivePage(
      lastPageByWorkspaceRef.current[
        workspace
      ] ??
        getDefaultPageForWorkspace(
          workspace
        )
    );
  };

  const changePlanningDestination = (
    view: PlanningWorkspaceView
  ) => {
    const nextPage =
      PLANNING_VIEW_TO_PAGE[view];

    lastPageByWorkspaceRef.current.strategy =
      nextPage;
    setActivePage(nextPage);
  };

  const [workforceData, setWorkforceData] =
    useState<WorkforceResponse | null>(null);
  const [workforceLoading, setWorkforceLoading] = useState(false);
  const [workforceError, setWorkforceError] = useState<string | null>(null);

  const [attritionData, setAttritionData] =
    useState<AttritionResponse | null>(null);
  const [attritionLoading, setAttritionLoading] = useState(false);
  const [attritionError, setAttritionError] = useState<string | null>(null);

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

  const [
    learningDevelopmentData,
    setLearningDevelopmentData,
  ] = useState<LearningDevelopmentResponse | null>(
    null
  );
  const [
    learningDevelopmentLoading,
    setLearningDevelopmentLoading,
  ] = useState(false);
  const [
    learningDevelopmentError,
    setLearningDevelopmentError,
  ] = useState<string | null>(null);

  const [
    careerMobilityData,
    setCareerMobilityData,
  ] = useState<CareerMobilityResponse | null>(
    null
  );
  const [
    careerGrowthMobilityData,
    setCareerGrowthMobilityData,
  ] = useState<CareerGrowthMobilityResponse | null>(
    null
  );
  const [
    careerGrowthMobilityLoading,
    setCareerGrowthMobilityLoading,
  ] = useState(false);
  const [
    careerGrowthMobilityError,
    setCareerGrowthMobilityError,
  ] = useState<string | null>(null);
  const [
    careerMobilityLoading,
    setCareerMobilityLoading,
  ] = useState(false);
  const [
    careerMobilityError,
    setCareerMobilityError,
  ] = useState<string | null>(null);

  const [
    successionCoverageData,
    setSuccessionCoverageData,
  ] = useState<SuccessionCoverageResponse | null>(
    null
  );
  const [
    successionCoverageLoading,
    setSuccessionCoverageLoading,
  ] = useState(false);
  const [
    successionCoverageError,
    setSuccessionCoverageError,
  ] = useState<string | null>(null);

  const [talentAcquisitionData, setTalentAcquisitionData] =
    useState<TalentAcquisitionResponse | null>(null);
  const [talentAcquisitionLoading, setTalentAcquisitionLoading] =
    useState(false);
  const [talentAcquisitionError, setTalentAcquisitionError] =
    useState<string | null>(null);

  const [surveySentimentData, setSurveySentimentData] =
    useState<SurveySentimentResponse | null>(null);
  const [surveySentimentLoading, setSurveySentimentLoading] =
    useState(false);
  const [surveySentimentError, setSurveySentimentError] =
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
  const dashboardRequestIdRef = useRef(0);

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);
  const modelHistoryRef = useRef<ScopedChatHistory>({ key: "", messages: [] });
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] =
    useState<string | null>(null);

  const [
    planningEvidenceHandoff,
    setPlanningEvidenceHandoff,
  ] = useState<PlanningEvidenceHandoff | null>(
    null
  );
  const [
    planningEvidenceFreshness,
    setPlanningEvidenceFreshness,
  ] = useState<EvidenceFreshness>({
    status: "unavailable",
    reason: "No evidence handoff is active.",
  });
  const [
    planningEvidenceFreshnessChecking,
    setPlanningEvidenceFreshnessChecking,
  ] = useState(false);
  const handoffValidationRequestIdRef =
    useRef(0);

  useEffect(() => {
    try {
      const savedSide =
        window.localStorage.getItem(
          AI_SIDE_STORAGE_KEY
        );

      if (
        savedSide === "left" ||
        savedSide === "right"
      ) {
        setAiSide(savedSide);
      }
    } catch {
      // Local preference persistence is optional.
    }
  }, []);

  useEffect(() => {
    const requestId = ++dashboardRequestIdRef.current;
    const controller = new AbortController();

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
          signal: controller.signal,
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ?? "Failed to load dashboard data."
          );
        }

        if (requestId !== dashboardRequestIdRef.current) {
          return;
        }

        const data = payload as DashboardResponse;

        setOverviewData(data.overview);
        setHeadcountTrend(data.trend ?? []);
        setFilterOptions(
          data.filter_options ?? EMPTY_FILTER_OPTIONS
        );
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== dashboardRequestIdRef.current
        ) {
          return;
        }

        console.error(error);
        setDashboardError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data."
        );
      } finally {
        if (
          !controller.signal.aborted &&
          requestId === dashboardRequestIdRef.current
        ) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      controller.abort();
    };
  }, [selectedCountry, selectedOrg, selectedLevel]);

  useEffect(() => {
    if (activePage !== "workforce" || workforceData) return;

    async function loadWorkforce() {
      try {
        setWorkforceLoading(true);
        setWorkforceError(null);
        const response = await fetch("/api/workforce", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load workforce analytics.");
        }
        setWorkforceData(payload as WorkforceResponse);
      } catch (error) {
        console.error(error);
        setWorkforceError(
          error instanceof Error ? error.message : "Failed to load workforce analytics."
        );
      } finally {
        setWorkforceLoading(false);
      }
    }

    loadWorkforce();
  }, [activePage, workforceData]);

  useEffect(() => {
    if (activePage !== "attrition" || attritionData) return;

    async function loadAttrition() {
      try {
        setAttritionLoading(true);
        setAttritionError(null);
        const response = await fetch("/api/attrition", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load attrition analytics.");
        }
        setAttritionData(payload as AttritionResponse);
      } catch (error) {
        console.error(error);
        setAttritionError(
          error instanceof Error ? error.message : "Failed to load attrition analytics."
        );
      } finally {
        setAttritionLoading(false);
      }
    }

    loadAttrition();
  }, [activePage, attritionData]);

  useEffect(() => {
    if (
      !planningWorkspaceActive ||
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
  }, [
    planningWorkspaceActive,
    planningData,
  ]);

  useEffect(() => {
    if (
      !planningWorkspaceActive ||
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
    planningWorkspaceActive,
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
      activePage !== "survey-sentiment" ||
      surveySentimentData
    ) {
      return;
    }

    async function loadSurveySentiment() {
      try {
        setSurveySentimentLoading(true);
        setSurveySentimentError(null);

        const response = await fetch(
          "/api/survey-sentiment",
          { cache: "no-store" }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load Survey & Sentiment data."
          );
        }

        setSurveySentimentData(
          payload as SurveySentimentResponse
        );
      } catch (error) {
        console.error(error);
        setSurveySentimentError(
          error instanceof Error
            ? error.message
            : "Failed to load Survey & Sentiment data."
        );
      } finally {
        setSurveySentimentLoading(false);
      }
    }

    loadSurveySentiment();
  }, [activePage, surveySentimentData]);

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
      activePage !==
        "learning-development" ||
      learningDevelopmentData
    ) {
      return;
    }

    async function loadLearningDevelopment() {
      try {
        setLearningDevelopmentLoading(true);
        setLearningDevelopmentError(null);

        const response = await fetch(
          "/api/learning-development",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load Learning & Development data."
          );
        }

        setLearningDevelopmentData(
          payload as LearningDevelopmentResponse
        );
      } catch (error) {
        console.error(error);
        setLearningDevelopmentError(
          error instanceof Error
            ? error.message
            : "Failed to load Learning & Development data."
        );
      } finally {
        setLearningDevelopmentLoading(false);
      }
    }

    loadLearningDevelopment();
  }, [
    activePage,
    learningDevelopmentData,
  ]);

  useEffect(() => {
    if (
      activePage !==
        "career-mobility" ||
      careerMobilityData
    ) {
      return;
    }

    async function loadCareerMobility() {
      try {
        setCareerMobilityLoading(true);
        setCareerMobilityError(null);

        const response = await fetch(
          "/api/career-mobility",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load Career Interests data."
          );
        }

        setCareerMobilityData(
          payload as CareerMobilityResponse
        );
      } catch (error) {
        console.error(error);
        setCareerMobilityError(
          error instanceof Error
            ? error.message
            : "Failed to load Career Interests data."
        );
      } finally {
        setCareerMobilityLoading(false);
      }
    }

    loadCareerMobility();
  }, [
    activePage,
    careerMobilityData,
  ]);

  useEffect(() => {
    if (
      activePage !==
        "career-growth-mobility" ||
      careerGrowthMobilityData
    ) {
      return;
    }

    async function loadCareerGrowthMobility() {
      try {
        setCareerGrowthMobilityLoading(true);
        setCareerGrowthMobilityError(null);
        const response = await fetch(
          "/api/career-growth-mobility",
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Career Growth & Internal Mobility data is unavailable."
          );
        }
        setCareerGrowthMobilityData(
          payload as CareerGrowthMobilityResponse
        );
      } catch (error) {
        setCareerGrowthMobilityError(
          error instanceof Error
            ? error.message
            : "Career Growth & Internal Mobility data is unavailable."
        );
      } finally {
        setCareerGrowthMobilityLoading(false);
      }
    }

    loadCareerGrowthMobility();
  }, [
    activePage,
    careerGrowthMobilityData,
  ]);

  useEffect(() => {
    if (
      activePage !==
        "succession-planning" ||
      successionCoverageData
    ) {
      return;
    }

    async function loadSuccessionCoverage() {
      try {
        setSuccessionCoverageLoading(true);
        setSuccessionCoverageError(null);

        const response = await fetch(
          "/api/succession-coverage",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Succession summary is unavailable."
          );
        }

        setSuccessionCoverageData(
          payload as SuccessionCoverageResponse
        );
      } catch (error) {
        console.error(error);
        setSuccessionCoverageError(
          error instanceof Error
            ? error.message
            : "Succession summary is unavailable."
        );
      } finally {
        setSuccessionCoverageLoading(false);
      }
    }

    loadSuccessionCoverage();
  }, [
    activePage,
    successionCoverageData,
  ]);

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

  const selectedBusinessContext =
    useMemo(
      () => ({
        country: selectedCountryLabel,
        businessUnit: selectedOrgLabel,
        level: selectedLevelLabel,
      }),
      [
        selectedCountryLabel,
        selectedOrgLabel,
        selectedLevelLabel,
      ]
    );

  const focusAfterRender = (
    elementId: string
  ) => {
    window.requestAnimationFrame(() => {
      document
        .getElementById(elementId)
        ?.focus();
    });
  };

  const openPlanningWithHandoff = () => {
    lastPageByWorkspaceRef.current.strategy =
      "planning-overview";
    setActivePage("planning-overview");
    focusAfterRender(
      "carried-planning-evidence"
    );
  };

  const backToSkillsFromHandoff = () => {
    lastPageByWorkspaceRef.current.talent =
      "skills";
    setActivePage("skills");
    focusAfterRender(
      "skills-evidence-handoff"
    );
  };

  const clearPlanningEvidenceHandoff = () => {
    handoffValidationRequestIdRef.current +=
      1;
    setPlanningEvidenceHandoff(null);
    setPlanningEvidenceFreshnessChecking(
      false
    );
    setPlanningEvidenceFreshness({
      status: "unavailable",
      reason:
        "No evidence handoff is active.",
    });
    focusAfterRender(
      "workforce-planning-heading"
    );
  };

  const carryEvidenceToPlanning = (
    handoff: PlanningEvidenceHandoff
  ) => {
    setPlanningEvidenceHandoff(handoff);
    setPlanningEvidenceFreshness(
      assessSkillsEvidenceFreshness(
        handoff,
        skillsData
      )
    );
    openPlanningWithHandoff();
  };

  const revalidatePlanningEvidenceHandoff =
    async (
      handoff: PlanningEvidenceHandoff
    ) => {
      const requestId =
        ++handoffValidationRequestIdRef.current;
      setPlanningEvidenceFreshnessChecking(
        true
      );

      try {
        const response = await fetch(
          "/api/skills",
          {
            cache: "no-store",
          }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Current Skills evidence is unavailable."
          );
        }

        if (
          requestId !==
          handoffValidationRequestIdRef.current
        ) {
          return;
        }

        const currentSkills =
          payload as SkillsResponse;

        setSkillsData(currentSkills);
        setPlanningEvidenceFreshness(
          assessSkillsEvidenceFreshness(
            handoff,
            currentSkills
          )
        );
      } catch (error) {
        if (
          requestId !==
          handoffValidationRequestIdRef.current
        ) {
          return;
        }

        setPlanningEvidenceFreshness({
          status: "unavailable",
          reason:
            error instanceof Error
              ? error.message
              : "Current Skills evidence is unavailable.",
        });
      } finally {
        if (
          requestId ===
          handoffValidationRequestIdRef.current
        ) {
          setPlanningEvidenceFreshnessChecking(
            false
          );
        }
      }
    };

  useEffect(() => {
    if (
      !planningWorkspaceActive ||
      !planningEvidenceHandoff
    ) {
      return;
    }

    void revalidatePlanningEvidenceHandoff(
      planningEvidenceHandoff
    );
    // The packet itself is the trigger; source
    // validation is intentionally read-only.
  }, [
    planningWorkspaceActive,
    planningEvidenceHandoff,
  ]);

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

  const previewPage = false;

  const suggestedPrompts =
    previewPage
      ? []
      : planningWorkspaceActive
      ? [
          "Compare all four workforce scenarios",
          "What stands out in this scenario?",
          "What are the labor cost implications?",
        ]
      : activePage === "workforce"
        ? [
            "How is our workforce distributed?",
            "What stands out in workforce composition?",
            "Where do management layers look unusual?",
          ]
        : activePage === "attrition"
          ? [
              "Where is attrition highest?",
              "What are the biggest regrettable-loss risks?",
              "What separation patterns stand out?",
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
          : activePage ===
              "learning-development"
            ? [
                "Which current skill gaps have active learning pathways?",
                "Where is learning pathway coverage missing?",
                "Which job profiles have the broadest required-skill pathway coverage?",
              ]
          : activePage ===
              "career-mobility"
            ? [
                "Which destination roles have the most recorded interest?",
                "Where are desired locations concentrated?",
                "What does recorded relocation willingness show?",
              ]
          : activePage ===
              "succession-planning"
            ? [
                "What does recorded succession-plan coverage show?",
                "How much recorded ready-now coverage do we have?",
                "How should I interpret this succession summary?",
              ]
          : activePage === "talent-acquisition"
            ? [
                "Where is the recruiting funnel weakest?",
                "Which business units have the greatest hiring pressure?",
                "Which recruiting sources are most effective?",
              ]
            : activePage === "survey-sentiment"
              ? [
                  "What are the biggest engagement risks?",
                  "Which business units stand out most?",
                  "What do onboarding and exit results suggest?",
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

    const modelContextKey = JSON.stringify({
      page: activePage,
      persona: selectedPersona,
      businessContext: selectedBusinessContext,
      snapshotDate: overviewData.snapshot_date,
      scenario: planningWorkspaceActive ? selectedPlanningScenario : null,
      comparison: planningWorkspaceActive ? talentResponseEvidenceContext : null,
      handoff: planningWorkspaceActive ? planningEvidenceHandoff : null,
      freshness: planningWorkspaceActive ? planningEvidenceFreshness : null,
    });
    const modelHistory = getScopedChatHistory(modelHistoryRef.current, modelContextKey);

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
            page: planningWorkspaceActive
              ? "workforce-planning"
              : activePage,
            workforceDetailContext:
              activePage === "workforce" && workforceData
                ? {
                    summary: workforceData.summary,
                    businessUnits: workforceData.business_units,
                    countries: workforceData.countries,
                    levels: workforceData.levels,
                    tenure: workforceData.tenure,
                    movements: workforceData.movements,
                  }
                : null,
            attritionContext:
              activePage === "attrition" && attritionData
                ? {
                    summary: attritionData.summary,
                    businessUnits: attritionData.business_units,
                    levels: attritionData.levels,
                    tenure: attritionData.tenure,
                    reasons: attritionData.reasons,
                    trend: attritionData.trend,
                  }
                : null,
            planningContext:
              planningWorkspaceActive &&
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
              planningWorkspaceActive &&
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
                    evidenceScope:
                      evidenceScopeForAi(
                        enterpriseTalentEvidenceScope({
                          label:
                            "Enterprise workforce",
                          asOf:
                            skillsData.as_of,
                          populationLabel:
                            "employees",
                          populationCount:
                            skillsData.summary
                              .current_workforce,
                          supportedBreakdowns: [
                            "skill",
                          ],
                        }),
                        selectedBusinessContext
                      ),
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

            learningDevelopmentContext:
              activePage ===
                "learning-development" &&
              learningDevelopmentData
                ? {
                    evidenceScope:
                      evidenceScopeForAi(
                        enterpriseTalentEvidenceScope({
                          label:
                            "Enterprise workforce",
                          asOf:
                            learningDevelopmentData.as_of,
                          populationLabel:
                            "employees",
                          populationCount:
                            learningDevelopmentData.summary
                              .current_workforce,
                          supportedBreakdowns: [
                            "skill",
                            "job_profile",
                          ],
                        }),
                        selectedBusinessContext
                      ),
                    summary:
                      learningDevelopmentData.summary,
                    skillPathways:
                      learningDevelopmentData.skill_pathways.slice(
                        0,
                        20
                      ),
                    jobProfilePathways:
                      learningDevelopmentData.job_profile_pathways.slice(
                        0,
                        15
                      ),
                  }
                : null,

            careerMobilityContext:
              activePage ===
                "career-mobility" &&
              careerMobilityData
                ? {
                    evidenceScope:
                      evidenceScopeForAi(
                        enterpriseTalentEvidenceScope({
                          label:
                            "Enterprise active workforce",
                          asOf:
                            careerMobilityData.as_of,
                          populationLabel:
                            "active employees",
                          populationCount:
                            careerMobilityData.summary
                              .active_employees,
                          supportedBreakdowns: [
                            "current_org_preference_coverage",
                          ],
                        }),
                        selectedBusinessContext
                      ),
                    summary:
                      careerMobilityData.summary,
                    dataQuality:
                      careerMobilityData.data_quality,
                    careerInterests:
                      careerMobilityData.career_interests,
                    destinationRoles:
                      careerMobilityData.destination_roles.slice(
                        0,
                        10
                      ),
                    desiredLocations:
                      careerMobilityData.desired_locations.slice(
                        0,
                        10
                      ),
                    currentOrgCoverage:
                      careerMobilityData.current_org_coverage,
                  }
                : null,

            careerGrowthMobilityContext:
              activePage ===
                "career-growth-mobility" &&
              careerGrowthMobilityData
                ? {
                    evidenceScope:
                      evidenceScopeForAi(
                        enterpriseTalentEvidenceScope({
                          label:
                            "Enterprise recorded movement events",
                          asOf:
                            careerGrowthMobilityData.source
                              .last_recorded_date,
                          populationLabel:
                            "recorded movement events",
                          populationCount:
                            careerGrowthMobilityData.source
                              .total_recorded_events,
                          supportedBreakdowns: [
                            "movement_type",
                            "month",
                            "job_level_transition",
                          ],
                        }),
                        selectedBusinessContext
                      ),
                    source:
                      careerGrowthMobilityData.source,
                    composition:
                      careerGrowthMobilityData.composition,
                    monthly:
                      careerGrowthMobilityData.monthly,
                    levelTransitions:
                      careerGrowthMobilityData.level_transitions,
                    limitations:
                      careerGrowthMobilityData.limitations,
                  }
                : null,

            successionCoverageContext:
              activePage ===
                "succession-planning" &&
              successionCoverageData
                ? {
                    ...successionCoverageData,
                    evidenceScope:
                      evidenceScopeForAi(
                        enterpriseTalentEvidenceScope({
                          label:
                            "Enterprise succession population",
                          asOf:
                            successionCoverageData.as_of_date,
                          populationLabel:
                            "filled critical positions",
                          populationCount:
                            successionCoverageData
                              .filled_critical_positions,
                          supportedBreakdowns: [],
                        }),
                        selectedBusinessContext
                      ),
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

            surveySentimentContext:
              activePage ===
                "survey-sentiment" &&
              surveySentimentData
                ? {
                    summary:
                      surveySentimentData.summary,
                    engagementTrend:
                      surveySentimentData.engagement_trend,
                    engagementDimensions:
                      surveySentimentData.engagement_dimensions,
                    pulseDimensions:
                      surveySentimentData.pulse_dimensions,
                    managerDimensions:
                      surveySentimentData.manager_dimensions,
                    onboardingDimensions:
                      surveySentimentData.onboarding_dimensions,
                    exitDimensions:
                      surveySentimentData.exit_dimensions,
                    businessUnits:
                      surveySentimentData.business_units,
                    exitReasons:
                      surveySentimentData.exit_reasons,
                  }
                : null,

            talentResponseEvidenceContext: planningWorkspaceActive ? talentResponseEvidenceContext : null,
            planningEvidenceHandoffContext:
              planningEvidenceHandoff
                ? {
                    ...planningEvidenceHandoff,
                    freshness:
                      planningEvidenceFreshness,
                    freshnessChecking:
                      planningEvidenceFreshnessChecking,
                    currentBusinessContext:
                      selectedBusinessContext,
                  }
                : null,

            history:
              modelHistory,
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
      modelHistoryRef.current = completeScopedChatTurn(modelContextKey, modelHistory, message, payload.answer ?? "No response returned.");
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

  const explainCustomScenario = async (
    scenario: ScenarioModelResponse
  ) => {
    setAiCollapsed(false);

    const assumptions = scenario.assumptions;
    const summary = scenario.summary;

    const prompt = [
      "Explain this deterministic workforce scenario and its business implications.",
      "",
      "Use the approved workforce scenario tool to rerun and verify these exact assumptions before explaining the result:",
      `- Annual enterprise growth: ${assumptions.annual_growth_pct}%`,
      `- Salary inflation: ${assumptions.salary_inflation_pct}%`,
      `- Annual attrition: ${assumptions.annual_attrition_pct}%`,
      `- Fill rate: ${assumptions.fill_rate_pct}%`,
      `- AI/productivity hiring-demand reduction: ${assumptions.productivity_hiring_reduction_pct}%`,
      "",
      "The deterministic UI result currently shows:",
      `- Ending headcount: ${summary.modeled_end_headcount}`,
      `- Baseline ending headcount: ${summary.baseline_end_headcount}`,
      `- Headcount delta vs Baseline: ${summary.headcount_delta_vs_baseline}`,
      `- Ending FTE: ${summary.modeled_end_fte}`,
      `- Ending labor cost USD: ${summary.modeled_end_labor_cost_usd}`,
      `- Labor cost delta vs Baseline USD: ${summary.labor_cost_delta_vs_baseline_usd}`,
      `- Headcount gap vs target: ${summary.headcount_gap_vs_target}`,
      "",
      "Explain the main workforce and cost tradeoffs. Separate modeled facts from interpretation and do not invent causes, savings, or math outside the deterministic tool result.",
    ].join("\n");

    await sendChatMessage(prompt);
  };

  // Expand AI to approximately 44% of the browser width.
  const toggleAiExpanded = () => {
    if (aiExpanded) {
      setAiWidth(460);
    } else {
      const expandedWidth = Math.min(
        window.innerWidth * 0.5,
        Math.max(
          560,
          Math.round(window.innerWidth * 0.44)
        )
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
        aiSide === "left"
          ? moveEvent.clientX - startX
          : startX - moveEvent.clientX;
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

  const resizeAiWithKeyboard = (
    event: ReactKeyboardEvent<HTMLDivElement>
  ) => {
    if (aiCollapsed) return;

    const minimumWidth = 280;
    const maximumWidth =
      window.innerWidth * 0.5;
    const step = 20;

    let nextWidth: number | null = null;

    if (event.key === "Home") {
      nextWidth = minimumWidth;
    } else if (event.key === "End") {
      nextWidth = maximumWidth;
    } else if (
      event.key === "ArrowLeft"
    ) {
      nextWidth =
        aiWidth +
        (aiSide === "left"
          ? -step
          : step);
    } else if (
      event.key === "ArrowRight"
    ) {
      nextWidth =
        aiWidth +
        (aiSide === "left"
          ? step
          : -step);
    }

    if (nextWidth === null) return;

    event.preventDefault();
    setAiWidth(
      Math.min(
        maximumWidth,
        Math.max(
          minimumWidth,
          nextWidth
        )
      )
    );
  };

  const updateAiSide = (
    nextSide: AiSide
  ) => {
    setAiSide(nextSide);

    try {
      window.localStorage.setItem(
        AI_SIDE_STORAGE_KEY,
        nextSide
      );
    } catch {
      // Local preference persistence is optional.
    }
  };

  return (
    <PlanningSessionProvider onTalentEvidenceContextChange={setTalentResponseEvidenceContext}>
    <main className={`min-h-screen bg-background text-foreground${activePage === "home" || activePage === "guide-data" ? " app-overview-mode" : ""}`}>
      {/* Top header */}
      <AppHeader
        activePage={activePage}
        selectedPersona={selectedPersona}
        onPersonaChange={setSelectedPersona}
      />

      {/* Main application */}
      <div
        className={`app-shell app-ai-${aiSide}${activePage === "home" || activePage === "guide-data" ? " app-home" : ""}`}
        style={
          {
            "--nav-width": `${
              navCollapsed ? 72 : 252
            }px`,
            "--divider-width": `${
              aiCollapsed ? 0 : 6
            }px`,
            "--ai-width": `${
              aiCollapsed ? 64 : aiWidth
            }px`,
          } as CSSProperties
        }
      >
        {/* Left navigation */}
        <AppSidebar
          activePage={activePage}
          activeWorkspace={activeWorkspace}
          navCollapsed={navCollapsed}
          onToggle={() => setNavCollapsed(!navCollapsed)}
          onPageChange={setActivePage}
          onWorkspaceChange={changeWorkspace}
        />

        {/* Dashboard area */}
        <div className="app-dashboard min-w-0 overflow-x-hidden bg-background">
        <div hidden={activePage !== "home"}><OverallOverviewPage active={activePage === "home"} persona={selectedPersona} onNavigate={setActivePage} /></div>
        {activePage === "guide-data" ? <GuideDataPage onBack={() => { setActivePage("home"); window.requestAnimationFrame(() => document.getElementById("overall-guide-link")?.focus()); }} /> : activePage === "home" ? null : activePage === "workforce" ? (
          <>
          <h1 className="px-6 pt-6 text-2xl font-semibold">Workforce</h1>
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
          <WorkforcePage
            data={workforceData}
            loading={workforceLoading}
            error={workforceError}
          />
          </>
        ) : activePage === "attrition" ? (
          <AttritionPage
            data={attritionData}
            loading={attritionLoading}
            error={attritionError}
          />
        ) : activePage ===
          "talent-acquisition" ? (
          <TalentAcquisitionPage
            data={talentAcquisitionData}
            loading={talentAcquisitionLoading}
            error={talentAcquisitionError}
          />        ) : activePage ===
          "survey-sentiment" ? (
          <SurveySentimentPage
            data={surveySentimentData}
            loading={surveySentimentLoading}
            error={surveySentimentError}
          />
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
            selectedContext={
              selectedBusinessContext
            }
            activeHandoff={
              planningEvidenceHandoff
            }
            onCarryToPlanning={
              carryEvidenceToPlanning
            }
            onClearHandoff={
              clearPlanningEvidenceHandoff
            }
            onOpenPlanning={
              openPlanningWithHandoff
            }
          />
        ) : activePage ===
          "learning-development" ? (
          <LearningDevelopmentPage
            data={learningDevelopmentData}
            loading={learningDevelopmentLoading}
            error={learningDevelopmentError}
            selectedContext={
              selectedBusinessContext
            }
          />
        ) : activePage ===
          "career-mobility" ? (
          <CareerMobilityPage
            data={careerMobilityData}
            loading={careerMobilityLoading}
            error={careerMobilityError}
            selectedContext={
              selectedBusinessContext
            }
          />
        ) : activePage ===
          "career-growth-mobility" ? (
          <CareerGrowthMobilityPage
            data={careerGrowthMobilityData}
            loading={careerGrowthMobilityLoading}
            error={careerGrowthMobilityError}
            selectedContext={
              selectedBusinessContext
            }
          />
        ) : activePage ===
          "succession-planning" ? (
          <SuccessionPlanningPage
            data={successionCoverageData}
            loading={successionCoverageLoading}
            error={successionCoverageError}
            selectedContext={
              selectedBusinessContext
            }
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
            onExplainCustomScenario={explainCustomScenario}
            evidenceHandoff={
              planningEvidenceHandoff
            }
            evidenceFreshness={
              planningEvidenceFreshness
            }
            evidenceFreshnessChecking={
              planningEvidenceFreshnessChecking
            }
            currentBusinessContext={
              selectedBusinessContext
            }
            requestedView={
              planningRequestedView ?? "overview"
            }
            onPlanningDestinationChange={
              changePlanningDestination
            }
            onBackToSkills={
              backToSkillsFromHandoff
            }
            onClearEvidenceHandoff={
              clearPlanningEvidenceHandoff
            }
            onRefreshEvidenceHandoff={() => {
              if (
                planningEvidenceHandoff
              ) {
                void revalidatePlanningEvidenceHandoff(
                  planningEvidenceHandoff
                );
              }
            }}
          />
        )}
        </div>

        {activePage !== "home" && activePage !== "guide-data" && <AiPanel
          aiCollapsed={aiCollapsed}
          aiExpanded={aiExpanded}
          aiSide={aiSide}
          aiWidth={aiWidth}
          previewPage={previewPage}
          suggestedPrompts={suggestedPrompts}
          chatMessages={chatMessages}
          chatInput={chatInput}
          chatLoading={chatLoading}
          chatError={chatError}
          dashboardReady={Boolean(overviewData)}
          onResizeStart={startAiResize}
          onResizeKeyDown={resizeAiWithKeyboard}
          onToggleExpanded={toggleAiExpanded}
          onToggleCollapsed={() =>
            setAiCollapsed(!aiCollapsed)
          }
          onAiSideChange={updateAiSide}
          onSuggestedPrompt={(prompt) =>
            sendChatMessage(prompt)
          }
          onChatInputChange={setChatInput}
          onSend={() => sendChatMessage()}
        />}
      </div>
    </main>
    </PlanningSessionProvider>
  );
}
