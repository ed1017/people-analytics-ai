export type HomeRecruitingKpi = {hires:number; month:string; asOf:string};
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const date=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

/** Recorded recruiting events only; never substitute modeled stock or projected hires.
 * The caller owns dataset-scoped request settlement. Other datasets need their own event convention.
 */
export function homeRecruitingKpi(result:unknown, settled:boolean, datasetToken:string, snapshotDate:string):HomeRecruitingKpi|null {
  if(!settled||datasetToken!=='legacy-v1:0'||!date(snapshotDate))return null;
  const source=object(result),data=object(source.data),meta=object(data.data_meta);
  if(source.status!=='loaded'||source.suppressed===true||data.suppressed===true||data.as_of!==snapshotDate||data.data_meta!==undefined&&(meta.datasetId!=='legacy-v1'||meta.datasetToken!==datasetToken||meta.dataClass==='constructed-synthetic'))return null;
  if(!Array.isArray(data.monthly))return null;
  const month=snapshotDate.slice(0,7)+'-01';
  const rows=data.monthly.map(object).filter(row=>row.month===month);
  if(rows.length!==1||rows[0].suppressed===true||!Number.isSafeInteger(rows[0].hires)||Number(rows[0].hires)<0)return null;
  return {hires:Number(rows[0].hires),month:month.slice(0,7),asOf:snapshotDate};
}
