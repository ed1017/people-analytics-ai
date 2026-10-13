// Prompt recovered from rendered UI evidence. Responses below are authored offline,
// not captured provider arguments, raw HTTP responses or stored browser state.
export const staffingDeliveryPrompt="We need 10 additional people within 3 months. Assume 4 can transfer internally, 3 can be trained at $5,000 each, and 3 must be hired at $160,000 each in first-year cost. Training takes 80 hours per person. Recommend one action plan with cost, timing, resources and key assumptions.";
export function syntheticDeliveryChanges(body){
 const user=(quote)=>({kind:'user-supplied',turnId:body.message.id,quote,explanation:'Synthetic interpretation of the explicit scenario input; not an observed workforce fact.'});
 const rows=[['requiredRoles',10,'We need 10 additional people within 3 months.'],['months',12,'3 must be hired at $160,000 each in first-year cost.'],['hireCostPerPerson',160000,'3 must be hired at $160,000 each in first-year cost.'],['trainingCostPerPerson',5000,'3 can be trained at $5,000 each'],['trainingHoursPerPerson',80,'Training takes 80 hours per person.'],['trainablePeople',3,'3 can be trained at $5,000 each'],['redeployablePeople',4,'Assume 4 can transfer internally']];
 return [...rows.map(([field,value,quote])=>({field,value,basis:user(quote)})),...[
  {field:'role',value:'Additional receiving-function roles — role mix to confirm',basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'Unconfirmed planning label; no occupation or skill match inferred.'}},
  {field:'currency',value:'USD',basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'Unconfirmed currency interpretation for this synthetic dollar-denominated scenario.'}},
  {field:'redeploymentCostPerPerson',value:0,basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'Conditional no-fees/no-relocation transfer scenario, not a verified zero cost. Backfill and complete costs remain unknown.'}},
 ]];
}
