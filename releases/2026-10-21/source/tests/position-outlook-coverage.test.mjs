import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import outlook from '../lib/data/bls-position-outlook-2025-2035.json' with {type:'json'};
import {generateCompanyPositionInventoryV2} from '../lib/company-position-model-v2.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
import {savePositionScenario,POSITION_ALLOCATION_LEDGER_FIELD as A} from '../lib/position-allocation-store.ts';
import {listPositionMarketContextReferences as list,POSITION_MARKET_CONTEXT_FIELD as M,preparePositionMarketContext as prepare,confirmPositionMarketContext as confirm,readPositionMarketContextLedger as read,positionMarketContextChatReference} from '../lib/position-market-context.ts';
import {positionChatContext,readPositionChatContext} from '../lib/position-chat-context.ts';
import {encodeDecisionBackup,parseDecisionBackup} from '../lib/decision-backup.ts';
const inventory=generateCompanyPositionInventoryV2(),at='2026-10-31T23:00:00.000Z';
function draft(role,country='US'){const ids=inventory.positions.filter(p=>p.status==='vacant'&&p.countryCode===country&&p.role===role).map(p=>p.id);assert.ok(ids.length);const d=createPositionAllocation(ids,false,inventory);Object.assign(d.input,{hire:1,repurpose:0,train:0});return d;}
const roles=[...new Set(inventory.positions.filter(p=>p.status==='vacant'&&p.countryCode==='US').map(p=>p.role))];
const all=()=>roles.flatMap(role=>list(draft(role)));
const expected=[['15-2051',275600,371000,95400,34.6,24800,5600,9700,15300,119,119],['15-1212',192900,233400,40600,21,14100,3500,6500,10000,97,97],['15-1243',69500,76000,6500,9.4,3900,1300,2000,3300,105,105],['15-1253',187600,198200,10600,5.7,10700,3500,6100,9600,110,110],['15-1255',132700,140800,8000,6,8300,3100,4300,7400,112,112],['13-1082',1094300,1167400,73200,6.7,76500,22600,46600,69200,67,67],['13-1141',118100,125200,7100,6,9000,3100,5200,8300,71,71],['27-3031',314500,320200,5700,1.8,23000,7400,15100,22400,393,393],['41-3091',1272700,1306700,33900,2.7,115700,35000,77300,112300,662,662]];
test('nine verified BLS rows retain independently rounded components and published coordinates',()=>{for(const tuple of expected){const r=outlook.records.find(r=>r.occupationCode===tuple[0]);assert.deepEqual([r.occupationCode,r.employmentBase,r.employmentProjected,r.employmentChangeNumeric,r.employmentChangePercent,r.annualAverageOpenings,r.annualAverageLaborForceExits,r.annualAverageOccupationalTransfers,r.annualAverageOccupationalSeparations,r.table12Row,r.table110Row],tuple);const refs=all().filter(x=>x.kind==='occupation-outlook'&&x.occupationCode===tuple[0]);assert.ok(refs.length);for(const ref of refs){const f=ref.facts;assert.deepEqual([ref.occupationCode,f.employmentBase,f.employmentProjected,f.employmentChange,f.employmentChangePercent,f.annualOpenings,f.annualExits,f.annualTransfers,f.annualSeparations,f.table12Row,f.table110Row],tuple);assert.equal(f.sourceUnit,'thousands');}}assert.equal(outlook.records.find(r=>r.occupationCode==='27-3031').annualAverageOccupationalSeparations,22400);});
test('outlook reaches46 vacancies and software48 without granting unsupported geography or occupations',()=>{const count=kind=>roles.reduce((n,role)=>n+(list(draft(role)).some(r=>r.kind===kind)?draft(role).input.selectedIds.length:0),0);assert.equal(count('occupation-outlook'),46);assert.equal(count('in-demand-software'),48);const uk=list(draft('Frontend Software Engineer','GB'));assert.deepEqual(uk.filter(r=>['occupation-outlook','in-demand-software','occupation-skills'].includes(r.kind)),[]);assert.deepEqual(uk.map(r=>[r.kind,r.countryCode,r.occupationCode]),[['occupation-demand','GB','2134']]);const mixed=draft('Machine Learning Engineer');mixed.input.selectedIds.push(draft('Business Intelligence Analyst').input.selectedIds[0]);assert.deepEqual(list(mixed),[]);});
test('BI disaggregation stays separate and shared Data Scientists outlook is explicitly nonadditive',()=>{for(const role of ['Business Intelligence Analyst','Business Intelligence Developer','Machine Learning Engineer']){const refs=list(draft(role)),software=refs.find(r=>r.kind==='in-demand-software'),projection=refs.find(r=>r.kind==='occupation-outlook');assert.equal(software.occupationCode,role==='Machine Learning Engineer'?'15-2051.00':'15-2051.01');assert.equal(projection.occupationCode,'15-2051');assert.equal(projection.facts.annualOpenings,24800);assert.match(projection.mappingLimit,/Broader Data Scientists/);assert.match(projection.mappingLimit,/not .*specific/);assert.match(projection.mappingLimit,/do not add them together/);}});
test('new context survives backup and exact server reconstruction without changing saved allocation',()=>{const memory=new Map(),store=new DecisionStore();store.initialize({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)});const datasetToken=store.getDatasetToken(),d=draft('Business Intelligence Developer'),identity={datasetToken,goalId:'',goal:''};const capture=savePositionScenario({store,...identity,revision:store.getSnapshot().data.revision,at,draft:d,scenarioId:'outlook'}),ref=list(d).find(r=>r.kind==='occupation-outlook'),options={store,datasetToken,goalId:'',scenarioId:'outlook',allocationRevision:1,referenceIds:[ref.id],dutiesConfirmed:{[ref.id]:true}},ticket=prepare(options),before=structuredClone(store.getSnapshot().data.exploration.fields[A]);confirm({store,ticket,at});assert.deepEqual(store.getSnapshot().data.exploration.fields[A],before);const data=parseDecisionBackup(encodeDecisionBackup(store.getSnapshot().data,datasetToken,at),datasetToken).data,fields=data.exploration.fields,ledger=read(fields[M],datasetToken,'',fields[A]),packet=positionChatContext({draft:d,scenario:{id:'outlook',revision:1},marketContext:positionMarketContextChatReference(ledger,capture,1)},identity),e=readPositionChatContext(packet,identity).evidence.marketContext.references[0];assert.equal(e.facts.annualOpenings,24800);assert.match(e.mappingLimit,/do not add/);const stale=prepare(options);store.setField('','unrelated','preserved');assert.throws(()=>confirm({store,ticket:stale,at}));const wrong=structuredClone(packet);wrong.marketContext.record.allocationRevision=2;assert.throws(()=>readPositionChatContext(wrong,identity));});

// Canonical reference hashes captured from live PR504 (45214a6); no external test dependency.
const previousHashes={
  "bls-outlook:13-1111:Management Consultant": "e6fa3d2a8157702a3d8267b6dc3191b4a390088d0ecb626ccd0ba7201e6db522",
  "bls-outlook:13-1111:Transformation Consultant": "debc5927fcc6db74e4dba379d0d47778838a3b8e35fdcc49fbb56b77dcf46051",
  "bls-outlook:13-2011:Accountant": "7b4ba70c43f87041faf14fb85a9d97a19b2a2d3c927b60363c72f2f68bea99a9",
  "bls-outlook:13-2031:Financial Planning and Analysis Analyst": "06ef102039442837a828d3ed7f54b3121fc959f4ba51a4bfe448e00829f21051",
  "bls-outlook:15-1211:HR Systems Specialist": "ab0c17be53dbcd1a4a6244a59c4fdd7ee5a8cef326acf84a8e71e6ff417fefd9",
  "bls-outlook:15-1252:Frontend Software Engineer": "88551b236e779ee8562cb589d41b8fc4f2fdd5444f4aa8d78bed55d98cbdc729",
  "bls-outlook:23-1011:Legal Counsel": "2bf1039780dae96559953b2016430aa6ccf0293fb987d8bc32b5d329ee083551",
  "bls-outlook:23-1011:Privacy Counsel": "d734c47939fe583ecb3651a3b2fb740e0d66097a12107cd693b24347e5d24418",
  "onet-software:13-1023.00:Sourcing Specialist": "cadeace8d11894e64f97ce39c8cfbeb03536e746c6de354747df0c60b60a481c",
  "onet-software:13-1082.00:Project Manager": "5bf434f19e2e48aca60e8f509a136bda173fff674471181fb9904dc0db0232e8",
  "onet-software:13-1111.00:Management Consultant": "525768842ceb3d4345f66b1fc4e6ab516e2ed1d78958834539576e7aa520897f",
  "onet-software:13-1111.00:Transformation Consultant": "6c95e9757c5e4d2d1ea94856c420ce86b30be38c96f2a43468d67d232adedecf",
  "onet-software:13-1141.00:Total Rewards Specialist": "c688cc6cf41ae44dbac01c05b38b61ef4425c52e12f7d689dceef7552ac39bb3",
  "onet-software:13-2011.00:Accountant": "431d5cd86e5b6e52c8d317391aa052e2605b0a5aef2f17faf043915770ef1c48",
  "onet-software:13-2031.00:Financial Planning and Analysis Analyst": "0c46decd7ff74a9405ef9f5f2ab09a58552d226242656b10729c4d8c43b78044",
  "onet-software:15-1211.00:HR Systems Specialist": "e3f0e9d02a53bb5a3169c90249c9318a9636a43782dc1bbaa917fb8ebc8d8be4",
  "onet-software:15-1212.00:Information Security Analyst": "3ef13743c8948cedef9e2103c974f3bd48542f8261d3459d2d87937ff97d0c17",
  "onet-software:15-1243.00:Data Architect": "ffd4ffe90e213445cd4a8b534300e84e3c3319a7f43051ca17e9fa5797aef360",
  "onet-software:15-1243.00:Data Engineer": "d4161b4aa8c18f60df751a6c9d3f03a4e9048cf4d297c872966a89bd044be0fd",
  "onet-software:15-1252.00:Frontend Software Engineer": "9b4016d52ac92cac45fe5f239d8df7d3133645c6c91212c01ed5d560e618a1f2",
  "onet-software:15-1253.00:Quality Assurance Engineer": "ca404c3553d540b7eaa0be172a107f7cd9e8d478913668f81638b8e0da20a294",
  "onet-software:15-1255.00:User Experience Designer": "ac7f38abd190b42acc41b2b697cdf23a905edddd22a72cbb47b171790d70c29d",
  "onet-software:15-2051.00:Machine Learning Engineer": "781c8cad796dba08d3f90e5f78e51315d106141fe5f11b00554d1cb42988625b",
  "onet-software:15-2051.01:Business Intelligence Analyst": "eda76228900d39dc52ed3d8ea4e19d995f3ef84d42976465a61c7a1af8af14ff",
  "onet-software:15-2051.01:Business Intelligence Developer": "1f3ad08c4afc140b0fe6f11a8f4154a8c39c94e481dd2ef0ffd350c3b253686b",
  "onet-software:23-1011.00:Legal Counsel": "e89b356a9633aa33b043a35382022fa1c79caee8c8c7392168aefbe9c911bf26",
  "onet-software:23-1011.00:Privacy Counsel": "1a7b7ebfde248caf4add888bd4762f3072d693c2586733f77ca18df592ab3873",
  "onet-software:27-3031.00:Communications Specialist": "ca17bfae50d100be8543805152643e49083e030152e52144cf2b8f96cd2beca0",
  "onet-software:41-3091.00:Sales Account Executive": "258b50e3f796e165a4c97c3348c51366360960eb1322aa0c211f289dae21bc96"
};
test('all29 existing canonical references remain byte-equivalent',()=>{const refs=all();assert.equal(Object.keys(previousHashes).length,29);for(const [id,hash] of Object.entries(previousHashes)){const ref=refs.find(r=>r.id===id);assert.ok(ref,id);assert.equal(createHash('sha256').update(JSON.stringify(ref)).digest('hex'),hash,id);}});
