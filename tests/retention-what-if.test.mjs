import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyRetentionInput,calculateRetentionWhatIf,readRetentionInput} from '../lib/retention-what-if.ts';
import {readRetentionRecord,retainRetentionReview,retentionStorageField} from '../lib/retention-what-if-record.ts';
import {DecisionStore,DECISIONS_STORAGE_KEY} from '../lib/local-decisions.ts';
const input={...emptyRetentionInput(),population:'Technology employees in the stated planning cohort',startMonth:'2027-01',months:'12',baselineExpectedExits:'20',lagMonths:'3',activeBaselineMode:'direct',activeBaselineExpectedExits:'12',effectLowPct:'10',effectHighPct:'25',setupCost:'1000',participants:'50',perParticipantCost:'20',monthlyProgramCost:'100',fundedMonths:'6'};
const calculate=patch=>calculateRetentionWhatIf({...input,...patch});
const revision=(patch={})=>({id:'review-1',goalId:'goal-a',goalStatement:'Explore retention in Technology',savedAt:'2026-10-04T04:00:00.000Z',input:{...input},result:calculate({}),...patch});
const current={goalId:'goal-a',goalStatement:'Explore retention in Technology',input};
test('direct active-period baseline gives fractional conditional outcomes and costs',()=>{
 const before=structuredClone(input),r=calculate({});assert.equal(r.baselineActive,12);assert.equal(r.activeMonths,9);assert.equal(r.effectStartMonth,'2027-04');assert.equal(r.endMonth,'2027-12');
 assert.deepEqual(r.noIntervention,{expectedExits:20,fewerExits:0,programCost:0});assert.deepEqual(r.programNoEffect,{expectedExits:20,fewerExits:0,programCost:2600});
 assert.deepEqual(r.assumedRange.lowReduction,{expectedExits:18.8,fewerExits:1.2,programCost:2600});assert.deepEqual(r.assumedRange.highReduction,{expectedExits:17,fewerExits:3,programCost:2600});assert.deepEqual(input,before);
});
test('uniform allocation requires explicit opt-in and does not use employee headcount',()=>{
 assert.equal(calculate({activeBaselineMode:'',activeBaselineExpectedExits:''}).baselineActive,null);
 assert.equal(calculate({activeBaselineMode:'',activeBaselineExpectedExits:''}).assumedRange.highReduction.expectedExits,null);
 assert.equal(calculate({activeBaselineMode:'uniform',activeBaselineExpectedExits:''}).baselineActive,15);
 assert.equal(calculate({activeBaselineMode:'uniform',activeBaselineExpectedExits:''}).assumedRange.highReduction.fewerExits,3.75);
});
test('defaults contain no effect, baseline, zero costs or timing assumptions',()=>{assert.ok(Object.values(emptyRetentionInput()).every(value=>value===''));});
test('blank baseline and explicit zero are distinct',()=>{
 const unknown=calculate({baselineExpectedExits:'',activeBaselineExpectedExits:''});assert.equal(unknown.noIntervention.expectedExits,null);assert.equal(unknown.programNoEffect.programCost,2600);assert.equal(unknown.assumedRange.lowReduction.expectedExits,null);
 const zero=calculate({baselineExpectedExits:'0',activeBaselineExpectedExits:'0'});assert.equal(zero.assumedRange.highReduction.expectedExits,0);assert.equal(zero.assumedRange.highReduction.fewerExits,0);
});
test('missing effect endpoints leave the whole range unknown, explicit zero retains program cost',()=>{
 for(const field of ['effectLowPct','effectHighPct']){const r=calculate({[field]:''});assert.equal(r.assumedRange.lowReduction.fewerExits,null);assert.equal(r.assumedRange.highReduction.fewerExits,null);assert.equal(r.programNoEffect.expectedExits,20);}
 const r=calculate({effectLowPct:'0',effectHighPct:'0'});assert.deepEqual(r.assumedRange.lowReduction,r.programNoEffect);
});
test('lag zero uses full baseline; lag at or beyond horizon has no modeled benefit but retains cost',()=>{
 const zero=calculate({lagMonths:'0',activeBaselineMode:'',activeBaselineExpectedExits:''});assert.equal(zero.baselineActive,20);assert.equal(zero.effectStartMonth,'2027-01');
 for(const lag of ['12','13','120']){const r=calculate({lagMonths:lag,activeBaselineExpectedExits:'0'});assert.equal(r.activeMonths,0);assert.equal(r.baselineActive,0);assert.equal(r.assumedRange.highReduction.expectedExits,20);assert.equal(r.assumedRange.highReduction.programCost,2600);}
 assert.equal(calculate({lagMonths:'',activeBaselineExpectedExits:''}).assumedRange.highReduction.fewerExits,null);
});
test('contradictory lag and direct baseline assumptions are rejected',()=>{
 for(const patch of [{lagMonths:'0'},{lagMonths:'12'},{activeBaselineExpectedExits:'21'},{activeBaselineExpectedExits:'-1'},{activeBaselineMode:'automatic'}])assert.throws(()=>calculate(patch));
});
test('cost funding duration is independent of effect lag',()=>{
 assert.equal(calculate({lagMonths:'9'}).programNoEffect.programCost,2600);
 for(const field of ['setupCost','participants','perParticipantCost','monthlyProgramCost','fundedMonths'])assert.equal(calculate({[field]:''}).programNoEffect.programCost,null,field);
 const r=calculate({setupCost:'0',participants:'0',perParticipantCost:'0',monthlyProgramCost:'0',fundedMonths:'0'});assert.equal(r.programNoEffect.programCost,0);
 assert.throws(()=>calculate({fundedMonths:'13'}));
});
test('currency rounding applies to total; baseline effects retain fractional expected counts',()=>{
 assert.equal(calculate({setupCost:'.01',participants:'3',perParticipantCost:'.335',monthlyProgramCost:'.001',fundedMonths:'6'}).programNoEffect.programCost,1.02);
 assert.equal(calculate({baselineExpectedExits:'1.25',activeBaselineExpectedExits:'.5',effectLowPct:'12.5'}).assumedRange.lowReduction.fewerExits,.0625);
});
test('invalid, unbounded and non-finite input never becomes a default',()=>{
 for(const patch of [{months:'0'},{months:'25'},{months:'1.5'},{lagMonths:'-1'},{lagMonths:'121'},{lagMonths:'0.5'},{effectLowPct:'-1'},{effectHighPct:'101'},{effectLowPct:'40',effectHighPct:'20'},{setupCost:'Infinity'},{participants:'1.5'},{baselineExpectedExits:'NaN'},{baselineExpectedExits:'1e2'},{monthlyProgramCost:'1000000001'},{startMonth:'2027-13'},{startMonth:'2027-1'},{population:''}])assert.throws(()=>calculate(patch),JSON.stringify(patch));
});
test('year boundary and valid zero-reduction bounds',()=>{assert.equal(calculate({startMonth:'2027-11'}).effectStartMonth,'2028-02');assert.equal(calculate({effectLowPct:'0',effectHighPct:'100'}).assumedRange.highReduction.expectedExits,8);});
test('unknown scope/numeric fields and person-shaped data are outside the contract',()=>{
 for(const extra of [{headcount:500},{annualAttritionPct:12},{surveyEffect:20},{employeeIds:['person-1']}])assert.throws(()=>readRetentionInput({...input,...extra}));
 assert.throws(()=>readRetentionInput({...input,population:'x'.repeat(241)}));assert.throws(()=>readRetentionInput({...input,baselineExpectedExits:null}));
});
test('results state assumption provenance and exclude prediction, savings, ranking and person outputs',()=>{
 const r=calculate({});assert.equal(r.provenance,'user assumptions');assert.ok(r.limitations.some(text=>text.includes('not three interventions')));assert.ok(r.limitations.some(text=>text.includes('not an annual exit probability')));assert.ok(!('savings' in r)&&!('ranking' in r)&&!('predictions' in r));
});
test('explicit retention saves independent copies and revalidates math on read',()=>{
 const rev=revision(),record=retainRetentionReview(undefined,rev,current);assert.deepEqual(readRetentionRecord(record,'goal-a'),record);
 rev.result.programNoEffect.programCost=7;rev.input.population='Changed';assert.equal(record.revisions[0].result.programNoEffect.programCost,2600);assert.equal(record.revisions[0].input.population,input.population);
});
test('goal or input changes reject stale reviews; an explicitly recalculated revision preserves history',()=>{
 const first=retainRetentionReview(undefined,revision(),current);
 for(const patch of [{goalId:'goal-b'},{goalStatement:'Different wording'},{input:{...input,baselineExpectedExits:'21'}}])assert.throws(()=>retainRetentionReview(first,revision({id:'review-2'}),{...current,...patch}),/changed/);
 const changed={...input,effectHighPct:'30'},next=retainRetentionReview(first,revision({id:'review-2',input:changed,result:calculateRetentionWhatIf(changed)}),{...current,input:changed});assert.equal(next.revisions.length,2);assert.deepEqual(next.revisions[0],first.revisions[0]);
});
test('read rejects tampered math, mismatched goals, unknown schema and duplicate revision identity',()=>{
 const first=retainRetentionReview(undefined,revision(),current);
 for(const mutate of [r=>r.revisions[0].result.programNoEffect.programCost=1,r=>r.revisions[0].result.assumedRange.highReduction.fewerExits=7,r=>r.revisions[0].goalId='goal-b',r=>r.method='future',r=>r.version=2,r=>r.revisions.push(r.revisions[0]),r=>r.extra='unsupported',r=>r.revisions[0].savedAt='2026-02-30T04:00:00.000Z']){const record=structuredClone(first);mutate(record);assert.throws(()=>readRetentionRecord(record,'goal-a'));}
 assert.throws(()=>readRetentionRecord(first,'goal-b'));
});
test('storage bounds refuse append without dropping prior revisions',()=>{
 let record;for(let i=0;i<10;i++)record=retainRetentionReview(record,revision({id:`review-${i}`}),current);
 const before=structuredClone(record);assert.throws(()=>retainRetentionReview(record,revision({id:'review-11'}),current),/Ten/);assert.deepEqual(record,before);
 assert.throws(()=>readRetentionRecord({...record,extra:'x'.repeat(65536)},'goal-a'),/storage limit/);
});
test('separate goal-owned field survives existing browser storage without changing capacity or other goals',()=>{
 const values=new Map(),port={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},store=new DecisionStore();store.initialize(port);store.saveGoals({version:1,activeId:'goal-a',goals:[{id:'goal-a',statement:current.goalStatement},{id:'goal-b',statement:'Other goal'}]});store.setField('goal-a','workforceSolution',{sentinel:'preserve capacity'});store.setField('goal-b','note','preserve other goal');
 const record=retainRetentionReview(undefined,revision(),current);store.setField('goal-a',retentionStorageField,record);assert.equal(store.getSnapshot().saved,true);
 const restored=new DecisionStore();restored.initialize(port);assert.deepEqual(readRetentionRecord(restored.getField('goal-a',retentionStorageField,null),'goal-a'),record);assert.deepEqual(restored.getField('goal-a','workforceSolution',null),{sentinel:'preserve capacity'});assert.equal(restored.getField('goal-b','note',null),'preserve other goal');assert.ok(values.get(DECISIONS_STORAGE_KEY));
});
test('unknown outcomes round-trip without silently becoming zero',()=>{
 const partial={...input,effectLowPct:'',effectHighPct:'',monthlyProgramCost:''},rev=revision({input:partial,result:calculateRetentionWhatIf(partial)}),record=retainRetentionReview(undefined,rev,{...current,input:partial});assert.equal(readRetentionRecord(record,'goal-a').revisions[0].result.assumedRange.highReduction.expectedExits,null);assert.equal(record.revisions[0].result.programNoEffect.programCost,null);
});
