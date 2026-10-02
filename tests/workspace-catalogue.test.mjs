import test from 'node:test';
import assert from 'node:assert/strict';
import {appNavigationSections,getWorkspaceForPage,getDefaultPageForWorkspace,appPageMetadata} from '../lib/app-navigation.ts';
test('four groups preserve existing destinations and expose only an evaluation placeholder',()=>{
  assert.deepEqual(appNavigationSections.map(s=>s.title),['Workforce','Intelligence','Planning','Assess & Evaluate']);
  for(const page of ['skills','learning-development','career-mobility','career-growth-mobility','succession-planning'])assert.equal(getWorkspaceForPage(page),'analytics');
  assert.deepEqual(appNavigationSections[1].pages,['occupational-references','labor-market','training-coaching']);
  assert.equal(getDefaultPageForWorkspace('talent'),'occupational-references');
  const pages=appNavigationSections.flatMap(s=>s.pages);assert.equal(new Set(pages).size,pages.length);
  for(const page of pages)assert.ok(appPageMetadata[page]);
});
test('five core Planning destinations retain their order and aliases',()=>{
  assert.deepEqual(appNavigationSections[2].pages.slice(0,5),['planning-overview','scenario-modeling','position-workforce-design','workforce-response','execution-feasibility']);
  assert.equal(getWorkspaceForPage('workforce-planning'),'strategy');
  assert.ok(appNavigationSections[2].pages.includes('development-planning'));
});

test('decision brief is separate from five core steps; evaluation has no scorecard destination',()=>{
 assert.equal(getWorkspaceForPage('decision-brief'),'strategy');
 assert.deepEqual(appNavigationSections[3].pages,['assess-evaluate']);
 assert.equal(appPageMetadata['assess-evaluate'].label,'Coming soon');
});
