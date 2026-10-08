// Newly invented solely for the authorized low-sensitivity model evaluation.
// No saved browser data, workforce loader, private documents or prior chats are read.
import {normalizeHomePack} from '../../lib/home-pack.mjs';
import {actionBinding} from '../../lib/home-action-drafts.ts';
import {createBundleDraft,reviseBundleDraft} from '../../lib/home-bundle-reconciliation.ts';
import {createPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
import {emptySolutionState,readSolutionRequest} from '../../lib/home-solution-conversation.ts';
export const fictionalProvenance={version:1,origin:'New fictional test literals authored for this evaluation',realUserConversation:false,realPeople:false,realWorkforceRecords:false,privateOrganizationalData:false,privateFileContent:false,syntheticPopulation:'Fictional evaluation population Kestrel',syntheticClock:'2026-11-01T15:24:00.000Z'};
export const fictionalScenarios=[
 {id:'clock-deadline',saved:true,turns:['What time is it?','Why might the manager support plan help reduce turnover?','Change its deadline to November 20, 2026.']},
 {id:'goal-select-refine',saved:false,selectAfterTurn:1,turns:['I want to reduce turnover. Suggest a useful approach beyond standard workshops.','Keep that idea, but make it volunteer-led and avoid manager workshops.','Replace its main activity with peer check-ins; keep costs and dates unknown until we review them.']},
 {id:'blend-replace',saved:true,turns:['Combine the manager support and learning approaches.','Replace manager support with an open office hour, but keep the learning activity.','Keep that learning component unchanged and explain how the two activities could work together.']},
 {id:'same-people-correction',saved:true,turns:['Use the same ten people for the manager support and learning activities.','Halve that participant count, keeping both activities.','Correction: use eight shared participants instead.']},
 {id:'constraint-recovery',saved:true,turns:['Set a cash ceiling of 2500 dollars; if the existing fee exceeds it, review a 2000-dollar fee instead.','Drop the budget cap, but retain that proposed fee.','What savings or retention improvement can we honestly claim from that?']},
 {id:'headcount-followup',saved:false,turns:['Project company headcount for the next three months using the supplied active scenario inputs.','Assume hiring fills at half that rate.','Can we use the same assumptions to project the Engineering team?']}
];
export function fictionalEvidence(){return normalizeHomePack({workforceScope:'All company; wholly fictional evaluation population',sources:[{id:'W1',status:'loaded',date:'2026-10-31',facts:{headcount:127,fte:123,open_positions:4}},{id:'A1',status:'loaded',date:'2026-10-31',facts:{total_exits:12,voluntary_exits:9,voluntary_turnover_ytd_pct:7.2}}]});}
const assumed=value=>({value,kind:'illustrative',basis:'New fictional evaluation input; no real employee, commitment or observed effect.'});
export async function fictionalCatalog(){
 const goal={goalId:'fictional-turnover',goal:'Reduce turnover'},binding=await actionBinding(goal.goalId,goal.goal,fictionalEvidence(),{origin:'fictional-evaluation-v2'});
 const examples=[['A','Manager support','manager_workload','Invite volunteers to discuss a workload obstacle and review one reversible response.'],['B','Learning practice','learning','Let volunteers practise a skill chosen from their own fictional work examples.'],['C','Peer feedback','execution','Ask volunteers to exchange brief feedback on a small reversible process change.']];
 return createPlanAlternatives(goal,examples.map(([id,name,domain,firstStep])=>{
  const draft=createBundleDraft({id,origin:'conversation-v1',name,objective:'Test a proposed approach to the fictional retention goal',coordination:'Discuss the activity, capacity and learning criteria before a voluntary trial.',components:[{id:'c1',name,domain,firstStep,ownerRole:'Fictional volunteer coordinator',evidence:[],dependsOn:[],limitation:'Invented evaluation proposal; effectiveness is unproven.'}],limitation:'Wholly fictional test plan. No operational or effectiveness claim.'},binding),input=draft.inputs;
  input.costPolicy='cash-hours-v2';Object.assign(input.scope,{population:assumed('Fictional volunteer cohort'),startMonth:assumed('2026-11'),months:assumed(3),capacityRequired:assumed(false),requirements:assumed('Use volunteers and make no claim of retention effect.')});
  input.groups=[{id:'fictional-people',label:'Fictional cohort',count:assumed(10)}];input.groupsDisjoint=assumed(true);input.memberships=[{componentId:'c1',groupIds:['fictional-people'],complete:assumed(true)}];input.timing=[{componentId:'c1',start:assumed('2026-11-01'),finish:assumed('2026-11-14')}];input.dependenciesConfirmed=assumed(true);
  input.expenses=[{id:'fictional-fee',label:'Invented delivery fee',kind:'cash',amount:assumed(3000),startMonth:assumed('2026-11'),months:assumed(1)}];input.expenseLinks=[{expenseId:'fictional-fee',componentIds:['c1'],allocations:null}];input.costReviews=[{componentId:'c1',complete:assumed(true)}];input.costsDistinct=assumed(true);input.budget={amount:assumed(10000),basis:assumed('cash')};input.deliveryEstimate={hoursPerParticipant:assumed(2),coordinationHours:assumed(8),hourlyRate:{value:null,kind:'unknown',basis:null},acceptance:assumed('Collect voluntary feedback; effectiveness remains unknown.')};
  return {id,draft:reviseBundleDraft(draft,input)};
 }));
}
export function fictionalProjection(filters={country:'all',org:'all',level:'all'}){return {asOf:'2026-10-31',opening:127,filters,scope:'Fictional evaluation population Kestrel',relations:['fictional_current_v2','fictional_defaults_v2','fictional_curve_v2'],datasetVersion:null,defaults:{annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:12,fill_rate_pct:100,productivity_hiring_reduction_pct:0},baseline:[128,129,130].map((n,index)=>({planning_month:['2026-11-01','2026-12-01','2027-01-01'][index],planned_headcount:n,planned_fte:n,planned_labor_cost_usd:n*1000}))};}
export async function fictionalRequest(scenario,index,state=emptySolutionState(),goal,catalog){
 const saved=catalog??(scenario.saved?await fictionalCatalog():null),active=goal??(scenario.saved?{id:'fictional-turnover',statement:'Reduce turnover'}:{id:'',statement:''});
 const filters={country:'all',org:scenario.id==='headcount-followup'&&index===2?'ENG':'all',level:'all'};
 return readSolutionRequest({version:1,requestId:scenario.id+'-'+(index+1),goal:active,scope:filters.org==='ENG'?'Fictional Engineering team':'All company; wholly fictional evaluation population',filters,timeZone:'UTC',evidence:fictionalEvidence(),goalContext:null,selectedId:saved?.order[0]??null,catalog:saved,state,message:{id:'user-'+(index+1),text:scenario.turns[index]}});
}
