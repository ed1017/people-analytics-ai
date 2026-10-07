/** Resolve only the requested S2 measure; keep the existing bounded row sampler. */
export function wantsHomeExitReasons(selection:string){
 const turns=selection.split('\n\nCURRENT USER TURN:\n').map(turn=>turn.split(/\n\n(?:Focused issue|Session problem context)/)[0]);
 const direct=(text:string)=>/\bexit[- ](?:surveys?|feedback)\b/i.test(text)&&/\b(?:reasons?|why|leav(?:e|ing)|left|report(?:ed)?)\b/i.test(text);
 const otherMeasure=/\b(?:favorab(?:ility|le)|ratings?|scores?|experience questions?|administrative|separation records|(?:turnover|attrition) rates?|S1|A1|headcount|hiring|skills|salary|pay)\b/i;
 const followup=/\b(?:chart|counts?|percentages?|shares?|reasons?|common|highest|largest|why|those|these|them|compare|refreshed|again|now)\b/i;
 let reasons=false;
 for(const turn of turns){
  if(otherMeasure.test(turn)&&/\b(?:not|instead of|rather than)\s+(?:the\s+)?(?:exit[- ]surveys?\s+)?(?:primary\s+)?reasons?\b/i.test(turn))reasons=false;
  else if(direct(turn))reasons=true;
  else if(otherMeasure.test(turn)||!followup.test(turn))reasons=false;
 }
 return reasons;
}
