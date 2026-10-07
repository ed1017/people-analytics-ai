import {retentionProposal} from './home-retention-proposal.mjs';
export const activityGoal='QA PR176 — reduce employee turnover by exactly 2 percentage points over 12 months';
export const activityContext='Country: United States. Illustrative budget: $100000. The target is exactly a 2-percentage-point turnover reduction over 12 months. Budget is not approved; all results are assumptions.';
export const activityPrompts=[
 'Revise Action Plan #1 by adding monthly manager check-ins and a quarterly review of turnover signals. Keep the target exactly a 2-percentage-point reduction over 12 months and the illustrative $100000 budget cap. Create this as a new numbered alternative and preserve the first three plans.',
 'Add monthly manager check-ins and quarterly turnover-signal reviews to the selected plan. Keep the target exactly a 2-percentage-point reduction over 12 months and the illustrative $100000 budget cap.',
];

// Observed hosted names, actions and proposed-role pairings. Domain tags were
// not exposed in the browser evidence; these are valid deliberately varied tags.
export function reportedActivityProposal(goal){
 const proposal=retentionProposal(goal),plan=proposal.bundles[0];
 plan.name='Manager Practice Reset';
 plan.objective='Review turnover signals, run manager feedback practice and review implementation against the agreed baseline.';
 plan.coordination='Use the turnover signal review to inform manager feedback routines, then review implementation and remaining evidence gaps.';
 plan.components=[
  {id:'c1',name:'Turnover Signal Review',domain:'execution',ownerRole:'HR analytics lead',firstStep:'Compare voluntary exits, manager-related exits and manager-experience signals without combining denominators.',dependsOn:[]},
  {id:'c2',name:'Manager Feedback Routines',domain:'learning',ownerRole:'Learning and development lead',firstStep:'Run structured manager feedback and delegation practice for managers in reviewed focus groups.',dependsOn:['c1']},
  {id:'c3',name:'Execution Review',domain:'execution',ownerRole:'HR business partner',firstStep:'Review participation, manager feedback and turnover indicators against the approved baseline.',dependsOn:['c2']},
 ].map(component=>({...component,evidence:['W1:summary'],limitation:'Proposed roles, not assigned people. Source context does not prove an intervention effect or implementation approval.'}));
 return proposal;
}

export const reportedActivityDates=[['2026-11-01','2026-11-14'],['2026-11-15','2026-11-28'],['2026-11-29','2026-12-12']];
