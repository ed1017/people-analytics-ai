// @ts-expect-error Native fixtures share source.
import {normalizeHomeQuestion} from './home-question-text.ts';
/** Recognize a bounded calendar-year question, without inferring a population. */
export function annualTurnoverSelection(question:string):{year:number|'last';metric:'total'|'voluntary'}|null {
 const text=normalizeHomeQuestion(question);
 if(!/\b(?:turnover|attrition)\b/.test(text)||/\b(?:monthly|annualized|annualised|ytd|year.to.date)\b/.test(text))return null;
 if(/\bvoluntary\b/.test(text)&&/\b(?:total|overall)\b/.test(text))return null;
 const relative=/\b(?:last|previous)\s+(?:calendar\s+)?year\b/.test(text);
 const years=[...text.matchAll(/\b20\d{2}\b/g)].map(m=>Number(m[0]));
 if(relative&&years.length||!relative&&years.length!==1)return null;
 const rest=text.replace(/\b20\d{2}\b/g,' ').replace(/\b(?:what|whats|was|were|is|the|our|company|companywide|company.wide|whole|all|show|me|tell|please|for|in|during|over|turnover|attrition|rate|rates|total|overall|voluntary|annual|yearly|full|calendar|last|previous|year)\b/g,' ').replace(/[\s.,?!:;()\u2013\u2014-]/g,'');
 if(rest)return null;
 return {year:relative?'last':years[0],metric:/\bvoluntary\b/.test(text)?'voluntary':'total'};
}
