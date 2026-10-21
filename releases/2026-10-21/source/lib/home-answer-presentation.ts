// Exact app-authored boilerplate only. Arbitrary model prose, missing requested
// measures, numbers and source qualifiers must not be classified by keywords.
const explanations=new Map([
 ['**SIMULATED DEMO — fixed simulated company-wide population.** These precomputed results are separate from recorded workforce data, dashboard filters and your goal. They cannot supply a filtered planning baseline, avoided exits, capacity, savings, ROI or an intervention effect.','**SIMULATED DEMO — fixed simulated company-wide population.** Goal and workforce filters do not apply; planning baselines and intervention effects are unavailable.'],
 ['All three methods are shown; none is selected as best. Results are scenario-dependent and miss unannounced reversals. Confidence intervals and operational forecasts are unavailable; method differences are not uncertainty bands.','Methods unranked; confidence intervals and operational forecasts unavailable.'],
 ['All openings are included, including cancellation, no-show and unresolved outcomes. November and December follow-up extends into 2027. No future opening counts are assumed.','Future opening counts unknown; Nov–Dec follow-up extends into 2027.'],
 ['December is one quarterly wave, not monthly interpolation or a percentage of satisfied employees. It assumes unchanged instrument, items, scoring, eligibility and population; response coverage is not representativeness.','One December quarterly wave; representativeness unverified.'],
]);
/** Collapse repeated explanation, retaining short decision-critical limits. */
export function homeAnswerPresentation(content:string) {
 const details:string[]=[],lines=content.split('\n');
 const answer=lines.flatMap(line=>{
  const brief=explanations.get(line.trim());
  if(brief){if(!details.includes(line.trim()))details.push(line.trim());return [brief];}
  const match=line.match(/^\s*[-*]\s+((?:The )?available evidence does not provide (.+?), so stronger retention conclusions are unavailable\.\s*(?:\[S2\])?)\s*$/i);
  if(!match)return [line];
  const fields=match[2].toLowerCase().split(/,\s*(?:or\s+|and\s+)?|\s+(?:or|and)\s+/).map(field=>field.trim());
  const known=new Set(['respondent-level detail','subgroup breakdowns','a fieldwork period','a comparison with non-exiting employees']);
  if(fields.length<3||!fields.every(field=>known.has(field)))return [line];
  if(!details.includes(match[1]))details.push(match[1]);
  return [];
 }).join('\n');
 return answer.trim()?{answer,details}:{answer:content,details:[]};
}
