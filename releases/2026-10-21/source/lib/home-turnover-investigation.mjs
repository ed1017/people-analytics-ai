/** A ranking plus a request for investigation checks, not a causal diagnosis.
 * Other factual, planning and exploratory questions retain their existing route. */
export function turnoverInvestigationSelection(question){
 if(typeof question!=='string'||question.length>1200)return null;
 const text=question.toLowerCase().replace(/[\u2010-\u2014]/g,'-');
 const clauses=text.split(/\s*(?:[?;]|,?\s+\b(?:and|also|then)\b)\s*/).filter(Boolean);
 if(clauses.length!==2)return null;
 const ranking=clauses[0],checks=clauses[1];
 if(!/\b(?:business[ -]units?|bus?)\b/.test(ranking)||! /\b(?:turnover|attrition)\b/.test(ranking)||! /\b(?:highest|lowest|most|least)\b/.test(ranking)||! /\b(?:investigat\w*|checks?|review|examine|look into|consider)\b/.test(checks))return null;
 if(/\b(?:implement|create|build|recommend|propose|forecast|predict)\b/.test(checks))return null;
 // Only a generic request for checks can use the fixed guidance. A named
 // subgroup, date, metric or causal proposition must retain ordinary routing;
 // answering just its ranking would silently discard the second intent.
 const checkRemainder=checks.replace(/\b(?:what|which|should|could|would|can|an?|the|we|i|our|hr|human|resources|leaders?|managers?|investigate|investigation|checks?|review|examine|look|into|consider|before|acting|taking|action|making|decisions?|first|please|general|suggested)\b/g,'').replace(/[\s,.!:?-]/g,'');
 if(!/^(?:what|which)\b/.test(checks)||checkRemainder)return null;
 // A restricted ranking vocabulary prevents silently dropping a requested
 // country, historical date, department, unsupported measure or extra metric.
 const remainder=ranking.replace(/\b(?:which|what|where|is|are|has|have|had|the|our|company|company-wide|all|business|units?|bus?|with|show|me|tell|please|recorded|current|latest|available|highest|lowest|most|least|voluntary|total|overall|turnover|attrition|rates?|ytd|year-to-date)\b/g,'').replace(/[\s,.:!-]/g,'');
 const high=/\b(?:highest|most)\b/.test(ranking),low=/\b(?:lowest|least)\b/.test(ranking);
 if(remainder||high===low||/\bvoluntary\b/.test(ranking)&&/\b(?:total|overall)\b/.test(ranking))return {unsupported:true};
 return {registryId:'attrition.business_units',metric:/\bvoluntary\b/.test(ranking)?'voluntary_turnover_ytd_pct':'total_turnover_ytd_pct',order:low?'ascending':'descending',limit:1,scope:'company-wide',asOf:'current'};
}

const checks='Suggested investigation checks — general guidance, not findings about this business unit or proof of a cause:\n\n- Confirm the exit classification, observation period, average-headcount denominator, missing records and group sizes before comparing rates.\n- Check whether the difference persists over comparable periods and within comparable roles, tenure and locations; a group ranking alone cannot explain individual departures.\n- Review appropriately aggregated exit feedback, workload, management practices, career opportunities and pay context as hypotheses to investigate, with privacy safeguards. Do not assume any factor caused the rate.\n- Triangulate employee feedback and operational context before selecting an action; define a baseline and follow-up measure rather than promising a retention effect.';

export async function turnoverInvestigationReply(question,readQuestions,signal){
 const selection=turnoverInvestigationSelection(question);
 if(!selection)return null;
 signal.throwIfAborted();
 const result=selection.unsupported?{answer:'The requested ranking scope, measure or period is not supported by this current company-wide business-unit comparison. No current ranking has been substituted. Specify total or voluntary YTD turnover across all business units for the latest recorded snapshot.',charts:[]}:
  await readQuestions({parts:[{kind:'comparison',history:null,comparison:selection}]},signal);
 signal.throwIfAborted();
 if(typeof result?.answer!=='string'||!result.answer.trim()||result.answer.length>8000)throw Error('Turnover comparison unavailable.');
 return {...result,answer:result.answer+'\n\n'+checks};
}
