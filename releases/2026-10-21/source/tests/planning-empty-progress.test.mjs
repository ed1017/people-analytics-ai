import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './fixtures/component-module.mjs';
import {capacityFindings} from '../lib/context-findings.ts';

const forbidden=()=>{throw Error('Summary must not write or load storage');};
const {GoalProgressSummary}=componentModule('goal-progress-summary.tsx',{
 '@/lib/home-solution-conversation':{solutionConversationEnabled:false},
 '@/lib/pinned-action-plans':{},'@/lib/home-plan-alternative-chat':{},
 '@/lib/goal-progress':{},'@/lib/goal-progress-summary':{},
 '@/lib/home-guide-origin':{},'@/lib/home-demo-catalog':{},
 './decision-store':{decisionStore:new Proxy({},{get:forbidden}),useDecisionStorage:forbidden},
});
const empty=()=>({context:{measurement:null,assessment:{baseline:null,latestComparable:null,latestReceivedId:null,currentStatus:'undefined',gap:null,reasons:[],assessedOn:'2026-10-27'},origin:'authored',history:[],milestones:[],planLinks:[]},snapshot:{hasObservations:false,baseline:null,latest:null,stale:false,nextAction:'Define a metric, scope, dated baseline and target in chat.'}});
const render=props=>renderToStaticMarkup(React.createElement(GoalProgressSummary,props));

test('only verified empty progress collapses while setup remains accessible without writes',()=>{
 const html=render(empty());
 assert.match(html,/^<details[^>]*><summary[^>]*>Goal progress · Not yet measured<\/summary>/);
 assert.doesNotMatch(html,/^<details[^>]* open/);
 assert.match(html,/Define a metric, scope, dated baseline and target in chat/);
 assert.match(html,/Measurement details and plan link/);
 assert.match(html,/Measurement scope and evidence/);
});

test('definitions, observations, saved progress and uncertain states retain the prominent summary',()=>{
 const variants=[
  p=>delete p.snapshot,
  p=>p.snapshot.hasObservations=true,
  p=>p.snapshot.stale=true,
  p=>p.context.assessment.currentStatus='unavailable',
  p=>p.context.history=[{id:'saved'}],
  p=>p.context.planLinks=[{id:'linked'}],
  p=>p.context.milestones=[{id:'m',date:'2026-11-01',value:5,status:'proposed'}],
  p=>p.pinnedPlanName='Reviewed proposal',
  p=>p.context.measurement={metric:'headcount',unit:'people',direction:'increase',target:{value:10,date:'2026-11-01'},scope:{country:'all',org:'all',level:'all'}},
 ];
 for(const change of variants){const props=empty();change(props);assert.match(render(props),/^<section aria-label="Goal progress"/);}
 const props=empty();props.context.measurement={metric:'headcount',unit:'people',direction:'increase',target:{value:10,date:'2026-11-01'},scope:{country:'all',org:'all',level:'all'}};
 props.snapshot.latest={value:8,period:{end:'2026-09-30'},source:{classification:'user-reported',releaseId:'r'},capturedAt:'2026-10-01'};props.snapshot.hasObservations=true;props.snapshot.stale=true;
 const html=render(props);assert.match(html,/Measured progress:<\/strong> 8 people/);assert.match(html,/Stale under saved freshness policy/);
});

test('capacity guidance keeps unknown inputs and a single draft-loss warning beside saving',()=>{
 assert.ok(capacityFindings(null,true).items.includes('Blank inputs remain unknown.'));
 const workspace=fs.readFileSync(new URL('../components/workforce-planning/capacity-workspace.tsx',import.meta.url),'utf8');
 const saved=fs.readFileSync(new URL('../components/workforce-planning/capacity-saved-scenarios.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(workspace,/Enter the work and the team you expect to have|Drafts are not saved automatically/);
 assert.equal((saved.match(/Drafts are not saved automatically/g)||[]).length,1);
 assert.match(saved,/clear on reload or dataset change/);
 assert.match(saved,/save a new named scenario in this browser under the selected goal/);
 assert.match(saved,/Cost rate is optional/);
});
