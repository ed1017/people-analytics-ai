import { CalendarDays, LayoutDashboard, ShieldCheck, TrendingUp, Users } from "lucide-react";

export type WorkforcePlanningWorkflowView =
  | "overview"
  | "plan"
  | "design"
  | "respond"
  | "execute";

type WorkflowNavigationProps = {
  activeView: WorkforcePlanningWorkflowView;
  onViewChange: (
    view: WorkforcePlanningWorkflowView
  ) => void;
  planReady: boolean;
  designReady: boolean;
  respondReady: boolean;
  executeReady: boolean;
};

const steps: Array<{
  key: WorkforcePlanningWorkflowView;
  step: string;
  title: string;
  description: string;
}> = [
  {
    key: "overview",
    step: "Overview",
    title: "Planning Overview",
    description: "What is the current plan and where does it need attention?",
  },
  {
    key: "plan",
    step: "1",
    title: "Scenario Modeling",
    description: "What workforce do we need?",
  },
  {
    key: "design",
    step: "2",
    title: "Position & Workforce Design",
    description: "What positions should change?",
  },
  {
    key: "respond",
    step: "3",
    title: "Workforce Response",
    description: "How do we close the gaps?",
  },
  {
    key: "execute",
    step: "4",
    title: "Execution & Feasibility",
    description: "Can we actually deliver it?",
  },
];

export function WorkforcePlanningWorkflowNavigation({
  activeView,
  onViewChange,
  planReady,
  designReady,
  respondReady,
  executeReady,
}: WorkflowNavigationProps) {
  const readiness = {
    overview: true,
    plan: planReady,
    design: designReady,
    respond: respondReady,
    execute: executeReady,
  };

  return (
    <>
      <nav aria-label="Planning destination cards" className="mb-4 flex flex-wrap gap-2">
        {steps.map((item, index) => {
          const Icon = [LayoutDashboard, CalendarDays, Users, TrendingUp, ShieldCheck][index];
          const active = activeView === item.key;
          return <button key={item.key} type="button" aria-label={`Open ${item.title}`} aria-current={active ? "page" : undefined}
            onClick={() => onViewChange(item.key)}
            className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md border p-2 text-center text-xs font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-foreground text-background" : "bg-card hover:bg-muted"}`}>
            <Icon size={20} aria-hidden="true" /><span>{item.title}</span>
          </button>;
        })}
      </nav>
      <div aria-label="Planning destination tabs" role="navigation" className="mb-6 rounded-lg border p-3">
        <div className="grid gap-2">
          {steps.map((item) => {
            const active =
              activeView === item.key;
            const ready =
              readiness[item.key];

            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() =>
                  onViewChange(item.key)
                }
                className={
                  active
                    ? "rounded-md border bg-foreground p-3 text-left text-background transition-colors"
                    : "rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                    {item.key === "overview" ? item.step : "Step " + item.step}
                  </span>
                  <span
                    className={
                      active
                        ? "text-[10px] opacity-80"
                        : "text-[10px] text-muted-foreground"
                    }
                  >
                    {ready
                      ? "Ready"
                      : "In progress"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold">
                  {item.title}
                </p>
                <p
                  className={
                    active
                      ? "mt-1 text-[11px] opacity-80"
                      : "mt-1 text-[11px] text-muted-foreground"
                  }
                >
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 rounded-md border bg-muted/20 p-3 text-sm">
        {activeView === "overview"
          ? "Use this as the control room for the current workforce plan: see the biggest changes, approved response, execution risk, and current feasibility before drilling into the workflow."
          : activeView === "plan"
            ? "Start with the business question: what workforce do we expect to need, and how does that compare with Baseline?"
            : activeView === "design"
              ? "Now turn the workforce scenario into actual position changes: add, close, freeze, or fill roles."
              : activeView === "respond"
                ? "Once the role gaps are clear, decide how much to Build internally, Move from inside the company, or Buy through external hiring."
                : "Last step: put the approved response on a timeline, auto-schedule around constraints, and check whether the plan is actually executable."}
      </div>
    </>
  );
}

