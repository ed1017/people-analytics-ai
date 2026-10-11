/** Presentation only. Never infer a caveat from keywords in ordinary prose. */
const label = '(?:Important caveats?|Caveats?|Assumptions?(?: & limits)?)';
const heading = new RegExp('^#{1,3}\\s+(?:\\*\\*)?'+label+'(?:\\*\\*)?\\s*:?\\s*$','i');
const paragraph = new RegExp('^(?:\\*\\*'+label+':\\*\\*|\\*\\*'+label+'\\*\\*:|'+label+':)\\s+','i');
// These cues only PREVENT hiding within an explicitly labelled block. They never
// select ordinary answer text for collapse. Keep the complete sentence, not a
// generated summary: a figure must not lose its unit, denominator or condition.
const essential = /\d|[$€£¥%]|\b(?:forecast\w*|projection\w*|predict\w*|simulat\w*|synthetic|scenario\w*|scope|population|cohort|company|country|business.unit|department|as.of|date\w*|period\w*|month\w*|year\w*|quarter\w*|week\w*|daily|today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|denominator\w*|numerator\w*|rate\w*|percent\w*|shares?|ratios?|per|each|eligible|coverage|respondent\w*|employee\w*|workforce|sample\w*|figures?|estimates?|headcount|hir\w*|exits?|attrition|turnover|transfers?|fte|baseline|observed|recorded|source\w*|unavailable|unknown|missing|incomplete|partial|cost\w*|budget\w*|funding|salary|salaries|fees?|benefits?|exclud\w*|only|not|no|cannot|can't|error\w*|failed|blocked|blocking|review\w*|confirm\w*|sav\w*|approv\w*|must|should|please|need\w*|required|prerequisite\w*)\b|\]\(app:/i;
const complete = (text:string) => /[.!?]["'”’)*_\]]*$/.test(text.trim()) && ['*','_','`'].every(mark=>text.split(mark).length%2===1) && [['[',']'],['(',')']].every(([open,close])=>text.split(open).length===text.split(close).length);
const instruction = /^(?:[-*]\s+)?(?:please\s+)?(?:do|run|select|choose|click|enter|change|review|confirm|save|approve|treat|use|check|discuss|ask|keep|ensure|verify|compare|consider|stop|don't)\b|\b(?:you|your)\b/i;

// Unknown/imperative sentence shapes stay visible. Collapse only plainly
// explanatory prose inside the explicit label boundary, never an action step.
const explanatory = /^(?:[-*]\s+)?(?:this|these|those|the|it|they|there|a|an|individual|variability|different|unannounced|unexpected|other|changes|results|outcomes|inputs|assumptions)\b/i;

export function chatCaveatBlocks(content:string) {
 const lines=content.split('\n'),answer:string[]=[],details:string[]=[],qualifiers:string[]=[];
 let fenced=false;
 for(let i=0;i<lines.length;){
  const trimmed=lines[i].trim();
  if(/^```|^~~~/.test(trimmed)){fenced=!fenced;answer.push(lines[i++]);continue;}
  const eligible=!fenced&&!/^(?: {4}|\t)/.test(lines[i]);
  const isHeading=eligible&&heading.test(trimmed),prefix=eligible?(trimmed.match(paragraph)??(trimmed+"\n").match(paragraph)):null;
  // A paragraph label is recognised only at an actual block boundary, not in
  // a wrapped paragraph, list item, quote, table cell or code sample.
  const boundary=i===0||!lines[i-1].trim()||/^#{1,3}\s/.test(lines[i-1]);
  if(!isHeading&&(!prefix||!boundary)){answer.push(lines[i++]);continue;}
  let end=i+1;
  while(end<lines.length&&!/^#{1,6}\s|^```|^~~~/.test(lines[end].trim())&&(isHeading||lines[end].trim()))end++;
  const raw=lines.slice(i,end).join('\n').trimEnd();
  const body=isHeading?lines.slice(i+1,end).join('\n').trim():raw.trimStart().slice(prefix![0].length);
  // An unfinished streamed block is never hidden. Tables inside a caveat are
  // left intact too, rather than attempting to detach their qualifiers.
  if(!body||!complete(raw)||body.includes('|')){answer.push(...lines.slice(i,end));i=end;continue;}
  const sentences=body.split(/(?<=[.!?])\s+(?=[A-Z*[(])|\n+/).filter(s=>s.trim());
  const retained=sentences.filter(s=>essential.test(s)||instruction.test(s)||!explanatory.test(s.trim()));
  if(retained.length===sentences.length){
   // Entirely critical: make the labelled prose compact, without hiding it or
   // adding a duplicate disclosure that would increase scrolling.
   answer.push(...lines.slice(i,end));qualifiers.push(...lines.slice(i,end).filter(s=>s.trim()));
  }else{
   details.push(raw);
   if(retained.length){
    const visible=(isHeading?'**'+trimmed.replace(/^#{1,3}\s+/,'').replaceAll('**','').replace(/:$/,'')+':** ':prefix![0].trimEnd()+' ')+retained.join(' ');
    answer.push(visible,'');qualifiers.push(visible);
   }
  }
  i=end;
 }
 return {answer:answer.join('\n'),details,qualifiers};
}
