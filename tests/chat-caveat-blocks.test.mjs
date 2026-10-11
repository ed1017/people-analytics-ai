import test from 'node:test';
import assert from 'node:assert/strict';
import {chatCaveatLineNumbers} from '../lib/chat-caveat-blocks.ts';

test('explicit standalone labels select typography only, irrespective of their meaning',()=>{
 for(const prefix of ['Important caveat: ','**Important caveat:** ','**Important caveat**: ','Assumptions: ']){
  for(const text of ['The analysis covers permanent staff.','The dataset omits contractors.','The population excludes agency staff and interns.','An unfamiliar qualifier has no recognised keywords.']){
   assert.deepEqual(chatCaveatLineNumbers('Answer.\n\n'+prefix+text+'\n\nNext paragraph.'),[2]);
  }
 }
});
test('a bounded assumption section marks all prose and action steps, stopping at the next heading',()=>{
 const content='Answer.\n\n### Assumptions\n- The analysis covers permanent staff.\n- The dataset omits contractors.\nChoose a scope.\nProceed with the plan.\nExport the result.\n\n### Answer\nDone.';
 assert.deepEqual(chatCaveatLineNumbers(content),[2,3,4,5,6,7]);
});
test('unlabelled paragraphs, embedded labels, quoted text and code are not restyled',()=>{
 for(const content of ['The analysis covers permanent staff.','The important caveat: assumptions vary.','A paragraph\nImportant caveat: The inputs are held steady.','- Important caveat: The inputs are held steady.','> Important caveat: The inputs are held steady.','    Important caveat: The inputs are held steady.','```text\nImportant caveat: The inputs are held steady.\n```','~~~text\n```\nImportant caveat: The inputs are held steady.\n~~~','### Assumptions and next steps\nThe inputs are held steady.']){
  assert.deepEqual(chatCaveatLineNumbers(content),[]);
 }
});
test('incomplete content only affects label recognition, never returns rewritten or hidden text',()=>{
 assert.deepEqual(chatCaveatLineNumbers('**Important caveat: The analysis covers'),[]);
 assert.deepEqual(chatCaveatLineNumbers('**Important caveat:** The analysis *covers'),[0]);
 assert.deepEqual(chatCaveatLineNumbers('Important caveat: The dataset omits'),[0]);
 assert.deepEqual(chatCaveatLineNumbers('**Important caveat:**\nThe dataset omits contractors.'),[0,1]);
});
