import test from 'node:test';import assert from 'node:assert/strict';
import {staffingChoiceSummary} from '../releases/2026-10-21/source/lib/staffing-choice-summary.ts';
const cheap={mix:{build:3,move:2,buy:0},cash:26800,shortfallHours:1280,status:'met'},early={mix:{build:0,move:2,buy:3},cash:319000,shortfallHours:320,status:'met'};
test('budget alone does not silently select cash over coverage or vice versa',()=>{const text=staffingChoiceSummary([cheap,early]);assert.match(text,/26,800/);assert.match(text,/319,000/);assert.match(text,/Choose the priority/);assert.match(text,/not a claim of lowest delivery risk/);assert.equal(text,staffingChoiceSummary([early,cheap]));});
test('unaffordable, unknown or invalid numbers cannot establish a recommended option',()=>{for(const patch of [{status:'not-met'},{status:'unknown'},{cash:null},{shortfallHours:null},{cash:-1},{shortfallHours:NaN}])assert.match(staffingChoiceSummary([{...cheap,...patch}]),/No displayed option/);});
test('zero cash and zero shortfall are legitimate known values',()=>{assert.match(staffingChoiceSummary([{...cheap,cash:0,shortfallHours:0}]),/\$0 USD, 0 uncovered hours/);});
