import type {Assumption} from './home-bundle-reconciliation';
const unknown=():Assumption<number>=>({value:null,kind:'unknown',basis:null});
const entered=(value:number,basis:string):Assumption<number>=>({value,kind:'user-entered',basis});
/** Bounded text extraction, never a substitute for a reviewed staffing schedule. */
export function capacityGoalAssumptions(goal:string){
 const added=[...goal.matchAll(/\badd\s+(\d+(?:\.\d+)?)\s+(?:[a-z-]+\s+){0,6}(?:roles?|positions?|FTEs?)\b/gi)];
 const rolePhrases=added.length?added:[...goal.matchAll(/\b(\d+(?:\.\d+)?)\s+additional\s+(?:[a-z-]+\s+){0,5}(?:roles?|positions?|FTEs?)\b/gi)];
 const explicitRole=rolePhrases.length>0||/\badd\s+\d/i.test(goal);
 const counts=rolePhrases.map(match=>Number(match[1]));
 const target=counts.length===1&&Number.isInteger(counts[0])&&counts[0]<=1000&&!/\b\d+(?:\.\d+)?\s*(?:–|-|to|or)\s*\d+\b/i.test(goal)?entered(counts[0],'Explicit additional-role target in the pinned goal; availability is not established.'):unknown();
 const foreign=/[€£¥₹₩₽]|\b(?:CAD|AUD|NZD|SGD|HKD|EUR|GBP|JPY|CNY|INR|CHF|SEK|NOK|DKK|BRL|MXN|ZAR|AED|SAR|KRW|RUB)\b|\b(?:Canadian|Australian|New Zealand|Singapore|Hong Kong) dollars?\b/i.test(goal);
 const costs=[...goal.matchAll(/(?:USD\s*\$?\s*|\$\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s+per role per month\b/gi)];
 const explicitCost=foreign||/\$|\b(?:USD|salary|salaries|payroll|cost|pay|paid|unknown|unpriced|TBD)\b/i.test(goal);
 const amount=costs.length===1?Number(costs[0][1].replaceAll(',','')):null;
 const unitCost=!foreign&&amount!==null&&amount<=1000000?entered(amount,'Explicit USD cash cost per new hire per month; not a verified salary or vendor quote.'):unknown();
 const needsSchedule=/\b(?:part[- ]time|FTEs?|internal|redeploy\w*|upskill\w*|reskill\w*|build|move|develop\w*|stagger\w*|phased)\b|\b(?:starting|arriving|joining|from)\s+(?:\d|January|February|March|April|May|June|July|August|September|October|November|December)|\b(?:after|last|first)\s+\d+\s+months?\b|\b\d+(?:\.\d+)?\s*(?:%|hours?\s+per\s+week)/i.test(goal);
 return {explicitRole,target,explicitCost,unitCost,capacityBasis:needsSchedule?'needs-staffing-schedule' as const:'full-period-hire' as const};
}
