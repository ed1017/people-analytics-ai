import {aggregateRegistry} from './home-aggregate-registry.mjs';

/** Conservative eligibility for a directly rendered comparison, not general plan completion. */
export function standaloneAggregateQuestion(text){
 if(typeof text!=='string'||text.length>600||(text.match(/\?/g)??[]).length>1)return false;
 if(/\b(?:and|also|then|plus|why|because|cause|causes|causing|create|build|design|recommend|propose|develop|implement|revise|change|adjust|reduce|increase|improve)\b|\b(?:plan|planning)\s+(?:for|to|a|an|our|the)\b/i.test(text))return false;
 return /\b(?:what|which|where|rank|compare|show|list)\b/i.test(text)&&/\b(?:highest|lowest|most|least|largest|smallest|longest|shortest|slowest|fastest|compare|comparison|rank|distribution|concentrated)\b/i.test(text);
}

/** An explicit read contract, never a caller-selected route, table or SQL expression. */
export const homeAggregateTool={type:'function',name:'read_aggregate_comparison',strict:true,
 description:'Answer one factual comparison from a released aggregate collection, including lowest/highest rankings where complete. For business-unit turnover use total_turnover_ytd_pct unless voluntary turnover is explicitly requested: total uses all departures and verified matching average headcounts. Never substitute voluntary or departure counts for total turnover. If the user says group without a dimension, state that the supported comparison is by business unit, not department. The server returns the final dated comparison directly, without another model rewrite. Use only for a factual comparison, not a plan, causal explanation, or multi-part request. Current snapshot and company-wide scope only; never silently replace a requested historical period or subgroup filter. Unsupported scope/period produces a useful limitation. Lists marked bounded-source-list cannot establish dataset-wide rankings. Registry: '+JSON.stringify(aggregateRegistry.map(({id,metrics,period,coverage})=>({id,metrics,period,coverage}))),
 parameters:{type:'object',additionalProperties:false,required:['registryId','metric','order','limit','scope','asOf'],properties:{
  registryId:{type:'string',enum:aggregateRegistry.map(x=>x.id)},metric:{type:'string',minLength:1,maxLength:80},
  order:{type:'string',enum:['ascending','descending']},limit:{type:'integer',minimum:1,maximum:20},
  scope:{type:'string',enum:['company-wide','selected-or-other']},asOf:{type:'string',minLength:1,maxLength:40,description:'current only when the user requests current/latest or gives no historical period; otherwise the requested ISO date or literal requested period. Never convert last year into current.'},
 }}
};
