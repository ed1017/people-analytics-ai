import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedConversationInstructions,chatCalculationToolsAvailable} from '../lib/chat-answer-style.ts';
import fs from 'node:fs';
test('tool-bearing and tool-free page paths receive consistent calculator instructions',()=>{
 for(const page of ['workforce-planning','finance','attrition','survey-sentiment']){
  assert.equal(chatCalculationToolsAvailable(page),true,page);assert.doesNotMatch(guidedConversationInstructions(chatCalculationToolsAvailable(page)),/This response has no calculation tool/);
 }
 for(const page of ['home','development-planning','labor-market','occupational-references','training-coaching','career-growth-mobility']){
  assert.equal(chatCalculationToolsAvailable(page),false,page);assert.match(guidedConversationInstructions(chatCalculationToolsAvailable(page)),/This response has no calculation tool/);
 }
 assert.equal(chatCalculationToolsAvailable('workforce-planning',true),false);
 const route=fs.readFileSync(new URL('../app/api/chat/route.ts',import.meta.url),'utf8');assert.match(route,/const toolChoice = chatCalculationToolsAvailable\(page,summaryOnly\)/);assert.match(route,/guidedConversationInstructions\(chatCalculationToolsAvailable\(String\(body\?\.page/);
});
test('non-Home typed outcomes reject a questionnaire-only string and preserve the progress envelope',async()=>{
 const {guidedChatContract}=await import('../lib/guided-chat-contract.ts');
 const contract=guidedChatContract({},text=>({answer:text}),true);
 assert.throws(()=>contract.reply(JSON.stringify({answer:'What is your budget?'})),/guided reply/);
 assert.match(contract.reply(JSON.stringify({answer:{unsupportedPlan:{decision:'Choose the cost currency and period.',reason:'No comparable cost calculation is available.',nextStep:'Confirm these two units with Finance, then compare the entered quotes.'}}})).answer,/Next step:/);
 assert.equal(contract.reply(JSON.stringify({answer:{discussion:'The observed denominator is 100.'}})).answer,'The observed denominator is 100.');
 const progress={text:{format:{type:'json_schema',name:'existing-progress',strict:true,schema:{type:'object',additionalProperties:false,required:['answer','proposal'],properties:{answer:{type:'string'},proposal:{type:'null'}}}}}};
 const withProgress=guidedChatContract(progress,raw=>JSON.parse(raw),true);
 assert.deepEqual(withProgress.reply(JSON.stringify({answer:{discussion:'No new observation supplied.'},proposal:null})),{answer:'No new observation supplied.',proposal:null});
 assert.deepEqual(guidedChatContract({},text=>text,false).reply('Summary stays unchanged.'),'Summary stays unchanged.');
});
test('explicitly requested non-Home alternatives retain distinct plans and one recommendation',async()=>{
 const {renderGuidedChatAnswer}=await import('../lib/guided-chat-contract.ts'),plan=name=>({name,rationale:'Conditional on the entered costs.',steps:['Verify capacity before commitment.'],assumptions:[],caveats:['Readiness unknown.']});
 const value=renderGuidedChatAnswer({alternatives:{recommendedIndex:1,plans:[plan('Training'),plan('Hiring')]}});assert.match(value,/Training/);assert.match(value,/Hiring/);assert.equal((value.match(/Recommended alternative:/g)||[]).length,1);
 assert.throws(()=>renderGuidedChatAnswer({alternatives:{recommendedIndex:2,plans:[plan('Training'),plan('Hiring')]}}),/unavailable/);
});
