import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {advanceWholeAppTour,wholeAppTourSteps} from '../lib/whole-app-tour.ts';
test('tour advances only through the prescribed actual app destinations',()=>{
 assert.equal(advanceWholeAppTour('overview','workforce'),'workforce');
 assert.equal(advanceWholeAppTour('workforce','future-of-work'),'future');
 assert.equal(advanceWholeAppTour('future','planning-overview'),'scenario');
 assert.equal(advanceWholeAppTour('scenario','action-plans'),null,'navigation cannot bypass the actual save receipt');
 assert.equal(advanceWholeAppTour('saved','action-plans'),'plans');
 assert.equal(advanceWholeAppTour('plans','plan-track'),'track');
 assert.equal(advanceWholeAppTour('overview','plan-track'),null);
 assert.equal(wholeAppTourSteps.track.nextPage,undefined);
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
});
