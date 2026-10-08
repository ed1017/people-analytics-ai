/** Fictional aggregate assumptions only; no employees, network or storage. */
import {createBundleDraft} from '../../lib/home-bundle-reconciliation.ts';
import {actionBinding} from '../../lib/home-action-drafts.ts';
import {emptyWorkforcePlanInput} from '../../lib/workforce-increment.ts';
import {bundleProposalFixture} from './home-bundles.mjs';
export const known=value=>({value,kind:'user-entered',basis:'Explicit synthetic planning assumption; not verified operational data.'});
export const unknown=()=>({value:null,kind:'unknown',basis:null});
const goal='Review Technical Support Specialist workload and staffing';
export async function workloadFixture(){
 const options=[];
 for(const build of [4,8]){
  const original=bundleProposalFixture(goal).bundles[0];
  const bundle={...original,components:[{...original.components[1],id:'c1',dependsOn:[]},{...original.components[4],id:'c2',dependsOn:[]},{...original.components[4],id:'c3',name:'Source-team backfill',dependsOn:[]},{...original.components[2],id:'c4',dependsOn:[]}]};
  const draft=createBundleDraft(bundle,await actionBinding('workload-goal',goal,{},{}));
  const input={...emptyWorkforcePlanInput(),businessUnit:'BU-SUPPORT',jobProfile:'OPS-CLIENT',intent:'additional',roles:'12',build:String(build),move:'0',buy:String(12-build),backfills:String(build),planningMonth:'2027-01',months:'3',arrivalMode:'explicit',arrivalDate:'2027-01-01',buildMonth:'2027-03',moveMonth:'2027-03',backfillDate:'2027-03-01',annualHireCost:'96000',hireFee:'1000',annualBackfillCost:'72000',backfillFee:'500',internalAnnualCostChange:'0',trainingCash:'',trainingHours:'',loadedHourlyCost:'',budget:'1000000',maxAddedEmployees:'12',deadlineMonth:'2027-03'};
  draft.inputs.costPolicy='cash-hours-v2';Object.assign(draft.inputs.scope,{population:known('Technical support'),businessUnit:known(input.businessUnit),jobProfile:known(input.jobProfile),startMonth:known(input.planningMonth),months:known(3),demand:known(12),capacityRequired:known(true)});
  draft.inputs.capacity={input,origins:Object.fromEntries(Object.entries(input).map(([key,v])=>[key,{kind:v?'user-entered':'unknown',basis:v?'Synthetic reviewed staffing assumption.':null}])),flows:[{id:'build',path:'build',componentIds:['c1'],groupId:'trainees'},{id:'buy',path:'buy',componentIds:['c2'],groupId:null},{id:'backfills',path:'backfills',componentIds:['c3'],groupId:null}]};
  draft.inputs.groups=[{id:'trainees',label:'Explicit distinct source cohort',count:known(build)}];draft.inputs.groupsDisjoint=known(true);
  draft.inputs.memberships=draft.bundle.components.map(c=>({componentId:c.id,groupIds:c.id==='c1'?['trainees']:[],complete:known(true)}));
  draft.inputs.timing=draft.bundle.components.map(c=>({componentId:c.id,start:known('2027-01-01'),finish:known(c.id==='c1'||c.id==='c3'?'2027-03-01':'2027-01-01')}));
  draft.inputs.dependenciesConfirmed=known(true);draft.inputs.costsDistinct=known(true);draft.inputs.costReviews.forEach(r=>r.complete=known(true));
  draft.inputs.expenseLinks=['hireStaffingCost','recruitingFees','backfillStaffingCost','internalSalaryUplift','trainingCash'].map(field=>({expenseId:'capacity:'+field,componentIds:[field==='trainingCash'?'c1':field==='backfillStaffingCost'?'c3':'c2'],allocations:null}));
  draft.inputs.budget={amount:known(1000000),basis:known('cash')};
  options.push({id:'hire-'+(12-build)+'-train-'+build,draft,productivity:'zero-until-ready-then-full',cohortsDisjoint:true,training:{basis:'per-person',cash:known(600),hours:known(40)},cohorts:[{id:'trainees',path:'build',sourcePoolId:'source',assignedMonth:'2027-01',trainingHoursByMonth:[known(build*20),known(build*20),known(0)]}]});
 }
 return {identity:{goalId:'workload-goal',goal,datasetToken:'legacy-v1:0',revision:options[0].draft.revision},profile:{code:'OPS-CLIENT',label:'Technical Support Specialist',familyCode:null},workload:{mode:'total',ticketsByMonth:[known(5760),known(5760),known(5760)],minutesPerTicket:known(20),productiveHoursPerRole:known(160)},target:{poolId:'target',baselineRoles:known(0),availabilityPct:known(100),baselineCohortIds:[]},source:{poolId:'source',capacityHoursByMonth:[known(1280),known(1280),known(1280)],workloadHoursByMonth:[known(1200),known(1200),known(1200)],productiveHoursPerRole:known(160),disjointFromTarget:true},managers:[{poolId:'shared-manager-pool',count:known(2),existingReports:known(4),spanLimit:known(8),uncommittedHoursByMonth:[known(30),known(30),known(30)],hoursPerAddedReport:known(2),coachingHoursPerTraineeMonth:known(1)}],options};
}
