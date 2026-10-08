import { withDatasetRequest } from "@/lib/dataset-runtime";
import {supabaseServer} from '../../../lib/supabase-server';
import type {RangeCatalog} from '../../../lib/compensation-ranges';

export const dynamic = 'force-dynamic';

/** Catalog metadata only: no employee rows, cost values or new database objects. */
async function handleGET() {
  try {
    const [jobs, inventory] = await Promise.all([
      supabaseServer.from('job_profiles').select('job_profile_code, job_profile_name', {count: 'exact'}),
      supabaseServer.from('position_action_structural_inventory').select('org_code, job_profile_code, level_code, level_rank', {count: 'exact'}),
    ]);
    for (const result of [jobs, inventory]) if (result.error || !result.data || result.count !== result.data.length) throw Error('Incomplete catalog');
    const jobRows = jobs.data!;
    const rows = inventory.data!;
    if (jobRows.some(row => !row.job_profile_code || !row.job_profile_name) || new Set(jobRows.map(row => row.job_profile_code)).size !== jobRows.length || rows.some(row => !row.org_code || !row.job_profile_code || !row.level_code || row.level_rank === null || !Number.isFinite(Number(row.level_rank)) || Number(row.level_rank) < 0)) throw Error('Invalid catalog');
    const ranks = new Map<string, number>();
    for (const row of rows) {
      const rank = Number(row.level_rank);
      if (ranks.has(row.level_code) && ranks.get(row.level_code) !== rank) throw Error('Conflicting rank');
      ranks.set(row.level_code, rank);
    }
    const data: RangeCatalog = {
      jobs: jobRows.map(row => ({job_profile_code: row.job_profile_code, job_profile_name: row.job_profile_name})).sort((a,b) => a.job_profile_name.localeCompare(b.job_profile_name)),
      levels: [...ranks].map(([level_code, level_rank]) => ({level_code, level_rank})).sort((a,b) => a.level_rank - b.level_rank),
      combinations: rows.map(row => ({org_code: row.org_code, job_profile_code: row.job_profile_code, level_code: row.level_code})),
    };
    return Response.json(data, {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return Response.json({error: 'Job range catalog unavailable.'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}

export async function GET(request?: Request) {
  return withDatasetRequest(request, () => handleGET());
}
