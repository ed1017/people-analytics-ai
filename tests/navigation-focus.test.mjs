import test from 'node:test';
import assert from 'node:assert/strict';
import {focusNavigationTarget} from '../lib/navigation-focus.ts';

test('transition headings clear visible headers and ignore headers already above the viewport',()=>{
 const priorWindow=globalThis.window,priorDocument=globalThis.document;
 try {
  for(const [headerBottom,headingTop,expectedTop] of [[180,600,192],[-500,600,12],[100,-300,112]]){
   let position=headingTop,focused=false;
   globalThis.document={querySelector:()=>({getBoundingClientRect:()=>({bottom:headerBottom})})};
   globalThis.window={scrollBy:({top,behavior})=>{assert.equal(behavior,'instant');position-=top;}};
   focusNavigationTarget({focus:options=>{assert.equal(options.preventScroll,true);focused=true;},getBoundingClientRect:()=>({top:position})});
   assert.equal(position,expectedTop);assert.equal(focused,true);
  }
  let pageTop=null;
  globalThis.document={querySelector:()=>{throw Error('Page start does not need a header offset');}};
  globalThis.window={scrollTo:options=>{pageTop=options.top;}};
  focusNavigationTarget({focus:()=>{}},true);assert.equal(pageTop,0);
  focusNavigationTarget(null);
 } finally {globalThis.window=priorWindow;globalThis.document=priorDocument;}
});
