// Real Home controls with intercepted synthetic transport; no hosted/live-model claim.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const [amount,budget] of [['$100k',100000],['$1.5m',1500000]]){
 const request='Reduce turnover by 2 percentage points over 12 months with a budget of '+amount;
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./home-retention-context-recovery.mjs',import.meta.url))],{env:{...process.env,RETENTION_EXACT_REQUEST:request,RETENTION_EXPECTED_BUDGET:String(budget)},stdio:'inherit'});
 assert.equal(result.status,0,'Complete desktop/mobile context and save/reopen flow for '+amount);
}
console.log(JSON.stringify({checks:52,scenarios:2,verification:'production build with fixture transport'}));
