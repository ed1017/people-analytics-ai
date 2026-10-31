import type {DecisionStore,Json} from './local-decisions';
// @ts-expect-error Native tests share canonical TypeScript.
import {requirePositionAllocationDraft,type PositionAllocationDraft} from './position-allocation.ts';
// @ts-expect-error Native tests share canonical TypeScript.
import {resolvePositionInventory,positionInventoryKey} from './position-inventory.ts';
// @ts-expect-error Native tests share canonical TypeScript.
import {POSITION_ALLOCATION_DRAFT_FIELD,readPositionScenarioLedger,type PositionScenarioCapture} from './position-allocation-store.ts';
import {marketEvidence} from './oews-reference.mjs';
// @ts-expect-error Native tests share canonical TypeScript.
import {UK_SOFTWARE_PAY_REFERENCE} from './external-workforce-evidence.ts';
import {validDatasetToken} from './dataset-identity.mjs';

export const POSITION_MARKET_FIELD='planning.positionMarketAssumptionsV1';
export const POSITION_MARKET_SOURCE_VERSION='oews-may2025-us-software-v1';
const softwareRoles=['Software Engineer','Backend Software Engineer','Frontend Software Engineer','Full Stack Software Engineer'];
const source=marketEvidence({soc:'15-1252',area:'99'});
export const POSITION_MARKET_REFERENCE=Object.freeze({
 version:POSITION_MARKET_SOURCE_VERSION,sourceSha256:'62bc04880b12993e9170e79efab49980a8ab909bb01cfad2d507844ba85fe85b',
 occupation:'Software Developers',occupationCode:'15-1252',taxonomy:'2018 SOC',geography:'United States',area:'99',
 period:'May 2025',currency:'USD',wageBasis:'Annual wages per occupational worker; excludes employer benefits',
 medianUsd:135980,meanUsd:148100,sourceUrl:'https://www.bls.gov/oes/special-requests/oesm25nat.zip',
});
export const POSITION_MARKET_BI_REFERENCE=Object.freeze({
 version:'oews-may2025-us-bi-broader-v2',sourceSha256:POSITION_MARKET_REFERENCE.sourceSha256,
 occupation:'Data Scientists',occupationCode:'15-2051',taxonomy:'2018 SOC',geography:'United States',area:'99',
 period:'May 2025',currency:'USD' as const,wageBasis:POSITION_MARKET_REFERENCE.wageBasis,medianNative:120230,meanNative:126800,
 sourceUrl:POSITION_MARKET_REFERENCE.sourceUrl,mappingScope:'broader-occupation' as const,
 mappingOccupationCode:'15-2051.01',mappingOccupation:'Business Intelligence Analysts',mappingSourceUrl:'https://www.onetonline.org/link/summary/15-2051.01',
 population:'Wage and salary workers in the broader Data Scientists occupation; not BI-specific pay',
 periodStart:'2025-05-01',periodEnd:'2025-05-31',releasedAt:'2026-05-15',revision:'reviewed-extract',
});
export const POSITION_MARKET_UK_REFERENCE=Object.freeze({
 version:'ons-ashe2026-uk-software-v2',sourceSha256:'4719f364d596739679d1bb492a1fc42e4c8e980a5b93ffc791e350f4ba8f4f1d',
 occupation:'Programmers and software development professionals',occupationCode:'2134',taxonomy:'UK SOC 2020',geography:'United Kingdom',area:'GB',
 period:'April 2025–April 2026',currency:'GBP' as const,wageBasis:'Annual gross employee pay; excludes employer benefit costs',medianNative:59862.5,meanNative:69120.6,
 sourceUrl:UK_SOFTWARE_PAY_REFERENCE.source.url,mappingScope:'occupation-reference' as const,
 population:'Full-time employee jobs; adult rates; same job more than one year',periodStart:'2025-04-06',periodEnd:'2026-04-05',releasedAt:'2026-10-22',revision:'provisional',
 medianCvPercent:2.4,meanCvPercent:2,
});
export type PositionMarketReference=typeof POSITION_MARKET_REFERENCE|typeof POSITION_MARKET_BI_REFERENCE|typeof POSITION_MARKET_UK_REFERENCE;
export type PositionMarketFx={basis:'user-assumption';from:'GBP';to:'USD';usdPerGbp:number;date:string;confirmed:true};
export function positionMarketNativeAmounts(reference:PositionMarketReference){return 'medianUsd' in reference?{currency:'USD' as const,median:reference.medianUsd,mean:reference.meanUsd}:{currency:reference.currency,median:reference.medianNative,mean:reference.meanNative};}
const exact=(value:unknown,keys:string[]):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join()===keys.sort().join();
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const assert=(condition:unknown,message:string):void=>{if(!condition)throw Error(message);};
const validAt=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const signature=(draft:PositionAllocationDraft)=>JSON.stringify(draft);
const cost=(wage:number,percent:number)=>Math.round((wage*(1+percent/100)+Number.EPSILON)*100)/100;
function reviewedSource(version:string=POSITION_MARKET_SOURCE_VERSION):PositionMarketReference{
 if(version===POSITION_MARKET_BI_REFERENCE.version){const row=marketEvidence({soc:'15-2051',area:'99'});assert(row&&row.currency==='USD'&&row.period==='May 2025'&&row.sourceUrl===POSITION_MARKET_BI_REFERENCE.sourceUrl&&row.selected.A_MEDIAN===120230&&row.selected.A_MEAN===126800,'The reviewed BI occupation source changed.');return POSITION_MARKET_BI_REFERENCE;}
 if(version===POSITION_MARKET_UK_REFERENCE.version){const r=UK_SOFTWARE_PAY_REFERENCE;assert(r.id==='ons-ashe-2026-provisional-2134-full-time-annual-gross-gb'&&r.occupation.code==='2134'&&r.geography.code==='GB'&&r.currency==='GBP'&&r.source.archiveSha256===POSITION_MARKET_UK_REFERENCE.sourceSha256&&r.estimates.median===59862.5&&r.estimates.mean===69120.6&&r.estimates.medianCvPercent===2.4&&r.estimates.meanCvPercent===2&&r.periodStart==='2025-04-06'&&r.periodEnd==='2026-04-05'&&r.revision==='provisional','The reviewed UK pay source changed.');return POSITION_MARKET_UK_REFERENCE;}
 assert(version===POSITION_MARKET_SOURCE_VERSION,'Unsupported market source version.');
 assert(source&&source.currency==='USD'&&source.period===POSITION_MARKET_REFERENCE.period&&source.sourceUrl===POSITION_MARKET_REFERENCE.sourceUrl&&source.selected.OCC_CODE==='15-1252'&&source.selected.AREA==='99'&&source.selected.A_MEDIAN===135980&&source.selected.A_MEAN===148100,'The reviewed market source changed.');
 return POSITION_MARKET_REFERENCE;
}
function eligibleScope(inventoryVersion:string,inventoryKey:string,selectedIds:readonly string[],sourceVersion?:string){
 assert(inventoryVersion==='company-position-model-v2','Choose supported vacancies in the company register.');
 const inventory=resolvePositionInventory(inventoryVersion);
 assert(inventoryKey===positionInventoryKey(inventory),'The position inventory changed.');
 assert(Array.isArray(selectedIds)&&selectedIds.length>0&&selectedIds.length<=500&&new Set(selectedIds).size===selectedIds.length,'Select position vacancies first.');
 const rows=selectedIds.map(id=>inventory.positions.find(row=>row.id===id));
 assert(rows.every(row=>row&&row.status==='vacant'),'Select only vacant positions for this reference.');
 const role=rows[0]!.role;
 const country=rows[0]!.location;
 assert(rows.every(row=>row!.role===role&&row!.location===country),'Choose vacancies for one role and country before adopting a pay reference.');
 const version=country==='United States'&&softwareRoles.includes(role)?POSITION_MARKET_SOURCE_VERSION:country==='United States'&&role==='Business Intelligence Analyst'?POSITION_MARKET_BI_REFERENCE.version:country==='United Kingdom'&&['Frontend Software Engineer','Backend Software Engineer','Software Engineer'].includes(role)?POSITION_MARKET_UK_REFERENCE.version:null;
 assert(version&&(!sourceVersion||version===sourceVersion),'This role and country have no supported pay reference.');
 return {role,reference:reviewedSource(version!)};
}
export function positionMarketEligibility(draft:PositionAllocationDraft){
 try{requirePositionAllocationDraft(draft);const {role,reference}=eligibleScope(draft.inventory.version,draft.inventoryKey,draft.input.selectedIds);return {eligible:true,reason:null,role,selectedIds:[...draft.input.selectedIds],reference};}
 catch(error){return {eligible:false,reason:error instanceof Error?error.message:'This position scope has no supported pay reference.',role:null,selectedIds:[],reference:null};}
}
type AdoptionCommon={inventoryVersion:string;inventoryKey:string;selectedIds:string[];role:string;statistic:'median'|'mean';wageUsd:number;employerOncostPercent:number;annualCostUsd:number;mappingConfirmed:true;fullTimeBasisConfirmed:true;adoptedAt:string};
export type PositionMarketAdoption=AdoptionCommon&({version:1;sourceVersion:typeof POSITION_MARKET_SOURCE_VERSION;reference:typeof POSITION_MARKET_REFERENCE}|{version:2;sourceVersion:string;reference:typeof POSITION_MARKET_BI_REFERENCE|typeof POSITION_MARKET_UK_REFERENCE;nativeCurrency:'USD'|'GBP';nativeWage:number;fx:PositionMarketFx|null});
export type PositionMarketRecord={scenarioId:string;allocationRevision:number;allocationSignature:string;adoption:PositionMarketAdoption};
export type PositionMarketLedger={version:1;datasetToken:string;goalId:string;current:PositionMarketAdoption|null;records:PositionMarketRecord[]};
function requireAdoption(value:unknown):asserts value is PositionMarketAdoption{
 const version=(value as PositionMarketAdoption|null)?.version;
 assert((version===1||version===2)&&exact(value,['version','sourceVersion','reference','inventoryVersion','inventoryKey','selectedIds','role','statistic','wageUsd','employerOncostPercent','annualCostUsd','mappingConfirmed','fullTimeBasisConfirmed','adoptedAt',...(version===2?['nativeCurrency','nativeWage','fx']:[])]),'Unsupported saved market assumption.');
 const a=value as PositionMarketAdoption;
 assert((a.version===1?a.sourceVersion===POSITION_MARKET_SOURCE_VERSION:a.sourceVersion!==POSITION_MARKET_SOURCE_VERSION)&&same(a.reference,reviewedSource(a.sourceVersion))&&a.mappingConfirmed===true&&a.fullTimeBasisConfirmed===true&&validAt(a.adoptedAt),'Saved market evidence cannot be verified.');
 assert(a.role===eligibleScope(a.inventoryVersion,a.inventoryKey,a.selectedIds,a.sourceVersion).role,'Saved role mapping changed.');
 assert(['median','mean'].includes(a.statistic)&&Number.isFinite(a.employerOncostPercent)&&a.employerOncostPercent>=0&&a.employerOncostPercent<=200,'Review the wage statistic and employer-cost assumption.');
 const amounts=positionMarketNativeAmounts(a.reference),native=a.statistic==='median'?amounts.median:amounts.mean;
 if(a.version===1)assert(a.wageUsd===native,'Saved source wage changed.');
 else{assert(a.nativeCurrency===amounts.currency&&a.nativeWage===native&&(a.nativeCurrency!=='USD'||a.fx===null),'Saved native pay changed.');const fx=readFx(a.fx,a.nativeCurrency,a.adoptedAt.slice(0,10));assert(a.wageUsd===native*(fx?.usdPerGbp??1),'Saved currency conversion changed.');}
 assert(a.annualCostUsd===cost(a.wageUsd,a.employerOncostPercent),'Saved market cost does not match the reviewed inputs.');
}
function readFx(value:unknown,currency:'USD'|'GBP',latestDate:string):PositionMarketFx|null{
 if(currency==='USD'){assert(value===null||value===undefined,'USD references do not use a currency conversion.');return null;}
 assert(exact(value,['basis','from','to','usdPerGbp','date','confirmed']),'Enter and confirm a dated USD-per-GBP assumption.');const fx=value as PositionMarketFx;
 assert(fx.basis==='user-assumption'&&fx.from==='GBP'&&fx.to==='USD'&&fx.confirmed===true&&typeof fx.usdPerGbp==='number'&&Number.isFinite(fx.usdPerGbp)&&fx.usdPerGbp>0&&fx.usdPerGbp<=10,'Enter a USD-per-GBP assumption greater than 0 and at most 10.');
 assert(typeof fx.date==='string'&&/^20\d\d-\d\d-\d\d$/.test(fx.date)&&Number.isFinite(Date.parse(fx.date+'T00:00:00.000Z'))&&new Date(fx.date+'T00:00:00.000Z').toISOString().slice(0,10)===fx.date&&fx.date<=latestDate,'Enter a valid exchange-rate date no later than the adoption date.');return structuredClone(fx);
}
function matches(a:PositionMarketAdoption,draft:PositionAllocationDraft){return a.inventoryVersion===draft.inventory.version&&a.inventoryKey===draft.inventoryKey&&same([...a.selectedIds].sort(),[...draft.input.selectedIds].sort())&&a.annualCostUsd===draft.input.annualHireCostUsd;}
/** An absent extension is a compatible old save. Malformed extensions never default away. */
export function readPositionMarketLedger(raw:unknown,datasetToken:string,goalId:string,allocationRaw:unknown):PositionMarketLedger|null{
 try{
  assert(validDatasetToken(datasetToken),'Invalid dataset.');
  const allocations=readPositionScenarioLedger(allocationRaw,datasetToken,goalId);assert(allocations,'Saved allocations cannot be verified.');
  if(raw===undefined)return {version:1,datasetToken,goalId,current:null,records:[]};
  assert(exact(raw,['version','datasetToken','goalId','current','records']),'Unsupported market assumption ledger.');const ledger=raw as PositionMarketLedger;
  assert(ledger.version===1&&ledger.datasetToken===datasetToken&&ledger.goalId===goalId&&Array.isArray(ledger.records)&&ledger.records.length<=20,'Market assumptions belong to another workspace or exceed the limit.');
  if(ledger.current!==null)requireAdoption(ledger.current);
  const seen=new Set<string>();
  for(const row of ledger.records){
   assert(exact(row,['scenarioId','allocationRevision','allocationSignature','adoption']),'Unsupported saved market binding.');
   const capture=allocations!.records.find(c=>c.scenarioId===row.scenarioId&&c.revision===row.allocationRevision),key=`${row.scenarioId}:${row.allocationRevision}`;
   assert(capture&&!seen.has(key)&&row.allocationSignature===signature(capture.draft),'Market assumptions do not match the exact saved allocation.');
   requireAdoption(row.adoption);assert(matches(row.adoption,capture!.draft),'Saved allocation cost or scope no longer matches its market assumption.');seen.add(key);
  }
  return structuredClone(ledger);
 }catch{return null;}
}
export function currentPositionMarketEvidence(ledger:PositionMarketLedger|null,draft:PositionAllocationDraft){return ledger?.current&&matches(ledger.current,draft)?structuredClone(ledger.current):null;}
export function positionMarketForCapture(ledger:PositionMarketLedger|null,capture:PositionScenarioCapture){return structuredClone(ledger?.records.find(r=>r.scenarioId===capture.scenarioId&&r.allocationRevision===capture.revision&&r.allocationSignature===signature(capture.draft))?.adoption??null);}

type Options={store:DecisionStore;datasetToken:string;goalId:string};
const allocationField='planning.positionAllocationScenariosV1';
function stateFor({store,datasetToken,goalId}:Options){
 const state=store.getSnapshot();
 assert(store.getDatasetToken()===datasetToken&&validDatasetToken(datasetToken)&&state.ready&&state.saved&&!state.recovery&&state.data.goals.activeId===goalId,'The goal, dataset or saved state changed. Review again.');
 const goal=goalId?state.data.goals.goals.find(g=>g.id===goalId):null;assert(!goalId||goal,'The selected goal is unavailable.');
 const fields=(goalId?state.data.workspaces[goalId]:state.data.exploration)?.fields??{};
 const ledger=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,goalId,fields[allocationField]);assert(ledger,'Saved market assumptions cannot be verified. Existing work is retained.');
 return {state,fields,ledger:ledger!,goal:goal?.statement??''};
}
export type PositionMarketTicket=Readonly<{reference:PositionMarketReference;statistic:'median'|'mean';nativeCurrency:'USD'|'GBP';nativeWage:number;fx:PositionMarketFx|null;wageUsd:number;employerOncostPercent:number;annualCostUsd:number;role:string;selectedCount:number}>;
type Binding=Options&{revision:number;stateSignature:string;draft:PositionAllocationDraft};
const tickets=new WeakMap<PositionMarketTicket,Binding>();
export function preparePositionMarketAdoption(options:Options&{draft:PositionAllocationDraft;statistic:'median'|'mean';employerOncostPercent:number;mappingConfirmed:boolean;fullTimeBasisConfirmed:boolean;fx?:PositionMarketFx|null}):PositionMarketTicket{
 const {state,fields}=stateFor(options),e=positionMarketEligibility(options.draft);
 assert(e.eligible,e.reason??'Select supported vacancies.');assert(same(fields[POSITION_ALLOCATION_DRAFT_FIELD],options.draft),'The position draft changed. Review again.');
 assert(options.mappingConfirmed===true&&options.fullTimeBasisConfirmed===true,'Confirm the role reference and full-time pay basis.');
 assert(['median','mean'].includes(options.statistic)&&Number.isFinite(options.employerOncostPercent)&&options.employerOncostPercent>=0&&options.employerOncostPercent<=200,'Enter an employer-cost percentage from 0 to 200.');
 const reference=e.reference!,amounts=positionMarketNativeAmounts(reference),nativeWage=options.statistic==='median'?amounts.median:amounts.mean,fx=readFx(options.fx,amounts.currency,new Date().toISOString().slice(0,10)),wageUsd=nativeWage*(fx?.usdPerGbp??1);
 if(fx)Object.freeze(fx);
 const ticket=Object.freeze({reference,statistic:options.statistic,nativeCurrency:amounts.currency,nativeWage,fx,wageUsd,employerOncostPercent:options.employerOncostPercent,annualCostUsd:cost(wageUsd,options.employerOncostPercent),role:e.role!,selectedCount:options.draft.input.selectedIds.length});
 tickets.set(ticket,{store:options.store,datasetToken:options.datasetToken,goalId:options.goalId,revision:state.data.revision,stateSignature:JSON.stringify(state.data),draft:structuredClone(options.draft)});return ticket;
}
export function confirmPositionMarketAdoption({store,ticket,at}:{store:DecisionStore;ticket:PositionMarketTicket;at:string}):PositionAllocationDraft{
 const b=tickets.get(ticket);assert(b&&b.store===store,'Review the market assumption again.');const {state,ledger,goal}=stateFor(b!);
 assert(state.data.revision===b!.revision&&JSON.stringify(state.data)===b!.stateSignature&&validAt(at),'The saved draft changed. Review the market assumption again.');
 const draft=structuredClone(b!.draft);draft.input.annualHireCostUsd=ticket.annualCostUsd;
 const common={inventoryVersion:draft.inventory.version,inventoryKey:draft.inventoryKey,selectedIds:[...draft.input.selectedIds],role:ticket.role,statistic:ticket.statistic,wageUsd:ticket.wageUsd,employerOncostPercent:ticket.employerOncostPercent,annualCostUsd:ticket.annualCostUsd,mappingConfirmed:true as const,fullTimeBasisConfirmed:true as const,adoptedAt:at};
 const adoption:PositionMarketAdoption=ticket.reference.version===POSITION_MARKET_SOURCE_VERSION?{version:1,sourceVersion:POSITION_MARKET_SOURCE_VERSION,reference:POSITION_MARKET_REFERENCE,...common}:{version:2,sourceVersion:ticket.reference.version,reference:ticket.reference as typeof POSITION_MARKET_BI_REFERENCE|typeof POSITION_MARKET_UK_REFERENCE,...common,nativeCurrency:ticket.nativeCurrency,nativeWage:ticket.nativeWage,fx:ticket.fx};requireAdoption(adoption);
 const patch={[POSITION_ALLOCATION_DRAFT_FIELD]:draft as unknown as Json,[POSITION_MARKET_FIELD]:{...ledger,current:adoption} as unknown as Json};
 if(b!.goalId)store.commitGoalFields(b!.goalId,goal,b!.revision,at,()=>patch);else store.commitExplorationFields(b!.revision,at,()=>patch);
 tickets.delete(ticket);return structuredClone(draft);
}
/** Draft edits clear an incompatible current adoption, never immutable saved provenance. */
export function updatePositionMarketDraft(options:Options&{draft:PositionAllocationDraft;restoreCapture?:PositionScenarioCapture}):PositionAllocationDraft{
 const {store}=options;requirePositionAllocationDraft(options.draft);const {state,ledger,goal,fields}=stateFor(options);
 let current=currentPositionMarketEvidence(ledger,options.draft);
 if(options.restoreCapture){
  const saved=readPositionScenarioLedger(fields[allocationField],options.datasetToken,options.goalId)?.records.find(c=>c.scenarioId===options.restoreCapture!.scenarioId&&c.revision===options.restoreCapture!.revision);
  assert(saved&&same(saved,options.restoreCapture)&&same(saved.draft,options.draft),'The saved revision changed. Reopen it again.');current=positionMarketForCapture(ledger,saved!);
 }
 const patch:Record<string,Json>={[POSITION_ALLOCATION_DRAFT_FIELD]:structuredClone(options.draft) as unknown as Json};
 if(fields[POSITION_MARKET_FIELD]!==undefined)patch[POSITION_MARKET_FIELD]={...ledger,current} as unknown as Json;
 const at=new Date().toISOString();if(options.goalId)store.commitGoalFields(options.goalId,goal,state.data.revision,at,()=>patch);else store.commitExplorationFields(state.data.revision,at,()=>patch);
 return structuredClone(options.draft);
}
/** Called inside the existing allocation save transaction. */
export function capturePositionMarketPatch(fields:Record<string,Json>,datasetToken:string,goalId:string,capture:PositionScenarioCapture,nextAllocationRaw:unknown):Record<string,Json>{
 const ledger=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,goalId,fields[allocationField]);assert(ledger,'Saved market assumptions cannot be verified.');
 if(fields[POSITION_MARKET_FIELD]===undefined)return {};
 const adoption=currentPositionMarketEvidence(ledger,capture.draft),existing=ledger!.records.find(r=>r.scenarioId===capture.scenarioId&&r.allocationRevision===capture.revision);
 // Existing immutable records cannot acquire a later adoption under the same revision.
 if(existing)assert(same(existing.adoption,adoption),'Review the changed market assumption as a new revision.');
 const records=existing||!adoption?ledger!.records:[...ledger!.records,{scenarioId:capture.scenarioId,allocationRevision:capture.revision,allocationSignature:signature(capture.draft),adoption}];
 const next={...ledger!,current:adoption,records};assert(readPositionMarketLedger(next,datasetToken,goalId,nextAllocationRaw),'Market binding could not be saved.');return {[POSITION_MARKET_FIELD]:next as unknown as Json};
}
export function positionMarketCaptureUnchanged(fields:Record<string,Json>,datasetToken:string,goalId:string,capture:PositionScenarioCapture){
 const ledger=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,goalId,fields[allocationField]);assert(ledger,'Saved market assumptions cannot be verified.');
 return same(currentPositionMarketEvidence(ledger,capture.draft),positionMarketForCapture(ledger,capture));
}
