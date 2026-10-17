import test from 'node:test';
import assert from 'node:assert/strict';
import {appNavigationSections} from '../lib/app-navigation.ts';
import {planningJourney,planningEvidence} from '../lib/planning-journey.ts';
import {mainNavigationSection,secondaryNavigationSections,secondaryNavigationSection} from '../lib/workspace-navigation.ts';
test('top navigation stays in its section on child pages and distinguishes the future evaluation placeholder',()=>{
 assert.equal(mainNavigationSection('home'),'overview');
 for(const page of ['future-of-work','planning-overview','action-plans','plan-track','finance','workforce-planning'])assert.equal(mainNavigationSection(page),'plan');
 for(const page of ['workforce','skills','attrition','compensation','labor-market','training-coaching','career-mobility','overview'])assert.equal(mainNavigationSection(page),'evidence');
 assert.equal(mainNavigationSection('assess-evaluate'),null);
});
test('consolidation retains every existing sidebar destination exactly once',()=>{
 const rendered=[...planningJourney,...planningEvidence].map(i=>i.page).concat(secondaryNavigationSections.flatMap(s=>s.pages));
 const original=appNavigationSections.flatMap(s=>s.pages);
 assert.equal(new Set(rendered).size,rendered.length);assert.deepEqual([...rendered].sort(),[...original].sort());
 assert.equal(secondaryNavigationSection('skills'),null);assert.equal(secondaryNavigationSection('talent-acquisition'),'evidence');assert.equal(secondaryNavigationSection('decision-brief'),'plan');
});
