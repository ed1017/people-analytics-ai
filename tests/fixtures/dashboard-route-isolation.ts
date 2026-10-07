// Loopback-free route harness: no credentials or database connection.
export const NextResponse={json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)};
export const supabaseServer={rpc:async(name:string,args:unknown)=>{
 const fixture=globalThis as unknown as {__dashboardCalls:{name:string;args:unknown}[];__dashboardPayload:unknown;__dashboardError:unknown};
 fixture.__dashboardCalls.push({name,args});
 return name==='dashboard_overview_filtered'?{data:fixture.__dashboardPayload,error:fixture.__dashboardError}:{data:null,error:null};
}};
