/** Lossless local report storage within the existing decision limit; no network or external store. */
import type {HomeMixReport} from './home-mix-search';
export type PackedHomeMixReport={encoding:'gzip-base64';data:string};
const limit=2*1024*1024;
export async function packHomeMixReport(report:HomeMixReport):Promise<PackedHomeMixReport>{
 const input=new TextEncoder().encode(JSON.stringify(report));if(input.length>limit)throw Error('Staffing report exceeds its storage bound.');
 const bytes=new Uint8Array(await new Response(new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return {encoding:'gzip-base64',data:btoa(binary)};
}
export async function unpackHomeMixReport(raw:unknown,signal?:AbortSignal):Promise<unknown>{
 const value=raw as PackedHomeMixReport;
 if(!value||Object.keys(value).sort().join()!=='data,encoding'||value.encoding!=='gzip-base64'||typeof value.data!=='string'||value.data.length>200000||!/^[A-Za-z0-9+/]*={0,2}$/.test(value.data))throw Error('Unsupported saved staffing report.');
 signal?.throwIfAborted();const input=Uint8Array.from(atob(value.data),char=>char.charCodeAt(0));
 const reader=new Blob([input]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){signal?.throwIfAborted();const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>limit)throw Error('Saved staffing report exceeds its decoded bound.');chunks.push(next.value);}}finally{await reader.cancel();reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
