export type WorkforcePlanningWorkflowView =
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
    key: "plan",
    step: "1",
    title: "Plan",
    description: "What workforce do we need?",
  },
  {
    key: "design",
    step: "2",
    title: "Design",
    description: "What positions should change?",
  },
  {
    key: "respond",
    step: "3",
    title: "Respond",
    description: "How do we close the gaps?",
  },
  {
    key: "execute",
    step: "4",
    title: "Execute",
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
    plan: planReady,
    design: designReady,
    respond: respondReady,
    execute: executeReady,
  };

  return (
    <>
      <div className="mb-6 rounded-lg border p-3">
        <div className="grid gap-2 md:grid-cols-4">
          {steps.map((item) => {
            const active =
              activeView === item.key;
            const ready =
              readiness[item.key];

            return (
              <button
                key={item.key}
                type="button"
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
                    Step {item.step}
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
        {activeView === "plan"
          ? "Start with the business question: what workforce do we expect to need, and how does that compare with Baseline?"
          : activeView === "design"
            ? "Now turn the workforce scenario into actual position changes — add, close, freeze, or fill roles."
            : activeView === "respond"
              ? "Once the role gaps are clear, decide how much to Build internally, Move from inside the company, or Buy through external hiring."
              : "Last step: put the approved response on a timeline, auto-schedule around constraints, and check whether the plan is actually executable."}
      </div>
    </>
  );
}
