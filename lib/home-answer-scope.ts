import {normalizeHomePack} from './home-pack.mjs';

const countryAliases=[['United States','USA','U.S.','US','U.S.-scoped','US-scoped'],['Canada'],['United Kingdom','UK','Britain'],['India'],['Germany'],['France'],['Australia'],['Japan'],['China'],['Brazil'],['Singapore'],['Mexico']];
const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const contains=(text:string,label:string)=>new RegExp('(?<![A-Za-z])'+escape(label)+'(?![A-Za-z])',label==='US'?'':'i').test(text);
const broad=/\b(?:company[ -]wide|global|enterprise[ -]wide|all countries)\b/i;
const metric=/\b(?:headcount|workforce|employees|people|turnover|exits|scenario|forecast|hires|hiring|skills?|respondents|favo(?:u)?rable|satisfaction|baseline|rate|population|coverage|participation)\b/i;
const assertion=/\b(?:is|are|was|were|has|have|had|recorded|reported|shows?|indicates?|totals?|includes?|represents?|covers?|projects?|forecasts?|accounts? for|based on)\b/i;
const unavailable=/\b(?:unavailable|unsupported|unknown|not supplied|not available|cannot (?:establish|determine|infer|provide)|does not (?:establish|represent|provide)|not (?:a |an )?(?:country|US|U\.S\.|United States|Canada|scoped)[ -]?(?:specific|only|forecast|estimate|rate|breakdown)?|no (?:scoped|country[ -]specific) (?:data|evidence|breakdown))\b/i;
const proposal=/^(?:target|aim|reduce|increase|improve|lower|retain|propose|proposed|introduce|run|pilot|review|compare|assess|evaluate|consider|offer|schedule|ask|define|measure|track|confirm|identify|validate|establish|test|coordinate|launch|use|provide|create|support)\b/i;
function proposedTextContainsFact(text:string,labels:readonly string[]):boolean {
 let words=text.replace(/\[[^\]\n]+\]/g,'');
 // Remove only explicitly desired quantities, then inspect the remaining prose.
 // This preserves a factual premise elsewhere in the same recommendation.
 words=words.replace(/\b(?:target|desired|proposed)\s+(?:turnover(?:\s+rate)?|exit\s+rate|hiring\s+rate|satisfaction\s+rate|rate)\s+(?:(?:of|at|is|equals?)\s+)?(?:\(\s*)?\d[\d,.]*\s*%?\s*\)?/gi,'desired measure ');
 const proposesActivity=/^(?:propose|proposed|introduce|run|pilot|offer|schedule|launch|use|provide|create|support|coordinate|test)\b/i.test(words.trim());
 if(proposesActivity)words=words.replace(/\b(?:pilot|programme?|trial|cohort|intervention|check[- ]?ins|support|coaching|training)\b[^.;!?]{0,48}?\b(?:for|to|with|serving)\s+\d[\d,]*\s+(?:employees|participants|people)\b/gi,activity=>activity.replace(/\d[\d,]*\s+(?:employees|participants|people)\b/i,'proposed participants'));
 // A recommendation may use an asserted source quantity as its premise. Keep
 // desired targets distinct, but do not let the leading action verb hide that premise.
 const goal=/^(?:target|aim|reduce|increase|improve|lower|retain)\b/i.test(words.trim());
 if(goal&&!/\b(?:baseline|current|existing|recorded|reported|from|based on)\b/i.test(words))return false;
 const metricValue=/\b(?:headcount|workforce|turnover(?:\s+rate)?|exit(?:s|\s+rate)?|hiring(?:\s+rate)?|satisfaction(?:\s+rate)?|baseline|rate|population|coverage|participation)\s+(?:(?:of|at|from|is|was|were|equals?)\s+)?(?:about\s+|approximately\s+)?(?:\(\s*)?\d/i;
 // Only known scope labels may occur between a value and its measure; this is
 // not a generic scan for arbitrary numbers elsewhere in a recommendation.
 const scopedLabel=labels.map(escape).join('|');
 const valueMetric=new RegExp('\\b\\d[\\d,.]*\\s*%?\\s+(?:(?:'+scopedLabel+')\\s+)?(?:turnover(?:\\s+rate)?|exit(?:s|\\s+rate)?|headcount|employees|respondents|favo(?:u)?rable|satisfaction(?:\\s+rate)?)\\b','gi');
 const valueFact=[...words.matchAll(valueMetric)].some(match=>!/^\s+(?:rate\s+)?(?:target|goal)\b/i.test(words.slice(match.index+match[0].length)));
 return metricValue.test(words)||valueFact||/\b(?:was|were|recorded|reported)\b/.test(words)&&/\d/.test(words);
}
/** Grouped IDs and field/row references share the same authoritative source scope. */
export function homeScopeCitations(text:string):string[]{
 return [...text.matchAll(/\[([^\]\n]+)\]/g)].flatMap(match=>[...match[1].matchAll(/(?:^|[,;\s])([A-Z]\d)(?=[\s,;.:]|$)/gi)].map(item=>item[1].toUpperCase()));
}
type ScopeOptions={references?:string[];scopeContext?:string};
/** Reject recognizable source/scope contradictions; never rewrite or relabel evidence.
 * Heading context and source IDs are structural. Free prose still requires human review;
 * this bounded check is not a general factual or causal verifier.
 */
export function homeAnswerScopeViolation(answer:string,raw:unknown,options:ScopeOptions={}):boolean {
 const pack=normalizeHomePack(raw);
 const selected=(pack.workforceScope??'').replace(/Selected workforce snapshot:\s*/gi,'').split(/;/).map((part:string)=>part.trim().replace(/^(?:country|business unit|level):\s*/i,'' )).filter((part:string)=>part&&!/^(?:all\b|global workforce|company|synthetic|scope unavailable)/i.test(part));
 const labels=[...new Set([...selected,...countryAliases.flat()])];
 const sources=new Map<string,{id:string;scope:string}>(pack.sources.map((source:{id:string;scope:string})=>[source.id,source]));
 const scopeLabels=(text:string)=>labels.filter(label=>contains(text,label));
 const sourceAllows=(id:string,label:string,claim:string)=>{
  const source=sources.get(id);if(!source)return false;
  if(id==='W2'&&/\b(?:headcount|FTE|employees)\b/i.test(claim)&&!/\b(?:turnover|exits|hires|rate|forecast|scenario)\b/i.test(claim)){
   const facts=pack.sources.find((item:{id:string})=>item.id==='W2')?.facts as {rows?:{country_name?:string;headcount?:number;fte?:number}[]}|null;
   const rows=facts?.rows??[];
   if(rows.some((row:{country_name?:string;headcount?:number;fte?:number})=>typeof row.country_name==='string'&&(contains(row.country_name,label)||countryAliases.some(aliases=>aliases.some(a=>contains(row.country_name!,a))&&aliases.includes(label)))&&(typeof row.headcount==='number'||typeof row.fte==='number')))return true;
  }
  if(id==='W1')return contains(source.scope,label)||countryAliases.some(aliases=>aliases.some(a=>contains(source.scope,a))&&aliases.includes(label));
  return id==='I2'&&countryAliases[0].includes(label); // US national, never company workforce.
 };
 let heading=options.scopeContext??'';
 for(const line of answer.split('\n')){
  const text=line.trim().replace(/\bU\.S\.(?:A\.)?/g,'United States').replace(/^[-*•]\s+/,'').replace(/\*\*/g,'');if(!text)continue;
  const headingMatch=/^(?:#{1,6}\s+(.+)|([^.!?\[\]]{1,100}):)$/.exec(text);
  const bareScopeHeading=labels.some(label=>text.toLowerCase()===label.toLowerCase()&&contains(text,label));
  const styledHeading=headingMatch||bareScopeHeading||/^\*\*[^*]+\*\*:?$/.test(line.trim());
  if(styledHeading){
   heading=headingMatch?(headingMatch[1]??headingMatch[2]).trim():text;
   // Formatting does not exempt a cited or quantified factual assertion.
   if(!homeScopeCitations(text).length&&!(metric.test(text)&&(assertion.test(text)||/\d/.test(text))))continue;
  }
  // Keep a trailing citation with its sentence; periods in U.S. are not boundaries.
  const sentences=(headingMatch?heading:text).split(/(?<=[.!?])\s+(?=[A-Z](?!\d\]))/);
  for(const sentence of sentences){
   const refs=[...new Set([...homeScopeCitations(sentence),...(options.references??[]).map(id=>id.split(/[.:]/)[0])])];
   if(!refs.length)continue;
   for(const clause of sentence.split(/;|,(?=\s*(?:but|whereas|while)\b)|\b(?:but|whereas|because|given that)\b/i)){
    const clauseRefs=homeScopeCitations(clause),claimRefs=clauseRefs.length?[...clauseRefs,...(options.references??[]).map(id=>id.split(/[.:]/)[0])]:refs;
    const explicit=scopeLabels(clause),inherited=explicit.length?[]:scopeLabels(heading+' '+sentence),scoped=[...explicit,...inherited];
    if(!scoped.length||!metric.test(clause))continue;
    // Proposed activities remain valid; factual premises within them still need scope checks.
    const factual=proposal.test(clause.trim())?proposedTextContainsFact(clause,labels):assertion.test(clause)||/\d/.test(clause);
    if(!factual)continue;
    const mismatched=scoped.filter(label=>claimRefs.some(id=>sources.has(id)&&!sourceAllows(id,label,clause)));
    if(!mismatched.length)continue;
    if(unavailable.test(clause)&&!/(?:\b(?:was|were|has|have|had|recorded|reported|totals?)\b[^;.!?]*\d|\b(?:is|are)\s+\d)/i.test(clause))continue;
    // Scope adjectives must qualify the actual claim. A stray 'global' elsewhere
    // cannot excuse 'US exits were 100' or 'United States global scenario'.
    const global=broad.exec(clause);
    if(global){
     const firstLabel=explicit.reduce((min,label)=>Math.min(min,clause.search(new RegExp('(?<![A-Za-z])'+escape(label)+'(?![A-Za-z])','i'))),Infinity);
     const metricIndex=clause.search(metric);
     const globalClaim=global.index<metricIndex&&metricIndex<firstLabel;
     const countryQualified=mismatched.some(label=>new RegExp(escape(label)+'(?:[ -](?:only|scoped)|[ -](?:scenario|forecast|turnover|exits|headcount|workforce|population|projection))','i').test(clause));
     const countryAttribution=countryQualified||/\b(?:all|solely|only|specifically|entirely)\s+(?:in|for|from|within)\b/i.test(clause)||/\b(?:in|for|from|within)\s+(?:the\s+)?$/i.test(clause.slice(0,firstLabel));
     if(globalClaim&&!countryAttribution)continue;
    }
    return true;
   }
  }
 }
 return false;
}
