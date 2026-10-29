/** Reviewed qualitative slice of official O*NET OnLine profiles, checked 29 October 2026.
 * These displayed skill lists are NOT importance ratings or employee measurements.
 * Lists copied by skill name; this app groups shared and differing names without weighting.
 */
export const SOFTWARE_TRAINING_REFERENCE = Object.freeze({
  id: 'onet-2026-software-systems-qualitative-v1',
  checkedAt: '2026-10-29',
  taxonomy: 'O*NET-SOC 2019', geography: 'United States',
  source: Object.freeze({code:'15-1211.00',title:'Computer Systems Analysts',url:'https://www.onetonline.org/link/summary/15-1211.00'}),
  target: Object.freeze({code:'15-1252.00',title:'Software Developers',soc:'15-1252',url:'https://www.onetonline.org/link/summary/15-1252.00'}),
  shared: Object.freeze(['Programming','Systems Analysis','Systems Evaluation','Complex Problem Solving','Judgment and Decision Making','Operations Analysis','Time Management','Coordination']),
  targetOnly: Object.freeze(['Technology Design']),
  sourceOnly: Object.freeze(['Social Perceptiveness','Troubleshooting','Operations Monitoring','Quality Control Analysis','Service Orientation']),
  relationship: 'Computer Systems Analysts is listed under Related Occupations on the Software Developers profile.',
  attribution: 'Adapted from O*NET OnLine occupational profiles, U.S. Department of Labor, Employment and Training Administration. O*NET® is a trademark of USDOL/ETA. This app selects transferable skill names and groups overlaps and differences; USDOL/ETA has not approved, endorsed or tested these modifications.',
  license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  licenseDetailsUrl: 'https://www.onetonline.org/help/license',
  limitation: 'Qualitative occupational reference only. A skill absent from a displayed profile list is not evidence that workers lack it. This is not an employee assessment, readiness score, course recommendation or estimate of training time, cost or success. Review employee evidence, role requirements and source-team capacity before selecting participants.',
})

export function findMarketSkillsReference(id: unknown, soc: unknown) {
  return id === SOFTWARE_TRAINING_REFERENCE.id && soc === SOFTWARE_TRAINING_REFERENCE.target.soc ? SOFTWARE_TRAINING_REFERENCE : null
}
