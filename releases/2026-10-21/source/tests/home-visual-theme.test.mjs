import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../components/'+name,import.meta.url),'utf8');
const shell=read('home-chat-shell.module.css'),decision=read('decision-style.module.css');
const finalRule=(css,selector)=>[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(match=>match[1].trim()===selector).at(-1)?.[2]??'';
test('Home snapshot opts into inherited workspace theme without changing other decision surfaces',()=>{
 assert.match(read('home-chat-welcome.tsx'),/\$\{decision\.surface\} \$\{decision\.adaptive\} \$\{styles\.historySummary\}/);
 const adaptive=finalRule(decision,'.adaptive');
 for(const token of ['background','foreground','card','muted-foreground','primary','border','chart-1'])assert.ok(adaptive.includes('--'+token+':inherit;'),token+' follows the workspace');
 assert.match(adaptive,/color-scheme:inherit/);
 assert.match(finalRule(shell,'.historySummary'),/background:var\(--background\)/);
 assert.match(finalRule(shell,'.historySummary .kpiRow,.historySummary .snapshotCharts'),/background:var\(--card\)/);
 assert.match(finalRule(shell,'.historySummary .kpiRow b'),/color:var\(--foreground\)/);
 assert.match(finalRule(shell,'.historySummary .historyLine'),/stroke:var\(--primary\)/);
});
test('category navigation uses transparent underlined tabs distinct from question cards',()=>{
 const tab=finalRule(shell,'.promptCategories button'),selected=finalRule(shell,'.promptCategories button[aria-selected="true"]');
 assert.match(tab,/border-radius:0/);assert.match(tab,/min-height:44px/);assert.match(tab,/border-bottom:3px solid transparent/);
 assert.match(selected,/background:transparent/);assert.match(selected,/border-color:var\(--primary\)/);assert.match(selected,/box-shadow:none/);
 const source=read('home-prompt-categories.tsx');
 assert.match(source,/role="tablist"/);assert.match(source,/aria-selected=\{selected===index\}/);assert.match(source,/ArrowRight/);assert.match(source,/role="tabpanel"/);
 assert.match(shell,/\.questions button \{[^}]*border-radius: 9px/);
});

test('Home KPI badges override generic span colors with readable light and dark pairs',()=>{
 for(const [status,lightBg,lightInk,darkBg,darkInk] of [['red','#fee2e2','#7f1d1d','#501b28','#ffe4e6'],['green','#d1fae5','#064e3b','#064e3b','#d1fae5']]){
  const selector='.historySummary .kpiRow [data-kpi-status="'+status+'"]';
  const light=finalRule(shell,selector);assert.ok(light.includes('background:'+lightBg));assert.ok(light.includes('color:'+lightInk));
  const dark=finalRule(shell,':global(html[data-workspace-preference="slate-blue"]) '+selector);
  assert.ok(dark.includes('background:'+darkBg));assert.ok(dark.includes('color:'+darkInk));
 }
});
