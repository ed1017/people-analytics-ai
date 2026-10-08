// Illustrative leader-authored objectives, never claims about available project data.
// @ts-expect-error Native Node tests share TypeScript source.
import {readUserGoalIntent} from './home-user-goal-intent.ts';
export const strategicPlanningStarters = [
  {id:'ai-projects',prompt:'We’re bidding on three new AI implementation projects next year. Can we staff them internally, or will we need to hire?',
    topic:/\b(AI|implementation|projects?|bids?|bidding|deliver(?:y|ing)?|staff(?:ing)?|allocations?|availability)\b/i,
    assumptions:'Clarify each bid’s scope, likelihood and timing, estimated effort and skill levels, delivery milestones, and actual employee allocations and availability. Three bids are not three confirmed projects. Compare internal staffing and hiring using supplied requirements and clearly identified assumptions for capacity, costs and lead times.'},
  {id:'digital-product',prompt:'A client wants us to build a new digital product in six months. How should we staff the project?',
    topic:/\b(digital|product|client|projects?|scope|milestones?|design|engineering|staff(?:ing)?|allocations?|availability)\b/i,
    assumptions:'Clarify the product scope and delivery milestones, estimated design, engineering and other effort, required skills and proficiency, budget, and actual allocations and availability over the six-month period. Six months is the user’s requested delivery horizon, not proof that delivery or recruiting is feasible.'},
  {id:'managed-services',prompt:'We’re taking on two new managed-services contracts. Can our current teams cover them?',
    topic:/\b(managed[ -]services|contracts?|service|coverage|shifts?|on-call|workload|capacity|teams?|allocations?|availability)\b/i,
    assumptions:'Clarify the services in each contract, start dates, workload and effort, service levels and coverage hours, required skills, and actual current-team allocations and availability. Two contracts alone do not establish workload or required headcount; account for existing commitments, on-call coverage and service constraints.'},
  {id:'cloud-modernization',prompt:'We want to expand our cloud modernization business. Should we develop existing employees or hire specialists?',
    topic:/\b(cloud|modernization|specialists?|skills?|training|develop(?:ment)?|business|pipeline|allocations?|availability)\b/i,
    assumptions:'Clarify the expected cloud-modernization pipeline and timing, required skills and proficiency, current evidenced skills, actual allocations and availability, and training, hiring and delivery costs and lead times. Compare development and hiring against the leader’s objective and constraints; a recorded skill or a training pathway does not prove deployment readiness or guarantee training effects.'},
  {id:'project-redeployment',prompt:'Several client projects will finish next quarter. How can we redeploy those teams to upcoming work?',
    topic:/\b(projects?|clients?|redeploy(?:ment)?|teams?|upcoming|releases?|finish|quarter|skills?|allocations?|availability)\b/i,
    assumptions:'Clarify which projects and people are expected to finish, release dates and remaining commitments, upcoming work’s scope, likelihood, skills and effort, and actual allocations and availability. An expected project finish is not confirmed employee availability; check handovers, overlapping assignments and skill fit before proposing redeployment.'},
] as const;

type Turn={role:string;content:string};
type Starter=typeof strategicPlanningStarters[number];
const question=(message:string)=>message.split(/\n\n(?:Focused issue|Session problem context)/)[0].trim();
export const strategicPlanningStarter=(message:string)=>strategicPlanningStarters.find(item=>item.prompt===question(message))??null;
const explicitSwitch=(text:string)=>/^(?:(?:no|please)[, ]+)*(?:forget\b|cancel\b|reset\b|new topic\b|change (?:the )?topic\b|stop\b)/i.test(text)
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

/** No new persisted state; the normal recent conversation supplies bounded context. */
function planningState(message:string,history:readonly Turn[]=[]){
  let active:Starter|null=null,previousAssistant='',isAssumption=false,goalRequested=false;
  for(const turn of [...history,{role:'user',content:message}]){
    if(turn.role==='assistant'){previousAssistant=turn.content;continue;}
    if(turn.role!=='user')continue;
    const text=question(turn.content),starter=strategicPlanningStarter(text);isAssumption=false;
    if(starter){active=starter;previousAssistant='';goalRequested=false;continue;}
    if(!active){previousAssistant='';continue;}
    const topicMatches=active.topic.test(text);
    const unrelated=/\b(turnover|attrition|satisfaction|engagement|employee benefits|workplace safety|weather|question about|talk about|discuss|instead)\b/i.test(text)&&!topicMatches;
    isAssumption=assumptionReply(text,previousAssistant,active);
    if(!isAssumption&&!text.includes('?')&&readUserGoalIntent([text]).status!=='no_goal')goalRequested=true;
    const shortFollowup=/^(?:why|how|what next|what do you need|what else do you need|which assumptions are missing)[?!.]*$/i.test(text);
    if(explicitSwitch(text)||unrelated||(!topicMatches&&!isAssumption&&!shortFollowup)){active=null;isAssumption=false;}
    previousAssistant='';
  }
  return {context:active,isAssumption:isAssumption&&!goalRequested};
}
export const strategicPlanningContext=(message:string,history:readonly Turn[]=[])=>planningState(message,history).context;
export const strategicPlanningAssumptionReply=(message:string,history:readonly Turn[]=[])=>planningState(message,history).isAssumption;

export function strategicPlanningInstructions(message:string,history:readonly Turn[]=[]){
  const context=strategicPlanningContext(message,history);if(!context)return '';
  return `STRATEGIC WORKFORCE PLANNING CLARIFICATION (${context.id}): This is an illustrative business-change objective from the user, not evidence that project scope, effort, demand or employee allocation data exists in this app. Respond conversationally with a useful provisional planning approach. Use facts the user has already supplied and keep unsupported measured/source values unknown. When effort, timing, skills, costs or availability are missing, propose clearly labelled assumptions separately for the user to review and correct; do not present them as observed data or automatically accepted inputs. Explain the relevant basis briefly and keep the proposed assumptions editable through the conversation. Ask only essential business ambiguity that would materially change the plan; do not require a complete input questionnaire before helping. Role headcounts do not establish available delivery capacity. Do not infer workloads, staffing ratios, productive capacity, costs or project availability from employee snapshots or the separate synthetic projections. A proposed assumption is not a measured/source value; do not backfill unknown source fields or imply the user confirmed it. Do not force three plans, a full numeric template, a goal card, a pin or a save. Preserve explicit subsequent calculation, review and save requests through the existing workflow, with its input and provenance checks. Never claim that a plan was calculated, saved or executed merely because an opener was clicked.\nPlanning considerations (use supplied facts or clearly labelled proposed assumptions; not a questionnaire): ${context.assumptions}`;
}
