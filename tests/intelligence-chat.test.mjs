import test from 'node:test';
import assert from 'node:assert/strict';
import {intelligenceEvidence,isIntelligencePage,intelligenceInstructions} from '../lib/intelligence-chat.ts';
test('catalogue scopes cannot acquire unrelated workforce context',()=>{
 assert.equal(isIntelligencePage('labor-market'),true);assert.equal(isIntelligencePage('finance'),false);
 const e=intelligenceEvidence('occupational-references',{totalJobProfiles:20,mappedJobProfiles:15,headcount:10000,quotes:[{provider:'Other'}]});
 assert.equal(e.mappedJobProfiles,15);assert.equal(e.filtersApplied,false);assert.equal(e.referenceContentLoaded,false);assert.equal(e.headcount,undefined);assert.equal(e.quotes,undefined);
 assert.equal(intelligenceEvidence('occupational-references',{totalJobProfiles:2,mappedJobProfiles:3}).mappedJobProfiles,null);
 assert.equal(intelligenceEvidence('occupational-references',{unavailable:true,totalJobProfiles:20,mappedJobProfiles:15}).totalJobProfiles,null);
});
test('BLS retains units/dates, drops foreign metrics and preserves unknowns',()=>{
 const e=intelligenceEvidence('labor-market',{metrics:[{series_id:'CES0000000001',raw_value:150000,observation_date:'2026-08-01',unit:'millions'},{series_id:'LNS14000000',raw_value:null},{series_id:'invented',raw_value:7}]});
 assert.equal(e.metrics.length,3);assert.equal(e.metrics[2].unit,'thousands');assert.equal(e.metrics[2].value,150000);assert.equal(e.metrics[2].observationDate,'2026-08-01');assert.equal(e.metrics[0].value,null);
 assert.ok(intelligenceEvidence('labor-market',{unavailable:true,metrics:[{series_id:'LNS14000000',raw_value:4}]}).metrics.every(m=>m.value===null));
 assert.equal(intelligenceEvidence('labor-market',{metrics:[{series_id:'LNS14000000',raw_value:101}]}).metrics[0].value,null);
});
test('quote provenance, bounded fields and blank versus zero costs survive',()=>{
 const e=intelligenceEvidence('training-coaching',{quotes:[{provider:'Example',provenance:'simulated',fee:'0',currency:'USD',basis:'person'},{provider:'Custom',fee:'',currency:'ZZZ',provenance:'user-provided'}]});
 assert.match(e.quotes[0].provenance,/FICTIONAL/);assert.equal(e.quotes[0].feePerUnitPerSession,'0');assert.equal(e.quotes[1].feePerUnitPerSession,null);assert.equal(e.quotes[1].currency,null);assert.match(e.quotes[1].provenance,/UNVERIFIED/);
 assert.equal(intelligenceEvidence('training-coaching',{quotes:Array(20).fill({provider:'a'.repeat(500)})}).quotes.length,8);
 assert.match(intelligenceInstructions,/No tools or browsing/);assert.match(intelligenceInstructions,/retention effects/);assert.match(intelligenceInstructions,/newest correction/);
});
