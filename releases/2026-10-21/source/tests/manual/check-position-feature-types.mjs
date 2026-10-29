import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'position-feature-types-'));
try {
 const entrypoints=['lib/position-inventory.ts','lib/position-allocation.ts','lib/position-allocation-store.ts','lib/decision-backup.ts','components/workforce-planning/talent-inventory-scenarios.tsx','components/workforce-planning/position-allocation-visuals.tsx','components/workforce-planning/position-workforce-design-destination.tsx','lib/planning-journey.ts','lib/app-navigation.ts'];
 const config=path.join(temporary,'tsconfig.json');
 fs.writeFileSync(config,JSON.stringify({extends:path.join(root,'tsconfig.json'),compilerOptions:{incremental:false,types:['node'],typeRoots:[path.dirname(createRequire(import.meta.url).resolve('@types/node/package.json'))+'/..']},include:[...entrypoints.map(p=>path.join(root,p)),createRequire(import.meta.url).resolve('next/types/global.d.ts')],exclude:[]}));
 const require=createRequire(import.meta.url),result=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--noEmit','--project',config],{cwd:root,encoding:'utf8'});
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');
 if(result.error)throw result.error;
 if(result.status!==0)process.exitCode=result.status??1;
 else console.log('Position inventory, scenario, storage, backup and navigation type graph verified.');
} finally {fs.rmSync(temporary,{recursive:true,force:true});}
