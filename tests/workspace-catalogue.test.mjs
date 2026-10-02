import test from 'node:test';
import assert from 'node:assert/strict';
import {appNavigationSections,getWorkspaceForPage,getDefaultPageForWorkspace,appPageMetadata} from '../lib/app-navigation.ts';
test('three groups separate internal evidence from external catalogue without losing destinations',()=>{
  assert.deepEqual(appNavigationSections.map(s=>s.title),['Workforce','Intelligence','Planning']);
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
