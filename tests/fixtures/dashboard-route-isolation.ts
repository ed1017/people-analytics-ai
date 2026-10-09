// Loopback-free route harness: no credentials or database connection.
export const NextResponse={json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)};
export const supabaseServer={rpc:(name:string,args:unknown)=>{
 const fixture=globalThis as unknown as {__dashboardCalls:{name:string;args:unknown}[];__dashboardPayload:unknown;__dashboardError:unknown;__dashboardSignals?:AbortSignal[]};
 fixture.__dashboardCalls.push({name,args});
 const result=Promise.resolve(name==='dashboard_overview_filtered'?{data:fixture.__dashboardPayload,error:fixture.__dashboardError}:{data:null,error:null});
 return Object.assign(result,{abortSignal(signal:AbortSignal){fixture.__dashboardSignals?.push(signal);return result;}});
}};
