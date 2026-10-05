import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const exec=promisify(execFile),runner=fileURLToPath(new URL('./manual/action-plan-analysis-demo.mjs',import.meta.url));
test('saved turnover-rate and capacity plans yield read-only review packets without substituted count baselines',async()=>{
 const root=await mkdtemp(join(tmpdir(),'analysis-review-plans-'));
 try{
  for(const goal of ['Reduce turnover','Add 5 additional roles over 12 months']){
   const binding=await actionBinding('scenario',goal,{sources:[]},{}),d=prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),'2026-10-05T00:00:00Z');
   const file=join(root,'draft.json'),text=JSON.stringify(d);await writeFile(file,text);
   const {stdout}=await exec(process.execPath,[runner,'--draft',file,'--review'],{maxBuffer:1024*1024}),r=JSON.parse(stdout);
   assert.equal(r.kind,'offline-analysis-review-packet');assert.equal(r.status,'current');
   assert.equal(r.domains.turnover.analysis,null);assert.equal(r.domains.turnover.status,'unavailable');
   assert.equal(r.domains.hiring.analysis.cases.length,9);assert.equal(r.domains.hiring.analysis.abstentions.length,7);
   assert.equal(r.domains.satisfaction.analysis.baselineComparison.status,'not-applicable');
   assert.equal(r.domains.satisfaction.analysis.waves.length,3);assert.equal(r.forecastBaseline,null);
   assert.deepEqual(r.planAssumptions.whatIf,d.inputs.whatIf);assert.equal(await readFile(file,'utf8'),text);
  }
  const bad=join(root,'invalid.json');await writeFile(bad,'{}');
  await assert.rejects(()=>exec(process.execPath,[runner,'--draft',bad,'--review']),/Valid exact Action Plan draft required/);
 }finally{await rm(root,{recursive:true,force:true});}
});
