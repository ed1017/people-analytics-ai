import {emptySolutionInputs,createWorkforceSolution,beginSolutionRun,completeSolutionRun} from '../../lib/workforce-solution.ts';
import {workforceInputGroups} from '../../lib/workforce-guided-intake.ts';
import {capacityFixture} from './home-plan-integration.mjs';
const entered=value=>({value,kind:'user-entered',basis:'Reviewed synthetic acceptance fixture.'});
export async function adoptionFixture(goalId,goal){
 const fixture=await capacityFixture(),input=fixture.draft.inputs;
 input.memberships.find(item=>item.componentId==='c3').groupIds=['cohort','other'];
 input.dependenciesConfirmed=entered(true);input.costsDistinct=entered(true);input.costReviews.forEach(item=>item.complete=entered(true));
 input.timing.forEach((item,index)=>{item.start=entered(`2026-10-${String(index*2+1).padStart(2,'0')}`);item.finish=entered(`2026-10-${String(index*2+2).padStart(2,'0')}`);});
 input.expenses=[{id:'manager-cost',label:'Manager pilot materials',kind:'cash',amount:entered(500),startMonth:entered('2026-10'),months:entered(1)}];
 input.expenseLinks=[{expenseId:'manager-cost',componentIds:['c1'],allocations:null},...['hireStaffingCost','backfillStaffingCost','internalSalaryUplift','recruitingFees','trainingCash','employeeTimeValue'].map(field=>({expenseId:'capacity:'+field,componentIds:['trainingCash','employeeTimeValue'].includes(field)?['c2','c3']:['c5'],allocations:['trainingCash','employeeTimeValue'].includes(field)?[{componentId:'c2',percent:50},{componentId:'c3',percent:50}]:null}))];
 const prior=fixture.solution,payload=prior.results[0].payload,fields=emptySolutionInputs();
 for(const [section,,items] of workforceInputGroups)for(const [field] of items)fields[section][field]=input.capacity.input[field];
 fields.scope.goalStatement=goal??fixture.draft.binding.goal;
 const solution=createWorkforceSolution(prior.id,goalId??prior.goalId,fields,'2026-10-05T00:00:00Z'),run=beginSolutionRun(solution,1,'source-run',['brief'],'2026-10-05T00:00:00Z');
 fixture.solution=completeSolutionRun(run.state,run.ticket,[{id:'source-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],'2026-10-05T00:00:00Z');
 return fixture;
}
