import {applicationFixture} from './action-plan-application.mjs';
import {selectionFixture} from './workforce-selection.mjs';
import {actionBinding} from '../../lib/home-action-drafts.ts';
const entered=value=>({value,kind:'user-entered',basis:'Reviewed fixture assumption.'});
export async function capacityFixture(){
 const {solution,payload}=selectionFixture(),draft=applicationFixture().currentDraft;
 draft.binding=await actionBinding(solution.goalId,solution.versions[0].inputs.scope.goalStatement,{sources:[]},{});
 const input=payload.input;Object.assign(draft.inputs.scope,{businessUnit:entered(input.businessUnit),jobProfile:entered(input.jobProfile),startMonth:entered(input.planningMonth),months:entered(Number(input.months)),demand:entered(Number(input.roles)),comparisonConfirmed:entered(true)});
 draft.inputs.capacity.input=structuredClone(input);draft.inputs.capacity.origins=Object.fromEntries(Object.entries(input).map(([key,value])=>[key,{kind:value?'user-entered':'unknown',basis:value?'Reviewed fixture':null}]));
 draft.inputs.capacity.flows.push({id:'move',path:'move',componentIds:['c3'],groupId:'other'});
 return {solution,draft};
}
