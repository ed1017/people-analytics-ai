/** Version-aware display adapter. Frozen v1 range policy remains byte-identical. */
// @ts-expect-error Native Node tests share TypeScript source.
import {rangesForScope as legacyRangesForScope,type RangeCatalog as LegacyRangeCatalog,type RangeScope} from './compensation-ranges.ts';
// @ts-expect-error Native Node tests share TypeScript source.
export {defaultRangeScope,type RangeScope,type JobCompa} from './compensation-ranges.ts';
export type RangeCatalog = LegacyRangeCatalog & {
 constructedPolicy?: {version:'constructed-demo-9847-ranges-v2';bands:{job:string;level:string;minimum:number;midpoint:number;maximum:number;effectiveFrom:string}[]};
};
export type DisplayRange = Omit<ReturnType<typeof legacyRangesForScope>[number],'version'|'effectiveFrom'|'effectiveTo'> & {version:string;effectiveFrom:string;effectiveTo:string|null};
export function rangesForScope(catalog:RangeCatalog,scope:RangeScope):DisplayRange[]{
 if(!catalog.constructedPolicy)return legacyRangesForScope(catalog,scope);
 const policy=catalog.constructedPolicy;
 if(policy.version!=='constructed-demo-9847-ranges-v2')throw Error('Unsupported constructed range policy');
 return catalog.jobs.flatMap(job=>catalog.levels.filter(level=>(scope.level==='all'||scope.level===level.level_code)&&(scope.org==='all'||catalog.combinations.some(row=>row.org_code===scope.org&&row.job_profile_code===job.job_profile_code&&row.level_code===level.level_code))).map<DisplayRange>(level=>{
  const matches=policy.bands.filter(row=>row.job===job.job_profile_code&&row.level===level.level_code);
  if(matches.length!==1||![matches[0].minimum,matches[0].midpoint,matches[0].maximum].every(Number.isFinite)||matches[0].minimum<=0||matches[0].minimum>matches[0].midpoint||matches[0].midpoint>matches[0].maximum)throw Error('Invalid constructed policy band');
  return {...matches[0],version:policy.version,provenance:'synthetic_assumed_range',currency:'USD',basis:'annual_base_1_fte',country:scope.country==='all'?'GLOBAL':scope.country,effectiveTo:null,name:job.job_profile_name};
 }));
}
