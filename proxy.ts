import {NextResponse,type NextRequest} from 'next/server';
import {local9037RequestAllowed} from './lib/dataset-9037-request-policy.mjs';
// The normal application is unchanged when the private local launcher is absent.
// In local mode, stop external-service and AI routes before their modules execute.
export function proxy(request: NextRequest){
 if(!local9037RequestAllowed(process.env,request))return NextResponse.json({error:'Unavailable in isolated 9037 development.'},{status:503});
 return NextResponse.next();
}
export const config={matcher:'/:path*'};
