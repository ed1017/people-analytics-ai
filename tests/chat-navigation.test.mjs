import test from "node:test";
import assert from "node:assert/strict";
import { chatNavigationTargets, getChatNavigationAction, chatNavigationInstructions, chatOpeningNavigationInstructions } from "../lib/chat-navigation.ts";
import { appPageMetadata } from "../lib/app-navigation.ts";

test("chat destinations match real canonical app pages and labels", () => {
  for (const [page,label] of Object.entries(chatNavigationTargets)) {
    assert.equal(appPageMetadata[page].label,label);
    assert.deepEqual(getChatNavigationAction('app:'+page),{page,label});
  }
});
test("unsupported, external, parameterized and executable destinations are inert", () => {
  for(const href of ['/skills','/skills?run=true','https://example.com','javascript:alert(1)','/api/scenario-model','app:unknown','app:skills?carry=true','app:skills#run','app:__proto__','app:constructor','APP:skills','app:skills/../../api/chat',' app:skills']) assert.equal(getChatNavigationAction(href),null);
});
test("navigation guidance distinguishes opening pages from explicit carry and calculation", () => {
  const text=chatNavigationInstructions();
  assert.match(text,/navigation buttons only/);assert.match(text,/explicitly click Carry to Planning/);assert.match(text,/do not invent a handoff/);assert.match(text,/not a proven solution/);
});

test("retired Career Interests navigation keeps safe legacy links and mobility destination",()=>{
 assert.equal(chatNavigationTargets['career-mobility'],undefined);
 assert.deepEqual(getChatNavigationAction('app:career-mobility'),{page:'workforce',label:'Workforce'});
 assert.equal(getChatNavigationAction('app:career-growth-mobility').page,'career-growth-mobility');
});

test("brief opening link instructions preserve the exact existing destination allowlist",()=>{
 const text=chatOpeningNavigationInstructions();
 for(const [page,label] of Object.entries(chatNavigationTargets)) assert.ok(text.includes(`[${label}](app:${page})`));
 assert.match(text,/at most one exact Markdown token/);
 assert.match(text,/never \/skills/);
 assert.doesNotMatch(text,/180 words|two option bullets|finding an issue/);
});
