import test from 'node:test';import assert from 'node:assert/strict';
import {buildHomePack,normalizeHomePack,HOME_MAX_BYTES} from '../lib/home-pack.mjs';
import {homeTurnoverGroups} from '../lib/home-turnover-groups.mjs';
import {actionEvidenceCatalog} from '../lib/home-action-proposal.ts';
import {createPublicHomeGroundingTestAdapter} from '../lib/public-home-grounding.server.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
const digest='a'.repeat(64),hostname='people-analytics-test-ed-56dc.vercel.app',scope='All countries; All business units; All levels',filters={country:'all',org:'all',level:'all'};
// Authored fixture, not a claim about observed company values.
const data=()=>({as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{total_exits:80,voluntary_exits:64},business_units:Array.from({length:8},(_,i)=>({org_code:'BU-'+i,org_name:i===7?'Managed Services':'Group '+i,exits:10,voluntary_exits:8,voluntary_turnover_ytd_pct:5+i})),reasons:[]});
const pack=(d,q='')=>buildHomePack({attrition:{status:'loaded',data:d}},scope,q);
const comparison=p=>p.sources.find(s=>s.id==='A1').facts.turnoverByBusinessUnit;
for(const q of ['How should an HR leader evaluate whether pay or workload is contributing to turnover in Managed Services?','How can HR investigate retention in Group 2?','What should we check before acting on turnover?'])test('advice evidence retains complete dated baseline: '+q,()=>{
 const p=pack(data(),q),c=comparison(p);assert.equal(c.rows.length,8);assert.equal(c.rows[7].voluntary_turnover_ytd_pct,12);assert.equal(c.periodStart,'2026-01-01');assert.equal(c.asOf,P.cutoff);assert.match(c.metric,/Voluntary turnover YTD/);assert.equal(c.rows[7].total_turnover_ytd_pct,undefined);assert.deepEqual(normalizeHomePack(p),p);assert.ok(Buffer.byteLength(JSON.stringify(p))<=HOME_MAX_BYTES);
 const citations=actionEvidenceCatalog(p).filter(c=>c.id.startsWith('A1:businessUnit:'));assert.equal(citations.length,8);assert.equal(citations[7].location,'facts.turnoverByBusinessUnit.rows[7]');assert.equal(citations[7].date,P.cutoff);
});
for(const [name,change] of [['missing row',d=>d.business_units.pop()],['duplicate',d=>d.business_units[1].org_code='BU-0'],['null rate',d=>d.business_units[0].voluntary_turnover_ytd_pct=null],['suppressed',d=>d.business_units[0].suppressed=true],['unknown suppression',d=>d.business_units[0].suppressed='unknown'],['wrong cutoff',d=>d.as_of='2025-09-30'],['unreconciled counts',d=>d.summary.total_exits++],['invalid rate',d=>d.business_units[0].voluntary_turnover_ytd_pct=101]])test(name+' does not create partial or invented baseline',()=>{const d=data();change(d);assert.equal(homeTurnoverGroups(d),null);assert.equal(comparison(pack(d)),null);assert.equal(actionEvidenceCatalog(pack(d)).some(c=>c.id.startsWith('A1:businessUnit:')),false);});
test('public grounding verifies every comparison field and rejects altered baseline',async()=>{
 const d=data(),p=pack(d),binding={router:{bootstrapToken:()=>P.token,current:()=>({datasetId:P.datasetId,token:P.token,generation:P.generation,digest})},handle:async()=>Response.json(d,{headers:{'x-workforce-dataset':P.token}})};
 const verify=createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:()=>binding}).verify;
 await verify({datasetToken:P.token,filters,scope,evidence:p});
 for(const field of ['voluntary_turnover_ytd_pct','org_name']){const changed=structuredClone(p);changed.sources.find(s=>s.id==='A1').facts.turnoverByBusinessUnit.rows[7][field]=field==='org_name'?'Other group':99;await assert.rejects(()=>verify({datasetToken:P.token,filters,scope,evidence:changed}));}
});
