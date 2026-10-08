import fs from 'node:fs';
import {buildCalibratedProposal} from '../../lib/synthetic-ta/calibrated-v2.ts';
import {forecast} from '../../lib/synthetic-ta/v1.ts';
const model=buildCalibratedProposal();
const history=model.history.map(r=>({month:r.month,active:r.active,complete:true}));
const last=model.history.at(-1);
const release={version:'synthetic-ta-calibrated-v2',modelVersion:model.version,cutoff:model.cutoff,auditDate:'2026-10-08',scope:model.scope,
 source:model.source,coverage:model.coverage,history,forecasts:forecast(history,model.cutoff),stages:model.summary.stages,
 outcomes:model.summary.outcomes,monthly:model.monthly,active:last.active,onHold:last.held,filled:last.filled,cancelled:last.cancelled,opened:last.opened,
 internalHires:model.summary.internalHires,externalHires:model.summary.externalHires,currentStatusOpen:475,
 methodLimits:'Unvalidated stock baselines, no confidence intervals or selected winner. Generated history is not recovered source history. The cutoff-truncated fill ledger affects recent stock changes; these baselines are not future opening, hire or capacity estimates.',
 exclusions:model.exclusions};
const output=JSON.stringify(release,null,2)+'\n',path='lib/data/synthetic-ta-calibrated-v2.json';
if(process.argv.includes('--check')) {if(fs.readFileSync(path,'utf8')!==output)throw Error('Calibrated TA artifact is stale');console.log('Calibrated TA v2 artifact verified');}
else fs.writeFileSync(path,output);
