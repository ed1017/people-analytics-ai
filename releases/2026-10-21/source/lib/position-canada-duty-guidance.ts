import source from './data/statcan-noc-duty-guidance-v2021.json' with {type:'json'};
import type {PositionMarketContextReference} from './position-market-context';

export type PositionOccupationalDutyGuidanceFacts = {
  kind:'occupational-duty-guidance';
  dutyPreamble:string;
  dutyGroups:{label:string|null;items:string[]}[];
  entryGuidance:string[];
  exclusions:string[];
  releaseDate:string;
  capturedAt:string;
  observationDate:null;
  taxonomy:'NOC 2021 Version 1.0';
  ordering:'source order, not ranking';
};
type Reference = Omit<PositionMarketContextReference,'kind'|'facts'> & {
  kind:'occupational-duty-guidance';facts:PositionOccupationalDutyGuidanceFacts;
};
type SourceRecord={csvRecord:number;elementType:string;text:string};
type Occupation={code:string;title:string;profileUrl:string;dutyPreamble:SourceRecord;
  duties:(SourceRecord&{isHeading:boolean})[];entryGuidance:SourceRecord[];exclusions:SourceRecord[]};
const SOURCE_HASH='50c3e31a90b0150cc5b8efd29ec020c2fd9ea5fc5b0a171ed65d3cd9a0abf32f';
const EXPECTED:Record<string,string>={
  'Cloud Architect':'21231','Talent Acquisition Specialist':'12101','HR Business Partner':'11200',
  'Transformation Consultant':'11201','Growth Marketing Specialist':'11202','Data Engineer':'21223',
  'Technology Consultant':'21222','Applied Data Scientist':'21211',
};

/** Classification guidance only. Each role still requires actual-duty confirmation. */
export function canadaDutyGuidanceReferences():Reference[]{
  if(source.source.sha256!==SOURCE_HASH||source.source.bytes!==5129133||
     source.taxonomy!=='NOC 2021 Version 1.0'||source.releaseDate!=='2021-09-28'||
     source.observationDate!==null||source.mappings.length!==8||
     new Set(source.mappings.map(m=>m.role)).size!==8||Object.keys(source.occupations).length!==8)
    throw Error('Canadian occupation source unavailable.');
  return source.mappings.map(mapping=>{
    if(mapping.country!=='CA'||EXPECTED[mapping.role]!==mapping.code||mapping.requiresExplicitConfirmation!==true)
      throw Error('Canadian occupation mapping unavailable.');
    const occupation=(source.occupations as Record<string,Occupation>)[mapping.code];
    if(!occupation||occupation.code!==mapping.code||occupation.dutyPreamble.text.trim()!==
       'This group performs some or all of the following duties:'||!occupation.entryGuidance.length)
      throw Error('Canadian occupation guidance unavailable.');
    const groups:PositionOccupationalDutyGuidanceFacts['dutyGroups']=[];
    for(const record of occupation.duties){
      if(!record.text.trim()||record.elementType!=='Main duties')throw Error('Canadian duty record unavailable.');
      // These are explicitly identified source records, never inferred from wording.
      const expectedHeading=occupation.code==='21223'&&(record.csvRecord===6078||record.csvRecord===6085);
      if(record.isHeading!==expectedHeading)throw Error('Canadian duty grouping unavailable.');
      if(record.isHeading){
        const expected=record.csvRecord===6078?'Database analysts':'Data administrators';
        if(record.text.trim()!==expected)throw Error('Canadian duty heading unavailable.');
        groups.push({label:record.text.trim(),items:[]});
      }else{
        if(!groups.length)groups.push({label:null,items:[]});
        groups.at(-1)!.items.push(record.text.trim());
      }
    }
    if(!groups.length||groups.some(g=>!g.items.length)||
       (occupation.code==='21223'&&(groups.length!==2||groups.some(g=>g.label===null))))
      throw Error('Canadian duty grouping unavailable.');
    const text=(records:SourceRecord[],type:string)=>records.map(r=>{
      if(r.elementType!==type||!r.text.trim())throw Error('Canadian guidance record unavailable.');
      return r.text.trim();
    });
    return {
      id:`statcan-noc-duties:${mapping.code}:${mapping.role}`,
      version:`${source.id}:${SOURCE_HASH}:conditional-duties-v1`,
      kind:'occupational-duty-guidance',countryCode:'CA',roles:[mapping.role],
      occupationCode:mapping.code,occupation:occupation.title,title:'Occupational duties and entry guidance',
      period:'NOC 2021 Version 1.0; released 28 September 2021',geography:'Canada occupational classification',
      population:'Occupations described by the Canadian NOC classification; not a sampled workforce',
      unit:'qualitative duties and entry guidance',sourceUrl:source.source.catalogueUrl,sourceSha256:SOURCE_HASH,
      attribution:source.licence.attribution,licence:source.licence.name,licenceUrl:source.licence.url,
      mappingDuties:mapping.condition,
      mappingLimit:`Exclude: ${mapping.excludes} Classification duties may describe some or all work within the occupation. Entry guidance retains source qualifications, not universal employer requirements. No applicant supply, hiring demand, time-to-fill, proficiency or wage measurement. Actual duties require confirmation; modeled duties alone do not establish a match.${mapping.code==='21231'?' The P.Eng. entry concerns regulated professional engineering practice and approval of engineering drawings/reports, not every cloud role.':''}`,
      facts:{kind:'occupational-duty-guidance',dutyPreamble:occupation.dutyPreamble.text.trim(),dutyGroups:groups,
        entryGuidance:text(occupation.entryGuidance,'Employment requirements'),exclusions:text(occupation.exclusions,'Exclusion(s)'),
        releaseDate:source.releaseDate,capturedAt:source.capturedAt,observationDate:null,
        taxonomy:'NOC 2021 Version 1.0',ordering:'source order, not ranking'},
    };
  });
}
