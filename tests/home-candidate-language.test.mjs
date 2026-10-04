import test from 'node:test';
import assert from 'node:assert/strict';
import {homeCandidateLanguage} from '../lib/home-candidate-language.ts';
import {inspectHomeCandidateProposal} from '../lib/home-candidate-options.ts';
const pack={sources:[{id:'S1',status:'loaded',facts:{respondents:12}},{id:'A1',status:'loaded',facts:{exits:15}}]};
const option={title:'Manager experience review',outcome:'Clarify whether recorded patterns warrant investigation',why:'Recorded manager feedback and voluntary exits support an investigation.',source_ids:['S1','A1']};
const proposal={version:1,problem:'Investigate manager experience alongside voluntary exits',options:[option],question:null};
const inspect=fields=>inspectHomeCandidateProposal({...proposal,options:[{...option,...fields}]},pack);
const caveats=[
 'The pattern is not proof of a cause.',
 'Association is not causation.',
 'Correlation is not causality.',
 'The evidence does not establish causality.',
 'Historical associations do not prove causation.',
 'No causal effect has been established.',
 'Causation has not been established.',
 'Causal effects remain unknown.',
 'Benefits are not guaranteed.',
 'No guaranteed benefit.',
 'This is not a proven cause.',
 'Recorded associations, not proven causes.',
 'Recorded associations—not proven causes.',
 'Limit: association is not causation.',
 'These are associations, not causal evidence.',
 'Causation cannot be inferred.',
 "Causation can't be assumed.",
 'Association rather than causation.',
 'No evidence that coaching reduces attrition.',
 'There is no evidence that coaching improves retention.',
 'It is not proven to reduce voluntary exits.',
];
for(const why of caveats)test('retain clear caveat verbatim: '+why,()=>{const result=inspect({why});assert.equal(result.diagnostic.reason,'ready');assert.equal(result.proposal.options[0].why,why)});
const wording=[
 {title:'Manager experience',outcome:'Clarify the recorded association'},
 {title:'Manager listening pilot',outcome:'Better understanding of the recorded association'},
 {title:'Review manager experience',outcome:'Evidence for further investigation'},
 {title:'Targeted interviews',outcome:'To clarify the recorded pattern'},
 {title:'Investigate manager feedback',outcome:'Understand whether patterns differ across recorded responses'},
 {title:'Voluntary-exit analysis',outcome:'A clearer picture of the association'},
 {title:'Manager experience review',outcome:'Test whether coaching improves retention'},
];
for(const fields of wording)test('qualitative wording without the former six-verb gate: '+fields.outcome,()=>{const result=inspect(fields);assert.equal(result.diagnostic.reason,'ready');for(const key of Object.keys(fields))assert.equal(result.proposal.options[0][key],fields[key])});
const claims=[
 'Not proven but will reduce attrition.',
 'The pattern is not proof of a cause; coaching improves retention.',
 'Association is not causation, however this guarantees improvement.',
 'Causation has not been established yet coaching reduces exits.',
 'No causal effect has been established and training prevents departures.',
 'The evidence does not establish causality because the program will work.',
 'Not only proven but guaranteed.',
 'Not not proven.',
 'No causal effect has not been proven.',
 'It is not proven to reduce exits it definitely reduces them.',
 'No evidence that coaching improves retention; it works.',
 'No evidence that coaching improves retention it works.',
 'This is not proof of a cause — training guarantees retention.',
 'This is not proof of a cause / coaching reduces exits.',
 'Causation has been established.',
 'The evidence proves causation.',
 'Coaching is effective.',
 'This works.',
 'Training retains employees.',
 'Coaching will reduce voluntary exits.',
 'A proven intervention.',
 'Guaranteed benefits.',
 'Test whether coaching improves retention coaching reduces exits.',
 'Successful retention program.',
 'Manager coaching leads to lower attrition.',
 'This doubles retention.',
 'This w.i.l.l work.',
 'This w i l l work.',
 'This is g-u-a-r-a-n-t-e-e-d.',
 'This is p.r.o.v.e.n.',
 'This w\u200bill work.',
 'This wіll work.',
 'This ｗｉｌｌ work.',
 'Costs are $100.',
 'Expect twenty percent fewer exits.',
 'Expect ٢٠ percent fewer exits.',
 'Expect ２０％ fewer exits.',
 'Expect half the exits.',
 'No effect of 10% has been established.',
];
for(const claim of claims)test('reject mixed, positive or evasive claim: '+claim,()=>{for(const field of ['title','outcome','why']){const result=inspect({[field]:'Investigate the pattern; '+claim});assert.equal(result.proposal,null,field);const candidate={...option,[field]:'Investigate the pattern; '+claim};assert.equal(homeCandidateLanguage(candidate.title,candidate.outcome,candidate.why),'numeric_or_effect_token',field)}});
test('an inquiry must not presuppose an established improvement',()=>assert.equal(inspect({outcome:'Assess how coaching reduces attrition'}).proposal,null));
test('non-investigation wording stays blocked; nothing is rewritten into an action',()=>{assert.equal(inspect({title:'Manager experience',outcome:'Capacity information'}).diagnostic.reason,'wording_rejected');assert.equal(inspect({title:'A manager experience review',outcome:'Improve retention'}).proposal,null)});
test('a safe caveat cannot excuse a separate unsafe option',()=>{const result=inspectHomeCandidateProposal({...proposal,options:[{...option,why:caveats[0]},{...option,title:'Manager listening pilot',why:'This will reduce departures.'}]},pack);assert.equal(result.proposal,null);assert.equal(result.diagnostic.reason,'numeric_or_effect_token')});
test('three natural-language candidates retain their count and exact caveats',()=>{const options=[option,{...option,title:'Manager listening pilot',outcome:'Better understanding of recorded associations',why:'Recorded associations—not proven causes.'},{...option,title:'Evidence comparison',outcome:'Compare the scope of recorded feedback and exits',why:'The evidence does not establish causality.'}];const result=inspectHomeCandidateProposal({...proposal,options},pack);assert.deepEqual(result.diagnostic,{reason:'ready',optionCount:3,missingFieldCount:0});assert.deepEqual(result.proposal.options,options)});
