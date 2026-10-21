
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
    <nav aria-label="Planning sections" className="flex flex-wrap items-start gap-2">
      {activeView!=='overview'&&activeView!=='plan'&&<button type="button" aria-label="Open Planning workspace" onClick={()=>onViewChange('overview')} className="min-h-11 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background focus-visible:ring-2 focus-visible:ring-ring">Planning</button>}
      <details className="rounded-md px-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Advanced tools</summary>
        <div className="flex flex-wrap gap-1 pb-2">{steps.filter(item=>item.key!=='overview').map(item=><button key={item.key} type="button" aria-label={`Open ${item.key==='plan'?'Stored scenario tools':item.title}`} aria-current={activeView===item.key?'page':undefined} title={`${item.description} ${readiness[item.key]?'Ready':'Not run yet'}`} onClick={()=>onViewChange(item.key)} className="min-h-11 rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{item.key==='plan'?'Stored scenario tools':item.label}</button>)}</div>
      </details>
    </nav>
  );
}
