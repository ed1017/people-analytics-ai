// Bounded rule-based orchestration over existing deterministic tools. No model calls.
// @ts-expect-error Node test runner uses explicit TypeScript extensions.
import { developmentCost, validateQuote, type DevelopmentOption } from "./development-costs.ts";
// @ts-expect-error Node test runner uses explicit TypeScript extensions.
import { type DecisionBrief } from "./decision-brief.ts";
import type { ScenarioModelAssumptions, ScenarioModelResponse } from "./types";
export type JourneyLimits = { budget:string; employeeHours:string; minimumParticipants:string; allowRevision:boolean };
export type JourneySource = {as_of:string;defaults:ScenarioModelAssumptions};
export type JourneyProposal = {goal:string;source:JourneySource;assumptions:ScenarioModelAssumptions;options:DevelopmentOption[];limits:JourneyLimits;fingerprint:string};
export type JourneyCandidate = {option:DevelopmentOption;cost:ReturnType<typeof developmentCost>;revision:boolean;status:"constraints met"|"infeasible"|"unknown";reasons:string[]};
export type JourneyRun = {id:string;completedAt:string;proposal:JourneyProposal;scenario:ScenarioModelResponse;candidates:JourneyCandidate[];trace:string[]};
export const emptyJourneyLimits=():JourneyLimits=>({budget:"",employeeHours:"",minimumParticipants:"",allowRevision:false});
export const journeyFingerprint=(goal:string,options:DevelopmentOption[],limits:JourneyLimits)=>JSON.stringify({goal,options,limits});
const ranges:Record<keyof ScenarioModelAssumptions,[number,number]>={annual_growth_pct:[-10,20],salary_inflation_pct:[-5,15],annual_attrition_pct:[0,30],fill_rate_pct:[0,100],productivity_hiring_reduction_pct:[0,50]};
function validateAssumptions(a:ScenarioModelAssumptions){if(!a||Object.entries(ranges).some(([k,[min,max]])=>{const v=a[k as keyof ScenarioModelAssumptions];return typeof v!=="number"||!Number.isFinite(v)||v<min||v>max}))throw Error("Scenario assumptions are unavailable or invalid.")}
export function validateJourneySource(value:JourneySource){if(!value||typeof value.as_of!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value.as_of))throw Error("Scenario source date unavailable.");validateAssumptions(value.defaults);return value}
function optionalNumber(s:string,label:string){if(!s.trim())return null;if(!/^\d+(\.\d{1,2})?$/.test(s)||!Number.isFinite(Number(s))||Number(s)>1e9)throw Error(`${label}: enter a nonnegative number up to 1 billion, with at most two decimals.`);return Number(s)}
export function prepareJourney(goal:string,options:DevelopmentOption[],limits:JourneyLimits,source:JourneySource):JourneyProposal{
 if(!goal.trim())throw Error("Select a saved goal first.");
 if(!options.length||options.length>2)throw Error("Carry one or two development options; remove extras before preparing this bounded comparison.");
 if(new Set(options.map(o=>o.quote.currency)).size!==1)throw Error("Use the same currency for both options; no exchange rate is assumed.");
 optionalNumber(limits.budget,"Total budget");optionalNumber(limits.employeeHours,"Employee-hour limit");
 const min=optionalNumber(limits.minimumParticipants,"Minimum participants");if(min===null||!Number.isInteger(min)||min<1||min>10000)throw Error("Enter your minimum required participants, a whole number from 1 to 10000.");
 for(const o of options){const errors=[...validateQuote(o.quote),...developmentCost(o.quote,o.inputs).errors];if(errors.length)throw Error(errors.join(" "));if(!o.inputs.participants.trim()||!o.inputs.sessions.trim()||!o.inputs.hours.trim())throw Error("Enter participants, sessions and hours in Development Planning. Unknown fees may remain blank.")}
 validateJourneySource(source);
 return JSON.parse(JSON.stringify({goal,source,limits,options,assumptions:{...source.defaults,annual_growth_pct:0,productivity_hiring_reduction_pct:0},fingerprint:journeyFingerprint(goal,options,limits)}));
}
export function assessJourneyOption(option:DevelopmentOption,limits:JourneyLimits,scenario:ScenarioModelResponse,revision=false):JourneyCandidate{
 const cost=developmentCost(option.quote,option.inputs),reasons:string[]=[];let failed=false,unknown=false;
 if(cost.errors.length)throw Error(cost.errors.join(" "));
 const start=scenario.summary.starting_headcount,peak=Math.max(...scenario.points.map(p=>p.modeled_headcount));
 if(peak>start){failed=true;reasons.push(`Headcount cap exceeded: peak ${peak}, starting ${start}. Zero growth input did not produce a flat path.`)}
 else reasons.push(`No increase above starting headcount ${start} in this modeled path; ends at ${scenario.summary.modeled_end_headcount}.`);
 if(scenario.summary.modeled_end_headcount<start)reasons.push("Modeled headcount declines through the engine's gross flows; this is not a staffing recommendation or proof of unchanged capacity.");
 if(Number(option.inputs.participants)<Number(limits.minimumParticipants)){failed=true;reasons.push("Below your minimum required participants.")}
 if(Number(option.inputs.participants)>start){failed=true;reasons.push("Participants exceed the synthetic enterprise starting headcount.")}
 for(const [label,value,limit] of [["Total cost including employee time",cost.total,optionalNumber(limits.budget,"Budget")],["Employee hours",cost.employeeHours,optionalNumber(limits.employeeHours,"Hours")]] as const){if(value===null||limit===null){unknown=true;reasons.push(`${label}: constraint unknown because a cost, time or limit input is missing.`)}else if(value>limit){failed=true;reasons.push(`${label} ${value} exceeds your limit ${limit}.`)}else reasons.push(`${label} ${value} is within your limit ${limit}.`)}
 reasons.push("AI capability gain, participant availability, provider fit and organizational approval remain unverified.");
 return {option,cost,revision,status:failed?"infeasible":unknown?"unknown":"constraints met",reasons};
}
export function validateJourneyScenario(value:ScenarioModelResponse,proposal:JourneyProposal){
 if(!value||value.as_of!==proposal.source.as_of||!value.summary||!Array.isArray(value.points)||!value.points.length||value.points.length>120)throw Error("Scenario source changed or result is incomplete; prepare again.");
 validateAssumptions(value.assumptions);validateAssumptions(value.defaults);
 for(const k of Object.keys(ranges) as Array<keyof ScenarioModelAssumptions>)if(value.assumptions[k]!==proposal.assumptions[k]||value.defaults[k]!==proposal.source.defaults[k])throw Error("Scenario defaults or assumptions changed; prepare again.");
 const requiredSummary=["starting_headcount","modeled_end_headcount","modeled_end_labor_cost_usd"];
 if(requiredSummary.some(k=>typeof (value.summary as unknown as Record<string,unknown>)[k]!=="number"))throw Error("Scenario summary is incomplete.");
 if(value.points.some(p=>typeof p.modeled_headcount!=="number"||p.modeled_headcount<0))throw Error("Scenario path is incomplete.");
 if(Object.values(value.summary).some(v=>typeof v!=="number"||!Number.isFinite(v))||value.summary.starting_headcount<=0||value.summary.modeled_end_headcount<0||value.points.some(p=>typeof p.planning_month!=="string"||Object.entries(p).some(([k,v])=>k!=="planning_month"&&(typeof v!=="number"||!Number.isFinite(v)))))throw Error("Scenario returned invalid arithmetic.");
 if(value.points.at(-1)!.modeled_headcount!==value.summary.modeled_end_headcount)throw Error("Scenario summary does not match its final point.");
 return value;
}
export async function runCapabilityJourney(proposal:JourneyProposal,calculate:(a:ScenarioModelAssumptions,signal:AbortSignal)=>Promise<ScenarioModelResponse>,signal:AbortSignal,onProgress:(trace:string[])=>void=()=>{}):Promise<JourneyRun>{
 // Revalidate saved proposals before any tool call.
 prepareJourney(proposal.goal,proposal.options,proposal.limits,proposal.source);validateAssumptions(proposal.assumptions);
 if(proposal.assumptions.annual_growth_pct!==0||proposal.assumptions.productivity_hiring_reduction_pct!==0)throw Error("This journey requires zero growth and no assumed productivity gain.");
 const trace:string[]=[];const event=(text:string)=>{signal.throwIfAborted();trace.push(text);onProgress([...trace])};
 event("1. Company scenario tool requested: enterprise synthetic Baseline, zero growth, zero assumed productivity gain.");
 const scenario=validateJourneyScenario(await calculate(proposal.assumptions,signal),proposal);signal.throwIfAborted();event("2. Company scenario tool completed; returned dates, assumptions and arithmetic validated.");
 const candidates:JourneyCandidate[]=[];
 for(const option of proposal.options){signal.throwIfAborted();candidates.push(assessJourneyOption(option,proposal.limits,scenario));event(`Development-cost tool completed for ${option.quote.provider}; deterministic comparison recorded.`)}
 const target=candidates.find(c=>c.status==="infeasible"&&Number(c.option.inputs.participants)>Number(proposal.limits.minimumParticipants)&&((c.cost.total!==null&&proposal.limits.budget.trim()!==""&&c.cost.total>Number(proposal.limits.budget))||(c.cost.employeeHours!==null&&proposal.limits.employeeHours.trim()!==""&&c.cost.employeeHours>Number(proposal.limits.employeeHours))));
 if(proposal.limits.allowRevision&&target){const option=JSON.parse(JSON.stringify(target.option)) as DevelopmentOption;option.inputs.participants=String(Math.max(Number(proposal.limits.minimumParticipants),Math.floor(Number(option.inputs.participants)/2)));candidates.push(assessJourneyOption(option,proposal.limits,scenario,true));event(`One permitted revision recalculated: ${target.option.inputs.participants} to ${option.inputs.participants} participants for ${option.quote.provider}. Original retained; no further search.`)}else event("No automatic revision made: disabled or no eligible cost/time failure above the minimum.");
 event("Comparison complete. Constraint status is not proof of AI capability, unchanged capacity, approval or execution.");
 return {id:crypto.randomUUID(),completedAt:new Date().toISOString(),proposal,scenario,candidates,trace};
}
export function appendJourneyToBrief(brief:DecisionBrief,run:JourneyRun):DecisionBrief{
 const {scenario,proposal}=run;const currency=proposal.options[0].quote.currency;
 const snippets={observed:`Journey source: synthetic enterprise Baseline as of ${scenario.as_of}; starting headcount ${scenario.summary.starting_headcount}. No verified AI proficiency baseline supplied.`,calculations:`Bounded comparison ${run.completedAt}: modeled end headcount ${scenario.summary.modeled_end_headcount}; final-month labor cost USD ${scenario.summary.modeled_end_labor_cost_usd} (not added to program costs).\n`+run.candidates.map(c=>`${c.option.quote.provider}${c.revision?" (revised)":""}: ${c.option.inputs.participants} participants; ${c.cost.employeeHours??"unknown"} employee hours; ${currency} ${c.cost.total??"unknown"} total including employee time; ${c.status}.`).join("\n"),assumptions:`Goal: ${proposal.goal}. Enterprise scope, independent of workforce filters. Annual growth 0%; productivity hiring reduction 0%; attrition ${proposal.assumptions.annual_attrition_pct}%; fill rate ${proposal.assumptions.fill_rate_pct}%; salary inflation ${proposal.assumptions.salary_inflation_pct}%. User limits: ${currency} ${proposal.limits.budget||"unknown"} total; ${proposal.limits.employeeHours||"unknown"} employee hours; minimum ${proposal.limits.minimumParticipants} participants. Quotes: ${proposal.options.map(o=>o.quote.provider+" - "+o.quote.provenance).join("; ")}.`,unknowns:"Provider suitability for AI capability, measured proficiency baseline/target, attendance, employee availability, delivery outcomes and approval remain unverified. Any missing cost is unknown, not zero. No ROI or training-to-headcount conversion. Modeled headcount decline does not demonstrate unchanged delivery capacity.",proposals:"Review the recorded candidate constraints and retained inputs. Decide whether to obtain a relevant quote, revise assumptions, or reject infeasible options. No scenario or participant allocation is approved or executed."};
 const next={...brief};for(const key of Object.keys(snippets) as Array<keyof typeof snippets>){const text=[brief[key],snippets[key]].filter(Boolean).join("\n\n");if(text.length>3000)throw Error("A brief field would exceed 3000 characters. Shorten it before appending; nothing was replaced.");next[key]=text}return next;
}
