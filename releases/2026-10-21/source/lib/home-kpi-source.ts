export type HomeRecruitingKpi = {hires:number; month:string; asOf:string; offers?:number|null; timeToFillDays?:number|null; openReqAgeDays?:number|null; timeToFillCohort?:'filled-requisitions-opening-to-closure'};
import {PUBLIC_9037} from './public-9037-contract.mjs';
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const date=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

const candidateId='workforce-demo-9037-2026-09-30-v3-1-offline-candidate';
const candidateConvention='hire_date is accepted offer; start_date drives headcount inflow. Internal hires are movements, not external starts.';
/** Historical recruiting events (including constructed demo events), never projected hires.
 * The caller owns dataset-scoped request settlement and the company-wide recruiting source.
 * Dashboard filters do not scope this independently labelled company KPI.
 */
export function homeRecruitingKpi(result:unknown, settled:boolean, datasetToken:string, snapshotDate:string):HomeRecruitingKpi|null {
  const publicRelease=datasetToken===PUBLIC_9037.token;
  const legacy=datasetToken==='legacy-v1:0',candidate=datasetToken===candidateId+':1'||publicRelease;
  if(!settled||!legacy&&!candidate||!date(snapshotDate))return null;
  const source=object(result),data=object(source.data),meta=object(data.data_meta);
  if(source.status!=='loaded'||source.suppressed===true||data.suppressed===true||data.as_of!==snapshotDate)return null;
  if(legacy&&data.data_meta!==undefined&&(meta.datasetId!=='legacy-v1'||meta.datasetToken!==datasetToken||meta.dataClass==='constructed-synthetic'))return null;
  if(candidate&&(snapshotDate!=='2026-09-30'||meta.datasetId!==(publicRelease?PUBLIC_9037.datasetId:candidateId)||meta.datasetToken!==datasetToken||meta.cutoff!==snapshotDate||meta.dataClass!=='constructed-synthetic'||meta.contract!==(publicRelease?PUBLIC_9037.contract:'local-app-parity-v1')||meta.hireDateConvention!==candidateConvention))return null;
  if(!Array.isArray(data.monthly))return null;
  const month=snapshotDate.slice(0,7)+'-01';
  const rows=data.monthly.map(object).filter(row=>row.month===month);
  if(rows.length!==1||rows[0].suppressed===true||!Number.isSafeInteger(rows[0].hires)||Number(rows[0].hires)<0)return null;
  const summary=object(data.summary);
  const days=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
  // Optional metrics retain missing/suppressed states independently of valid hires.
  return {hires:Number(rows[0].hires),month:month.slice(0,7),asOf:snapshotDate,
    offers:Number.isSafeInteger(rows[0].offers)&&Number(rows[0].offers)>=0?Number(rows[0].offers):null,
    timeToFillDays:summary.suppressed===true?null:days(summary.avg_time_to_fill_days),
    ...(publicRelease ? {timeToFillCohort:'filled-requisitions-opening-to-closure' as const} : {}),
    openReqAgeDays:summary.suppressed===true?null:days(summary.avg_open_req_age_days)};
}
