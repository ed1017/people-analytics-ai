export type HomeForecastDomain = 'turnover'|'hiring'|'satisfaction';
/** Only the current explicit question routes; saved goals and prior turns are not forecast requests. */
export function homeForecastIntent(message:string) {
 const question=message.split(/\n\n(?:Focused issue|Session problem context)/)[0].trim();
 if(!question||question.length>6000||/\b(?:do not|don't|never|no need to)\s+(?:forecast|predict|project)\b/i.test(question))return null;
 const explicit=/\b(?:forecasts?|forecasting|predict|predicting|predictions?|predictive|projections?)\b/i.test(question);
 const future=/\b(?:what|how many|how much|will)\b.*\b(?:will|expected|expect|year.?end|next|future)\b/i.test(question);
 if(!explicit&&!future)return null;
 const domains:HomeForecastDomain[]=[];
 if(/\b(?:turnover|attrition|exits?|resignations?|retention)\b/i.test(question))domains.push('turnover');
 if(/\b(?:hiring|hires?|recruiting|recruitment|talent acquisition|requisitions?|opening.cohort)\b/i.test(question))domains.push('hiring');
 if(/\b(?:satisfaction|satisfied|sentiment|engagement|survey|employee listening)\b/i.test(question))domains.push('satisfaction');
 if(!explicit&&!domains.length)return null;
 if(!domains.length&&/\b(?:all three|all 3|across domains|cross.domain)\b/i.test(question))domains.push('turnover','hiring','satisfaction');
 return {question,domains};
}
