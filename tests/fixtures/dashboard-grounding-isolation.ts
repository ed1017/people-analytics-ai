export class NextRequest extends Request {nextUrl:URL;constructor(input:string,init?:RequestInit){super(input,init);this.nextUrl=new URL(input);}}
export const NextResponse={json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)};
export const supabaseServer={rpc:(name:string,args:unknown)=>({abortSignal:(signal:AbortSignal)=>{
 const fixture=globalThis as unknown as {__rpc:(name:string,args:unknown,signal:AbortSignal)=>Promise<unknown>};
 return fixture.__rpc(name,args,signal);
}})};
