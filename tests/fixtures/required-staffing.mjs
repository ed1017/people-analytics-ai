/** Inferred illustrative unit inputs from review feedback; not the unavailable original prompt or DB facts. */
import {final} from './home-solution-conversation.mjs';
export const fixedMessages={start:'Illustrative scenario: fill 10 engineering roles over 12 months, with a budget of USD 1000000. Each hire costs USD 160000 for the whole 12-month period. Each trainee costs USD 5000 and needs 80 planned training hours. Redeployment adds zero cash per person. We have a pool of 4 redeployable people and a separate pool of 6 trainable people. Release, readiness, backfill costs and other cost coverage are unknown. New-hire training requirements are not specified.',followup:'Give me the numerical totals for the three options again.',correction:'Make training USD 7000 per trainee. Keep the required headcount, horizon and all other premises unchanged.'};
export const fixedValues={role:'Engineering roles',requiredRoles:10,months:12,currency:'USD',budget:1000000,hireCostPerPerson:160000,trainingCostPerPerson:5000,trainingHoursPerPerson:80,redeploymentCostPerPerson:0,trainablePeople:6,redeployablePeople:4,poolsDistinct:true};
export const fixedBasis=body=>({kind:'user-supplied',turnId:body.message.id,quote:body.message.text,explanation:'Explicit illustrative fixture input; not a company fact.'});
export const fixedChanges=(body,values=fixedValues)=>Object.entries(values).map(([field,value])=>({field,value,basis:fixedBasis(body)}));
export function fixedSteps(body){
 const changes=body.message.text===fixedMessages.start?fixedChanges(body):body.message.text===fixedMessages.correction?fixedChanges(body,{trainingCostPerPerson:7000}):[];
 return [{name:'compare_required_staffing',args:{changes}},items=>{
  const result=JSON.parse(items.filter(i=>i.type==='function_call_output').at(-1).output).requiredStaffing;
  if(!result?.options.length)throw Error('The fixed-role calculator returned no options.');
  const lines=result.options.map(o=>`Train ${o.train}, redeploy ${o.redeploy}, hire ${o.hire}: ${o.listedCash} ${result.input.currency}; ${o.train?o.plannedTrainingHours+' planned training hours':'new-hire training not specified'}.`);
  return final(lines.join('\n')+'\n'+(result.recommendation?.text??'Review missing inputs.')+' Next step: confirm release, readiness and backfill costs.');
 }];
}
