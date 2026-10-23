import type {SolutionState} from './home-solution-conversation';

/** Presentation only: current clarification topics select fixed aggregate-safe hints. */
export function homeNextDetails(state:SolutionState, questions:readonly string[], furtherReading:string, current:boolean):string[]{
 if(!current)return [];
 const staffing=state.currentCalculationKinds?.includes('required-staffing')?state.requiredStaffing?.inputs:null;
 const hiring=state.currentCalculationKinds?.includes('hiring')?state.hiringBudget?.inputs:null;
 const supplied=(value:unknown)=>value!==null&&value!==undefined&&value!=='';
 const constraint=(field:string)=>state.constraints.some(c=>c.field===field&&c.action==='set'&&(supplied(c.number)||supplied(c.text)));
 const topics=[
  // Mentioning additional capacity in a timing/cost question is not a request
  // to clarify population. Require an explicit contrast or a polar question.
  {pattern:/^(?=.*\b(?:FTEs?|capacity)\b)(?:.*\b(?:additional(?:\s+(?:FTEs?|capacity))?\s+(?:or|versus|vs\.?|rather than|instead of)\s+(?:the\s+)?total|total(?:\s+(?:FTEs?|capacity))?\s+(?:or|versus|vs\.?|rather than|instead of)\s+(?:the\s+)?additional)\b|^\s*(?:[-*]\s*)?(?:is|are|whether)\s+(?:(?:this|that|these|those|it|the|your|our)\s+)?(?:\d+(?:\.\d+)?\s+)?(?:(?:additional|total)\s+(?:FTEs?|capacity)\b|(?:FTEs?|capacity)\s+(?:additional|total)\b)\s*\??\s*$)/i,known:constraint('population'),hint:'Whether the FTE requirement is additional capacity or the total needed.'},
  {pattern:/\b(readiness|ready|arrival|deadline|when|timeframe|time frame)\b/i,known:supplied(hiring?.arrivalDate)||supplied(state.staffingDeliveryTarget?.months),hint:'When the capacity needs to be ready.'},
  {pattern:/\bbudget\b/i,known:supplied(staffing?.budget)||supplied(hiring?.budget)||constraint('budget_usd'),hint:'The available budget and currency for this scenario.'},
  {pattern:/\b(role|job title)\b/i,known:supplied(staffing?.role)||supplied(hiring?.role),hint:'The role or type of work to cover.'},
  {pattern:/\blocation\b/i,known:supplied(hiring?.location),hint:'The work location or country.'},
  {pattern:/\b(cost horizon|duration)\b/i,known:supplied(staffing?.months)||supplied(hiring?.months)||constraint('horizon_months'),hint:'The period the scenario budget should cover.'},
  {pattern:/\b(internal capacity|internal staff|internal people|internal talent|release)\b/i,known:supplied(staffing?.trainablePeople)&&supplied(staffing?.redeployablePeople)&&supplied(staffing?.internalRelease),hint:'Aggregate internal capacity available for moves or development, and whether it can be released.'},
 ];
 const currentQuestions=[...questions,...furtherReading.split(/\n+/).filter(s=>s.trim().endsWith('?'))];
 // Never render raw generated requests here: fixed topic hints cannot solicit
 // individual records, identifiers, salaries or other sensitive personal data.
 return topics.filter(t=>!t.known&&currentQuestions.some(q=>t.pattern.test(q))).slice(0,3).map(t=>t.hint);
}
