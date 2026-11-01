import source from './data/statcan-noc-duty-expansion-v2021.json' with {type:'json'};
// @ts-expect-error Native tests share canonical TypeScript.
import {canadaDutyGuidanceReferences} from './position-canada-duty-guidance.ts';
import type {PositionMarketContextReference} from './position-market-context';
const HASH='50c3e31a90b0150cc5b8efd29ec020c2fd9ea5fc5b0a171ed65d3cd9a0abf32f';
const roles:Record<string,{role:string;code:string}>={
  'OPS-BUS':{role:'Business Operations Specialist',code:'11201'},
  'STRAT-ANA':{role:'Strategy Analyst',code:'11201'},
  'AI-ARCH':{role:'AI Architect',code:'21231'},
  'SALES-AE':{role:'Sales Account Executive',code:'64101'},
};
/** Additive conditional mappings; neither modeled duties nor a title establish source consent. */
export function canadaDutyExpansionReferences():PositionMarketContextReference[]{
  if(source.source.sha256!==HASH||source.source.bytes!==5129133||source.mappings.length!==4||
    new Set(source.mappings.map(m=>m.roleId)).size!==4||source.occupation.code!=='64101'||
    source.reviewedDesignSha256!=='04c404caf3c5067c317fa460c00ba33afdc44fea016e967390abfb8d970c499d')
    throw Error('Canadian follow-on guidance unavailable.');
  const prior=canadaDutyGuidanceReferences();
  return source.mappings.map(mapping=>{
    const target=roles[mapping.roleId];
    if(!target||mapping.country!=='CA'||mapping.code!==target.code)throw Error('Canadian follow-on mapping unavailable.');
    const base=prior.find(r=>r.occupationCode===mapping.code);
    const shared={
      id:`statcan-noc-duties:${mapping.code}:${target.role}`,
      version:`${source.id}:${HASH}:conditional-duties-v1`,
      roles:[target.role],mappingDuties:`Confirm actual planned duties: ${mapping.condition}`,
      mappingLimit:'Broader Canadian occupational classification, not verified duties of this vacancy. The source describes some or all duties. Entry guidance retains may/usually qualifiers and subgroup conditions. Modeled duties and external-source consent are separate; no automatic attachment. No demand, available applicants, pay or proficiency inference.'+
        (mapping.code==='21231'?' The P.Eng. guidance concerns regulated professional engineering practice and approval of engineering drawings/reports, not all AI architecture work.':''),
    };
    if(base)return {...base,...shared};
    const rows=source.occupation.records;
    const select=(type:string)=>rows.filter(r=>r.elementType===type);
    const duties=select('Main duties'),entry=select('Employment requirements'),exclusions=select('Exclusion(s)');
    const example=rows.find(r=>r.csvRecord===21239);
    if(duties.length!==11||duties[0].csvRecord!==21364||duties[0].text!=='This group performs some or all of the following duties: '||
       entry.length!==6||!exclusions.length||example?.elementType!=='All examples'||example.text!=='business services sales representative ')
      throw Error('Canadian sales source records unavailable.');
    return {...shared,kind:'occupational-duty-guidance',countryCode:'CA',occupationCode:'64101',occupation:source.occupation.title,
      title:'Occupational duties and entry guidance',period:'NOC 2021 Version 1.0; released 28 September 2021',
      geography:'Canada occupational classification',population:'Occupations described by the Canadian NOC classification; not a sampled workforce',
      unit:'qualitative duties and entry guidance',sourceUrl:source.source.catalogueUrl,sourceSha256:HASH,
      attribution:source.licence.attribution,licence:source.licence.name,licenceUrl:source.licence.url,
      facts:{kind:'occupational-duty-guidance',dutyPreamble:duties[0].text.trim(),dutyGroups:[{label:null,items:duties.slice(1).map(r=>r.text.trim())}],
        entryGuidance:entry.map(r=>r.text.trim()),exclusions:exclusions.map(r=>r.text.trim()),releaseDate:source.releaseDate,
        capturedAt:source.capturedAt,observationDate:null,taxonomy:'NOC 2021 Version 1.0',ordering:'source order, not ranking'}};
  });
}
