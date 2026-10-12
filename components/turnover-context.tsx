import {companyTurnoverText,turnoverMetrics,turnoverContextLimit,isTurnoverGoal,type CompanyTurnoverContext} from '@/lib/home-turnover-context';
export function TurnoverContext({goal,context,detailsOnly=false}:{goal:string;context?:CompanyTurnoverContext;detailsOnly?:boolean}){
 if(!isTurnoverGoal(goal))return null;
 return <section aria-label="Company turnover context" className="space-y-1 text-sm">
  {!detailsOnly&&<p>{companyTurnoverText(goal,context)}</p>}
  <details><summary className="min-h-11 cursor-pointer py-2">Company metric definitions and limits</summary>
   <ul className="list-disc pl-5">{Object.entries(turnoverMetrics).map(([key,label])=><li key={key}>{label}: {context?.[key as keyof typeof turnoverMetrics]??'Unknown'}{context?.[key as keyof typeof turnoverMetrics]!=null?'%':''}</li>)}</ul>
   <p>Source as of: {context?.asOf??'Unknown'}. {turnoverContextLimit}</p>
   <p>Plan baseline and target require their own population and comparable observation periods. This context supplies neither pilot observations nor evidence of effectiveness.</p>
  </details>
 </section>;
}
