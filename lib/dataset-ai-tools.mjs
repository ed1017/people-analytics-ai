/** Candidate-only tool dispatch. All reads/calculators use the same verified API. */
import {deepFreeze} from './dataset-demo-contracts.mjs';
import {peopleAnalyticsTools} from './people-analytics-tool-definitions.ts';
import {assertSolutionShape} from './home-solution-conversation-schema.ts';
const get={get_workforce_overview:'overview',get_workforce_composition:'workforce',get_attrition:'attrition',get_workforce_finance:'finance',get_workforce_skills:'skills',get_workforce_planning:'workforce-planning',get_talent_acquisition:'talent-acquisition',get_survey_sentiment:'survey-sentiment'};
const post={run_business_unit_scenario:'business-unit-scenario',run_position_action_scenario:'position-actions',run_structural_position_scenario:'position-structure',run_workforce_response_plan:'workforce-response-plan',run_role_workforce_response_plan:'role-workforce-response-plan',run_workforce_response_portfolio:'workforce-response-portfolio',run_business_unit_response_allocation:'business-unit-response-allocation',run_time_phased_workforce_execution:'time-phased-workforce-execution',run_workforce_response_constraints:'workforce-response-constraints',run_constraint_aware_workforce_scheduler:'constraint-aware-workforce-scheduler'};
const definitions=structuredClone(peopleAnalyticsTools);
const scheduler=definitions.find(t=>t.name==='run_constraint_aware_workforce_scheduler');
const object=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const month={type:['string','null'],maxLength:7},capacity={type:['number','null'],minimum:0,maximum:200000};
scheduler.parameters.properties.scheduling_assumptions={anyOf:[{type:'null'},object({start_month:month,earliest_effective_months:object({build:month,move:month,buy:month}),monthly_capacity:object({build:capacity,move:capacity,buy:capacity})})]};
scheduler.parameters.required.push('scheduling_assumptions');
export const candidateTools=deepFreeze(definitions);
export function createCandidateTools(read){
 return Object.freeze({definitions:candidateTools,async run(name,args,signal){
  signal.throwIfAborted();const definition=candidateTools.find(t=>t.name===name);if(!definition)throw Error('Unsupported candidate tool.');
  assertSolutionShape(args,definition.parameters,'tool arguments');
  if(get[name])return read('/api/'+get[name],undefined,signal);
  // Top-level nullable optional tool arguments mean keep API defaults. Nested
  // nulls are meaningful unknowns and are never replaced with zero.
  const body=Object.fromEntries(Object.entries(args).filter(([,v])=>v!==null));
  if(name==='run_workforce_scenario'){
   if(body.additional_attrition_pct_points!==undefined){
    if(body.annual_attrition_pct!==undefined)throw Error('Use either explicit attrition or an additional attrition assumption.');
    const source=await read('/api/scenario-modeler',undefined,signal);body.annual_attrition_pct=source.defaults.annual_attrition_pct+body.additional_attrition_pct_points;delete body.additional_attrition_pct_points;
   }
   return read('/api/scenario-modeler',{assumptions:body},signal);
  }
  if(name==='get_internal_talent_readiness'||name==='get_role_buy_feasibility'){
   const route=name==='get_internal_talent_readiness'?'internal-talent-readiness':'role-buy-feasibility';
   return read('/api/'+route+'?'+new URLSearchParams(Object.entries(body).map(([k,v])=>[k,String(v)])).toString(),undefined,signal);
  }
  if(post[name])return read('/api/'+post[name],body,signal);
  throw Error('Unmapped candidate tool.');
 }});
}
