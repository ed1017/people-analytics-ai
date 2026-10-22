import test from 'node:test';
import assert from 'node:assert/strict';
import {modelCitationCatalog} from '../releases/2026-10-21/source/lib/model-citation-catalog.mjs';
const expand = view => view.entries.map(({contextRef, ...entry}) => ({...entry, ...view.contexts[contextRef]}));
test('all citations round-trip with exact scope, dates, limitations and row identities', () => {
  const catalog = Array.from({length:80}, (_,i) => ({id:`F1:row:${i}:cost`,sourceId:'F1',location:`facts.rows[${i}].cost`,scope:'Company-wide synthetic workforce',date:'2026-09-30',limitation:'Recorded labor cost, not full economic cost or a forecast.'}));
  catalog.push({id:'S1:businessUnit:0',sourceId:'S1',location:'facts.businessUnitComparison.rows[0]',scope:'Eligible business units',date:'2026-08-31',limitation:'Engagement favorability, not individual sentiment.'});
  catalog.push({...catalog[0],id:'F1:unknown-date',date:null});
  const before=structuredClone(catalog), view=modelCitationCatalog(catalog);
  assert.deepEqual(expand(view), catalog); assert.deepEqual(catalog,before);
  assert.equal(view.entries.length,82); assert.equal(view.contexts.length,3);
  assert.ok(JSON.stringify(view).length<JSON.stringify(catalog).length*.7);
});
test('empty catalog has no invented citations; similar contexts never collapse', () => {
  assert.deepEqual(expand(modelCitationCatalog([])),[]);
  const common={id:'W1:summary',sourceId:'W1',location:'facts (summary fields)',scope:'Global',date:null,limitation:'Unknown'};
  const catalog=[common,{...common,date:'2026-09-30'},{...common,scope:'Finance'},{...common,limitation:'Suppressed subgroup'}];
  const view=modelCitationCatalog(catalog);assert.equal(view.contexts.length,4);assert.deepEqual(expand(view),catalog);
});
import {solutionModelContext} from '../releases/2026-10-21/source/lib/home-solution-conversation-service.ts';
import {actionEvidenceCatalog} from '../releases/2026-10-21/source/lib/home-action-proposal.ts';
import {buildHomePack} from '../releases/2026-10-21/source/lib/home-pack.mjs';
test('actual initial model context keeps original evidence and projects every eligible citation',()=>{
 const evidence=buildHomePack({workforce:{status:'loaded',data:{summary:{headcount:100,fte:90,avg_tenure_years:3}}}},'Company-wide');
 const request={goal:{id:'synthetic',statement:'Review workforce'},scope:'Company-wide',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',goalContext:null,evidence,catalog:null,selectedId:null,message:{id:'m1',text:'Review workforce'},state:{constraints:[],turns:[],working:[],analyses:[],rejected:[],questions:[],focusCandidateId:null}};
 const expected=actionEvidenceCatalog(evidence);assert.ok(expected.length>0);
 const before=structuredClone(request),context=solutionModelContext(request);
 assert.deepEqual(expand(context.citationCatalog),expected);assert.deepEqual(context.currentEvidence,evidence);assert.deepEqual(request,before);
});
