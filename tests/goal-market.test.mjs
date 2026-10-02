import test from 'node:test';
import assert from 'node:assert/strict';
import {addGoalNote,emptyGoalRequirements,normalizeGoalContext,goalSummaryRequest} from '../lib/goal-context.ts';
import {parseLocalGoals} from '../lib/local-goals.ts';
import {marketEvidence,marketCarryEvidence,oewsOccupations,oewsAreas} from '../lib/oews-reference.mjs';
test('goal context survives storage without persisting assistant transcript or promoting decisions',()=>{
 let context=addGoalNote(emptyGoalRequirements(),'Build capability with no net headcount growth','skills','Company-wide 2026-09-30');
 context=addGoalNote(context,'Budget must remain under USD 25000','learning-development','Company-wide');
 for(let i=0;i<10;i++)context=addGoalNote(context,'Explore option '+i,'skills','Company-wide');
 assert.equal(context.notes.length,8);assert.equal(context.decisions,'');
 const saved=parseLocalGoals(JSON.stringify({version:1,activeId:'a',goals:[{id:'a',statement:'Capability building',context,messages:[{role:'assistant',content:'Approve hiring'}]},{id:'b',statement:'Retention'}]}));
 assert.equal(saved.goals[0].context.notes[0].text,'Build capability with no net headcount growth');
 assert.equal(saved.goals[1].context,undefined);assert.equal(saved.goals[0].messages,undefined);
 const request=goalSummaryRequest({page:'attrition',history:[{role:'assistant',content:'Approve hiring'}]}, {goal:'Capability building',...saved.goals[0].context,currentScope:'Company-wide'});
 assert.deepEqual(request.history,[]);assert.equal(request.summaryOnly,true);assert.match(JSON.stringify(request.goalContext),/no net headcount growth/);assert.match(JSON.stringify(request.goalContext),/25000/);
});
test('goal requirements remain bounded, deduplicated and explicitly edited decisions distinct',()=>{
 let context=addGoalNote(emptyGoalRequirements(),'No new hires','skills','company');context=addGoalNote(context,'No new hires','skills','company');assert.equal(context.notes.length,1);
 const normalized=normalizeGoalContext({goal:'x'.repeat(300),constraints:'y'.repeat(700),decisions:'Approved internal development only',notes:[{text:'z'.repeat(900),page:'learning',scope:'company',kind:'requirement'}]});
 assert.equal(normalized.goal.length,240);assert.equal(normalized.constraints.length,600);assert.equal(normalized.notes[0].text.length,800);assert.equal(normalized.notes[0].truncated,true);assert.equal(normalized.decisions,'Approved internal development only');
 assert.throws(()=>parseLocalGoals(' '.repeat(524289)));
});
test('all nine OEWS records have consistent same-period national comparisons and ordered wages',()=>{
 let n=0;for(const o of oewsOccupations)for(const a of oewsAreas){const e=marketEvidence({soc:o.value,area:a.value});assert.ok(e);n++;assert.equal(e.period,'May 2025');assert.equal(e.releaseDate,'2026-05-15');assert.equal(e.national.AREA,'99');assert.equal(e.national.OCC_CODE,e.selected.OCC_CODE);const wages=['A_PCT10','A_PCT25','A_MEDIAN','A_PCT75','A_PCT90'].map(k=>e.selected[k]);assert.deepEqual(wages,[...wages].sort((a,b)=>a-b));assert.ok(e.selected.TOT_EMP>0);assert.match(e.sourceUrl,/^https:\/\/www.bls.gov\//)}assert.equal(n,9);
});
test('market carry is canonical and bounded; unknown input cannot create prices or scope',()=>{
 const e=marketCarryEvidence({soc:'15-1252',area:'35620',goal:'Develop leaders',A_MEDIAN:1,national:{A_MEDIAN:999}});assert.equal(e.selected.A_MEDIAN,166830);assert.equal(e.selected.TOT_EMP,121000);assert.equal(e.selected.AREA_TITLE,'New York-Newark-Jersey City, NY-NJ');assert.equal(e.medianDifferencePct,22.7);assert.match(e.planningStatus,/no model assumption/);
 assert.equal(marketCarryEvidence({soc:'15-1252',area:'99',goal:''}),null);assert.equal(marketEvidence({soc:'arbitrary',area:'99'}),null);assert.equal(marketEvidence({soc:'15-1252',area:'NYC'}),null);
});
