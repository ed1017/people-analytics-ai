import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
import * as navigation from '../lib/chat-navigation.ts';
import * as presentation from '../lib/home-answer-presentation.ts';
import {exitMissingFieldsBullet} from './fixtures/exit-reason-packet.mjs';
import {homeStarterGroups,homeGoalStarters} from '../lib/contextual-prompts.ts';
import {homeTurnPurpose} from '../lib/home-conversation.ts';
import {homeForecastIntent} from '../lib/home-forecast-intent.ts';
const require=createRequire(import.meta.url);
function component(file,name){
 const exports={},source=fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>name==='@/lib/chat-navigation'?navigation:name==='@/lib/home-answer-presentation'?presentation:require(name)});return exports[name];
}
const ChatContent=component('chat-content.tsx','ChatContent'),PromptExamples=component('prompt-examples.tsx','PromptExamples');
const render=(content,options={})=>renderToStaticMarkup(React.createElement(ChatContent,{content,...options}));
const nodes=element=>!element||typeof element!=='object'?[]:[element,...React.Children.toArray(element.props?.children).flatMap(nodes)];
test('takeaway and short bullets retain inline citations, emphasis, follow-up actions and source navigation',()=>{
 const content='April 2026 was below both earlier Aprils.\n- **Rate:** 0.93%, below 0.96% and 1.05%. [a1] See [Attrition](app:attrition).\n- Monthly denominators and causes are unknown. [A1] [W1]';
 const actions=[],destinations=[],props={compact:true,onNavigate:page=>destinations.push(page),bulletAction:text=>{actions.push(text);return null}};
 const html=render(content,props);assert.equal((html.match(/data-chat-item="true"/g)??[]).length,2);assert.match(html,/<p>.*April 2026/);assert.match(html,/<strong>.*Rate:/);assert.equal(actions.length,2);assert.match(actions[0],/\[a1\]/);
 assert.match(html,/<sup[^>]*data-chat-citation="A1"/);assert.match(html,/aria-label="Source A1: Attrition"/);assert.match(html,/aria-label="Answer sources"/);
 assert.ok(html.indexOf('data-chat-citation="A1"')<html.indexOf('Answer sources'));
 const marker=nodes(ChatContent({content,...props})).find(node=>node.props?.['aria-label']==='Source A1: Attrition');marker.props.onClick();assert.deepEqual(destinations,['attrition']);assert.equal(marker.props.type,'button');assert.match(marker.props.className,/focus-visible/);
});
test('all supported evidence IDs, adjacent markers and citations inside emphasis/tables are superscripts, ordinary brackets stay unchanged',()=>{
 const ids=['W1','W2','A1','R1','S1','S2','T1','T2','T3','T4','T5','P1','P2','F1','I1','I2','I3','D1','M1'];
 const html=render(ids.map(id=>'['+id.toLowerCase()+']').join('')+'\n**Rate [A1]**\nData [Q4] [2026] [n=12] [USD 20]\n| Measure | Value |\n| --- | --- |\n| Rate | 0.93% [A1] |');
 assert.equal((html.match(/<sup /g)??[]).length,ids.length+2);for(const id of ids)assert.ok(html.includes('data-chat-citation="'+id+'"'));
 assert.match(html,/Data \[Q4\] \[2026\] \[n=12\] \[USD 20\]/);assert.match(html,/<td[^>]*>.*0.93%.*<sup/);assert.match(html,/aria-label="Source M1"/);
});
test('explicit Action Plan headings and numbered steps are preserved, unrelated prose is never rewritten',()=>{
 const headings=['Evidence and scope','Options and tradeoffs','Costs and unknown assumptions','Proposed next steps','Suggested success measures'];
 const content=headings.map((heading,index)=>'### '+heading+'\n'+(index+1)+'. Review the supplied evidence. [A1]').join('\n');
 const html=render(content,{compact:true});assert.equal((html.match(/data-chat-heading="true"/g)??[]).length,5);assert.equal((html.match(/data-chat-item="true"/g)??[]).length,5);for(const heading of headings)assert.ok(html.includes(heading));
 const prose='This one ordinary paragraph has [Q4] data and no list.';assert.match(render(prose),new RegExp(prose.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.doesNotMatch(render(prose),/<sup|data-chat-item/);
 assert.doesNotMatch(render('[A1] See [Unknown](app:unknown).',{onNavigate:()=>{}}),/<button/);
});
test('grouped starter labels submit exact grounded intents without overwriting drafts or changing forecast and goal routing',()=>{
 const sent=[],props={prompts:homeGoalStarters,groups:homeStarterGroups,draft:'',busy:false,onDraft:prompt=>sent.push(prompt)};
 const element=PromptExamples(props),buttons=nodes(element).filter(node=>node.type==='button'),html=renderToStaticMarkup(element);
 assert.equal(buttons.length,7);assert.equal((html.match(/role="group"/g)??[]).length,3);
 assert.deepEqual(buttons.map(button=>button.props.children),['What skills are we missing?','Where should we invest in training?','How can we reduce turnover?','How can we improve satisfaction?','Show the hiring forecast.','Show the turnover forecast.','Show the satisfaction forecast.']);
 buttons.forEach(button=>button.props.onClick());assert.deepEqual(sent,homeGoalStarters);
 assert.deepEqual(sent.slice(0,4).map(prompt=>homeTurnPurpose(prompt)),['answer','answer','goal','goal']);
 assert.deepEqual(sent.slice(4).map(prompt=>homeForecastIntent(prompt).domains[0]),['hiring','turnover','satisfaction']);
 assert.equal(homeTurnPurpose('Find issues worth tackling'),'discovery');
 for(const changes of [{draft:'Keep my draft'},{busy:true}]){
  const blocked=nodes(PromptExamples({...props,...changes})).filter(node=>node.type==='button');assert.ok(blocked.every(button=>button.props.disabled));blocked.forEach(button=>button.props.onClick());assert.equal(sent.length,7);
 }
 const missing=renderToStaticMarkup(PromptExamples({...props,prompts:['What evidence is unavailable?']}));assert.doesNotMatch(missing,/role="group"/);assert.match(missing,/What evidence is unavailable/);
});
test('linked markers retain their explicit targets and references still use superscripts without a navigation handler',()=>{
 const visited=[],content='One fact [a1](app:attrition); another [W1](app:workforce).';
 const html=render(content,{onNavigate:page=>visited.push(page)});assert.equal((html.match(/<sup /g)??[]).length,2);assert.match(html,/Source A1: Attrition/);assert.match(html,/Source W1: Workforce/);
 nodes(ChatContent({content,onNavigate:page=>visited.push(page)})).filter(node=>node.type==='button').forEach(button=>button.props.onClick());assert.deepEqual(visited,['attrition','workforce']);
 const inert=render('[a1] See [Attrition](app:attrition).');assert.match(inert,/<sup[^>]*data-chat-citation="A1"/);assert.doesNotMatch(inert,/<button/);
});
test('categorical comparisons render semantic nested bullets with inline source markers, separate from ordinary paragraphs',()=>{
 const html=render('Reported exit-survey reasons differ.\n- Leading reported reasons among 50 respondents: [S2]\n  - Work-Life Balance: 20 (40%). [S2]\n  - Manager: 15 (30%). [S2]\n  - New Opportunity: 10 (20%). [S2]\n- Administrative exits are a separate population. [A1]',{compact:true});
 assert.equal((html.match(/<ul /g)??[]).length,2);assert.equal((html.match(/<li /g)??[]).length,5);assert.equal((html.match(/data-chat-citation="S2"/g)??[]).length,4);assert.match(html,/<li[^>]*>.*Leading reported[\s\S]*<ul[\s\S]*Work-Life Balance/);assert.match(html,/<\/ul><\/li><li[^>]*>.*Administrative exits/);
});
test('exit reason chart renders a zero-based count axis with explicit S2 denominator, date and limits',()=>{
 const Chart=component('home-exit-reason-chart.tsx','HomeExitReasonChart'),chart={source:'S2',date:'2026-09-30',respondents:50,rows:[{reason:'Work-Life Balance',count:20,percentage:40},{reason:'Manager',count:15,percentage:30},{reason:'New Opportunity',count:10,percentage:20}]};
 const html=renderToStaticMarkup(React.createElement(Chart,{chart}));assert.match(html,/count axis from 0 to 20/);assert.match(html,/50.*exit-survey respondents/);assert.match(html,/Company-wide.*As of.*2026/);assert.match(html,/Source S2/);assert.equal((html.match(/data-reason-bar=/g)??[]).length,3);assert.match(html,/20.*40.*%/);assert.match(html,/fieldwork period.*unavailable/);assert.match(html,/do not establish causes or workforce turnover rates/);
});

test('known standalone missing-fields inventory moves into collapsed detail while factual answer and qualifiers stay visible',()=>{
 const main='These are reported primary reasons, not proven causes.\n- Work-Life Balance: 244 respondents (12.5%). [S2]\n- No month-specific reason breakdown is supplied. [S2]';
 const content=main+'\n'+exitMissingFieldsBullet+'\n'+exitMissingFieldsBullet;
 const result=presentation.homeAnswerPresentation(content);assert.equal(result.answer.trim(),main);assert.equal(result.details.length,1);
 const html=render(content,{compact:true});assert.equal((html.match(/data-chat-item="true"/g)??[]).length,2);assert.match(html,/<details data-answer-evidence-details=/);assert.doesNotMatch(html,/<details[^>]* open/);
 assert.ok(html.indexOf('244')<html.indexOf('<details'));assert.ok(html.indexOf('No month-specific')<html.indexOf('<details'));assert.ok(html.indexOf('stronger retention')>html.indexOf('<details'));
 assert.match(html,/<summary[^>]*>Evidence details<\/summary>/);assert.equal((html.match(/stronger retention/g)??[]).length,1);
 assert.doesNotMatch(render(content),/data-answer-evidence-details/);
});

test('missing requested evidence, denominator differences, demo labels and substantive limitations never disappear',()=>{
 for(const content of [exitMissingFieldsBullet,'- Respondent-level exit reasons are unavailable. [S2]','- These are simulated figures, not observed outcomes. [S2]','- The available evidence does not provide monthly exit counts, subgroup breakdowns, a fieldwork period, or a comparison with non-exiting employees, so stronger retention conclusions are unavailable. [S2]','- Exit-survey respondents and all separations have different denominators. [S2] [A1]']){
  assert.deepEqual(presentation.homeAnswerPresentation(content),{answer:content,details:[]});
  assert.deepEqual(presentation.homeAnswerPresentation('One useful fact.\n'+content.replace('The available evidence','The available evidence includes 42 respondents and does not')), {answer:'One useful fact.\n'+content.replace('The available evidence','The available evidence includes 42 respondents and does not'),details:[]});
 }
});
