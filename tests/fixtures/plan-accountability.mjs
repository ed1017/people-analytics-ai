import {candidate,quantity} from './home-solution-conversation.mjs';
export const accountabilityMessage='Reduce turnover in the Fictional test group. For this test, proposed baseline 8.2%, target 6.56%; Learning lead owns the review on 2026-11-14. Ten participants, two hours per participant and eight coordination hours. Start November 2026 for three months.';
export const accountabilityNextStep='Learning lead reviews participation and feedback on 2026-11-14.';
export const accountabilityScopeChange='Change the planning population to Another fictional test group. Keep the existing baseline and target for reference; they still need review for the new population.';
export function accountabilityQuantity(body,field,value,unit,target=null){
 const q=quantity(field,typeof value==='number'?value:null,unit,target,body.message.id);
 return {...q,text:typeof value==='string'?value:null,interpretation:'Synthetic user-supplied premise; proposed and not confirmed.'};
}
export function accountabilityCandidate(body){
 const c=candidate('accountability');c.goal={statement:'Reduce turnover',turnId:body.message.id};c.name='Accountability review';c.nextStep=accountabilityNextStep;c.successMeasure='Matched-period turnover rate';c.activities[0].ownerRole='Learning lead';
 const q=(...args)=>accountabilityQuantity(body,...args);
 c.quantities=[q('success_baseline','8.2%','text'),q('success_target','6.56%','text'),q('population','Fictional test group','text'),q('start_month','2026-11','YYYY-MM'),q('horizon_months',3,'months'),q('participants',10,'people','c1'),q('hours_per_participant',2,'hours/person/total'),q('coordination_hours',8,'hours/total')];
 return c;
}
