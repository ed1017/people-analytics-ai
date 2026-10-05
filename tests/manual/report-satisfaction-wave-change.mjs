import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {satisfactionWaveFixture,satisfactionFixtureDefinition} from '../fixtures/satisfaction-wave-change.mjs';
import {satisfactionWaveChange} from '../../lib/ml/satisfaction-wave-change.mjs';
import {evidenceCheckpoint} from './predictive-evidence-checkpoint.mjs';
export async function satisfactionWaveChangeReport(){
 const paths=['lib/ml/satisfaction-wave-change.mjs','lib/ml/satisfaction-domain-adapter.mjs','lib/ml/predictive-readiness.ts',
  'tests/fixtures/satisfaction-wave-change.mjs','tests/fixtures/predictive-readiness.mjs','tests/manual/report-satisfaction-wave-change.mjs'];
 const files=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(new URL('../../'+path,import.meta.url))).digest('hex')])));
 const checkpoint=await evidenceCheckpoint(),input=satisfactionWaveFixture(),definition=satisfactionFixtureDefinition();
 const incompatible=structuredClone(input);incompatible.records[1].value.instrumentVersion='different-pulse-instrument';
 const suppressed=structuredClone(input);suppressed.records[1].value.release.status='suppressed';
 return {status:'constructed-satisfaction-wave-change-report',sourceEvidence:checkpoint.sourceEvidence.satisfaction,
  sourceQualification:'No qualified local comparable-wave extract or supported scoring definition is available in the existing checkpoint.',
  fixturePurpose:'Three irregular illustrative waves; no reconstructed company outcomes or invented monthly history.',files,
  example:satisfactionWaveChange(input,definition),
  restrictedAssumptionExample:satisfactionWaveChange(input,definition,{nonrespondentMeanRange:[0,.5],constantNonrespondentMeans:[0,.5],populationInterpretation:'repeated-cross-section-not-matched'}),
  blockedExamples:{incompatibleInstrument:satisfactionWaveChange(incompatible,definition),suppressedWave:satisfactionWaveChange(suppressed,definition)}};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const mode=process.argv[2]??'--check';if(process.argv.length>3||!['--check','--write'].includes(mode))throw Error('Use --check or --write.');
 const text=JSON.stringify(await satisfactionWaveChangeReport(),null,2)+'\n',file=new URL('../../docs/evidence/satisfaction-wave-change-v1.json',import.meta.url);
 if(mode==='--write')await writeFile(file,text);else if(await readFile(file,'utf8')!==text)throw Error('Satisfaction wave report differs.');
 console.log('Satisfaction wave-change report '+(mode==='--write'?'written.':'verified.'));
}
