/** Explicit user delivery timing, separate from calculator cost periods and model prose. */
export type StaffingDeliveryCapture={months:number|null;turnId:string;quote:string;issue:string|null};
const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty one','twenty two','twenty three','twenty four'];
const amount='(?:\\d+(?:\\.\\d+)?|twenty[ -](?:one|two|three|four)|'+words.slice(1,21).join('|')+')';
const clarify='Please clarify one staffing delivery deadline in whole months (1–24), or explicitly remove the deadline. The cost horizon is separate.';
/** Deliberately bounded grammar: unfamiliar or contradictory timing is not guessed. */
export function captureStaffingDelivery(turn:{id:string;text:string},clarification=false):StaffingDeliveryCapture|null{
 const values:number[]=[],text=turn.text.trim();let uncertain=false;
 // Removal is an instruction only when the entire message is an affirmative directive.
 // Preserve the current target for questions, negation and hypothetical discussion.
 if(/\b(?:remove|clear|drop) (?:the |our )?(?:(?:delivery|staffing) )?(?:deadline|target)\b|\bno (?:delivery |staffing )?deadline\b/i.test(text)){
  if(/^(?:please\s+)?(?:(?:remove|clear|drop) (?:the |our )?(?:(?:delivery|staffing) )?(?:deadline|target)|no (?:delivery |staffing )?deadline)[.!]?$/i.test(text))return {months:null,turnId:turn.id,quote:text,issue:null};
  if(/\?|\b(?:not|never|if|unless|maybe|perhaps|example|could|would|should|can|may|might|what|why|how|whether|without)\b|n't\b/i.test(text))return null;
  return {months:null,turnId:turn.id,quote:text,issue:clarify};
 }
 const bare=clarification&&new RegExp('^('+amount+')\\s+months?[.!]?$','i').test(text);
 for(const sourceClause of text.split(/[;!?\n]|\.(?!\d)/).map(s=>s.trim()).filter(Boolean)){
  const clause=bare?'Delivery deadline: '+sourceClause:sourceClause;
  const named=/\b(?:delivery (?:target|deadline)|staffing deadline|deadline)\b/i.test(clause);
  const standalone=new RegExp('^(?:(?:actually|instead|to clarify|make it|change it to|use)\\s*[, :]?\\s*)?(?:within|in(?: the next)?|by(?: the end of)?|no later than)\\s+(?:the next\\s+)?'+amount+'\\s+months?$','i').test(clause);
  const demand=/\bdeliver\b/i.test(clause)||new RegExp('\\b(?:need|require|required|fill|cover|staff)\\s+(?:exactly\\s+)?'+amount+'(?:\\s+[\\w-]+){0,3}\\s+(?:roles?|positions?|people|employees?|engineers?|developers?|analysts?)\\b','i').test(clause);
  if(!named&&!standalone&&!demand)continue;
  const expressions=[new RegExp('\\b(?:within|in(?: the next)?|no later than|by(?: the end of)?)\\s+(?:the next\\s+)?('+amount+')\\s+months?\\b','gi'),new RegExp('\\bby (?:the end of )?month\\s+('+amount+')\\b','gi'),new RegExp('\\b(?:delivery (?:target|deadline)|staffing deadline|deadline)\\s*(?:is|of|:|=|to)?\\s*('+amount+')\\s*[- ]months?\\b','gi'),new RegExp('\\b('+amount+')[- ]months?\\s+(?:delivery )?deadline\\b','gi')];
  expressions.push(new RegExp('\\b('+amount+')\\s+months?\\s+from now\\b','gi'));
  const found=expressions.flatMap(pattern=>[...clause.matchAll(pattern)]);
  if(new RegExp('months?\\s+(?:and|or)\\s+('+amount+')\\s+months?','i').test(clause))uncertain=true;
  if(found.length){
   if(text.includes('?')||/\b(?:not|never|if|unless|maybe|perhaps|example|could|would|should|may|might)\b|\bcan (?:we|you)\b|n't\b|\d\s*[-–/]\s*\d|\b(?:or|between|at least)\b/i.test(clause))uncertain=true;
   for(const match of found){const value=match[1].toLowerCase().replaceAll('-',' '),months=/^\d/.test(value)?Number(value):words.indexOf(value);if(!Number.isInteger(months)||months<1||months>24)uncertain=true;else values.push(months);}
  }else if(named&&/\b(?:unchanged|same|keep|retain|what|which|show|explain|remind)\b/i.test(clause))continue;
  else if(named||/\bby\s+(?!hir(?:e|ing)\b|train(?:ing)?\b|redeploy|transfer|using\b)/i.test(clause)||/\b(?:within|in(?: the next)?|no later than|by(?: the end of)?)\b.*\b(?:months?|weeks?|days?|year|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(clause))uncertain=true;
 }
 const distinct=[...new Set(values)];
 if(!uncertain&&!distinct.length)return null;
 const issue=uncertain||distinct.length>1?clarify:null;
 return {months:issue?null:distinct[0],turnId:turn.id,quote:text,issue};
}
export function readStaffingDeliveryCapture(raw:unknown):StaffingDeliveryCapture|undefined{
 if(raw===undefined)return undefined;
 const value=raw as StaffingDeliveryCapture;
 if(!value||Object.keys(value).sort().join()!=='issue,months,quote,turnId'||typeof value.turnId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(value.turnId)||typeof value.quote!=='string'||!value.quote||value.quote.length>4000)throw Error('The staffing delivery source could not be verified.');
 const checked=captureStaffingDelivery({id:value.turnId,text:value.quote},true);
 if(!checked||JSON.stringify(checked)!==JSON.stringify({months:value.months,turnId:value.turnId,quote:value.quote,issue:value.issue}))throw Error('The staffing delivery target does not match its source.');
 return structuredClone(checked);
}
