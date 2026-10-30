import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {HISTORY_VERSION,HISTORY_SEED,HISTORY_DATASET_TOKEN,HISTORY_BUNDLE_DIGEST,HISTORY_PERIODS,generateSyntheticHistory} from '../../lib/synthetic-workforce-history.ts';
const path=new URL('../../lib/data/synthetic-workforce-history-v1.json',import.meta.url);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const artifact={version:HISTORY_VERSION,seed:HISTORY_SEED,datasetToken:HISTORY_DATASET_TOKEN,bundleDigest:HISTORY_BUNDLE_DIGEST,periods:HISTORY_PERIODS.map(period=>{
 const rows=generateSyntheticHistory(period.id);
 return {...period,recordDigest:digest(rows),rated:rows.filter(r=>r.rating!==null).length,ratings:[1,2,3,4,5].map(n=>rows.filter(r=>r.rating===n).length),classes:Object.fromEntries(['unfavorable','neutral','favorable'].map(key=>[key,rows.filter(r=>r.sentiment===key).length]))};
})};
const text=JSON.stringify(artifact,null,2)+'\n';
if(process.argv.includes('--write')){fs.writeFileSync(path,text);console.log('Wrote aggregate reproducibility certificate; no individual records written.');}
else {if(!process.argv.includes('--check'))throw Error('Use --check or --write.');if(fs.readFileSync(path,'utf8').replaceAll('\r\n','\n')!==text)throw Error('Synthetic workforce history certificate differs; review the version and generated output.');console.log(JSON.stringify({status:'verified',version:HISTORY_VERSION,periods:artifact.periods.map(p=>({id:p.id,population:p.population,respondents:p.respondents,recordDigest:p.recordDigest}))}));}
