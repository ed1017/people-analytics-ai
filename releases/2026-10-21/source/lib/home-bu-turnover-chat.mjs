import {PUBLIC_9037 as P} from './public-9037-contract.mjs';

const topic=/\b(?:turnover|attrition)\b/;
const group=/\b(?:business[ -]units?|bus?)\b/;
const explicitPeriod=/\b(?:20\d{2}|last year|previous year|annual|annualized|monthly|january|february|march|april|may|june|july|august|september|october|november|december)\b/;
const continuation=/^(?:and\b|also\b|what about\b|how about\b|break (?:it|that) down\b)|\b(?:same (?:year|period)|that (?:year|period)|those months)\b/;
const year=P.cutoff.slice(0,4),endMonth=new Date(P.cutoff+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',timeZone:'UTC'}).toLowerCase();
const currentWindows=[new RegExp('\\b'+year+' (?:ytd|year-to-date)\\b','g'),new RegExp('\\b(?:ytd|year-to-date)(?: for| in)? '+year+'\\b','g'),new RegExp('\\b(?:january|jan) ?(?:-|to|through) ?(?:'+endMonth+'|'+endMonth.slice(0,3)+') '+year+'\\b','g'),new RegExp('\\bas of '+P.cutoff+'\\b','g'),new RegExp('\\bas of (?:'+endMonth+'|'+endMonth.slice(0,3)+') '+Number(P.cutoff.slice(8,10))+',? '+year+'\\b','g')];
const normalizeWindow=text=>currentWindows.reduce((value,pattern)=>value.replace(pattern,'current'),text);
const advice='What to investigate\n- Check the period, exit classification, group size and average-headcount denominator.\n- Compare roles, locations and tenure; review exit feedback, workload, career opportunities and pay as possible drivers.\n- Validate the strongest explanation with the HR leader before choosing an action and a follow-up measure.';

/** Current BU comparisons have a separate evidence contract from monthly company rates.
 * A complete new question starts a new selection; explicit/elliptical continuations
 * retain the previous requested period instead of silently changing it to current. */
export function businessUnitTurnoverIntent(question,turns=[]){
 if(typeof question!=='string'||question.length>1200)return null;
 let text=question.toLowerCase().replace(/[\u2010-\u2014]/g,'-').replace(/\s+/g,' ').trim();
 const lastAnswer=turns.at(-1)?.role==='assistant'&&typeof turns.at(-1).text==='string'?turns.at(-1).text:'';
 const offered=lastAnswer.match(/^Business-unit (total|voluntary) turnover is available for January-September 2026 \(as of 2026-09-30\)\. .*Would you like the available YTD comparison\?$/);
 if(offered&&/^(?:yes|yes please|show it|show the available ytd comparison|show the latest instead)[.!?]?$/.test(text))text=`show latest ${offered[1]} turnover by business unit`;
 const priorComparison=lastAnswer.includes('Recorded as of '+P.cutoff)&&/\b(?:Total|Voluntary) YTD turnover\b/.test(lastAnswer);
 if(priorComparison&&/^(?:what (?:is|are) (?:driving it|the (?:key )?drivers)|why is that|what should we investigate)[.!?]?$/.test(text))text=`show ${lastAnswer.includes('Voluntary YTD turnover')?'voluntary':'total'} turnover by business unit and what are possible drivers`;
 text=normalizeWindow(text);
 if(!group.test(text))return null;
 const previous=[...turns].reverse().find(t=>t.role==='user'&&typeof t.text==='string')?.text.toLowerCase()??'';
 const follows=continuation.test(text)||!topic.test(text);
 if(!topic.test(text)&&!topic.test(previous)&&!offered)return null;
 const latest=/\b(?:latest|current|ytd|year-to-date)\b/.test(text);
 const inherited=follows&&!latest&&topic.test(previous)?normalizeWindow(previous):'';
 const measure=/\bvoluntary\b/.test(text)?'voluntary':/\b(?:total|overall)\b/.test(text)?'total':inherited&&/\bvoluntary\b/.test(inherited)||offered?.[1]==='voluntary'&&follows&&!latest?'voluntary':'total';
 const guidance=/\b(?:drivers?|why|causes?|causing|investigat\w*|checks?|review|examine|look into|consider)\b/.test(text);
 const unsupportedMeasure=/\b(?:involuntary|regrettable|retirement|annualized)\b/.test(text)||/\bvoluntary\b/.test(text)&&/\b(?:total|overall)\b/.test(text);
 // Only generic driver/check requests are answered here. Qualified hypotheses,
 // extra dimensions and new planning work remain in the richer conversation.
 const remainderFor=value=>value.replace(/\b20\d{2}\b/g,'').replace(/\b(?:which|what|where|why|how|is|are|was|were|has|have|had|the|our|a|an|company|company-wide|all|business|units?|bus?|with|show|me|tell|please|recorded|current|latest|available|highest|lowest|most|least|voluntary|involuntary|regrettable|retirement|total|overall|turnover|attrition|rates?|ytd|year-to-date|by|across|compare|comparison|breakdown|break|it|that|down|and|also|then|about|for|in|during|last|previous|year|annual|annualized|monthly|same|period|those|months|january|february|march|april|may|june|july|august|september|october|november|december|drivers?|key|main|possible|potential|causes?|causing|should|could|would|can|we|i|hr|human|resources|leaders?|managers?|investigate|investigation|checks?|review|examine|look|into|consider|before|acting|taking|action|making|decisions?|first|general|suggested)\b/g,'').replace(/[\s,.!:?;-]/g,'');
 if(remainderFor(text))return null;
 const periodText=explicitPeriod.test(text)?text:offered&&follows&&!latest?'previously requested period':explicitPeriod.test(inherited)?inherited:'';
 const ambiguous=follows&&!latest&&!offered&&(!topic.test(previous)||!!remainderFor(inherited));
 return {measure,guidance,unsupportedMeasure,periodText,ambiguous,comparison:{registryId:'attrition.business_units',metric:measure==='voluntary'?'voluntary_turnover_ytd_pct':'total_turnover_ytd_pct',order:/\b(?:lowest|least)\b/.test(text)?'ascending':'descending',limit:/\b(?:highest|lowest|most|least)\b/.test(text)?1:20,scope:'company-wide',asOf:'current'}};
}

export async function businessUnitTurnoverReply(question,turns,readQuestions,signal){
 const intent=businessUnitTurnoverIntent(question,turns);if(!intent)return null;
 signal.throwIfAborted();
 if(intent.unsupportedMeasure)return {answer:'Choose total or voluntary YTD turnover for the business-unit comparison.',charts:[]};
 if(intent.periodText||intent.ambiguous){
  const previousYear=/\b(?:last|previous) year\b/.test(intent.periodText),years=intent.periodText.match(/\b20\d{2}\b/g);
  const requested=previousYear?'the previous calendar year':years?.length?years.join(' and '):intent.periodText?'that requested period':'the previous period';
  return {answer:`Business-unit ${intent.measure} turnover is available for January-September 2026 (as of ${P.cutoff}). ${intent.ambiguous?'Do you mean this YTD comparison or the previous period?':`The breakdown for ${requested} is unavailable. Would you like the available YTD comparison?`}`,charts:[]};
 }
 const result=await readQuestions({parts:[{kind:'comparison',history:null,comparison:intent.comparison}]},signal);
 signal.throwIfAborted();
 if(typeof result?.answer!=='string'||!result.answer.trim()||result.answer.length>8000)throw Error('Turnover comparison unavailable.');
 return {...result,answer:result.answer+(intent.guidance?'\n\n'+advice:'')};
}
