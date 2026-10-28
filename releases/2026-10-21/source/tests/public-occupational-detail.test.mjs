import test from 'node:test';import assert from 'node:assert/strict';
import {projectPublic9037,public9037Metadata} from '../lib/public-9037-projection.mjs';
const path='/api/occupational-reference',digest='a'.repeat(64);
const detail=()=>({kind:'detail',code:'15-1252.00',essentialSkills:[],softwareSkills:[],suppressedRatings:0,sources:{essentialSkills:'unavailable',softwareSkills:'unavailable'},data_meta:{privateMarker:'must not escape',artifactDigest:'private'}});
test('only existing unavailable empty detail crosses with regenerated public provenance',()=>{
 const input=detail(),before=structuredClone(input),r=projectPublic9037(path,input,digest);
 assert.deepEqual(r,{kind:'detail',code:'15-1252.00',essentialSkills:[],softwareSkills:[],suppressedRatings:0,sources:{essentialSkills:'unavailable',softwareSkills:'unavailable'},data_meta:public9037Metadata(digest)});assert.deepEqual(input,before);assert.doesNotMatch(JSON.stringify(r),/privateMarker|artifactDigest|must not escape/);
});
for(const [name,change] of [['extra root field',d=>d.description='private'],['nonempty essential skills',d=>d.essentialSkills=[{name:'private'}]],['nonempty software skills',d=>d.softwareSkills=[{name:'private'}]],['ready source',d=>d.sources.essentialSkills='ready'],['extra source field',d=>d.sources.other='unavailable'],['invalid code',d=>d.code='../private'],['nonzero suppressed count',d=>d.suppressedRatings=1],['null skills',d=>d.essentialSkills=null],['missing metadata',d=>delete d.data_meta],['missing source',d=>delete d.sources.softwareSkills],['wrong metadata type',d=>d.data_meta=[]]])test(name+' remains rejected',()=>{const d=detail();change(d);assert.throws(()=>projectPublic9037(path,d,digest),/Unreviewed occupational detail/);});
test('detail fields remain unauthorized on other endpoints',()=>{assert.throws(()=>projectPublic9037('/api/workforce',detail(),digest));});
test('existing index projection and public identity stay unchanged',()=>{const d={kind:'index',mappedProfileCount:0,occupations:[],profiles:[{id:'private-id',code:'AI-ENG',name:'AI Engineer',description:null,active:true,mapping:null,requirements:[]}],sources:{profiles:'ready',mappings:'ready',occupations:'unavailable',requirements:'ready',skills:'ready'},data_meta:{privateMarker:'private'}};
 assert.deepEqual(projectPublic9037(path,d,digest),{...d,profiles:d.profiles.map(({id,...r})=>r),data_meta:public9037Metadata(digest)});
});
