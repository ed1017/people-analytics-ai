
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
  label: string;
  description: string;
}> = [
  {
    key: "overview",
    step: "Overview",
    title: "Planning Overview",
    label: "Overview",
    description: "What is the current plan and where does it need attention?",
  },
  {
    key: "plan",
    step: "1",
    title: "Scenario Modeling",
    label: "Scenarios",
    description: "What workforce do we need?",
  },
  {
    key: "design",
    step: "2",
    title: "Position & Workforce Design",
    label: "Design",
    description: "What positions should change?",
  },
  {
    key: "respond",
    step: "3",
    title: "Workforce Response",
    label: "Response",
    description: "How do we close the gaps?",
  },
  {
    key: "execute",
    step: "4",
    title: "Execution & Feasibility",
    label: "Execution",
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
    <nav aria-label="Planning sections" className="mb-4 flex flex-wrap gap-1 border-b pb-2">
      {steps.map((item) => {
        const active = activeView === item.key;
        return <button key={item.key} type="button" aria-label={`Open ${item.title}`} aria-current={active ? "page" : undefined}
          title={`${item.description} ${readiness[item.key] ? "Ready" : "Not run yet"}`}
          onClick={() => onViewChange(item.key)}
          className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-foreground text-background" : "bg-card hover:bg-muted"}`}>
          <span>{item.label}</span>
        </button>;
      })}
    </nav>
  );
}
