// @ts-expect-error Native fixtures share source.
import {catalogRoleCode,catalogDisplayLabel} from './catalog-display.ts';
// @ts-expect-error Native fixtures share source.
import {readStaffingTemplate} from './staffing-template.ts';
// @ts-expect-error Native fixtures share source.
import {confirmsBudgetAmount} from './hiring-budget-authority.ts';
// @ts-expect-error Native fixtures share source.
import {emptyHiringBudget,readHiringBudgetInput} from './hiring-budget.ts';
import type {SolutionRequest} from './home-solution-conversation';
// @ts-expect-error Native fixtures share source.
import {normalizeHomeQuestion} from './home-question-text.ts';

/** Initial, unspecified starter only: collect premises without buying a model round. */
export function staffingStarterIntake(request:SolutionRequest){
 const text=normalizeHomeQuestion(request.message.text);
 const s=request.state;
 const template=readStaffingTemplate(request.message.text);
 const roles=template?.role.split(',').map(role=>catalogRoleCode(role))??[];
 if(template&&template.description===''&&/^\d+(?:\.\d+)?$/.test(template['fte needed'])&&Number(template['fte needed'])>0&&roles.length>1&&roles.every((role):role is string=>role!==null)&&new Set(roles).size===roles.length){
  const question=`How should the total ${template['fte needed']} FTE be split across ${roles.map(role=>catalogDisplayLabel(role!)).join(', ')}?`;
  return {questions:[question],answer:question+'\n\nReply with FTE per role, or ask to compare allocations.'};
 }
 const gap=text.match(/^(?:how (?:can|could|would) (?:we|you) )?close (?:the |a )?(\d+(?:\.\d+)?) fte capacity gap$/);
 if((text!=='how can we close a staffing gap'&&(!gap||Number(gap[1])>100000))||request.goal.statement||request.selectedId||request.catalog||request.goalContext||s.turns.length||s.constraints.length||s.working.length||s.analyses.length||s.requiredStaffing||s.staffingDeliveryTarget||s.hiringBudget||s.businessPlanning)return null;
 const questions=[
  'Which role or team needs capacity, and how many additional people or what workload must be covered?',
  'By when is it needed, and what budget or constraints apply to hiring, redeployment or training?',
 ];
 return {questions,answer:(gap?`You specified a ${gap[1]} FTE capacity gap. This alone does not specify a role, dates, budget or available staffing pools. `:"Let us define the gap before comparing options. ")+questions.join(' ')+' If a quantity is unknown, say so. I have not calculated a gap, cost or staffing plan yet.'};
}

/** Capture funding at the same turn where strict template validation grants authority.
 * Only a new conversation may seed this premise; never attach it to an older plan.
 * Counts, role allocation, currency and pay remain unknown. */
export function initialStaffingTemplateBudget(request:SolutionRequest):number|null{
 const s=request.state;
 if(request.message.text.length>4000||request.goal.id||request.goal.statement||request.selectedId||request.catalog||request.goalContext||s.turns.length||s.constraints.length||s.working.length||s.analyses.length||s.requiredStaffing||s.staffingDeliveryTarget||s.hiringBudget||s.businessPlanning)return null;
 const value=readStaffingTemplate(request.message.text)?.['budget (optional)'];
 const match=value?.match(/^(?:USD\s*|\$\s*)?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)(\s*[km])?$/i);
 if(!match)return null;
 const amount=Number(match[1].replaceAll(',',''))*(match[2]?.trim().toLowerCase()==='k'?1000:match[2]?.trim().toLowerCase()==='m'?1000000:1);
 if(!confirmsBudgetAmount(request.message.text,amount))return null;
 try{readHiringBudgetInput({...emptyHiringBudget(),budget:amount});return amount;}catch{return null;}
}
