import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../components/swp-guided-journey.tsx',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),owner=fs.readFileSync(new URL('../components/pages/overall-overview-page.tsx',import.meta.url),'utf8');
test('one mounted journey shares ordinary and guided Scenarios targets, never adds a second normal modal',()=>{
 assert.equal((owner.match(/<SwpGuidedJourney /g)||[]).length,1);assert.ok(app.includes('(wholeTour||normalStaffingOpen)&&<div ref={setTourScenarioTarget}'));
 assert.ok(source.includes('if(normalHosted)return normalPortal('));assert.ok(source.includes('normalHosted?normalPortal(inputs):normalWorkspace?null:'));
 assert.ok(source.includes('{!normalWorkspace&&!chatScenario&&<WorkforceDemoDialog'));
});
test('hosted controller becomes inactive on all navigation away, including Home',()=>{
 assert.ok(owner.includes('active={!!wholeAppDemo||(normalWorkspace?.open?normalWorkspace.active:active)}'));
 assert.ok(app.includes("active:normalStaffingOpen&&activePage==='planning-overview'&&!wholeTour"));
 assert.ok(source.includes('if(ownedIsolation.current&&(opening.current||normalWorkspace?.open))'));
 assert.ok(source.includes('suspended.current=true;endIsolation.current();ownedIsolation.current=null;'));
});
test('matching requests preserve an edited draft and expose quantity mismatch, rather than resetting defaults',()=>{
 const guard=source.slice(source.indexOf('// Reopening a normal workspace'),source.indexOf('// An explicit supported Home request'));
 assert.ok(guard.includes('draft&&matches&&!demandBridge'));assert.ok(guard.includes('scenarioQuestionMismatch(text,draft)'));assert.ok(guard.includes('resumeDemo()'));assert.equal(guard.includes('createSwpDemo'),false);assert.ok(guard.includes('setShowOptions(false)'));
 assert.ok(source.includes('setInputReview(current=>current?.identity===entryIdentity?current:null)'));
});
test('parked isolation is scoped to exact origin goal, dataset, discussion and saved receipt',()=>{
 for(const field of ['goalId===conversation.activeGoalId','datasetToken===token','discussionKey===discussionKey','savedSignature===savedSignature'])assert.ok(source.includes('parkedOrigin.current.'+field));
 assert.ok(source.includes('suspended.current&&draft&&draftDataset===token&&draftDiscussion.current===discussionKey&&parkedOriginMatches'));
 assert.equal((source.match(/if\(!ownedIsolation.current\)parkedOrigin.current=/g)||[]).length,2);
});
test('host supports explicit return to chat and scenario tools without changing unrelated prompts',()=>{
 assert.ok(source.includes("normalWorkspace?.onClose();onNavigate('home');requestAnimationFrame"));assert.ok(source.includes('Return to scenario tools'));
 assert.ok(source.includes('if(!active&&normalWorkspace&&!wholeAppDemo&&!busy&&!pending&&storage.saved&&!acceptedExample&&offersCapacityExample(text))'));
});
