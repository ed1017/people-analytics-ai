import test from 'node:test';
import assert from 'node:assert/strict';
import {appNavigationSections,getWorkspaceForPage,getDefaultPageForWorkspace,appPageMetadata} from '../lib/app-navigation.ts';
import {planningJourney,planningEvidence} from '../lib/planning-journey.ts';
test('four groups preserve existing destinations and expose only an evaluation placeholder',()=>{
  assert.deepEqual(appNavigationSections.map(s=>s.title),['Workforce','Intelligence','Planning','Assess & Evaluate']);
  for(const page of ['skills','learning-development','career-mobility','career-growth-mobility','succession-planning'])assert.equal(getWorkspaceForPage(page),'analytics');
  assert.deepEqual(appNavigationSections[1].pages,['occupational-references','labor-market','training-coaching']);
  assert.equal(getDefaultPageForWorkspace('talent'),'occupational-references');
  const pages=appNavigationSections.flatMap(s=>s.pages);assert.equal(new Set(pages).size,pages.length);
  for(const page of pages)assert.ok(appPageMetadata[page]);
});
test('SWP journey leads navigation while core Planning tools retain their relative order and aliases',()=>{
  assert.deepEqual(planningJourney,[
    {page:'workforce',label:'Baseline'},
    {page:'future-of-work',label:'Future of Work'},
    {page:'planning-overview',label:'Scenarios'},
    {page:'action-plans',label:'Action plans'},
    {page:'plan-track',label:'Track'},
  ]);
  const core=['planning-overview','scenario-modeling','position-workforce-design','workforce-response','execution-feasibility'];
  assert.deepEqual(appNavigationSections[2].pages.filter(page=>core.includes(page)),core);
  for(const {page} of planningJourney){
    assert.ok(appPageMetadata[page]);
    assert.equal(getWorkspaceForPage(page),page==='workforce'?'analytics':'strategy');
    assert.equal(appNavigationSections.flatMap(section=>section.pages).filter(item=>item===page).length,1);
  }
  assert.equal(appPageMetadata.home.label,'Overview');
  assert.equal(getDefaultPageForWorkspace('strategy'),'planning-overview');
  assert.deepEqual(planningEvidence.map(item=>item.page),['attrition','skills','labor-market','compensation']);
  assert.equal(planningEvidence.some(item=>planningJourney.some(step=>step.page===item.page)),false);
  assert.equal(getWorkspaceForPage('workforce-planning'),'strategy');
  assert.ok(appNavigationSections[2].pages.includes('development-planning'));
});

test('decision brief is separate from five core steps; evaluation has no scorecard destination',()=>{
 assert.equal(getWorkspaceForPage('decision-brief'),'strategy');
 assert.deepEqual(appNavigationSections[3].pages,['assess-evaluate']);
 assert.equal(appPageMetadata['assess-evaluate'].label,'Assess & Evaluate · Coming soon');
});
