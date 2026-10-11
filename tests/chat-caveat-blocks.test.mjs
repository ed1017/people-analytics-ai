import test from 'node:test';
import assert from 'node:assert/strict';
import {chatCaveatBlocks} from '../lib/chat-caveat-blocks.ts';

test('only an explicitly labelled standalone paragraph is collapsed, exactly retained',()=>{
 for(const prefix of ['Important caveat: ','**Important caveat:** ','**Important caveat**: ','Assumptions: ','**Important caveat:**\n']){
  const block=prefix+'The inputs are held steady for illustration. Individual departures can vary.';
  const result=chatCaveatBlocks('A useful answer.\n\n'+block+'\n\nThe next paragraph remains visible.');
  assert.deepEqual(result.details,[block]);assert.match(result.answer,/A useful answer/);assert.match(result.answer,/next paragraph remains visible/);assert.doesNotMatch(result.answer,/inputs are held/);
 }
});
test('mixed critical qualifiers retain whole sentences beside the answer',()=>{
 const critical='9,910 assumes 100 hires and 115 exits per month. Company-wide as of September 2026. This is a simulated scenario, not a trained forecast. The denominator is the opening workforce. Percentages describe eligible respondents. The window ends next week. Costs are partial; benefits are excluded. Source data is unavailable. Review and confirm before saving.';
 const block='**Important caveat:** '+critical+' The inputs are held steady for illustration.';
 const result=chatCaveatBlocks('Projected figure: 9,910.\n\n'+block);
 assert.equal(result.details[0],block);
 for(const sentence of critical.split(/(?<=\.)\s/))assert.ok(result.answer.includes(sentence),sentence);
 assert.equal(result.qualifiers.length,1);assert.doesNotMatch(result.answer,/held steady/);
});
test('bounded assumption heading retains its lists in detail and never consumes next section',()=>{
 const block='### Assumptions\n- The inputs are held steady.\n- Variability can alter the outcome.';
 const result=chatCaveatBlocks('Answer.\n\n'+block+'\n\n### Next steps\nReview before saving.');
 assert.deepEqual(result.details,[block]);assert.match(result.answer,/### Next steps\nReview before saving\./);
});
test('all-critical caveats stay visible compactly without duplicated disclosure',()=>{
 const content='Important caveat: This is a scenario, not a trained forecast. 9,910 excludes transfers. Confirm before saving.';
 const result=chatCaveatBlocks(content);assert.equal(result.answer,content);assert.deepEqual(result.details,[]);assert.deepEqual(result.qualifiers,[content]);
});
test('unlabelled prose, embedded labels, lists, quotes and code are never classified',()=>{
 for(const content of ['The inputs are held steady for illustration.','The important caveat: assumptions vary.','A paragraph\nImportant caveat: The inputs are held steady.','- Important caveat: The inputs are held steady.','> Important caveat: The inputs are held steady.','    Important caveat: The inputs are held steady.','```text\nImportant caveat: The inputs are held steady.\n```','### Assumptions and next steps\nThe inputs are held steady.']){
  assert.deepEqual(chatCaveatBlocks(content),{answer:content,details:[],qualifiers:[]});
 }
});
test('incomplete Markdown, unfinished streamed sentences and caveat tables remain visible',()=>{
 for(const content of ['**Important caveat: The inputs are held steady.','**Important caveat:** The inputs *are held steady.','Important caveat: The inputs are held steady','### Assumptions\n','### Assumptions\nThe inputs are held [steady.','Important caveat: The inputs (are held steady.','### Assumptions\n| Input | Value |\n| --- | --- |\n| Hiring | 100 |']){
  assert.equal(chatCaveatBlocks(content).answer,content);assert.deepEqual(chatCaveatBlocks(content).details,[]);
 }
});
test('instructions under a caveat heading remain visible',()=>{
 const result=chatCaveatBlocks('### Caveats\nChoose a scope before proceeding.\nProceed with the plan.\nExport the result.\nThe inputs are held steady.\n\n### Answer\nDone.');
 assert.match(result.answer,/Choose a scope before proceeding/);assert.match(result.answer,/Proceed with the plan/);assert.match(result.answer,/Export the result/);assert.match(result.answer,/### Answer/);assert.equal(result.details.length,1);
});
