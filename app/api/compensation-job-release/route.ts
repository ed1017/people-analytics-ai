import {companyReleaseQuery, compensationRelease, RELEASE_COLUMNS, validateRelease} from '../../../lib/compensation-release';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const headers = {'Cache-Control':'no-store'};
  if (!companyReleaseQuery(new URL(request.url).searchParams)) return Response.json({status:'scope_not_released'}, {status:422,headers});
  // Convention approval is NOT aggregate publication approval. No client or DB
  // module is loaded while this separate deployment gate is disabled.
  if (process.env.COMPENSATION_JOB_RELEASE_ENABLED !== 'true') return Response.json({status:'release_not_enabled'}, {status:503,headers});
  try {
    const {supabaseServer} = await import('../../../lib/supabase-server');
    const {data,error,count} = await supabaseServer.from('compensation_job_release_v1').select(RELEASE_COLUMNS,{count:'exact'}).eq('release_id',compensationRelease.releaseId);
    if (error || !data || count !== compensationRelease.jobCodes.length || count !== data.length) throw Error('Incomplete release');
    return Response.json({release_id:compensationRelease.releaseId,snapshot_date:compensationRelease.snapshotDate,scope:{country:null,org:null,level:null},convention:'Demo data: existing base salary is treated as annual contracted pay at recorded FTE; not verified payroll semantics.',rows:validateRelease(data)}, {headers});
  } catch {return Response.json({status:'release_unavailable'}, {status:503,headers});}
}
