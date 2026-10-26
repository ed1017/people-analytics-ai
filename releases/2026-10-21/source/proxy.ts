import {preview9037Options,preview9037RequestAllowed} from './lib/dataset-9037-preview-options.mjs';
import {public9037Options,public9037RequestAllowed} from './lib/public-9037-options.mjs';
import {publicAiRequestAllowed} from './lib/public-ai-capabilities.mjs';
import {NextResponse,type NextRequest} from 'next/server';
import {publicQaDiagnosticAllowed} from './lib/public-qa-diagnostic-options.mjs';
import {local9037RequestAllowed} from './lib/dataset-9037-request-policy.mjs';
// The normal application is unchanged when the private local launcher is absent.
// In local mode, stop external-service and AI routes before their modules execute.
export function proxy(request: NextRequest){
 const url=new URL(request.url);
 if(['GET','HEAD'].includes(request.method)&&url.pathname==='/'&&url.searchParams.getAll('page').length===1&&url.searchParams.get('page')==='about'){url.pathname='/about';url.searchParams.delete('page');return NextResponse.redirect(url,307);}
 const scenarioAlias=['GET','HEAD'].includes(request.method)&&(
  ['/scenarios','/Scenarios'].includes(url.pathname)||
  (url.pathname==='/'&&url.searchParams.getAll('page').length===1&&url.searchParams.get('page')==='scenarios')
 );
 if(scenarioAlias){url.pathname='/';url.searchParams.set('page','planning-overview');}
 // Validate the canonical destination against the same host, method and release guards.
 // Aliases redirect only; they do not add a new allowed page or API surface.
 const checkedRequest=scenarioAlias?new Request(url,{method:request.method,headers:request.headers}):request;
 const success=()=>scenarioAlias?NextResponse.redirect(url,307):NextResponse.next();
 const publicRelease=public9037Options(process.env);
 if(publicRelease){
  if(new URL(request.url).pathname==='/api/public-qa-diagnostic')return publicQaDiagnosticAllowed(process.env,request)?NextResponse.next():NextResponse.json({available:false},{status:404,headers:{'cache-control':'no-store'}});
  return publicAiRequestAllowed(publicRelease,checkedRequest)||public9037RequestAllowed(publicRelease,checkedRequest)?success():NextResponse.json({error:'Unavailable in the public synthetic release.'},{status:503});
 }
 const preview=preview9037Options(process.env);
 if(preview&&!preview9037RequestAllowed(preview,checkedRequest))return NextResponse.json({error:'Unavailable in protected preview.'},{status:503});
 if(!local9037RequestAllowed(process.env,checkedRequest))return NextResponse.json({error:'Unavailable in isolated 9037 development.'},{status:503});
 return success();
}
export const config={matcher:'/:path*'};
