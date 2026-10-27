// @ts-expect-error Native fixtures share source.
import {normalizeHomeQuestion} from './home-question-text.ts';
import {acceptsGroundedAggregate,isPublicHomeReceiptCandidate} from './public-home-receipt.mjs';
import {normalizeHomePack} from './home-pack.mjs';
import type {SolutionRequest, SolutionState} from './home-solution-conversation';
// @ts-expect-error Native Node tests share application source.
import {annualTurnoverSelection} from './home-turnover-year.ts';

type Metric='total'|'voluntary';
type Period='monthly'|'ytd'|'annualized';
type Selection={metric:Metric;period:Period;months:string[]};
type Grounding={datasetToken:string;packetSha256:string;sources:{id:string;status:string;scope:string;asOf:string|null;basis:string}[]};
type Context=Selection&{annualYear?:number;version:1;datasetToken:string;scope:string;filters:string;answerId:string};
type TurnoverState=SolutionState&{turnoverChat?:Context};
type Intent={kind:'selected';selection:Selection}|{kind:'annual';selection:{year:number|'last';metric:Metric}}|{kind:'clarify'|'unsupported';answer:string}|{kind:'other'};
const monthNames=['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthPattern=/\b(20\d{2})-(0[1-9]|1[0-2])(?:-01)?\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b(?:\s+(20\d{2}))?/g;
const topic=/\b(?:turnover|attrition)\b/i;
const rate=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const filters=(r:Pick<SolutionRequest,'filters'>)=>JSON.stringify([r.filters.country,r.filters.org,r.filters.level]);
const answerId=(r:SolutionRequest)=>'reply-'+r.requestId.slice(0,70);
const selectionRemainder=(text:string)=>text.replace(monthPattern,' ').replace(/\b(?:year.to.date|company.wide|whole company|all company)\b/g,' ').replace(/\b(?:whats|what|was|were|is|are|how|does|do|the|our|company|we|us|looking|look|like|doing|show|me|tell|about|and|or|please|just|only|now|instead|actually|make|it|for|in|over|turnover|attrition|rate|rates|trend|trends|monthly|voluntary|total|overall|ytd|annual|yearly|annualized|annualised|latest|available|recorded|periods|months|versus|vs|compare|with|to|through)\b/g,' ').replace(/[\s.,?!:;%()\u2013\u2014-]/g,'');

/** Selection only, never stored evidence. Unknown/old contexts cannot authorize a follow-up. */
function previousSelection(request:SolutionRequest,grounding:Grounding|undefined):Selection|undefined {
 const c=(request.state as TurnoverState).turnoverChat;
 if(!c||c.annualYear!==undefined||c.version!==1||!grounding||c.datasetToken!==grounding.datasetToken||c.scope!==request.scope||c.filters!==filters(request)||c.answerId!==request.state.turns.at(-1)?.id||request.state.turns.at(-1)?.role!=='assistant'||!['total','voluntary'].includes(c.metric)||!['monthly','ytd','annualized'].includes(c.period)||!Array.isArray(c.months)||c.months.length>3||c.months.some(m=>typeof m!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(m)))return;
 return {metric:c.metric,period:c.period,months:[...c.months]};
}

function annualFollowup(request:Pick<SolutionRequest,'message'|'state'|'scope'|'filters'>,grounding:Pick<Grounding,'datasetToken'>|undefined){
 const c=(request.state as TurnoverState).turnoverChat,text=normalizeHomeQuestion(request.message.text);
 if(!c||!Number.isInteger(c.annualYear)||c.annualYear!<2000||c.annualYear!>2099||!grounding||c.version!==1||c.datasetToken!==grounding.datasetToken||c.scope!==request.scope||c.filters!==filters(request)||c.answerId!==request.state.turns.at(-1)?.id||request.state.turns.at(-1)?.role!=='assistant'||!['total','voluntary'].includes(c.metric))return null;
 if(/\b(?:country|countries|india|team|department|business unit|demographic|forecast|predict|reduce|plan|hire|salary|engagement)\b/.test(text))return null;
 if([...text.matchAll(/\b20\d{2}\b/g)].some(m=>Number(m[0])!==c.annualYear))return null;
 const chart=/^(?:please )?(?:show|plot|draw|display)(?: me)?(?: a| the)?(?: turnover)? (?:chart|graph|visual)(?: for (?:that|it|this))?[.!?]?$/.test(text);
 const compare=/\b(?:compare|compares|comparison|different|difference|versus|vs|but)\b/.test(text)&&/\b(?:voluntary|ytd|year.to.date|home|dashboard|turnover|rate)\b/.test(text);
 if(!chart&&!compare)return null;
 return {kind:'annual' as const,selection:{year:c.annualYear!,metric:c.metric},compare};
}

/** Select fresh annual rows for a validated continuation, never authorize stored facts. */
export function annualTurnoverEvidenceQuestion(text:string,state:SolutionState,scope:string,requestFilters:SolutionRequest['filters'],datasetToken:string){
 const continuation=annualFollowup({message:{id:'selection',text},state,scope,filters:requestFilters},{datasetToken});
 return continuation?`${continuation.selection.metric} turnover for ${continuation.selection.year}`:text;
}

/** Deliberately small language surface. Other workforce questions keep the existing conversation. */
export function turnoverIntent(question:string,availableMonths:string[],previous?:Selection):Intent {
 const annual=annualTurnoverSelection(question);if(annual)return {kind:'annual',selection:annual};
 const text=normalizeHomeQuestion(question);
 const explicit=topic.test(text);
 const follow=/^(?:(?:and|what about|how about|show|show me|just|only|now|instead|actually|make it|for|in|please)\s+)*(?:voluntary|total|overall|monthly|ytd|year.to.date|annual(?:ized|ised)?|20\d{2}|january|february|march|april|may|june|july|august|september|october|november|december|company.wide)\b/.test(text);
 // A previous turnover answer does not make an arbitrary "what about ..." a
 // turnover request. Inherit only a complete, bounded measure/period selection.
 if(!explicit&&(!follow||selectionRemainder(text)))return {kind:'other'};
 // Planning, causality and other named metrics belong to the existing richer conversation.
 if(/\b(?:why|cause|investigate|highest|lowest|rank|ranking|reduce|improve|plan|target|forecast|predict|headcount|hires|hiring|salary|pay|engagement|retention|skills|learning|mentoring|feedback|revenue|performance|promotion|promotions)\b/.test(text))return {kind:'other'};
 if(/\b(?:involuntary|regrettable|non[ -]?voluntary|exits?|count)\b/.test(text))return {kind:'unsupported',answer:'This turnover chart supports total or voluntary monthly rates. That requested measure is not supported here.'};
 if(/\b(?:annual|yearly)\b/.test(text))return {kind:'clarify',answer:'Do you mean a full-year recorded rate, an annualized voluntary rate, or YTD turnover? These are different measures.'};
 const periods=[/\bmonthly\b/.test(text),/\b(?:ytd|year.to.date)\b/.test(text),/\bannual(?:ized|ised)\b/.test(text)];
 if(periods.filter(Boolean).length>1||/\bvoluntary\b/.test(text)&&/\b(?:total|overall)\b/.test(text))return {kind:'clarify',answer:'Please choose one turnover measure and period for this chart: total or voluntary, and monthly or YTD.'};
 const metric:Metric=/\bvoluntary\b/.test(text)?'voluntary':/\b(?:total|overall)\b/.test(text)?'total':previous?.metric??'total';
 const period:Period=periods[2]?'annualized':periods[1]?'ytd':periods[0]?'monthly':explicit?'monthly':previous?.period??'monthly';
 if(period==='annualized'&&!/\bvoluntary\b/.test(text)&&!previous)return {kind:'clarify',answer:'Do you mean annualized voluntary turnover? Total annualized turnover is not a supported metric here.'};
 if(period==='annualized'&&metric!=='voluntary')return {kind:'unsupported',answer:'Total annualized turnover is not supported here. It cannot be calculated from the sampled monthly rates.'};
 const months:string[]=[];let ambiguous=false;
 const matches=[...text.matchAll(monthPattern)];
 for(const match of matches){
  if(match[1])months.push(match[1]+'-'+match[2]);
  else {const month=String(monthNames.indexOf(match[3])+1).padStart(2,'0');const candidates=[...new Set(availableMonths.filter(m=>m.endsWith('-'+month)))];if(match[4])months.push(match[4]+'-'+month);else if(candidates.length===1)months.push(candidates[0]);else ambiguous=true;}
 }
 if(ambiguous)return {kind:'clarify',answer:'Which year do you mean for those months? I cannot resolve it from the available turnover observations.'};
 // Inspect only the separator BETWEEN complete month matches. ISO date hyphens
 // remain inside their matches and cannot accidentally become range separators.
 if(matches.length===2&&/^\s*(?:to|through|-|\u2013|\u2014)\s*$/.test(text.slice(matches[0].index!+matches[0][0].length,matches[1].index))&&months.length===2){
  const [start,end]=months;if(start>end)return {kind:'clarify',answer:'Please give the monthly range in chronological order.'};
  const cursor=new Date(start+'-01T00:00:00Z');months.length=0;
  while(cursor.toISOString().slice(0,7)<=end&&months.length<4){months.push(cursor.toISOString().slice(0,7));cursor.setUTCMonth(cursor.getUTCMonth()+1);}
 }
 const rest=selectionRemainder(text);
 if(rest){if(!explicit&&!previous)return {kind:'other'};return {kind:'unsupported',answer:'That scope or time selection is not supported by this company-wide turnover view. I can show the available company monthly total or voluntary rates; subgroup rates and other time windows need separate verified evidence.'};}
 if(!explicit&&!previous)return {kind:'clarify',answer:'Which turnover measure and period do you mean? Please specify monthly total or voluntary turnover and the months.'};
 if(months.length>3)return {kind:'unsupported',answer:'This view supports up to three available monthly observations at a time. Please choose up to three months.'};
 if(months.length&&period!=='monthly')return {kind:'unsupported',answer:'The available YTD and annualized figures are source snapshots, not a history for selected months. I cannot relabel them for that time window.'};
 return {kind:'selected',selection:{metric,period,months:[...new Set(months.length?months:!explicit&&!periods.some(Boolean)?previous?.months??[]:[])]}};
}

export function turnoverChartMonths(question:string,dates:string[]):string[]|null {
 const year=question.match(/^Monthly (total|voluntary) turnover for calendar year (20\d{2})$/);
 if(year){const selected=dates.filter(d=>d.startsWith(year[2]+'-'));return selected.length===12&&new Set(selected.map(d=>d.slice(0,7))).size===12?selected:null;}
 const intent=turnoverIntent(question,dates.map(d=>d.slice(0,7)));
 if(intent.kind!=='selected'||intent.selection.period!=='monthly')return null;
 const wanted=intent.selection.months;
 if(wanted.some(m=>!dates.some(d=>d.slice(0,7)===m)))return null;
 return wanted.length?dates.filter(d=>wanted.includes(d.slice(0,7))):dates;
}

/** Fresh verified aggregates only; complete calendar years additionally require matching W1 stocks. */
export function turnoverChatReply(request:SolutionRequest,grounding:Grounding|undefined,now=new Date()):{answer:string;chartQuestion:string|null;context:Context|null}|null {
 const pack=normalizeHomePack(request.evidence),source=pack.sources.find((s:{id:string})=>s.id==='A1');
 const facts=source?.facts as Record<string,unknown>|null|undefined;
 const rows=(facts?.monthly??[]) as Record<string,unknown>[];
 const dates=rows.map(r=>String(r.month).slice(0,7));
 const previous=previousSelection(request,grounding),followup=annualFollowup(request,grounding),intent=followup??turnoverIntent(request.message.text,dates,previous);
 if(intent.kind==='other')return null;
 if(intent.kind==='annual'){
  const localYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:request.timeZone,year:'numeric'}).format(now));
  const year=intent.selection.year==='last'?localYear-1:intent.selection.year;
  const start=year+'-01-01',end=year+'-12-31',metric=intent.selection.metric;
  const label=metric==='total'?'Total':'Voluntary';
  const resolved=intent.selection.year==='last'?`“Last year” means ${start} through ${end}, using the current calendar year in ${request.timeZone}. `:`For ${start} through ${end}, `;
  const reply=(answer:string)=>({answer:resolved+answer,chartQuestion:null,context:null});
  if(!grounding||source?.status!=='loaded'||!source.date||!acceptsGroundedAggregate(grounding,request.evidence,source,request))return reply('annual turnover is unavailable because the current exit-count evidence could not be verified. Refresh the workforce evidence before calculating.');
  const latest=rows.filter(r=>/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(String(r.month))&&String(r.month)<=source.date!&&rate(r[metric==='total'?'monthly_turnover_pct':'monthly_voluntary_turnover_pct'])).sort((a,b)=>String(a.month).localeCompare(String(b.month))).at(-1);
  const closest=latest?` The closest supplied result is company-wide ${metric} monthly turnover for ${String(latest.month).slice(0,7)}: ${latest[metric==='total'?'monthly_turnover_pct':'monthly_voluntary_turnover_pct']}% [A1]. This is a monthly rate, not the requested annual rate.`:'';
  if(!['country','org','level'].every(k=>request.filters[k as keyof SolutionRequest['filters']]==='all'))return reply('the supplied exit counts are company-wide and cannot establish annual turnover for the selected subgroup.'+closest);
  const stock=pack.sources.find((s:{id:string})=>s.id==='W1');
  if(stock?.status!=='loaded'||stock.date!==source.date||!acceptsGroundedAggregate(grounding,request.evidence,stock,request))return reply('annual turnover needs verified company-wide month-end headcounts for the same year and source date; those denominators are not available.'+closest);
  if(end>source.date)return reply(`the full calendar year is not covered by the data, which ends ${source.date}. I cannot substitute YTD or annualized turnover.`+closest);
  const counts:number[]=[],stocks:number[]=[],missing:string[]=[];
  for(let month=1;month<=12;month++){
   const key=year+'-'+String(month).padStart(2,'0'),monthEnd=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
   const exits=rows.filter(r=>r.month===key+'-01'),heads=((stock.facts as {rows?:Record<string,unknown>[]} | null)?.rows??[]).filter((r:Record<string,unknown>)=>r.snapshot_date===monthEnd);
   const n=exits[0]?.[metric==='total'?'total_exits':'voluntary_exits'],h=heads[0]?.headcount;
   if(exits.length!==1||heads.length!==1||exits[0]?.suppressed===true||heads[0]?.suppressed===true||!Number.isSafeInteger(n)||Number(n)<0||!Number.isSafeInteger(h)||Number(h)<0){missing.push(key);continue;}
   counts.push(Number(n));stocks.push(Number(h));
  }
  if(missing.length)return reply(`annual turnover needs one verified exit count and month-end headcount for each of all 12 months. Missing, duplicate or unknown evidence affects: ${missing.join(', ')}. I will not sum monthly rates or use today's headcount instead.`+closest);
  const exits=counts.reduce((a,b)=>a+b,0),stockSum=stocks.reduce((a,b)=>a+b,0),average=stockSum/12;
  if(!Number.isSafeInteger(exits)||!Number.isSafeInteger(stockSum)||average<=0)return reply('annual turnover is undefined because the verified average workforce denominator is zero or invalid.'+closest);
  const fmt=(n:number,digits=2)=>n.toLocaleString('en-US',{maximumFractionDigits:digits});
  const result=reply(`${label} company-wide turnover was ${fmt(exits/average*100)}%. Calculation: ${fmt(exits,0)} recorded ${metric==='total'?'total':'voluntary'} exits [A1] / ${fmt(average)} average month-end headcount across all 12 months [W1] × 100. This uses the average of monthly closing headcounts, not a sum of monthly rates. Synthetic recorded data as of ${source.date}; no forecast or causal claim.`);
  const voluntary=facts?.voluntary_turnover_ytd_pct;
  if(followup?.compare)result.answer+=rate(voluntary)?` The source-reported voluntary YTD snapshot is ${voluntary}% as of ${source.date} [A1]. It counts voluntary exits in the current YTD window, whereas the ${year} result above counts ${metric} exits over a full calendar year. These are different measures and periods; neither retracts the other, and their difference is not a like-for-like trend.`:' The voluntary YTD comparator is unavailable in current verified evidence. That does not invalidate the independently calculated annual result.';
  return {...result,chartQuestion:`Monthly ${metric} turnover for calendar year ${year}`,context:{version:1,datasetToken:grounding.datasetToken,scope:request.scope,filters:filters(request),answerId:answerId(request),metric,period:'monthly',months:[],annualYear:year}};

 }
 if(intent.kind!=='selected')return {answer:intent.answer,chartQuestion:null,context:null};
 if(!grounding||!/^[a-f0-9]{64}$/.test(grounding.packetSha256)||source?.status!=='loaded'||!source.date||!acceptsGroundedAggregate(grounding,request.evidence,source,request))return {answer:'Turnover is unknown for this request because current company aggregate evidence could not be verified. No chart is available.',chartQuestion:null,context:null};
 const {metric,period,months}=intent.selection;
 const provenance=`Company-wide${source.sourceContext||isPublicHomeReceiptCandidate(grounding)?' synthetic':''} recorded aggregate, as of ${source.date} [A1].`;
 const context:Context={...intent.selection,version:1,datasetToken:grounding.datasetToken,scope:request.scope,filters:filters(request),answerId:answerId(request)};
 if(period!=='monthly'){
  const key=period==='annualized'?'annualized_voluntary_turnover_pct':metric==='voluntary'?'voluntary_turnover_ytd_pct':'total_turnover_ytd_pct';
  const value=facts?.[key],label=period==='annualized'?'Annualized voluntary turnover':`${metric==='total'?'Total':'Voluntary'} turnover (YTD)`;
  return {answer:rate(value)?`${label} is ${value}%. ${provenance} The exact observation window and denominator are unavailable. This single snapshot cannot form a trend chart.`:`${label} is unknown in the current verified evidence. Monthly rates cannot substitute for it. ${provenance}`,chartQuestion:null,context};
 }
 const key=metric==='total'?'monthly_turnover_pct':'monthly_voluntary_turnover_pct',label=`Monthly ${metric==='total'?'total':'voluntary'} turnover`;
 const selected=rows.filter(r=>!months.length||months.includes(String(r.month).slice(0,7))).sort((a,b)=>String(a.month).localeCompare(String(b.month)));
 if(months.some(m=>!selected.some(r=>String(r.month).slice(0,7)===m)))return {answer:`Turnover for one or more requested months is unknown in the current verified evidence. ${provenance} Please choose available months: ${[...new Set(dates)].join(', ')||'none'}.`,chartQuestion:null,context};
 const valid=selected.filter(r=>r.suppressed!==true&&/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(String(r.month))&&String(r.month)<=source.date!&&rate(r[key]));
 if(new Set(valid.map(r=>r.month)).size!==valid.length||!valid.length)return {answer:`${label} is unknown for the requested periods in the current verified evidence. ${provenance} No chart is available.`,chartQuestion:null,context};
 const answer=`${label}: ${valid.map(r=>`${String(r.month).slice(0,7)}: ${r[key]}%`).join('; ')}. ${provenance}${valid.length<selected.length?' Other selected periods are unavailable.':''}${valid.length<2?' At least two known periods are needed for a trend chart.':''}`;
 return {answer,chartQuestion:valid.length>=2?`Monthly ${metric==='voluntary'?'voluntary ':''}turnover ${months.join(' ')}`:null,context};
}

export function clearTurnoverChat(state:SolutionState){delete (state as TurnoverState).turnoverChat;}
export function retainTurnoverChat(state:SolutionState,context:Context|null){clearTurnoverChat(state);if(context)(state as TurnoverState).turnoverChat=context;}
