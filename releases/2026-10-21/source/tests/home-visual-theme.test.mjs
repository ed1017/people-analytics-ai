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
