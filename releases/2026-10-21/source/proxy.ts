import {preview9037Options,preview9037RequestAllowed} from './lib/dataset-9037-preview-options.mjs';
import {public9037Options,public9037RequestAllowed} from './lib/public-9037-options.mjs';
import {publicAiRequestAllowed} from './lib/public-ai-capabilities.mjs';
import {NextResponse,type NextRequest} from 'next/server';
import {publicQaDiagnosticAllowed} from './lib/public-qa-diagnostic-options.mjs';
import {local9037RequestAllowed} from './lib/dataset-9037-request-policy.mjs';
// The normal application is unchanged when the private local launcher is absent.
// In local mode, stop external-service and AI routes before their modules execute.
export function proxy(request: NextRequest){
 const publicRelease=public9037Options(process.env);
 if(publicRelease){
  if(new URL(request.url).pathname==='/api/public-qa-diagnostic')return publicQaDiagnosticAllowed(process.env,request)?NextResponse.next():NextResponse.json({available:false},{status:404,headers:{'cache-control':'no-store'}});
  return publicAiRequestAllowed(publicRelease,request)||public9037RequestAllowed(publicRelease,request)?NextResponse.next():NextResponse.json({error:'Unavailable in the public synthetic release.'},{status:503});
 }
 const preview=preview9037Options(process.env);
 if(preview&&!preview9037RequestAllowed(preview,request))return NextResponse.json({error:'Unavailable in protected preview.'},{status:503});
 if(!local9037RequestAllowed(process.env,request))return NextResponse.json({error:'Unavailable in isolated 9037 development.'},{status:503});
 return NextResponse.next();
}
export const config={matcher:'/:path*'};
