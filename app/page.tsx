"use client";

import { contextualPrompts, hasKnownNumericEvidence } from "@/lib/contextual-prompts";
import {usePlanningEvidenceValidation} from "@/components/use-planning-evidence-validation";

import {WorkforceSolutionPanel} from "@/components/workforce-solution-panel";
import {evidenceTrustLabel} from "@/lib/evidence-trust";
import {DecisionBrief} from "@/components/decision-brief";
import {recordDecisionEvidence} from "@/components/decision-store";
import { intelligenceEvidence, isIntelligencePage } from "@/lib/intelligence-chat";
import { developmentCatalog } from "@/lib/development-costs";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { SiteFooter } from "@/components/site-footer";
import { employeeListeningEvidence, exitSurveyEvidence } from "@/lib/employee-listening";
import { FocusedIssue } from "@/components/focused-issue";
import { buildHomePack } from "@/lib/home-pack.mjs";
import {MarketComparison,CarriedMarketReference,type MarketCarry} from "@/components/market-reference";
import {defaultMarketSelection,marketCarryEvidence} from "@/lib/oews-reference.mjs";
import { GoalTakeaway } from "@/components/goal-takeaway";
import { useGoalWorkspace } from "@/components/use-goal-workspace";
import { useProblemConversation } from "@/components/problem-conversation";
import { getProblemChatHistory, withProblemContext } from "@/lib/problem-session";
import { AppSidebar } from "@/components/app-sidebar";
import { completeScopedChatTurn } from "@/lib/chat-context-history";
import { buildAggregateExport, downloadAggregateCsv } from "@/lib/aggregate-export";
import { GlobalWorkforceFilters } from "@/components/global-workforce-filters";
import { AppHeader } from "@/components/app-header";
import { OverviewPage } from "@/components/pages/overview-page";
import { OverallOverviewPage } from "@/components/pages/overall-overview-page";
import { GuideDataPage } from "@/components/pages/guide-data-page";
import { WorkforcePage } from "@/components/pages/workforce-page";
import { AttritionPage } from "@/components/pages/attrition-page";
import { FinancePage } from "@/components/pages/finance-page";
import { IntelligencePage } from "@/components/pages/intelligence-page";
import { SkillsPage } from "@/components/pages/skills-page";
import { GuidedDemo, DEVELOPMENT_DEMO_GOAL } from "@/components/guided-demo";
import { DevelopmentCatalog, DevelopmentPlanning, emptyDevelopmentSession } from "@/components/development-workspace";
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
  const conversation = useProblemConversation();
  const [homeEvidencePacket,setHomeEvidencePacket]=useState("");
  const goalWorkspaceKeys = ["", ...conversation.goals.map(g=>g.id)].map(id=>conversation.workspaceKey.split(":")[0]+":"+id);
  const [demoActive, setDemoActive] = useState(false);
  const [developmentSession, setDevelopmentSession] = useGoalWorkspace(conversation.workspaceKey, goalWorkspaceKeys, emptyDevelopmentSession,"development");
  const [marketSelection,setMarketSelection]=useGoalWorkspace(conversation.workspaceKey,goalWorkspaceKeys,defaultMarketSelection,"marketSelection");
  const [marketCarry,setMarketCarry]=useGoalWorkspace<MarketCarry|null>(conversation.workspaceKey,goalWorkspaceKeys,emptyMarketCarry,"marketCarry");
  const [talentResponseEvidenceContext, setTalentResponseEvidenceContext] = useGoalWorkspace<string | null>(conversation.workspaceKey, goalWorkspaceKeys, emptyTalentContext,"talentContext");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [aiWidth, setAiWidth] = useState(500);

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
    talent: "occupational-references",
    strategy: "planning-overview",
    evaluate: "assess-evaluate",
  });

  const setActivePage = (page: AppPage) => { if(page !== activePage) conversation.cancelPending(); setActivePageState(page === "overview" || page === "career-mobility" ? "workforce" : page); };

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
  ] = useGoalWorkspace(conversation.workspaceKey,goalWorkspaceKeys,()=>"Baseline","selectedPlanningScenario");
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


  const { messages: chatMessages, setMessages: setChatMessages, input: chatInput, setInput: setChatInput, loading: chatLoading, setLoading: setChatLoading, error: chatError, setError: setChatError, history: modelHistoryRef } = conversation;

  const [
    planningEvidenceHandoff,
    setPlanningEvidenceHandoff,
  ] = useGoalWorkspace<PlanningEvidenceHandoff | null>(conversation.workspaceKey, goalWorkspaceKeys, emptyHandoff,"skillsHandoff");
  const {freshness:planningEvidenceFreshness,checking:planningEvidenceFreshnessChecking,refresh:refreshPlanningEvidence} =
    usePlanningEvidenceValidation(conversation.workspaceKey,planningWorkspaceActive,planningEvidenceHandoff,skillsData,setSkillsData);



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
      (activePage !== "survey-sentiment" && activePage !== "attrition") ||
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
              "Failed to load Employee Listening data."
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
            : "Failed to load Employee Listening data."
        );
      } finally {
        setSurveySentimentLoading(false);
      }
    }

    loadSurveySentiment();
  }, [activePage, surveySentimentData]);

  useEffect(() => {
    if (
      (activePage !== "skills" && activePage !== "occupational-references") ||
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
      activePage !== "labor-market" ||
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
    lastPageByWorkspaceRef.current.analytics =
      "skills";
    setActivePage("skills");
    focusAfterRender(
      "skills-evidence-handoff"
    );
  };

  const clearPlanningEvidenceHandoff = () => {
    setPlanningEvidenceHandoff(null);
    focusAfterRender(
      "workforce-planning-heading"
    );
  };

  const carryEvidenceToPlanning = (
    handoff: PlanningEvidenceHandoff
  ) => {
    setPlanningEvidenceHandoff(handoff);
    openPlanningWithHandoff();
  };

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

  const intelligencePage = activePage === "occupational-references" || activePage === "labor-market" || activePage === "training-coaching";
  const readOnlyChatPage = activePage === "guide-data" || activePage === "compensation" || activePage === "decision-brief" || activePage === "assess-evaluate";
  const readOnlyReason = readOnlyChatPage ? "AI does not analyze the local content on this page. Your earlier conversation stays available for reference." : undefined;
  const previewPage = readOnlyChatPage;

  const resetFilters = () => {
    setSelectedCountry("all");
    setSelectedOrg("all");
    setSelectedLevel("all");
  };

  const catalogueContext = activePage === "occupational-references" ? { loading: skillsLoading, unavailable: Boolean(skillsError) || !skillsData, mappedJobProfiles: skillsData?.summary.onet_mapped_job_profiles, totalJobProfiles: skillsData?.summary.total_job_profiles } : activePage === "labor-market" ? { loading: blsLoading, unavailable: Boolean(blsError) || !blsData, metrics: blsData?.metrics,marketSelection } : activePage === "training-coaching" ? { quotes: [...developmentCatalog, ...developmentSession.custom], selected: developmentSession.selected, goal: developmentSession.goal } : null;
  const chatEvidence = intelligencePage ? { page: activePage, persona: selectedPersona, intelligenceContext: catalogueContext } : overviewData ? {
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
                            "Company workforce",
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
                            "Company workforce",
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
                            "Company active workforce",
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
                            "Company recorded movement events",
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
                            "Company succession population",
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

            surveySentimentContext: activePage === "survey-sentiment" ? employeeListeningEvidence(surveySentimentData) : null,
            exitSurveyContext: activePage === "attrition" ? exitSurveyEvidence(surveySentimentData) : null,

            talentResponseEvidenceContext: planningWorkspaceActive ? talentResponseEvidenceContext : null,
            planningEvidenceHandoffContext:
              planningWorkspaceActive && planningEvidenceHandoff
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
          } : null;
  const sourceState = activePage === "workforce" ? [workforceData, workforceLoading, workforceError] : activePage === "attrition" ? [attritionData, attritionLoading, attritionError] : activePage === "skills" ? [skillsData, skillsLoading, skillsError] : activePage === "learning-development" ? [learningDevelopmentData, learningDevelopmentLoading, learningDevelopmentError] : activePage === "career-mobility" ? [careerMobilityData, careerMobilityLoading, careerMobilityError] : activePage === "career-growth-mobility" ? [careerGrowthMobilityData, careerGrowthMobilityLoading, careerGrowthMobilityError] : activePage === "succession-planning" ? [successionCoverageData, successionCoverageLoading, successionCoverageError] : activePage === "talent-acquisition" ? [talentAcquisitionData, talentAcquisitionLoading, talentAcquisitionError] : activePage === "survey-sentiment" ? [surveySentimentData, surveySentimentLoading, surveySentimentError] : activePage === "finance" ? [financeData, financeLoading, financeError] : [planningData, planningLoading || positionModelingLoading, planningError || positionModelingError];
  const chatEvidenceReady = activePage === "development-planning" ? true : intelligencePage ? true : !readOnlyChatPage && Boolean(overviewData) && !dashboardLoading && !dashboardError && !sourceState[1] && Boolean(sourceState[0]) && !sourceState[2];
  const suggestedPrompts = contextualPrompts({page:activePage,goal:conversation.focusedIssue,hasConversation:chatMessages.some(message=>message.role==="user"),evidenceReady:intelligencePage ? activePage==="occupational-references" ? !skillsLoading&&!skillsError&&Boolean(skillsData) : activePage==="labor-market" ? !blsLoading&&!blsError&&Boolean(blsData) : developmentSession.selected.length>0 : activePage==="development-planning" ? developmentSession.options.length>0 : chatEvidenceReady&&hasKnownNumericEvidence(sourceState[0])});
  const currentSource = sourceState[0];
  const sourceRecord = currentSource && typeof currentSource === "object" ? currentSource as Record<string, unknown> : null;
  const movementSource = sourceRecord?.source;
  const sourceDate = sourceRecord?.as_of ?? sourceRecord?.as_of_date ?? (movementSource && typeof movementSource === "object" && "last_recorded_date" in movementSource ? movementSource.last_recorded_date : null);
  const pageSourceDate = intelligencePage ? null : typeof sourceDate === "string" ? sourceDate : null;
  const developmentSummaryContext=buildHomePack({},"User-entered Development Planning",conversation.focusedIssue,developmentSession).sources.find(source=>source.id==="D1");
  const chatEvidenceKey = JSON.stringify(activePage==="development-planning" ? {goalId:conversation.activeGoalId,page:"development-planning",persona:selectedPersona,destination:activePage,developmentSummaryContext,pageSourceDate:null} : { goalId:conversation.activeGoalId, ...chatEvidence, destination: activePage, pageSourceDate });

  const relatedGoalEvidence = useMemo(()=>{
    if(!homeEvidencePacket)return [];
    const packet=JSON.parse(homeEvidencePacket);
    if(packet.goalKey!==conversation.workspaceKey||packet.goal!==conversation.focusedIssue)return [];
    const priority=/turnover|retention|attrition/i.test(conversation.focusedIssue)?["A1","S1","T1","T2"]:["T1","T2","A1","S1"];
    return priority.map(id=>packet.pack.sources.find((source:{id:string})=>source.id===id)).filter((source:{page:string;facts:unknown}|undefined)=>source&&source.page!==activePage&&source.facts).slice(0,3);
  },[homeEvidencePacket,conversation.workspaceKey,conversation.focusedIssue,activePage]);
  const summaryEvidenceReady = intelligencePage ? activePage!=="occupational-references"||(!skillsLoading&&Boolean(skillsData)) : chatEvidenceReady;
  const goalSummaryPayload = {...JSON.parse(chatEvidenceKey),goalEvidenceContext:relatedGoalEvidence,marketReference:marketCarry};
  const currentChatEvidenceKey = useRef(chatEvidenceKey);
  useLayoutEffect(() => { currentChatEvidenceKey.current = chatEvidenceKey; }, [chatEvidenceKey]);

  const sendChatMessage = async (
    suggestedMessage?: string
  ) => {
    const message = (
      suggestedMessage ?? chatInput
    ).trim();

    if (/^(?:please\s+|can you\s+)?(?:export|download)\b/i.test(message)) {
      const roster = /\b(names?|roster|employees? list|list of employees)\b/i.test(message);
      const csv = !roster && chatEvidenceReady ? buildAggregateExport({page:activePage,filters:JSON.stringify(selectedBusinessContext),snapshot:overviewData,trend:headcountTrend,workforce:workforceData,skills:skillsData}) : null;
      if (csv) downloadAggregateCsv(csv, activePage);
      setChatMessages(current => [...current, {role:"user",content:message},{role:"assistant",content:roster ? "Employee-name and roster exports are not available from the current public aggregate views. I have not downloaded a roster. This needs a separate source and access review." : csv ? "Downloaded the available Workforce or Skills aggregate tables as CSV, with source, scope, filters, dates and units. This contains aggregate metrics, not employee names or raw records." : "A CSV export is currently available on Workforce and Skills Intelligence after their data has loaded. This page’s data is not yet supported for export; no file was downloaded."}]);
      setChatInput("");
      return;
    }

    if (
      !message ||
      !chatEvidenceReady ||
      chatLoading
    ) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };

    const request = conversation.beginRequest();
    recordDecisionEvidence(conversation.activeGoalId,activePage,JSON.parse(chatEvidenceKey));
    const modelContextKey = chatEvidenceKey;
    const priorHistory = getProblemChatHistory(modelHistoryRef.current, modelContextKey);
    const modelHistory: ChatMessage[] = priorHistory;

    const nextMessages = [
      ...chatMessages,
      userMessage,
    ];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);
    conversation.setQuestionUnanswered(true);

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          signal: request.signal,
          body: JSON.stringify({ ...JSON.parse(chatEvidenceKey), goalContext:conversation.recordGoalStatement(message,activePage,JSON.stringify(selectedBusinessContext)),goalEvidenceContext:relatedGoalEvidence,marketReference:marketCarry, message: withProblemContext(message, conversation.problem, conversation.focusedIssue), history: modelHistory }),
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

      if (!request.current() || (intelligencePage && currentChatEvidenceKey.current !== modelContextKey)) return;
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
      conversation.rememberQuestion(modelContextKey, message); conversation.setQuestionUnanswered(false);
    } catch (error) {
      if (!request.current()) return;
      console.error(error);
      setChatInput(message);
      setChatError(
        error instanceof Error
          ? error.message
          : "AI request failed."
      );
    } finally {
      if (request.current()) setChatLoading(false);
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
      `- Annual company growth: ${assumptions.annual_growth_pct}%`,
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
      setAiWidth(500);
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
        moveEvent.clientX - startX;
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
        -step;
    } else if (
      event.key === "ArrowRight"
    ) {
      nextWidth =
        aiWidth +
        step;
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

  return (
    <PlanningSessionProvider goalKey={conversation.workspaceKey} onTalentEvidenceContextChange={setTalentResponseEvidenceContext}>
    <main className={`min-h-screen bg-background text-foreground${["home","guide-data","decision-brief","assess-evaluate"].includes(activePage) ? " app-overview-mode" : ""}`}>
      {/* Top header */}
      <AppHeader
        activePage={activePage}
        selectedPersona={selectedPersona}
        onPersonaChange={setSelectedPersona}
      ><GlobalWorkforceFilters focusedIssue={<FocusedIssue conversation={conversation} />} options={filterOptions} country={selectedCountry} org={selectedOrg} level={selectedLevel} loading={dashboardLoading} onCountry={setSelectedCountry} onOrg={setSelectedOrg} onLevel={setSelectedLevel} onReset={resetFilters} /></AppHeader>

      {/* Main application */}
      <div
        className={`app-shell app-ai-left${["home","decision-brief","assess-evaluate"].includes(activePage) ? " app-home" : ""}`}
        style={
          {
            "--nav-width": `${
              navCollapsed ? 72 : 280
            }px`,
            "--divider-width": `${
              aiCollapsed ? 0 : 6
            }px`,
            "--ai-width": aiCollapsed ? "64px" : `min(${aiWidth}px, max(280px, calc(100vw - var(--nav-width) - 486px)))`,
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
        <WorkforceSolutionPanel page={activePage} onNavigate={setActivePage}/>
        {!["home","guide-data","decision-brief","assess-evaluate","compensation"].includes(activePage)&&<p className="px-6 pt-3 text-xs text-muted-foreground" aria-label="Evidence type">{evidenceTrustLabel(activePage)}</p>}
        {demoActive && <GuidedDemo page={activePage} onNavigate={setActivePage} onClose={() => setDemoActive(false)} onUseGoal={() => setDevelopmentSession(current => ({ ...current, goal: DEVELOPMENT_DEMO_GOAL }))} hasOptions={developmentSession.options.length > 0} />}
        <div hidden={activePage !== "home"}><OverallOverviewPage marketReference={marketCarry} onEvidencePack={setHomeEvidencePacket} countryOptions={filterOptions.countries} onCountry={setSelectedCountry} developmentSession={developmentSession} conversation={conversation} onStartDemo={() => setDemoActive(true)} active={activePage === "home"} persona={selectedPersona} onNavigate={setActivePage} workforceQuery={"?" + new URLSearchParams({ country: selectedCountry, org: selectedOrg, level: selectedLevel }).toString()} workforceScope={`Selected workforce snapshot: ${selectedCountryLabel}; ${selectedOrgLabel}; ${selectedLevelLabel}`} /></div>
        {planningWorkspaceActive && marketCarry && <CarriedMarketReference carry={marketCarry} onClear={()=>setMarketCarry(null)}/>}
        {activePage === "decision-brief" ? <DecisionBrief key={conversation.workspaceKey} conversation={conversation} onNavigate={setActivePage}/> : activePage === "assess-evaluate" ? <section className="p-6"><h1 className="text-2xl font-semibold">Assess &amp; Evaluate · Coming soon</h1><p className="mt-3 text-muted-foreground">A future space to compare agreed targets with observed outcomes. No scorecard, predicted impact or ROI is calculated here.</p></section> : activePage === "guide-data" ? <GuideDataPage onBack={() => { setActivePage("home"); window.requestAnimationFrame(() => document.getElementById("overall-guide-link")?.focus()); }} /> : activePage === "home" ? null : intelligencePage ? <IntelligencePage page={activePage as "occupational-references" | "labor-market" | "training-coaching"} skills={skillsData} skillsLoading={skillsLoading} bls={blsData} blsLoading={blsLoading} blsError={blsError} market={<MarketComparison selection={marketSelection} onChange={setMarketSelection} goal={conversation.focusedIssue} onCarry={carry=>{recordDecisionEvidence(conversation.activeGoalId,"labor-market",marketCarryEvidence(carry));setMarketCarry(carry);setActivePage("planning-overview");}} />} catalog={<DevelopmentCatalog session={developmentSession} onChange={setDevelopmentSession} onOpen={() => setActivePage("development-planning")} />} /> : activePage === "compensation" ? (
          <section className="p-6"><h1 className="text-2xl font-semibold">Compensation</h1><p className="mt-4 text-lg">TBD</p><p className="mt-2 text-muted-foreground">Planned destination. Compensation data and analysis are not available.</p></section>
        ) : activePage === "development-planning" ? (
          <DevelopmentPlanning session={developmentSession} onChange={setDevelopmentSession} onCatalog={() => setActivePage("training-coaching")} />
          ) : activePage === "workforce" ? (
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
            exitData={surveySentimentData} exitLoading={surveySentimentLoading} exitError={surveySentimentError}
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
          <SkillsPage key={conversation.workspaceKey}
            skillsData={skillsData}
            skillsLoading={skillsLoading}
            skillsError={skillsError}
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
          <WorkforcePlanningPage key={conversation.workspaceKey}
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
            onRefreshEvidenceHandoff={refreshPlanningEvidence}
          />
        )}
          <SiteFooter planning={planningWorkspaceActive || activePage === "finance"} />
        </div>

        {activePage !== "home" && activePage!=="decision-brief" && activePage!=="assess-evaluate" && <AiPanel
          goalViewKey={JSON.stringify([conversation.workspaceKey,conversation.focusedIssue,activePage,selectedPersona,selectedBusinessContext])}
          hasGoal={Boolean(conversation.focusedIssue)}
          goalTakeaway={<GoalTakeaway goalId={conversation.activeGoalId} goalContext={{...conversation.goalContext,currentScope:JSON.stringify(selectedBusinessContext)}} payload={goalSummaryPayload} active={true} ready={summaryEvidenceReady} paused={chatLoading||Boolean(chatInput.trim())||Boolean(conversation.issueEditor)} validGoalIds={conversation.goals.map(g=>g.id)} unavailable={activePage==="compensation"?"Compensation evidence is not available yet. Use the supported Workforce or Planning evidence for this goal.":activePage==="guide-data"?"Use this guide to understand source coverage, then open a data page for a goal-specific takeaway.":undefined} onNavigate={setActivePage}/>}
          readOnlyReason={readOnlyReason}
          aiCollapsed={aiCollapsed}
          aiExpanded={aiExpanded}
          aiWidth={aiWidth}
          previewPage={previewPage}
          suggestedPrompts={activePage==="workforce"||activePage==="skills" ? [...suggestedPrompts.slice(0,2),"Export current data (CSV)"] : suggestedPrompts}
          scopeNote={readOnlyReason ?? (isIntelligencePage(activePage) ? `${intelligenceEvidence(activePage, catalogueContext).scope}. Workforce filters do not narrow this evidence. AI uses only this page; no external lookup.` : activePage === "workforce" ? "Selected filters narrow the workforce snapshot only; company composition stays unfiltered." : activePage==="development-planning" ? "Selected quotes and user-entered assumptions; modeled costs, not approved budgets or measured outcomes. Missing costs stay unknown." : planningWorkspaceActive ? "Filters describe workforce context. Planning scenarios and carried evidence keep their own scope, dates and assumptions." : "This page uses company-wide evidence. The shared workforce filters do not narrow these measures.")}
          chatMessages={chatMessages}
          chatInput={chatInput}
          chatLoading={chatLoading}
          chatError={chatError}
          dashboardReady={chatEvidenceReady}
          onResizeStart={startAiResize}
          onResizeKeyDown={resizeAiWithKeyboard}
          onToggleExpanded={toggleAiExpanded}
          onToggleCollapsed={() =>
            setAiCollapsed(!aiCollapsed)
          }
          onChatInputChange={setChatInput}
          onDraftExample={conversation.draftExample}
          onSend={() => sendChatMessage()}
        />}
      </div>
    </main>
    </PlanningSessionProvider>
  );
}

function emptyTalentContext(): string | null { return null; }
function emptyHandoff(): PlanningEvidenceHandoff | null { return null; }

function emptyMarketCarry():MarketCarry|null {return null;}
