import source from './data/jsa-osl-selected-2026.json' with {type:'json'};
import type {PositionMarketContextReference} from './position-market-context';
export type PositionOccupationalShortageFacts={kind:'occupational-shortage';ratingCode:'NS'|'S'|'R'|'M';ratingLabel:string;confidence:'Clear'|'On-balance'|null;shortageDriver:string|null;taxonomy:'ANZSCO 2022'|'OSCA 2024 v1.0';classificationLevel:'occupation'|'unit-group';assessmentYear:2026;sourceExcelRow:number;sourceSheet:string;raw:{A:string;B:string;C:string;D:string};methodologyUrl:string;rightsPolicyUrl:string};
type Reference=Omit<PositionMarketContextReference,'kind'|'facts'>&{kind:'occupational-shortage';facts:PositionOccupationalShortageFacts};
const labels={NS:'No shortage',S:'Shortage',R:'Regional shortage',M:'Metropolitan shortage'} as const;
const mappings=[
 {code:'221212',role:'Treasury Specialist',duties:'Confirm primary responsibility for corporate funding, liquidity and financial-risk management. Financial analysis or cash reporting alone is insufficient; no autonomous borrowing, hedging approval or credential is inferred.'},
 {code:'224713',role:'Management Consultant',duties:'Confirm primary work analyses organisational efficiency and problems, recommends improvements and supports change. Exclude ICT business analysis and quality-system certification deployment.'},
 {code:'2713',role:'Privacy Counsel',duties:'Confirm primary legal advice, legal drafting and negotiation within solicitor work, not privacy administration or security coordination. Registration/licensing requirements are not proof of an employee credential.'},
];
/** Categorical assessments only; modeled duties and evidence consent remain separate. */
export function australiaShortageReferences():Reference[]{
 if(source.sources.occupation.sha256!=='9d35938318b7032f95a1f203962f83d00800622a98a8f2df17d8ace90fedcedd'||source.sources['unit-group'].sha256!=='0eab13fc886e4b8e7852a56dfe6863b8e32101996e5e7c167495b9a030e4ec39'||source.records.length!==3)throw Error('Australian shortage source unavailable.');
 return mappings.map(m=>{
  const rows=source.records.filter(r=>r.raw.A===m.code);if(rows.length!==1)throw Error('Australian shortage record unavailable.');const row=rows[0],raw=row.raw;
  const level=row.level;if(level!=='occupation'&&level!=='unit-group')throw Error('Invalid shortage classification level.');
  if(!/^\d+$/.test(raw.A)||raw.A.length!==(level==='occupation'?6:4)||!raw.B.trim()||!Object.hasOwn(labels,raw.C)||!Number.isSafeInteger(row.excelRow)||row.excelRow<=8)throw Error('Invalid shortage source record.');
  const confidence=level==='occupation'?raw.D:null,driver=level==='unit-group'?raw.D:null;
  if(confidence!==null&&confidence!=='Clear'&&confidence!=='On-balance')throw Error('Unknown shortage confidence.');
  if(driver!==null&&!['Suitability gap','Education and training gap','Retention gap'].includes(driver))throw Error('Unknown shortage driver.');
  const s=source.sources[level],code=raw.C as keyof typeof labels;
  return {id:`jsa-shortage:${level}:${raw.A}:${m.role}`,version:`${source.id}:${s.sha256}:conditional-duties-v1`,kind:'occupational-shortage',countryCode:'AU',roles:[m.role],occupationCode:raw.A,occupation:raw.B,title:'Occupational shortage assessment',period:source.releasePeriod,geography:'Australia national assessment; regional/metropolitan restrictions retained in rating',population:`ANZSCO 2022 ${level} ${raw.A}`,unit:'categorical shortage assessment',sourceUrl:s.url,sourceSha256:s.sha256,licence:source.licence,licenceUrl:source.licenceUrl,attribution:source.attribution,mappingDuties:m.duties,mappingLimit:'Point-in-time occupational assessment, not a role-specific hiring guarantee. No shortage does not mean easy hiring; shortage does not quantify available candidates, time to fill, pay or demand growth. Clear/On-balance are qualitative confidence labels, not probabilities; a shortage driver is not confidence. Group ratings are not six-digit occupation ratings. ANZSCO skill level is not employee proficiency or app grade. Conditional duties require separate confirmation; no modeled-duty adoption or consent is implied.',facts:{kind:'occupational-shortage',ratingCode:code,ratingLabel:labels[code],confidence,shortageDriver:driver,taxonomy:'ANZSCO 2022',classificationLevel:level,assessmentYear:2026,sourceExcelRow:row.excelRow,sourceSheet:s.sheet,raw:{A:raw.A,B:raw.B,C:raw.C,D:raw.D},methodologyUrl:source.methodologyUrl,rightsPolicyUrl:source.rightsPolicyUrl}};
 });
}
