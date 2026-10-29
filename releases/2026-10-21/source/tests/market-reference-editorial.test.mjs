import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './fixtures/component-module.mjs';
import * as oews from '../lib/oews-reference.mjs';
import * as outlook from '../lib/labor-outlook.mjs';
import * as carry from '../lib/market-reference-carry.ts';
const {MarketComparison}=componentModule('market-reference.tsx',{'@/components/market-evidence-bars':componentModule('market-evidence-bars.tsx'),'@/lib/market-skills-reference':await import('../lib/market-skills-reference.ts'),'@/components/key-findings':componentModule('key-findings.tsx'),'@/lib/oews-reference.mjs':oews,'@/lib/labor-outlook.mjs':outlook,'@/lib/market-reference-carry':carry});
const render=selection=>renderToStaticMarkup(React.createElement(MarketComparison,{selection,onChange:()=>{},goal:'Test',onCarry:()=>{}}));
test('market comparison keeps measures visible and interpretation in closed Details',()=>{
 const html=render(oews.defaultMarketSelection());
 const primary=html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g,'');
 for(const phrase of ['Geographies overlap; employment counts are not additive.','This population differs from OEWS','does not establish internal pay, hiring time or individual compensation','not vacancies or available candidates']){
  assert.ok(html.includes(phrase),phrase);assert.ok(!primary.includes(phrase),phrase);
 }
 assert.match(primary,/Median annual wage/);assert.match(primary,/Estimated employment/);
 assert.match(primary,/Annual USD wages/);assert.match(html,/25th[\u2013-]75th percentile/);
 assert.match(primary,/May 2025/);assert.match(html,/United States only/);
 assert.doesNotMatch(html,/<details[^>]*\bopen/);
});
test('invalid market selection still offers honest unavailable state and reset',()=>{
 const html=render({soc:'invalid',area:'invalid'});
 assert.match(html,/Reference unavailable for this selection/);assert.match(html,/Reset market selection/);
 assert.doesNotMatch(html,/Estimated employment:/);
});
