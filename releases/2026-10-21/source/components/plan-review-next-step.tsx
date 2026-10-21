export function PlanReviewNextStep({goal}:{goal:string}){
 return <div className="space-y-1 text-base"><p><strong>Before starting:</strong> Confirm owner, baseline, target and review date.</p>{/turnover|retention|retain|exits/i.test(goal)&&<details><summary className="min-h-11 cursor-pointer py-2">Pilot check-in</summary><p>Review pilot participation and workload alongside turnover, against the agreed baseline and target.</p></details>}</div>;
}
