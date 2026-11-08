import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {advanceWholeAppTour,wholeAppTourSteps} from '../lib/whole-app-tour.ts';
test('staffing demo starts directly and only save unlocks the real continuation',()=>{
 assert.deepEqual(Object.keys(wholeAppTourSteps),['scenario','saved','plans','track']);
 assert.equal(wholeAppTourSteps.scenario.page,'planning-overview');
 assert.equal(wholeAppTourSteps.scenario.title,'Staffing scenario demo');
 assert.match(wholeAppTourSteps.scenario.instruction,/Four required steps/);
 assert.equal(advanceWholeAppTour('scenario','action-plans'),null,'navigation cannot bypass actual save');
 assert.equal(advanceWholeAppTour('saved','action-plans'),'plans');
 assert.equal(advanceWholeAppTour('plans','plan-track'),'track');
 assert.equal(advanceWholeAppTour('scenario','workforce'),null);
 assert.equal(wholeAppTourSteps.track.nextPage,undefined);
 for(const stage of ['saved','plans','track'])assert.doesNotMatch(wholeAppTourSteps[stage].title,/^\d/);
});
test('launch captures Home before routing directly to the staffing example',()=>{
 const source=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
 const launch=source.match(/function startWholeTour\(\)\{([^\n]+)\}/)[1];
 assert.ok(launch.indexOf("window.dispatchEvent(new Event('whole-app-demo-start'))")<launch.indexOf("setWholeTour({stage:'scenario'"));
 assert.match(launch,/setActivePage\('planning-overview'\)/);
 assert.doesNotMatch(launch,/stage:'overview'|setActivePage\('home'\)/);
});
test('app integration uses real save receipt and exits forced mode on browser navigation',()=>{
 const root=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),journey=fs.readFileSync(new URL('../components/swp-guided-journey.tsx',import.meta.url),'utf8');
 assert.match(root,/const restore = \(\) => \{setWholeTour\(null\);cancelHistoryRequest\(\);\}/);
 assert.match(root,/wholeAppDemo=\{wholeTour\?\.stage==='scenario'/);
 assert.match(journey,/decisionStore\.getSnapshot\(\)\.data\.goals\.activeId===review\.goal\.id\)wholeAppDemo\?\.onSaved\(\)/);
 assert.match(journey,/createPortal\(<div data-whole-app-demo-plan>\{content\}<\/div>,wholeAppDemo\.target\)/);
});

test('whole-app prompt waits for explicit Enter with a touch-accessible equivalent',()=>{
 const source=fs.readFileSync(new URL('../components/swp-guided-journey.tsx',import.meta.url),'utf8');
 assert.match(source,/autoFocus=\{!!wholeAppDemo\}/);
 assert.match(source,/wholeAppDemo&&event.key==='Enter'&&!event.nativeEvent.isComposing/);
 assert.match(source,/event.preventDefault\(\);submitExamplePrompt\(\)/);
 assert.match(source,/onClick=\{submitExamplePrompt\}/);
 assert.match(source,/Press Enter in the prompt above/);
 assert.match(source,/Step 1 of 4: Submit the prefilled prompt/);
});
