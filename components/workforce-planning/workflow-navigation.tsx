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
    <nav aria-label="Planning destination cards" className="mb-6 grid grid-cols-2 gap-2 xl:grid-cols-5">
      {steps.map((item, index) => {
        const Icon = [LayoutDashboard, CalendarDays, Users, TrendingUp, ShieldCheck][index];
        const active = activeView === item.key;
        return <button key={item.key} type="button" aria-label={`Open ${item.title}`} aria-current={active ? "page" : undefined}
          title={`${item.description} ${readiness[item.key] ? "Ready" : "Not run yet"}`}
          onClick={() => onViewChange(item.key)}
          className={`flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-2 py-3 text-center text-xs font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-secondary text-[#45D6B0]" : "bg-card hover:bg-muted"}`}>
          <Icon size={18} aria-hidden="true" /><span>{item.title}</span>
        </button>;
      })}
    </nav>
  );
}
