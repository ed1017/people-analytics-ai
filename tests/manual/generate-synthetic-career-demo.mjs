import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildSyntheticCareerDemo,careerDemoPath} from '../../lib/simulation/career-demo.mjs';
const artifact=await buildSyntheticCareerDemo(),serialized=JSON.stringify(artifact,null,2)+'\n';
if(process.argv.includes('--write'))await writeFile(careerDemoPath,serialized);
else {assert(process.argv.includes('--check'),'Use --write or --check');assert.equal(await readFile(careerDemoPath,'utf8'),serialized,'Synthetic career artifact differs from the reproducible release');}
console.log(JSON.stringify({status:'verified',dataset:artifact.dataset,cohorts:artifact.cohorts.length,rowRecordsPublished:false}));
