import {withDatasetRequest} from '@/lib/dataset-runtime';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 return withDatasetRequest(request,async()=>Response.json({error:'Public capability receipt unavailable.'},{status:404,headers:{'cache-control':'no-store'}}));
}
