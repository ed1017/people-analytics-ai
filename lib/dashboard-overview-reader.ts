import {NextRequest,NextResponse} from 'next/server';
import {withDatasetRequest} from './dataset-runtime';
import {supabaseServer} from './supabase-server';
import {dataApiErrorResponse} from './data-api-error';
import {dashboardRequestedFilters,scopedDashboardResponse} from './dashboard-scope';

/** Shared fresh overview read; the public dashboard adds its performance enrichment. */
export async function loadScopedDashboardOverview(request:NextRequest){
 const filter=(key:string)=>{const value=request.nextUrl.searchParams.get(key);return !value||value==='all'?null:value;};
 const {data,error}=await supabaseServer.rpc('dashboard_overview_filtered',{
  p_country_code:filter('country'),p_org_code:filter('org'),p_level_code:filter('level'),
 }).abortSignal(request.signal);
 if(error)throw error;
 return {data,scoped:scopedDashboardResponse(data,dashboardRequestedFilters(request.nextUrl.searchParams))};
}

/** Internal Home reader: same dataset/error/scope contract, no unused rating RPC. */
export async function readDashboardOverview(request:NextRequest){
 return withDatasetRequest(request,async()=>{
  try{
   const {scoped}=await loadScopedDashboardOverview(request);
   return NextResponse.json(scoped,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return dataApiErrorResponse('dashboard',error);}
 });
}
