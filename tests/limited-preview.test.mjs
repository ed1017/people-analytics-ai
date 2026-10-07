import test from 'node:test';
import assert from 'node:assert/strict';
import {appPageMetadata,appNavigationSections} from '../lib/app-navigation.ts';
test('exactly three existing navigation destinations have Limited preview status',()=>{
 const expected=['development-planning','labor-market','training-coaching'];
 assert.deepEqual(Object.entries(appPageMetadata).filter(([,meta])=>meta.status).map(([page])=>page).sort(),expected);
 for(const page of expected){assert.equal(appPageMetadata[page].status,'Limited preview');assert.ok(appNavigationSections.some(group=>group.pages.includes(page)));}
});

import {pageHelp} from '../lib/page-help.ts';
test('Home floating help uses the approved dashboard-to-action wording',()=>{
 assert.equal(pageHelp.home,'A workforce decision-making tool that turns dashboard insights into practical Action Plans, helping you connect workforce decisions to business outcomes.');
});
