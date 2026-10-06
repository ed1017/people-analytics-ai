import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {captureAggregateExport,parseCustodySidecar,verifyAggregateExport} from '../../lib/ml/aggregate-export-custody.mjs';

export async function runCustody(args){
 assert(args.length===3&&['capture','verify'].includes(args[0]),'Usage: capture INPUT.json NEW_DIRECTORY | verify PAYLOAD.json SIDECAR.json');
 const [mode,input,destination]=args,bytes=await readFile(resolve(input));
 if(mode==='verify')return verifyAggregateExport(bytes,parseCustodySidecar(await readFile(resolve(destination))));
 const sidecar=captureAggregateExport(bytes),summary=verifyAggregateExport(bytes,sidecar);
 // Validate before creating anything, and never overwrite an existing capture directory.
 const directory=resolve(destination);await mkdir(directory,{recursive:false});
 await writeFile(join(directory,'payload.json'),bytes,{flag:'wx'});
 await writeFile(join(directory,'custody.json'),JSON.stringify(sidecar,null,2)+'\n',{flag:'wx'});
 return {...summary,status:'captured',directory};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{console.log(JSON.stringify(await runCustody(process.argv.slice(2)),null,2));}
 catch{console.error('Aggregate custody failed: input, metadata, chronology, arguments or output path did not pass validation.');process.exitCode=1;}
}
