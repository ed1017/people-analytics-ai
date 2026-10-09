// Illustrative leader-authored objectives, never claims about available project data.
// @ts-expect-error Native Node tests share TypeScript source.
import {readUserGoalIntent} from './home-user-goal-intent.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {getScopedChatHistory,completeScopedChatTurn,type ScopedChatHistory} from './chat-context-history.ts';
export const strategicPlanningStarters = [
  {id:'ai-projects',prompt:'If we win three AI projects next year, should we hire engineers or move people from other projects?',legacyPrompt:'We’re bidding on three new AI implementation projects next year. Can we staff them internally, or will we need to hire?',
    topic:/\b(AI|implementation|projects?|bids?|bidding|deliver(?:y|ing)?|staff(?:ing)?|allocations?|availability)\b/i,
    assumptions:'Clarify each bid’s scope, likelihood and timing, estimated effort and skill levels, delivery milestones, and actual employee allocations and availability. Three bids are not three confirmed projects. Compare internal staffing and hiring using supplied requirements and clearly identified assumptions for capacity, costs and lead times.'},
  {id:'digital-product',prompt:'A client wants a new digital product in six months. Should we recruit more engineers if our managers are already stretched?',legacyPrompt:'A client wants us to build a new digital product in six months. How should we staff the project?',
    topic:/\b(digital|product|client|projects?|scope|milestones?|design|engineering|staff(?:ing)?|allocations?|availability)\b/i,
    assumptions:'Clarify the product scope and delivery milestones, estimated design, engineering and other effort, required skills and proficiency, budget, and actual allocations and availability over the six-month period. Six months is the user’s requested delivery horizon, not proof that delivery or recruiting is feasible.'},
  {id:'managed-services',prompt:'If two new managed-services contracts bring more support tickets, should we hire specialists or train people from another team?',legacyPrompt:'We’re taking on two new managed-services contracts. Can our current teams cover them?',
    topic:/\b(managed[ -]services|contracts?|service|coverage|shifts?|on-call|workload|capacity|teams?|allocations?|availability)\b/i,
    assumptions:'Clarify the services in each contract, start dates, workload and effort, service levels and coverage hours, required skills, and actual current-team allocations and availability. Two contracts alone do not establish workload or required headcount; account for existing commitments, on-call coverage and service constraints.'},
  {id:'cloud-modernization',prompt:'We want more cloud modernization work. Should we train our engineers or hire specialists?',legacyPrompt:'We want to expand our cloud modernization business. Should we develop existing employees or hire specialists?',
    topic:/\b(cloud|modernization|specialists?|skills?|training|develop(?:ment)?|business|pipeline|allocations?|availability)\b/i,
    assumptions:'Clarify the expected cloud-modernization pipeline and timing, required skills and proficiency, current evidenced skills, actual allocations and availability, and training, hiring and delivery costs and lead times. Compare development and hiring against the leader’s objective and constraints; a recorded skill or a training pathway does not prove deployment readiness or guarantee training effects.'},
  {id:'project-redeployment',prompt:'If some client projects finish next quarter, which upcoming work could those teams move to?',legacyPrompt:'Several client projects will finish next quarter. How can we redeploy those teams to upcoming work?',
    topic:/\b(projects?|clients?|redeploy(?:ment)?|teams?|upcoming|releases?|finish|quarter|skills?|allocations?|availability)\b/i,
    assumptions:'Clarify which projects and people are expected to finish, release dates and remaining commitments, upcoming work’s scope, likelihood, skills and effort, and actual allocations and availability. An expected project finish is not confirmed employee availability; check handovers, overlapping assignments and skill fit before proposing redeployment.'},
] as const;

type Turn={role:string;content:string};
type Starter=typeof strategicPlanningStarters[number];
const question=(message:string)=>message.split(/\n\n(?:Focused issue|Session problem context)/)[0].trim();
export const strategicPlanningStarter=(message:string)=>strategicPlanningStarters.find(item=>item.prompt===question(message)||item.legacyPrompt===question(message))??null;
const explicitSwitch=(text:string)=>/^(?:(?:no|please)[, ]+)*(?:forget\b|cancel\b|reset\b|new topic\b|change (?:the )?topic\b|stop\b|switch (?:topics?\b|to (?:another|a new|a different) (?:topic|subject)\b))/i.test(text)
  ||/^How can we (?:reduce turnover|improve employee satisfaction|improve hiring) based on recorded\b/i.test(text);
const explicitWorkflow=(text:string)=>/\b(?:pin|save|calculate|review|set (?:a |the |this )?goal|confirm (?:a |the |this )?goal)\b/i.test(text)
  ||/^(?:(?:please|can you|could you)\s+)*(?:create|build|develop|make|prepare|draft|find|identify|suggest|propose)\b/i.test(text)
  ||/^(?:I|we) (?:want|need|would like) to\b/i.test(text);
function assumptionReply(text:string,previousAssistant:string,context:Starter){
  if(explicitWorkflow(text)||explicitSwitch(text)||text.includes('?'))return false;
  const topicalStatement=context.topic.test(text)&&/^(?:we (?:have|expect|currently|need\b(?!\s+to\b))|(?:the |our )?(?:budget|baseline|target|capacity|scope|hours|skills|effort|allocations|availability)|within\b|use\b|assume\b|yes\b|no\b)/i.test(text);
  const quantified=/^(?:\d|[$£€]|(?:the |our )?(?:budget|baseline|target|capacity)|within\b|use\b|assume\b)/i.test(text)&&text.length<=400;
  // The immediately preceding assistant question is context, never evidence.
  // This permits short answers such as a location, date or effort estimate without
  // treating a newly stated objective or unrelated analytical question as an answer.
  const clarification=previousAssistant.split(/[.!\n]/).at(-1)?.trim()??'';
  const shortAnswer=text.length<=180&&/\?$/.test(clarification)
    &&(context.topic.test(clarification)||/\b(where|when|which dates|how many|how much|locations?|hours?|effort|budget)\b/i.test(clarification));
  return topicalStatement||quantified||shortAnswer;
}

/** Elliptical replies need an established user objective and a preceding answer.
 * These forms refer back to that discussion; isolated words never start planning.
 * Assistant language supplies an antecedent only, never evidence or acceptance.
 */
function conversationalContinuation(text:string,previousAssistant:string,carriedAntecedent=false){
  if((!previousAssistant.trim()&&!carriedAntecedent)||text.length>400||explicitSwitch(text))return false;
  if(/\b(?:pin|save|calculate|review|goal|full plan|action plan)\b/i.test(text)
    ||/^(?:I|we) (?:want|need|would like) to\b/i.test(text))return false;
  const reply=text.replace(/^(?:or|and|actually|no|yes)[, ]+/i,'').trim().replace(/[?!.]+$/,'');
  // Whole response forms keep a referential comparison from swallowing an
  // unrelated new clause, e.g. "do that for my wedding" or "both recipes".
  const comparison=/^(?:(?:can|could|should|would) (?:we|you|I) (?:do|make|try|get|use|combine)|(?:please )?(?:do|make|try|use|combine)|(?:we|I) need) (?:it|that|this|both|either)(?: options| approaches| routes| teams)?(?: (?:cheaper|sooner|faster|less expensive|with (?:a |the )?different team))?$/i.test(reply);
  const elliptical=/^(?:(?:how|what) about )?(?:both(?: options| approaches| routes| teams| (?:hiring|training|recruiting|redeployment) and (?:hiring|training|recruiting|redeployment))?|either|cheaper|sooner|faster|less expensive|(?:a |the )?different team)$/i.test(reply);
  // A new workforce alternative can be a noun phrase, not an unrelated clause.
  // No role inventory, availability or scope acceptance is inferred from it.
  const alternative=/^(?:how|what) about (?:using|hiring|training|recruiting|redeploying|moving) (?:[a-z-]+\s+){0,5}[a-z-]+$/i.test(reply)
    &&! /\b(?:for|at|in|about|because|when|where|which|who|that)\b/i.test(reply.replace(/^(?:how|what) about /i,''));
  const number='[$£€]?\\d+(?:\\.\\d+)?%?(?: (?:hours?|days?|weeks?|months?|years?|FTE))?';
  const correction=new RegExp(`^(?:actually|correction|no)[, :]+(?:(?:the |our )?(?:budget|hours|effort|availability|deadline|duration)(?: is|:)? )?${number}(?: (?:not|instead of) ${number})?[.!]?$`,'i').test(text);
  const options=['hiring','training','redeployment','recruiting','onboarding','costs','timing'].filter(option=>carriedAntecedent||new RegExp(`\\b${option}\\b`,'i').test(previousAssistant)).join('|');
  const selection=!!options&&new RegExp(`^(?:(?:yes|no) to |I (?:like|prefer|agree with) |(?:use|keep|drop) )(?:the )?(${options})(?: option| part)?(?:,? (?:but |and )?(?:not|no|yes|without)(?: to)? (?:the )?(${options}))?$`,'i').test(text.replace(/[.!?]+$/,''));
  const unavailable=/^(?:(?:we|I) (?:do not|don['’]t) have (?:those|these) (?:numbers|figures|inputs)|(?:those|these) (?:numbers|figures|inputs|sources) are (?:unknown|unavailable))$/i.test(reply);
  return comparison||elliptical||alternative||correction||selection||unavailable;
}

/** No new persisted state; the normal recent conversation supplies bounded context. */
function planningState(message:string|null,history:readonly Turn[]=[]){
  let active:Starter|null=null,objective='',previousAssistant='',isAssumption=false,goalRequested=false,carriedAntecedent=false,answered=false;
  for(const turn of message===null?history:[...history,{role:'user',content:message}]){
    // Internal interpretation marker only: never sent as a model/history turn.
    // It supplies the antecedent omitted immediately before a truncated window,
    // not an assistant statement, source value or accepted option.
    if(turn.role==='planning-objective'){
      const starter=strategicPlanningStarter(turn.content);
      if(starter){active=starter;objective=turn.content;goalRequested=false;carriedAntecedent=true;answered=true;}
      continue;
    }
    if(turn.role==='assistant'){previousAssistant=turn.content;if(active)answered=true;carriedAntecedent=false;continue;}
    if(turn.role!=='user')continue;
    const text=question(turn.content),starter=strategicPlanningStarter(text);isAssumption=false;
    if(starter){active=starter;objective=text;previousAssistant='';goalRequested=false;carriedAntecedent=false;answered=false;continue;}
    if(!active){previousAssistant='';continue;}
    const topicMatches=active.topic.test(text);
    const unrelated=/\b(turnover|attrition|satisfaction|engagement|employee benefits|workplace safety|weather|question about|talk about|discuss)\b/i.test(text)&&!topicMatches;
    const continuation=conversationalContinuation(text,previousAssistant,carriedAntecedent);
    isAssumption=assumptionReply(text,previousAssistant,active)||continuation;
    if(!isAssumption&&!text.includes('?')&&readUserGoalIntent([text]).status!=='no_goal')goalRequested=true;
    const shortFollowup=/^(?:why|how|what next|what do you need|what else do you need|which assumptions are missing)[?!.]*$/i.test(text);
    if(explicitSwitch(text)||unrelated||(!topicMatches&&!isAssumption&&!shortFollowup)){active=null;isAssumption=false;}
    previousAssistant='';carriedAntecedent=false;
  }
  return {context:active,isAssumption:isAssumption&&!goalRequested,objective:active&&!goalRequested&&answered?objective:null};
}
export const strategicPlanningContext=(message:string,history:readonly Turn[]=[])=>planningState(message,history).context;
export const strategicPlanningAssumptionReply=(message:string,history:readonly Turn[]=[])=>planningState(message,history).isAssumption;

/** Project the still-active answered user objective from bounded interpreted turns.
 * No archive scan, source value, plan input or implicit goal is carried.
 */
export const strategicPlanningObjective=(transcript:readonly Turn[])=>planningState(null,transcript).objective;
export const normalizePlanningObjective=(value:unknown)=>typeof value==='string'&&value.length<=240&&value===question(value)&&strategicPlanningStarter(value)?value:null;
export function planningConversationHistory(history:readonly Turn[],objective:unknown,authoritative=false):readonly Turn[]{
  const known=normalizePlanningObjective(objective);
  if(known)return [{role:authoritative?'planning-objective':'user',content:known},...history];
  // An explicitly cleared scoped objective outranks a stale model window
  // (which can lag local-only turns). Keep other goal intent/history intact.
  return authoritative?history.filter(turn=>turn.role!=='user'||!strategicPlanningStarter(turn.content)):history;
}
/** One optional scalar on the existing in-memory history follows its key/clear
 * boundaries. It is never restored from visible or saved/archive messages.
 */
export const scopedPlanningObjective=(previous:ScopedChatHistory,key:string)=>previous.key===key?normalizePlanningObjective(previous.planningObjective):null;
export function completeHomePlanningTurn(previous:ScopedChatHistory,key:string,message:string,answer:string):ScopedChatHistory{
  const history=getScopedChatHistory(previous,key);
  const planningObjective=strategicPlanningObjective([...planningConversationHistory(history,scopedPlanningObjective(previous,key),true),{role:'user',content:message},{role:'assistant',content:answer}]);
  return {...completeScopedChatTurn(key,history,message,answer),planningObjective};
}

/** The UI owns popup availability and all input/review state; chat grants no action. */
export const planningCalculatorInvitation='Have a rough idea of your available people, budget or timeline? Tell me in chat, or open the Planning Calculator.';
export function strategicPlanningInstructions(message:string,history:readonly Turn[]=[],calculatorAvailable=false){
  const context=strategicPlanningContext(message,history);return context?planningRecommendationInstructions(context,calculatorAvailable):'';
}
/** Shared scoped guidance; callers must establish a current business-planning context. */
export function planningRecommendationInstructions(context:{id:string;assumptions:string},calculatorAvailable=false){
  const invitation=calculatorAvailable?`When refining proposed assumptions would help the current decision, you may invite: "${planningCalculatorInvitation}". Place this optional invitation after the recommendation, rationale, next move and any stated assumptions, not before them or after every message. The UI supplies the optional popup control; never invent a navigation link, new tab, form opening, supported field or calculated update. Opening it changes no assumption acceptance or review/save state.`:'When refining proposed assumptions would help the current decision, optionally invite the user to share rough available people, budget or timeline in chat after the recommendation and stated assumptions. Do not repeat the invitation after every message. No Planning Calculator popup control is supplied on this request; do not offer it, invent a link or promise a calculator update.';
  return `STRATEGIC WORKFORCE PLANNING CLARIFICATION (${context.id}): This is an illustrative business-change objective from the user, not evidence that project scope, effort, demand or employee allocation data exists in this app. Lead with a useful grounded or clearly conditional recommendation, a brief reason tied to the user’s objective and constraints, and the next concrete move. Offer optional deeper exploration afterward; do not put a questionnaire or exploratory detour before available useful guidance. When essential evidence is missing, recommend the next concrete step conditionally rather than fabricate numeric results. Keep chat primary; do not open or require an assumption editor or form unless the user explicitly requests it. Explain the meaningful tradeoff and a concrete next move, using supplied evidence and supported code results where available. If the evidence cannot distinguish routes, give a conditional recommendation and say what would change it; do not merely list missing inputs or keep exploring. Ground comparative claims such as faster, fastest, cheaper, cheapest or best in available evidence about the alternatives; otherwise make the claim explicitly conditional on the missing timing, cost, skill or availability evidence. State the decisive condition briefly alongside the recommendation, without a caveat list. Consider alternatives, including a hybrid when complementary work, timing and constraints justify it, without forcing a binary choice, a fixed mix or a universal hire/train recommendation. Adapt the recommendation when the user asks about both, cost, timing, another team or corrects an assumption. Partial agreement accepts only the stated conversational premise, never all proposed inputs, source verification or a saved plan. Missing or unavailable sources remain unknown; assistant proposals remain labelled assumptions even when discussed in later turns. Do not imply an unavailable calculation or tool was run. Use facts the user has already supplied and keep unsupported measured/source values unknown. When effort, timing, skills, costs or availability are missing, propose clearly labelled assumptions separately for the user to review and correct; do not present them as observed data or automatically accepted inputs. Explain the relevant basis briefly and keep the proposed assumptions editable through the conversation. Ask only essential business ambiguity that would materially change the plan; do not require a complete input questionnaire before helping. Role headcounts do not establish available delivery capacity. Do not infer workloads, staffing ratios, productive capacity, costs or project availability from employee snapshots or the separate synthetic projections. A proposed assumption is not a measured/source value; do not backfill unknown source fields or imply the user confirmed it. Offer three distinct proposed Action Plans for a business decision, with a conditional recommendation and concrete next actions. Never fabricate three numerically feasible options, force a full numeric template, a goal card, a pin or a save. Preserve explicit subsequent calculation, review and save requests through the existing workflow, with its input and provenance checks. Never claim that a plan was calculated, saved or executed merely because an opener was clicked.\nPlanning considerations (use supplied facts or clearly labelled proposed assumptions; not a questionnaire): ${context.assumptions}\nOPTIONAL INPUT REFINEMENT: ${invitation}`;
}
