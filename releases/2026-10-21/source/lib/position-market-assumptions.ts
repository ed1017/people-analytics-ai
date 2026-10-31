import usPositionPay from './data/oews-may2025-position-pay.json' with {type:'json'};
import ukPositionPay from './data/ons-ashe2026-position-pay.json' with {type:'json'};
import japanPositionPay from './data/mhlw-japan-2025-position-pay.json' with {type:'json'};
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
/** Immutable additional references; legacy reference objects remain unchanged. */
export const POSITION_MARKET_UK_ADDITIONAL_REFERENCES=Object.freeze(ukPositionPay.rows.map(row=>Object.freeze({
 version:row.referenceVersion??`ons-ashe2026-uk-${row.occupationCode}-v2`,sourceSha256:ukPositionPay.archiveSha256,
 occupation:row.occupation,occupationCode:row.occupationCode,taxonomy:'UK SOC 2020',geography:'United Kingdom',area:'GB',
 period:'April 2025-April 2026',currency:'GBP' as const,wageBasis:'Annual gross employee pay; excludes employer benefit costs',
 medianNative:row.medianNative,meanNative:row.meanNative,sourceUrl:ukPositionPay.sourceUrl,mappingScope:'broader-occupation' as const,
 population:'Full-time employee jobs; adult rates; same job more than one year',periodStart:'2025-04-06',periodEnd:'2026-04-05',releasedAt:'2026-10-22',revision:'provisional',
 medianCvPercent:row.medianCvPercent,meanCvPercent:row.meanCvPercent,socMajorGroup:row.socMajorGroup,
 mappingSourceUrl:row.mappingSourceUrl,mappingPages:row.mappingPages,mappedRole:row.role,
 payWorkbook:ukPositionPay.payWorkbook,payWorkbookSha256:ukPositionPay.payWorkbookSha256,cvWorkbook:ukPositionPay.cvWorkbook,cvWorkbookSha256:ukPositionPay.cvWorkbookSha256,
 sourceSheet:ukPositionPay.sheet,medianCell:row.medianCell,meanCell:row.meanCell,license:ukPositionPay.license,licenseUrl:ukPositionPay.licenseUrl,
 ...(row.dutyAcknowledgement?{dutyAcknowledgement:row.dutyAcknowledgement}:{}),
})));
const additionalUsMappings=[
 {role:'Accountant',soc:'13-2011',onet:'13-2011.00',duties:'Prepare and examine accounting records and financial statements.',limit:'Accounting and auditing duties; not all finance roles.'},
 {role:'Privacy Counsel',soc:'23-1011',onet:'23-1011.00',duties:'Advise clients on legal rights and obligations and prepare legal documents.',limit:'Qualified legal-counsel duties; this is broader Lawyers pay, not a privacy-specialist estimate.'},
 {role:'Legal Counsel',soc:'23-1011',onet:'23-1011.00',duties:'Advise clients on legal rights and obligations and prepare legal documents.',limit:'Qualified legal-counsel duties; not paralegal or compliance-administration work.'},
 {role:'Project Manager',soc:'13-1082',onet:'13-1082.00',duties:'Coordinate project schedules, staffing, procurement and budgets.',limit:'Project-management specialist duties; not construction-management or executive pay.'},
 {role:'User Experience Designer',soc:'15-1255',onet:'15-1255.00',duties:'Design and test digital interfaces and usability.',limit:'Digital-interface design duties; not all graphic or industrial design.'},
 {role:'Information Security Analyst',soc:'15-1212',onet:'15-1212.00',duties:'Plan and implement security measures protecting computer networks and information.',limit:'Information-security analysis duties; not all engineering or IT roles.'},
 {role:'Management Consultant',soc:'13-1111',onet:'13-1111.00',duties:'Analyze organizational operations and recommend improvements.',limit:'Management-analysis consulting duties; not every consulting specialty.'},
 {role:'Communications Specialist',soc:'27-3031',onet:'27-3031.00',duties:'Prepare communications and manage public information and organizational reputation.',limit:'Public-relations communication duties; not all marketing or technical writing.'},
 {role:'Data Architect',soc:'15-1243',onet:'15-1243.00',duties:'Design database architectures and data models and set database standards.',limit:'Database-architecture duties; not generic data engineering or infrastructure work.'},
 {role:'Total Rewards Specialist',soc:'13-1141',onet:'13-1141.00',duties:'Analyze compensation, benefits and job classifications and administer reward programs.',limit:'Compensation, benefits and job-analysis duties; not all HR work.'},
 {role:'Data Engineer',soc:'15-1243',onet:'15-1243.00',duties:'Design database and data-warehouse structures and integrate data systems.',limit:'Database and warehouse design or integration duties; not all data engineering work.'},
 {role:'Business Intelligence Developer',soc:'15-2051',onet:'15-2051.01',duties:'Develop business-intelligence tools, reports and supporting databases.',limit:'Business-intelligence duties within the broader Data Scientists wage occupation; not developer-specific wages.'},
 {role:'Transformation Consultant',soc:'13-1111',onet:'13-1111.00',duties:'Analyze organizational processes and plan changes that improve operations.',limit:'Organizational and process-change analysis duties; not all transformation or technical consulting.'},
 {role:'Quality Assurance Engineer',soc:'15-1253',onet:'15-1253.00',duties:'Design and execute software tests and identify and document software defects.',limit:'Software quality-assurance and testing duties; not manufacturing or other quality-engineering work.'},
 {role:'Sourcing Specialist',soc:'13-1020',onet:'13-1023.00',duties:'Select suppliers, purchase goods and services, and negotiate purchasing contracts.',limit:'Narrower purchasing-agent duties use the broader Buyers and Purchasing Agents wage group, not a separate 13-1023 wage estimate.',acknowledgement:'Use Buyers and Purchasing Agents pay for a planned role requiring supplier selection, purchasing and contract negotiation duties.'},
 {role:'Sales Account Executive',soc:'41-3091',onet:'41-3091.00',duties:'Sell services to customers, explain service features and negotiate sales terms.',limit:'Services sales excluding advertising, insurance, financial services and travel; not goods sales.',acknowledgement:'Use this reference for a planned role selling services outside advertising, insurance, financial services and travel.'},
 {role:'Machine Learning Engineer',soc:'15-2051',onet:'15-2051.00',duties:'Develop machine-learning applications, validate models, select features and compare model performance.',limit:'Analytical machine-learning model development and evaluation; excludes deployment-only MLOps, infrastructure and general software roles without analytical duties. The reference is broader Data Scientists pay, not machine-learning-engineer-specific wages.',acknowledgement:'Use the broader Data Scientists pay reference for a planned role developing and evaluating machine-learning models, excluding deployment-only MLOps, infrastructure and general software without analytical duties.'},
 {role:'Financial Planning and Analysis Analyst',soc:'13-2031',onet:'13-2031.00',duties:'Prepare operating budgets, analyze expenditures and budget variances, and plan costs.',limit:'Budget-analysis duties; excludes investment research, securities advice, business valuation and primarily accounting or audit work. Broader Budget Analysts wages, not FP&A-specific offers or employer costs.',acknowledgement:'Use Budget Analysts pay for a planned role preparing operating budgets, analyzing expenditure and variances, and planning costs, excluding investment research, securities advice, business valuation and primarily accounting or audit work.'},
 {role:'HR Systems Specialist',soc:'15-1211',onet:'15-1211.00',duties:'Analyze HR-system requirements, configure and integrate systems, and test system changes.',limit:'Substantive systems-analysis duties; excludes routine personnel administration, payroll processing, recruiting and general HR work. Broader Computer Systems Analysts wages, not HRIS-specific offers or employer costs.',acknowledgement:'Use Computer Systems Analysts pay for a planned role analyzing HR-system requirements, configuring or integrating systems, and testing changes, excluding routine personnel administration, payroll processing, recruiting and general HR work without substantive systems analysis.'},
] as const;
function reviewedUsRow(soc:string){
 const rows=usPositionPay.records.filter(r=>r.raw.OCC_CODE===soc),r=rows[0];
 if(usPositionPay.source.sha256!=='852250997ceff9b721ff68f63e877d818f9c1ec8b1b69dd367958faedd5282b2'||usPositionPay.source.worksheet!=='national_M2025_dl'||usPositionPay.source.vintageText!=='May 2025 OEWS Estimates'||rows.length!==1||!r||r.raw.AREA!=='99'||r.raw.NAICS!=='000000'||r.raw.OWN_CODE!=='1235'||r.raw.I_GROUP!=='cross-industry'||r.raw.O_GROUP!=='detailed'||r.raw.ANNUAL!==''||r.raw.HOURLY!==''||![r.raw.A_MEDIAN,r.raw.A_MEAN].every(v=>/^\d+(\.\d+)?$/.test(v)&&Number(v)>0&&Number(v)<239200)||r.worksheet!=='national_M2025_dl'||r.cells.A_MEDIAN!==`AB${r.row}`||r.cells.A_MEAN!==`S${r.row}`)throw Error('The reviewed national pay source cannot be verified.');
 return r;
}
export const POSITION_MARKET_US_ADDITIONAL_REFERENCES=Object.freeze(additionalUsMappings.map(mapping=>{
 const row=reviewedUsRow(mapping.soc);
 return Object.freeze({version:`oews-may2025-us-${mapping.soc}-${mapping.role.toLowerCase().replaceAll(' ','-')}-v2`,
 sourceSha256:usPositionPay.source.sha256,occupation:row.raw.OCC_TITLE,occupationCode:mapping.soc,taxonomy:'2018 SOC',geography:'United States',area:'99',
 period:'May 2025',currency:'USD' as const,wageBasis:'Annual wages per occupational worker; excludes employer benefits',medianNative:Number(row.raw.A_MEDIAN),meanNative:Number(row.raw.A_MEAN),
 sourceUrl:usPositionPay.source.sourceUrl,mappingScope:'broader-occupation' as const,mappedRole:mapping.role,mappingSourceUrl:`https://www.onetonline.org/link/summary/${mapping.onet}`,mappingDuties:mapping.duties,mappingLimit:mapping.limit,
 population:'Wage and salary workers across industries in the national occupation',periodStart:'2025-05-01',periodEnd:'2025-05-31',releasedAt:usPositionPay.source.releaseDate,revision:'reviewed-extract',
 sourceWorkbook:usPositionPay.source.originalFilename,sourceSheet:row.worksheet,medianCell:row.cells.A_MEDIAN,meanCell:row.cells.A_MEAN,annualFlag:row.raw.ANNUAL,hourlyFlag:row.raw.HOURLY,
 ...("acknowledgement" in mapping?{dutyAcknowledgement:mapping.acknowledgement}:{}),
 });
}));
type AdditionalUsReference=typeof POSITION_MARKET_US_ADDITIONAL_REFERENCES[number];
type AdditionalUkReference=typeof POSITION_MARKET_UK_ADDITIONAL_REFERENCES[number];
const japanMappings=[
 {role:'AI Engineer',code:'1109',ack:'Use this broader occupation for a planned role developing and evaluating machine-learning or AI systems.'},
 {role:'Machine Learning Engineer',code:'1109',ack:'Use this broader occupation for a planned role developing and evaluating machine-learning systems.'},
 {role:'Backend Software Engineer',code:'1104',ack:'Use this reference for a planned role developing web APIs, databases and server-side software.'},
 {role:'Cloud Engineer',code:'1101',ack:'Use System consultants and designers pay for a planned role designing and building cloud infrastructure through server, network and platform configuration, excluding support-only operations.'},
] as const;
export const POSITION_MARKET_JAPAN_REFERENCES=Object.freeze(japanMappings.map(mapping=>{
 const row=japanPositionPay.occupations[mapping.code];
 return Object.freeze({version:`mhlw-2025-jp-${mapping.code}-${mapping.role.toLowerCase().replaceAll(' ','-')}-v3`,
  sourceSha256:japanPositionPay.source.sha256,crosswalkSha256:japanPositionPay.crosswalk.sha256,
  occupation:row.title,occupationCode:mapping.code,taxonomy:'Japan wage survey occupation group',geography:'Japan',area:'JP',period:'2025 wage survey',currency:'JPY' as const,
  wageBasis:'Annualised cash estimate: June monthly cash × 12 plus preceding-calendar-year bonus',annualisedCashJpy:row.annualisedCashJpy,
  monthlyCashJpy:Math.round(row.monthlyCashThousandJpy*1000),annualBonusJpy:Math.round(row.annualBonusThousandJpy*1000),publishedJobTagRoundedJpy:row.publishedJobTagRoundedJpy,
  sourceUrl:japanPositionPay.source.url,mappingScope:'broader-occupation' as const,mappedRole:mapping.role,dutyAcknowledgement:mapping.ack,
  mappingSourceUrl:row.jobTag.url,population:japanPositionPay.methodology.population,methodologyUrl:japanPositionPay.methodology.url,
  sourceSheet:japanPositionPay.source.sheet,sourceCells:row.cells,license:japanPositionPay.licence.attribution,licenseUrl:japanPositionPay.licence.url,
 });
}));
type JapanReference=typeof POSITION_MARKET_JAPAN_REFERENCES[number];
export type PositionMarketReference=typeof POSITION_MARKET_REFERENCE|typeof POSITION_MARKET_BI_REFERENCE|typeof POSITION_MARKET_UK_REFERENCE|AdditionalUkReference|AdditionalUsReference|JapanReference;
export type PositionMarketFx={basis:'user-assumption';from:'GBP';to:'USD';usdPerGbp:number;date:string;confirmed:true};
export type PositionMarketJpyFx={basis:'user-assumption';from:'JPY';to:'USD';usdPerJpy:number;date:string;confirmed:true};
export type PositionMarketStatistic='median'|'mean'|'annualised-cash';
export function positionMarketNativeAmounts(reference:PositionMarketReference):{currency:'USD'|'GBP'|'JPY';median:number|null;mean:number|null;annualisedCash?:number}{return 'annualisedCashJpy' in reference?{currency:'JPY' as const,median:null,mean:null,annualisedCash:reference.annualisedCashJpy}:'medianUsd' in reference?{currency:'USD' as const,median:reference.medianUsd,mean:reference.meanUsd}:{currency:reference.currency,median:reference.medianNative,mean:reference.meanNative};}
const exact=(value:unknown,keys:string[]):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join()===keys.sort().join();
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const assert=(condition:unknown,message:string):void=>{if(!condition)throw Error(message);};
const validAt=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const signature=(draft:PositionAllocationDraft)=>JSON.stringify(draft);
const cost=(wage:number,percent:number)=>Math.round((wage*(1+percent/100)+Number.EPSILON)*100)/100;
function reviewedSource(version:string=POSITION_MARKET_SOURCE_VERSION):PositionMarketReference{
 const japan=POSITION_MARKET_JAPAN_REFERENCES.find(r=>r.version===version);
 if(japan){assert(japan.sourceSha256==='05380f928b776122821214c1e8e50a963a3a4a178bb3d0a27386ae2509221cdd'&&japan.crosswalkSha256==='49f548ac63b4c7ff7ddc4e870ea2ca885700851666d92b863f1021a8e30a393e'&&japan.annualisedCashJpy===japan.monthlyCashJpy*12+japan.annualBonusJpy&&japan.annualisedCashJpy===(japan.occupationCode==='1101'?8890400:japan.occupationCode==='1104'?5784700:6097600),'The reviewed Japanese source changed.');return japan;}
 const additionalUs=POSITION_MARKET_US_ADDITIONAL_REFERENCES.find(r=>r.version===version);
 if(additionalUs){const row=reviewedUsRow(additionalUs.occupationCode);assert(additionalUs.medianNative===Number(row.raw.A_MEDIAN)&&additionalUs.meanNative===Number(row.raw.A_MEAN),'The reviewed national source changed.');return additionalUs;}
 const additional=POSITION_MARKET_UK_ADDITIONAL_REFERENCES.find(r=>r.version===version);
 if(additional){assert(additional.sourceSha256===POSITION_MARKET_UK_REFERENCE.sourceSha256&&[additional.medianNative,additional.meanNative].every(v=>Number.isFinite(v)&&v>0)&&[additional.medianCvPercent,additional.meanCvPercent].every(v=>Number.isFinite(v)&&v>=0&&v<=20),'The reviewed additional UK pay source changed.');return additional;}
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
 const version=country==='United States'&&softwareRoles.includes(role)?POSITION_MARKET_SOURCE_VERSION:country==='United States'&&role==='Business Intelligence Analyst'?POSITION_MARKET_BI_REFERENCE.version:country==='United States'?POSITION_MARKET_US_ADDITIONAL_REFERENCES.find(r=>r.mappedRole===role)?.version??null:country==='United Kingdom'&&['Frontend Software Engineer','Backend Software Engineer','Software Engineer'].includes(role)?POSITION_MARKET_UK_REFERENCE.version:country==='United Kingdom'?POSITION_MARKET_UK_ADDITIONAL_REFERENCES.find(r=>r.mappedRole===role)?.version??null:country==='Japan'?POSITION_MARKET_JAPAN_REFERENCES.find(r=>r.mappedRole===role)?.version??null:null;
 assert(version&&(!sourceVersion||version===sourceVersion),'This role and country have no supported pay reference.');
 return {role,reference:reviewedSource(version!)};
}
export function positionMarketEligibility(draft:PositionAllocationDraft){
 try{requirePositionAllocationDraft(draft);const {role,reference}=eligibleScope(draft.inventory.version,draft.inventoryKey,draft.input.selectedIds);return {eligible:true,reason:null,role,selectedIds:[...draft.input.selectedIds],reference};}
 catch(error){return {eligible:false,reason:error instanceof Error?error.message:'This position scope has no supported pay reference.',role:null,selectedIds:[],reference:null};}
}
type AdoptionCommon={inventoryVersion:string;inventoryKey:string;selectedIds:string[];role:string;statistic:PositionMarketStatistic;wageUsd:number;employerOncostPercent:number;annualCostUsd:number;mappingConfirmed:true;fullTimeBasisConfirmed:true;adoptedAt:string};
export type PositionMarketAdoption=AdoptionCommon&({version:1;sourceVersion:typeof POSITION_MARKET_SOURCE_VERSION;reference:typeof POSITION_MARKET_REFERENCE}|{version:2;sourceVersion:string;reference:typeof POSITION_MARKET_BI_REFERENCE|typeof POSITION_MARKET_UK_REFERENCE|AdditionalUkReference|AdditionalUsReference;nativeCurrency:'USD'|'GBP';nativeWage:number;fx:PositionMarketFx|null}|{version:3;sourceVersion:string;reference:JapanReference;nativeCurrency:'JPY';nativeWage:number;fx:PositionMarketJpyFx});
export type PositionMarketRecord={scenarioId:string;allocationRevision:number;allocationSignature:string;adoption:PositionMarketAdoption};
export type PositionMarketLedger={version:1;datasetToken:string;goalId:string;current:PositionMarketAdoption|null;records:PositionMarketRecord[]};
function requireAdoption(value:unknown):asserts value is PositionMarketAdoption{
 const version=(value as PositionMarketAdoption|null)?.version;
 assert((version===1||version===2||version===3)&&exact(value,['version','sourceVersion','reference','inventoryVersion','inventoryKey','selectedIds','role','statistic','wageUsd','employerOncostPercent','annualCostUsd','mappingConfirmed','fullTimeBasisConfirmed','adoptedAt',...(version!==1?['nativeCurrency','nativeWage','fx']:[])]),'Unsupported saved market assumption.');
 const a=value as PositionMarketAdoption;
 assert((a.version===1?a.sourceVersion===POSITION_MARKET_SOURCE_VERSION:a.sourceVersion!==POSITION_MARKET_SOURCE_VERSION)&&same(a.reference,reviewedSource(a.sourceVersion))&&a.mappingConfirmed===true&&a.fullTimeBasisConfirmed===true&&validAt(a.adoptedAt),'Saved market evidence cannot be verified.');
 assert(a.role===eligibleScope(a.inventoryVersion,a.inventoryKey,a.selectedIds,a.sourceVersion).role,'Saved role mapping changed.');
 assert((a.version===3?a.statistic==='annualised-cash':['median','mean'].includes(a.statistic))&&Number.isFinite(a.employerOncostPercent)&&a.employerOncostPercent>=0&&a.employerOncostPercent<=200,'Review the wage statistic and employer-cost assumption.');
 const amounts=positionMarketNativeAmounts(a.reference),native=a.statistic==='annualised-cash'?amounts.annualisedCash:a.statistic==='median'?amounts.median:amounts.mean;
 assert(typeof native==='number'&&Number.isFinite(native)&&native>0,'Saved pay statistic is unavailable.');
 if(a.version===1)assert(a.wageUsd===native,'Saved source wage changed.');
 else if(a.version===3){assert(a.reference.currency==='JPY'&&a.nativeCurrency==='JPY'&&a.nativeWage===native,'Saved annualised cash changed.');const fx=readJpyFx(a.fx,a.adoptedAt.slice(0,10));assert(a.wageUsd===native!*fx.usdPerJpy,'Saved currency conversion changed.');}
 else{assert(a.nativeCurrency===amounts.currency&&a.nativeWage===native&&(a.nativeCurrency!=='USD'||a.fx===null),'Saved native pay changed.');const fx=readFx(a.fx,a.nativeCurrency,a.adoptedAt.slice(0,10));assert(a.wageUsd===native!*(fx?.usdPerGbp??1),'Saved currency conversion changed.');}
 assert(a.annualCostUsd===cost(a.wageUsd,a.employerOncostPercent),'Saved market cost does not match the reviewed inputs.');
}
function readFx(value:unknown,currency:'USD'|'GBP',latestDate:string):PositionMarketFx|null{
 if(currency==='USD'){assert(value===null||value===undefined,'USD references do not use a currency conversion.');return null;}
 assert(exact(value,['basis','from','to','usdPerGbp','date','confirmed']),'Enter and confirm a dated USD-per-GBP assumption.');const fx=value as PositionMarketFx;
 assert(fx.basis==='user-assumption'&&fx.from==='GBP'&&fx.to==='USD'&&fx.confirmed===true&&typeof fx.usdPerGbp==='number'&&Number.isFinite(fx.usdPerGbp)&&fx.usdPerGbp>0&&fx.usdPerGbp<=10,'Enter a USD-per-GBP assumption greater than 0 and at most 10.');
 assert(typeof fx.date==='string'&&/^20\d\d-\d\d-\d\d$/.test(fx.date)&&Number.isFinite(Date.parse(fx.date+'T00:00:00.000Z'))&&new Date(fx.date+'T00:00:00.000Z').toISOString().slice(0,10)===fx.date&&fx.date<=latestDate,'Enter a valid exchange-rate date no later than the adoption date.');return structuredClone(fx);
}
function readJpyFx(value:unknown,latestDate:string):PositionMarketJpyFx{
 assert(exact(value,['basis','from','to','usdPerJpy','date','confirmed']),'Enter and confirm a dated USD-per-JPY assumption.');
 const fx=value as PositionMarketJpyFx;
 assert(fx.basis==='user-assumption'&&fx.from==='JPY'&&fx.to==='USD'&&fx.confirmed===true&&typeof fx.usdPerJpy==='number'&&Number.isFinite(fx.usdPerJpy)&&fx.usdPerJpy>0&&fx.usdPerJpy<=10,'Enter a positive USD-per-JPY assumption at most 10.');
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
export type PositionMarketTicket=Readonly<{reference:PositionMarketReference;statistic:PositionMarketStatistic;nativeCurrency:'USD'|'GBP'|'JPY';nativeWage:number;fx:PositionMarketFx|PositionMarketJpyFx|null;wageUsd:number;employerOncostPercent:number;annualCostUsd:number;role:string;selectedCount:number}>;
type Binding=Options&{revision:number;stateSignature:string;draft:PositionAllocationDraft};
const tickets=new WeakMap<PositionMarketTicket,Binding>();
export function preparePositionMarketAdoption(options:Options&{draft:PositionAllocationDraft;statistic:PositionMarketStatistic;employerOncostPercent:number;mappingConfirmed:boolean;fullTimeBasisConfirmed:boolean;fx?:PositionMarketFx|PositionMarketJpyFx|null}):PositionMarketTicket{
 const {state,fields}=stateFor(options),e=positionMarketEligibility(options.draft);
 assert(e.eligible,e.reason??'Select supported vacancies.');assert(same(fields[POSITION_ALLOCATION_DRAFT_FIELD],options.draft),'The position draft changed. Review again.');
 assert(options.mappingConfirmed===true&&options.fullTimeBasisConfirmed===true,'Confirm the role reference and full-time pay basis.');
 assert((e.reference!.currency==='JPY'?options.statistic==='annualised-cash':['median','mean'].includes(options.statistic))&&Number.isFinite(options.employerOncostPercent)&&options.employerOncostPercent>=0&&options.employerOncostPercent<=200,'Enter an employer-cost percentage from 0 to 200.');
 const reference=e.reference!,amounts=positionMarketNativeAmounts(reference),selected=options.statistic==='annualised-cash'?amounts.annualisedCash:options.statistic==='median'?amounts.median:amounts.mean;
 assert(typeof selected==='number'&&Number.isFinite(selected)&&selected>0,'The selected pay statistic is unavailable.');
 const nativeWage=selected as number,fx=amounts.currency==='JPY'?readJpyFx(options.fx,new Date().toISOString().slice(0,10)):readFx(options.fx,amounts.currency,new Date().toISOString().slice(0,10)),wageUsd=nativeWage*(fx?('usdPerJpy' in fx?fx.usdPerJpy:fx.usdPerGbp):1);
 if(fx)Object.freeze(fx);
 const ticket=Object.freeze({reference,statistic:options.statistic,nativeCurrency:amounts.currency,nativeWage,fx,wageUsd,employerOncostPercent:options.employerOncostPercent,annualCostUsd:cost(wageUsd,options.employerOncostPercent),role:e.role!,selectedCount:options.draft.input.selectedIds.length});
 tickets.set(ticket,{store:options.store,datasetToken:options.datasetToken,goalId:options.goalId,revision:state.data.revision,stateSignature:JSON.stringify(state.data),draft:structuredClone(options.draft)});return ticket;
}
export function confirmPositionMarketAdoption({store,ticket,at}:{store:DecisionStore;ticket:PositionMarketTicket;at:string}):PositionAllocationDraft{
 const b=tickets.get(ticket);assert(b&&b.store===store,'Review the market assumption again.');const {state,ledger,goal}=stateFor(b!);
 assert(state.data.revision===b!.revision&&JSON.stringify(state.data)===b!.stateSignature&&validAt(at),'The saved draft changed. Review the market assumption again.');
 const draft=structuredClone(b!.draft);draft.input.annualHireCostUsd=ticket.annualCostUsd;
 const common={inventoryVersion:draft.inventory.version,inventoryKey:draft.inventoryKey,selectedIds:[...draft.input.selectedIds],role:ticket.role,statistic:ticket.statistic,wageUsd:ticket.wageUsd,employerOncostPercent:ticket.employerOncostPercent,annualCostUsd:ticket.annualCostUsd,mappingConfirmed:true as const,fullTimeBasisConfirmed:true as const,adoptedAt:at};
 const adoption:PositionMarketAdoption=ticket.reference.currency==='JPY'?{version:3,sourceVersion:ticket.reference.version,reference:ticket.reference as JapanReference,...common,nativeCurrency:'JPY',nativeWage:ticket.nativeWage,fx:readJpyFx(ticket.fx,at.slice(0,10))}:ticket.reference.version===POSITION_MARKET_SOURCE_VERSION?{version:1,sourceVersion:POSITION_MARKET_SOURCE_VERSION,reference:POSITION_MARKET_REFERENCE,...common}:{version:2,sourceVersion:ticket.reference.version,reference:ticket.reference as typeof POSITION_MARKET_BI_REFERENCE|typeof POSITION_MARKET_UK_REFERENCE|AdditionalUkReference|AdditionalUsReference,...common,nativeCurrency:ticket.nativeCurrency as 'USD'|'GBP',nativeWage:ticket.nativeWage,fx:ticket.fx as PositionMarketFx|null};requireAdoption(adoption);
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

/** Bounded browser-supplied saved reference, not authenticated storage or approval. */
export type PositionMarketChatReference={datasetToken:string;goalId:string;scenarioId:string;allocationRevision:number;allocationSignature:string;adoption:PositionMarketAdoption};
export function readPositionMarketChatReference(raw:unknown,expected:{datasetToken:string;goalId:string;scenario:{id:string;revision:number}|null;draft:PositionAllocationDraft}):PositionMarketAdoption{
 assert(exact(raw,['datasetToken','goalId','scenarioId','allocationRevision','allocationSignature','adoption']),'Invalid saved market context.');
 const value=raw as PositionMarketChatReference;
 assert(validDatasetToken(expected.datasetToken)&&value.datasetToken===expected.datasetToken&&value.goalId===expected.goalId&&expected.scenario&&value.scenarioId===expected.scenario.id&&value.allocationRevision===expected.scenario.revision&&value.allocationSignature===signature(expected.draft),'Market context belongs to another scenario revision.');
 requireAdoption(value.adoption);assert(matches(value.adoption,expected.draft),'Market context no longer matches the selected draft.');
 return structuredClone(value.adoption);
}
export function positionMarketChatReference(ledger:PositionMarketLedger|null,capture:PositionScenarioCapture):PositionMarketChatReference|null{
 const adoption=positionMarketForCapture(ledger,capture);if(!ledger||!adoption)return null;
 const reference={datasetToken:ledger.datasetToken,goalId:ledger.goalId,scenarioId:capture.scenarioId,allocationRevision:capture.revision,allocationSignature:signature(capture.draft),adoption};
 readPositionMarketChatReference(reference,{datasetToken:ledger.datasetToken,goalId:ledger.goalId,scenario:{id:capture.scenarioId,revision:capture.revision},draft:capture.draft});return reference;
}
