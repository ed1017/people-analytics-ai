import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBundleDraft,reconcileBundle,unknownAssumption} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {homePlanSummary,planSummarySentences} from '../lib/home-plan-summary.ts';
const legacy=JSON.parse(readFileSync(new URL('./fixtures/home-plan-legacy-costs.json',import.meta.url)));
const entered=value=>({value,kind:'user-entered',basis:'Explicit test input.'});
const goal='Reduce turnover by 2 percentage points over 12 months with a $100,000 illustrative budget for 10 participants.';
const fresh=(text=goal)=>prepareIllustrativePilot(createBundleDraft(legacy.base.bundle,{...legacy.base.binding,goal:text}),'2026-10-06T12:00:00Z',{includeDeliveryEstimate:true});
const section=(rows,name)=>rows.find(row=>row.heading===name).items;
test('separate summary facts retain exact goal, unknown baseline, cap, cash and staff hours without mutating a plan',()=>{
 const draft=fresh();draft.inputs.deliveryEstimate.coordinationHours=entered(24);const result=reconcileBundle(draft),before=JSON.stringify({draft,result}),rows=homePlanSummary(draft,result);
 assert.deepEqual(section(rows,'People needed'),['10 assumed participants.','44 total staff hours.']);
 const costs=section(rows,'Cost').join(' ');assert.match(costs,/Assumed cash \$3,500 USD — listed subtotal/);assert.match(costs,/Reviewed full budget: Unknown/);assert.match(costs,/Budget limit \$100,000 USD \(cash cap, not an expense\)/);assert.doesNotMatch(costs,/\$96,500|\$2,640/);assert.match(costs,/no available headroom/);
 assert.ok(section(rows,'How success is measured').includes('Goal: '+goal));assert.ok(section(rows,'How success is measured').includes('Baseline: Unknown.'));assert.match(section(rows,'How success is measured').join(' '),/2 percentage-point reduction/);assert.doesNotMatch(JSON.stringify(rows),/15%|12%|100 assumed participants/);assert.match(section(rows,'Timeline').join(' '),/12 months/);
 assert.equal(section(rows,'Stakeholders').length,new Set(draft.bundle.components.map(item=>item.ownerRole)).size+1);assert.equal(section(rows,'Expected outcome').filter(item=>item.startsWith('Deliverable target:')).length,result.deliveryEstimate.deliverables.length);assert.equal(JSON.stringify({draft,result}),before);
});
test('different explicit inputs render their own quantities and all work packages',()=>{
 const draft=fresh('Reduce turnover by 5 percentage points over 9 months with a $90,000 demo budget for 7 participants.'),result=reconcileBundle(draft),rows=homePlanSummary(draft,result),text=JSON.stringify(rows);
 assert.match(text,/7 assumed participants/);assert.match(text,/30 total staff hours/);assert.match(text,/9 months/);assert.match(text,/\$90,000/);assert.match(text,/5 percentage-point reduction/);assert.doesNotMatch(text,/\$100,000|44 total staff hours|12 months/);
 for(const name of result.deliveryEstimate.deliverables)assert.ok(section(rows,'Expected outcome').some(item=>item.includes(name)));
});
test('missing amounts, zero costs and missing participant overlap remain distinct',()=>{
 for(const mode of ['missing','zero','overlap']){
  const draft=fresh();if(mode==='missing')draft.inputs.expenses[0].amount=unknownAssumption();if(mode==='zero')draft.inputs.expenses.forEach(row=>row.amount=entered(0));if(mode==='overlap')draft.inputs.groups.push({...draft.inputs.groups[0],id:'second-group'});
  const rows=homePlanSummary(draft,null),costs=section(rows,'Cost').join(' ');
  assert.match(costs,/Reviewed full budget: Unknown/);assert.match(costs,/no available headroom/);
  if(mode==='missing')assert.match(costs,/Assumed cash Unknown/);
  if(mode==='zero')assert.match(costs,/Assumed cash \$0 USD — listed subtotal/);
  if(mode==='overlap')assert.match(section(rows,'People needed').join(' '),/Participants: Unknown.*Unknown total staff hours/);
 }
});
test('complete zero-cash review may show valid headroom, while changed scope hides stale measure values',()=>{
 const draft=fresh();draft.inputs.expenses=[];draft.inputs.expenseLinks=[];draft.inputs.costsDistinct=entered(true);draft.inputs.scope.capacityRequired=entered(false);draft.inputs.costReviews.forEach(row=>row.complete=entered(true));
 const result=reconcileBundle(draft),rows=homePlanSummary(draft,result);assert.match(section(rows,'Cost').join(' '),/Reviewed full budget: \$0 USD/);assert.match(section(rows,'Cost').join(' '),/\$100,000 USD headroom under reviewed assumptions/);
 draft.inputs.scope.months=entered(6);const changed=section(homePlanSummary(draft,null),'How success is measured').join(' ');assert.match(changed,/needs renewed review/);assert.doesNotMatch(changed,/User target:/);
});
test('sentence presentation preserves wording, decimals and abbreviation content',()=>{
 const text='Use a 2.5-hour session. Keep the U.S. scope unchanged. Review the owner role.';
 assert.equal(planSummarySentences(text).join(' '),text);assert.ok(planSummarySentences(text).length>=2);
});
test('capacity summary retains known role targets when role cost is missing',()=>{
 const draft=fresh('Add 5 roles over 12 months');draft.inputs.whatIf.unitCost=unknownAssumption();
 const rows=homePlanSummary(draft,null);assert.match(section(rows,'How success is measured').join(' '),/User target: 5 roles/);assert.match(section(rows,'Cost').join(' '),/Assumed cash Unknown/);assert.doesNotMatch(section(rows,'Cost').join(' '),/Assumed cash \$3,500/);
});
