// Repository-only report to stdout; no arbitrary input dataset or prediction path.
import {buildHiringFixturePreflight} from '../../lib/ml/hiring-fixture-preflight.ts';
if(process.argv.length!==2)throw Error('This command accepts no data, prediction or identity overrides.');
process.stdout.write(JSON.stringify(await buildHiringFixturePreflight(),null,2)+'\n');
