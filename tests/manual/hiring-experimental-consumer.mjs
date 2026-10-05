// Sole local producer. No caller-supplied qualification, source, model or case override.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {benchmarkHiringSelection} from './benchmark-hiring-selection.mjs';
import {projectExperimentalHiringArtifact,unavailableExperimentalHiring} from '../../lib/ml/hiring-experimental-domain.mjs';
export async function hiringExperimentalForConsumer(){
 const files=['../../lib/ml/hiring-experimental-domain.mjs','../../lib/ml/hiring-experimental-result.ts','./hiring-experimental-consumer.mjs'];
 const code=await Promise.all(files.map(file=>readFile(new URL(file,import.meta.url))));
 const implementationIdentity=createHash('sha256').update(Buffer.concat(code)).digest('hex');
 let cached;
 try{cached=JSON.parse(await readFile(new URL('../../docs/evidence/hiring-selection-benchmark-v1.json',import.meta.url),'utf8'));}
 catch{return unavailableExperimentalHiring('benchmark-artifact-missing-or-invalid',implementationIdentity);}
 let fresh;
 try{fresh=await benchmarkHiringSelection();}
 catch{return unavailableExperimentalHiring('benchmark-regeneration-failed',implementationIdentity);}
 return projectExperimentalHiringArtifact(cached,fresh,implementationIdentity);
}
