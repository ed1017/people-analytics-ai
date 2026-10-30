/** Exact, bounded extract of DfE ESS 2024. Published densities are not recomputed from rounded counts. */
export const UK_HIRING_SOURCE = Object.freeze({
  id: 'dfe-ess-2024-professional-national-v1',
  period: '2024', occupation: 'Professional occupations', taxonomy: 'SOC 2020 major group 2',
  sector: 'All sectors', retrievedAt: '2026-10-30', publishedAt: '2025-07-24',
  sourceUrl: 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/1c000555-8188-4e28-ac32-22313d8702a1',
  downloadUrl: 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/1c000555-8188-4e28-ac32-22313d8702a1/csv',
  downloadSha256: '557dbafc39bdcfd96ec6637d8dcaef42c6babbb467359efe7cbed67d1ca65156',
  methodologyUrl: 'https://explore-education-statistics.service.gov.uk/methodology/employer-skills-survey-2022-2024',
  reportUrl: 'https://assets.publishing.service.gov.uk/media/6a1eef8d050971fbebf3bd92/Employer_Skills_Survey_2024_UK_report.pdf',
  licenseUrl: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  attribution: 'Source: Department for Education, Employer Skills Survey 2024. Contains public sector information licensed under the Open Government Licence v3.0.',
});

export type HiringDifficulty = Readonly<{
  code: string; nation: string; sample: number;
  vacancies: number | null; hardToFillVacancies: number | null; skillShortageVacancies: number | null;
  hardToFillPercent: number | null; skillShortagePercent: number | null;
}>;

const nations = Object.freeze({K02000001:'United Kingdom', E92000001:'England', S92000003:'Scotland', W92000004:'Wales', N92000002:'Northern Ireland'});
const expectedKeys = ['country_name','country_code','geographic_level','time_period','time_identifier','sector','soc2020_4_labelled','soc2020_3_labelled','soc2020_2_labelled','soc2020_1_labelled','sample_occupations_site_has_vacancy','vac_sum','htfv_sum','ssv_sum','htfv_den','ssv_den'];
const number = (value: unknown, percent=false): number | null | undefined => {
  if(value === 'c' || value === 'u') return null;
  if(typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && (percent ? parsed <= 100 : Number.isSafeInteger(parsed)) ? parsed : undefined;
};
/** Fail closed on a different occupation, period, geography, denominator or malformed value. */
export function readHiringDifficulty(value: unknown): HiringDifficulty | null {
  if(!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string,unknown>;
  if(Object.keys(v).length !== expectedKeys.length || !expectedKeys.every(key => Object.hasOwn(v,key))) return null;
  const code = typeof v.country_code === 'string' ? v.country_code : '';
  const nation = nations[code as keyof typeof nations];
  if(!nation || v.country_name !== nation || v.geographic_level !== 'National' || v.time_period !== '2024' || v.time_identifier !== 'Calendar year' || v.sector !== 'Total' || v.soc2020_1_labelled !== '2 - Professional occupations' || ['soc2020_2_labelled','soc2020_3_labelled','soc2020_4_labelled'].some(key => v[key] !== 'Total')) return null;
  const sample = number(v.sample_occupations_site_has_vacancy);
  const vacancies = number(v.vac_sum), hardToFillVacancies = number(v.htfv_sum), skillShortageVacancies = number(v.ssv_sum);
  const hardToFillPercent = number(v.htfv_den,true), skillShortagePercent = number(v.ssv_den,true);
  if(sample === null || sample === undefined || sample <= 0 || [vacancies,hardToFillVacancies,skillShortageVacancies,hardToFillPercent,skillShortagePercent].some(n => n === undefined)) return null;
  if(hardToFillPercent !== null && skillShortagePercent !== null && skillShortagePercent! > hardToFillPercent!) return null;
  if(typeof vacancies === 'number' && typeof hardToFillVacancies === 'number' && hardToFillVacancies > vacancies || typeof hardToFillVacancies === 'number' && typeof skillShortageVacancies === 'number' && skillShortageVacancies > hardToFillVacancies || typeof vacancies === 'number' && typeof skillShortageVacancies === 'number' && skillShortageVacancies > vacancies) return null;
  if(vacancies === 0 && (typeof hardToFillPercent === 'number' && hardToFillPercent > 0 || typeof skillShortagePercent === 'number' && skillShortagePercent > 0)) return null;
  return Object.freeze({code,nation,sample,vacancies:vacancies!,hardToFillVacancies:hardToFillVacancies!,skillShortageVacancies:skillShortageVacancies!,hardToFillPercent:hardToFillPercent!,skillShortagePercent:skillShortagePercent!});
}

const row = (code: keyof typeof nations, sample: string, vacancies: string, hard: string, shortage: string, hardRate: string, shortageRate: string) => readHiringDifficulty({
  country_code:code,country_name:nations[code],geographic_level:'National',time_period:'2024',time_identifier:'Calendar year',sector:'Total',
  soc2020_1_labelled:'2 - Professional occupations',soc2020_2_labelled:'Total',soc2020_3_labelled:'Total',soc2020_4_labelled:'Total',
  sample_occupations_site_has_vacancy:sample,vac_sum:vacancies,htfv_sum:hard,ssv_sum:shortage,htfv_den:hardRate,ssv_den:shortageRate,
})!;

export const UK_HIRING_DIFFICULTY: readonly HiringDifficulty[] = Object.freeze([
  row('K02000001','1416','176000','64800','51800','36.8264386739777','29.4054186371798'),
  row('E92000001','604','150700','55600','46100','36.8658258964872','30.5799457793964'),
  row('S92000003','356','15200','6300','3700','41.4153099532505','24.5241826257784'),
  row('W92000004','253','3500','1500','1100','42.6794644210775','31.2857845928298'),
  row('N92000002','203','6600','1500','800','22.132573906836','12.7283008938066'),
]);
export function findHiringDifficulty(code: string): HiringDifficulty | null {
  return UK_HIRING_DIFFICULTY.find(row => row.code === code) ?? null;
}
export const hiringPercent = (value: number | null) => value === null ? 'Unavailable' : `${value.toFixed(1)}%`;
