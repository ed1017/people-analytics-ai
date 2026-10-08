import fs from 'node:fs';
import {buildProjectionBacktests} from '../../lib/ml/projection-backtests.mjs';
const output=JSON.stringify(await buildProjectionBacktests(),null,2)+'\n',path='lib/data/projection-backtest-ranking-v1.json';
if(process.argv.includes('--check')){if(fs.readFileSync(path,'utf8')!==output)throw Error('Projection backtest ranking artifact is stale');console.log('Projection backtest ranking artifact verified');}
else fs.writeFileSync(path,output);
