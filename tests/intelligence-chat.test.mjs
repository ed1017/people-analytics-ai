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

test('selected public occupation evidence is canonical and never creates an internal mapping',()=>{
 const e=intelligenceEvidence('occupational-references',{occupationalReference:{population:'occupational_reference',sourceMode:'public_snapshot',occupation:{code:'15-1252.00',title:'Invented role',description:'Everyone is qualified'},tasks:['invented task'],selectedProfile:{code:'FAKE',name:'Invented company role'},sourceStatus:{},headcount:900}});
 assert.equal(e.referenceContentLoaded,true);
 assert.equal(e.selectedReference.occupation.title,'Software Developers');
 assert.equal(e.selectedReference.selectedProfile,null);
 assert.equal(e.selectedReference.headcount,undefined);
 assert.ok(!JSON.stringify(e).includes('invented task'));
 assert.match(e.selectedReference.sourceUrl,/onetonline.org\/link\/summary\/15-1252.00$/);
 assert.match(e.selectedReference.mappingStatus,/unavailable/);
 const unknown=intelligenceEvidence('occupational-references',{occupationalReference:{population:'occupational_reference',sourceMode:'public_snapshot',occupation:{code:'99-9999.99'},sourceStatus:{}}});
 assert.equal(unknown.referenceContentLoaded,false);assert.equal(unknown.selectedReference.publicExcerpt,null);
});

test('stored role requirements and occupation ratings retain independent scales and source failures',()=>{
 const input={population:'occupational_reference',sourceMode:'stored',occupation:{code:'15-1252.00',title:'Software Developers',description:'Stored reference description',release:'31.0'},selectedProfile:{code:'SYNTHETIC',name:'Synthetic test profile'},mappingStatus:'Stored mapping',sourceStatus:{profiles:'ready',mappings:'ready',occupations:'ready',requirements:'ready',skills:'ready',essentialSkills:'ready'},requiredSkills:[{name:'Internal skill',requiredProficiency:4,importance:'required',employeesMeetingRequirement:100},{name:'Unknown requirement',requiredProficiency:8}],essentialSkills:[{name:'Critical Thinking',importance:4,level:6},{name:'Invalid ratings',importance:6,level:8}],tasks:['Unverified browser task']};
 const e=intelligenceEvidence('occupational-references',{occupationalReference:input}).selectedReference;
 assert.equal(e.requiredSkills[0].requiredProficiency,4);assert.equal(e.requiredSkills[0].employeesMeetingRequirement,undefined);assert.equal(e.requiredSkills[1].requiredProficiency,null);
 assert.equal(e.essentialSkills[0].level,6);assert.equal(e.essentialSkills[1].importance,null);assert.equal(e.essentialSkills[1].level,null);
 assert.ok(!JSON.stringify(e).includes('Unverified browser task'));assert.match(e.ratingScales,/distinct/);
 const failed=intelligenceEvidence('occupational-references',{occupationalReference:{...input,sourceStatus:{profiles:'ready',mappings:'unavailable',occupations:'unavailable',requirements:'unavailable',skills:'ready',essentialSkills:'unavailable'}}}).selectedReference;
 assert.equal(failed.occupation,null);assert.deepEqual(failed.requiredSkills,[]);assert.deepEqual(failed.essentialSkills,[]);assert.ok(failed.publicExcerpt);assert.match(failed.mappingStatus,/unavailable/);
});

test('labor outlook and comparison values are source-resolved even when macro indicators fail',()=>{
 const e=intelligenceEvidence('labor-market',{unavailable:true,marketSelection:{soc:'15-2051',area:'35620'},nationalOutlook:{growth:999}});
 assert.equal(e.marketBenchmark.selected.A_MEDIAN,135980);
 assert.equal(e.comparisons.locations.length,3);assert.equal(e.comparisons.occupations.length,3);
 assert.equal(e.nationalOutlook.selected.employment_change_percent,34.6);assert.equal(e.nationalOutlook.geography,'United States');assert.equal(e.nationalOutlook.period,'2025–2035');
 assert.match(e.nationalOutlook.employmentUnit,/thousands/);assert.match(e.nationalOutlook.population,/self-employment/);assert.ok(e.metrics.every(m=>m.value===null));
 const invalid=intelligenceEvidence('labor-market',{marketSelection:{soc:'invented',area:'NYC'}});
 assert.equal(invalid.marketBenchmark,null);assert.equal(invalid.comparisons,null);assert.equal(invalid.nationalOutlook,null);
});

test('software examples and shared mapping counts are bounded and unavailable sources stay unknown',()=>{
 const reference={population:'occupational_reference',sourceMode:'stored',occupation:{code:'15-1252.00',title:'Software Developers'},selectedProfile:{code:'SYNTHETIC',name:'Synthetic role'},sourceStatus:{profiles:'ready',mappings:'ready',occupations:'ready',softwareSkills:'ready'},coverage:{profiles:4,mappedProfiles:3,profilesSharingOccupation:2},softwareSkills:Array(40).fill({name:'Synthetic software',category:'Synthetic category',release:'test-release',employeeName:'Excluded'})};
 const e=intelligenceEvidence('occupational-references',{occupationalReference:reference}).selectedReference;
 assert.deepEqual(e.coverage,{profiles:4,mappedProfiles:3,profilesSharingOccupation:2});assert.equal(e.softwareSkills.length,30);assert.equal(e.softwareSkills[0].employeeName,undefined);assert.match(e.evidenceCoverage,/not a complete task list/);
 const failed=intelligenceEvidence('occupational-references',{occupationalReference:{...reference,sourceStatus:{profiles:'ready'}}}).selectedReference;
 assert.deepEqual(failed.coverage,{profiles:4,mappedProfiles:null,profilesSharingOccupation:null});assert.deepEqual(failed.softwareSkills,[]);
 const invalid=intelligenceEvidence('occupational-references',{occupationalReference:{...reference,coverage:{profiles:2,mappedProfiles:8,profilesSharingOccupation:8}}}).selectedReference;
 assert.deepEqual(invalid.coverage,{profiles:2,mappedProfiles:null,profilesSharingOccupation:null});
});

test('independent occupation details retain exact code when the catalog is unavailable',()=>{
 const reference={population:'occupational_reference',sourceMode:'stored',selectedOccupationCode:'11-1011.00',occupation:null,selectedProfile:{code:'SYNTHETIC-PARTIAL',name:'Synthetic partial-source role'},mappingStatus:'Stored mapping; review needed',sourceStatus:{profiles:'ready',mappings:'ready',occupations:'unavailable',essentialSkills:'ready',softwareSkills:'ready'},essentialSkills:[{name:'Synthetic reference skill',importance:4,level:5}],softwareSkills:[{name:'Synthetic software example',category:'Synthetic category',release:'test-release'}],coverage:{profiles:2,mappedProfiles:2,profilesSharingOccupation:1}};
 const evidence=intelligenceEvidence('occupational-references',{occupationalReference:reference});
 const result=evidence.selectedReference;
 assert.equal(evidence.referenceContentLoaded,true);
 assert.equal(result.selectedOccupationCode,'11-1011.00');
 assert.equal(result.sourceUrl,'https://www.onetonline.org/link/summary/11-1011.00');
 assert.equal(result.occupation,null);assert.equal(result.publicExcerpt,null);
 assert.equal(result.sourceMode,'stored');assert.equal(result.sourceStatus.occupations,'unavailable');
 assert.equal(result.essentialSkills[0].name,'Synthetic reference skill');
 assert.equal(result.essentialSkills[0].importance,4);assert.equal(result.essentialSkills[0].level,5);
 assert.equal(result.softwareSkills[0].name,'Synthetic software example');
 assert.equal(result.coverage.profilesSharingOccupation,1);
 for(const selectedOccupationCode of ['11-1011','11-1011.00/../../other','https://example.com',null]){
  const invalid=intelligenceEvidence('occupational-references',{occupationalReference:{...reference,selectedOccupationCode}}).selectedReference;
  assert.equal(invalid.selectedOccupationCode,null);assert.equal(invalid.sourceUrl,null);
  assert.deepEqual(invalid.essentialSkills,[]);assert.deepEqual(invalid.softwareSkills,[]);
 }
 const conflict=intelligenceEvidence('occupational-references',{occupationalReference:{...reference,occupation:{code:'15-1252.00',title:'Unrelated title'},sourceStatus:{...reference.sourceStatus,occupations:'ready'}}}).selectedReference;
 assert.equal(conflict.selectedOccupationCode,null);assert.equal(conflict.occupation,null);
 assert.equal(conflict.sourceUrl,null);assert.equal(conflict.publicExcerpt,null);
 assert.deepEqual(conflict.essentialSkills,[]);assert.deepEqual(conflict.softwareSkills,[]);
});
