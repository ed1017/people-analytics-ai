import type {SolutionRequest} from './home-solution-conversation';
// @ts-expect-error Native Node tests share application source.
import {emptyRequiredStaffing,readRequiredStaffingInput,type RequiredStaffingInput} from './required-staffing.ts';

// @ts-expect-error Native Node tests share application source.
import {captureStaffingDelivery} from './home-staffing-delivery.ts';

const words=['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const count='(?:[1-9]\\d?|'+words.join('|')+')';
const amount=(s:string)=>/^\d/.test(s)?Number(s):words.indexOf(s.toLowerCase())+1;
const role='(?:[a-z][a-z-]* ){0,3}(?:roles?|positions?|people|employees?|engineers?|developers?|analysts?|nurses?|agents?|consultants?|specialists?|operators?|designers?|managers?|technicians?|accountants?|representatives?|reps|scientists?|recruiters?|coordinators?|associates?|officers?)';
const strategy='(?:hir(?:e|ing)|recruit(?:ing)?|train(?:ing)?|upskill(?:ing)?|develop(?:ing)?(?: people)?|redeploy(?:ing|ment)?|(?:internal )?transfers?|transfer(?:ring)? internally)';
const strategies=strategy+'(?:(?:\\s*[/,]\\s*(?:(?:and|or)\\s+)?|\\s+(?:and|or)\\s+)'+strategy+'){1,2}';
const comparison=new RegExp('^(?:(?:should (?:we|I)|can (?:we|I)|compare|compare (?:our|the) options(?: for)?|what about) )'+strategies+'$','i');
const requirement=new RegExp('^(?:please )?(?:(?:we|I) (?:need|require)|(?:help (?:us|me) )?(?:fill|staff|cover)) ('+count+') ('+role+')(?: (over|for|within|in) ('+count+') months?)?(?: (?:with|on) (?:a )?(USD|EUR|GBP|CAD|AUD|JPY|INR|SGD|CHF|CNY) ((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?)(k)? budget)?(?: by ('+strategies+'))?$','i');

export function staffingInputQuestion(inputs:RequiredStaffingInput,deliveryKnown=false):string{
 if(!inputs.role)return 'Which role needs these people?';
 if(inputs.requiredRoles===null)return 'How many additional people are needed? A fractional FTE gap needs a separate workload calculation.';
 if(inputs.months===null)return 'What cost horizon in months should we compare? This is separate from the date people must be ready.';
 if(!inputs.currency)return 'Which currency should the costs and budget use? No currency conversion is assumed.';
 if(inputs.hireCostPerPerson===null)return 'What is the hire cost per person, and is it annual, monthly or for the whole cost period? Leave it unknown if you do not have it.';
 if(inputs.trainablePeople===null||inputs.redeployablePeople===null)return 'How many people could train or transfer internally? Availability and release remain unknown until you supply them.';
 if(!deliveryKnown)return 'By when must these people be ready? The cost horizon is not a delivery deadline.';
 return 'Review readiness, release, pool overlap and complete costs before choosing a staffing option.';
}

/** Small, complete grammar for an INITIAL request, not general language understanding.
 * Every clause must be consumed. Extra constraints, different scopes and retained work
 * remain with the ordinary provenance-checked conversation rather than being dropped. */
export function normalStaffingIntake(request:SolutionRequest){
 const s=request.state,text=request.message.text.trim();
 if(text.length>1200||request.goal.id||request.goal.statement||request.selectedId||request.catalog||request.goalContext||request.progressEntry||s.turns.length||s.constraints.length||s.working.length||s.analyses.length||s.verifiedMetrics.length||s.rejected.length||s.questions.length||s.focusCandidateId||s.requiredStaffing||s.staffingDeliveryTarget||s.hiringBudget||s.businessPlanning)return null;
 if(request.goalProgress!=null){const progress=request.goalProgress as {goalId?:unknown;ledger?:unknown};if(progress.goalId!==''||progress.ledger!==null)return null;}
 // A questioned requirement is not an affirmative staffing premise.
 if(/^[^.!;\n]*\?/.test(text))return null;
 const clauses=text.split(/[!?;\n]|\.(?!\d)/).map(c=>c.trim()).filter(Boolean);
 if(clauses.length<1||clauses.length>2)return null;
 const m=clauses[0].match(requirement);
 if(!m||!(m[8]||clauses.length===2&&comparison.test(clauses[1]))||m[8]&&clauses.length!==1)return null;
 if(/\b(?:and|or|not|no|if|unless|without|versus|vs)\b/i.test(m[2]))return null;
 const inputs=emptyRequiredStaffing(),people=amount(m[1]),months=m[4]?amount(m[4]):null;
 if(people>20||months!==null&&(months<1||months>24))return null;
 inputs.requiredRoles=people;
 // Generic people/roles is a count, not an actual profession or population.
 inputs.role=/^(?:roles?|positions?|people|employees?)$/i.test(m[2])?null:m[2];
 if(m[3]&&/^(?:over|for)$/i.test(m[3]))inputs.months=months;
 if(m[5]){inputs.currency=m[5].toUpperCase();inputs.budget=Number(m[6].replaceAll(',',''))*(m[7]?1000:1);}
 const deliveryMonths=m[3]&&/^(?:within|in)$/i.test(m[3])?months:null;
 const captured=captureStaffingDelivery(request.message);
 if(captured?.issue||deliveryMonths!==null&&captured?.months!==deliveryMonths||deliveryMonths===null&&captured?.months!=null)return null;
 try{readRequiredStaffingInput(inputs);}catch{return null;}
 const question=staffingInputQuestion(inputs,deliveryMonths!==null);
 return {inputs,deliveryMonths,questions:[question],answer:`I kept your requirement for ${people} ${inputs.role??'people'}${deliveryMonths!==null?`, needed within ${deliveryMonths} months`:''}. ${question}\n\nContinue in the editable staffing planner below, or reply in chat. Missing costs, staffing pools and readiness stay unknown. No example assumptions were inserted, and nothing was saved or applied.`};
}
