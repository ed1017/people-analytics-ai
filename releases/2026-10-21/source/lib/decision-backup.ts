// @ts-expect-error Native Node tests share TypeScript source.
import {encodeDecisions,parseDecisions,MAX_STORE_BYTES,type DecisionData} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleWorkspace,bundleWorkspaceField} from './home-bundle-records.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readManualResults,manualPlanResultsField} from './manual-plan-results.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readGoalProgressLedger,goalProgressField} from './goal-progress.ts';
import {validDatasetToken} from './dataset-identity.mjs';
export const MAX_BACKUP_BYTES=MAX_STORE_BYTES*2+4096;
export type BackupCounts={goals:number;workspaces:number;plans:number;bundles:number;results:number;progressEvents:number;exploration:boolean};
export type DecisionBackup={version:1;datasetToken:string;createdAt:string;data:DecisionData;counts:BackupCounts};
const bytes=(value:string)=>new TextEncoder().encode(value).length;
function requireValue(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
function validated(envelope:string,datasetToken:string):{data:DecisionData;counts:BackupCounts}{
 parseDecisions(envelope);
 // Validation may normalize legacy goal context. Preserve the original backup bytes instead.
 const data=JSON.parse(envelope).payload as DecisionData;
 requireValue(Object.keys(data).every(k=>['version','revision','removedGoalIds','exploration','goals','workspaces'].includes(k)),'Unsupported decision fields.');
 const counts:BackupCounts={goals:data.goals.goals.length,workspaces:Object.keys(data.workspaces).length,plans:0,bundles:0,results:0,progressEvents:0,exploration:!!data.exploration};
 for(const [id,slot] of [...Object.entries(data.workspaces),...(data.exploration?[['',data.exploration] as const]:[])]){
  const f=slot.fields,goal=data.goals.goals.find(g=>g.id===id)?.statement??'';
  if(Object.hasOwn(f,planAlternativesField)){const value=readPlanAlternatives(f[planAlternativesField],{goalId:id,goal});requireValue(value,'Saved plans cannot be verified.');counts.plans+=value.plans.length;}
  if(Object.hasOwn(f,bundleWorkspaceField)){const value=readBundleWorkspace(f[bundleWorkspaceField],id);requireValue(value,'Saved bundles cannot be verified.');counts.bundles+=value.attachments.length;}
  if(Object.hasOwn(f,manualPlanResultsField)){const value=readManualResults(f[manualPlanResultsField],id);requireValue(value.targets.every(item=>item.target.datasetToken===datasetToken),'Saved result history belongs to a different dataset.');counts.results+=value.entries.length;}
  if(Object.hasOwn(f,goalProgressField)){const value=readGoalProgressLedger(f[goalProgressField],id);counts.progressEvents+=value.events.length;}
 }
 return {data,counts};
}
export function encodeDecisionBackup(data:DecisionData,datasetToken:string,createdAt:string):string{
 const raw=JSON.stringify({format:'workforce-decision-backup',version:1,datasetToken,createdAt,decisions:encodeDecisions(data)});
 parseDecisionBackup(raw,datasetToken);return raw;
}
export function parseDecisionBackup(raw:string,expectedDatasetToken:string):DecisionBackup{
 requireValue(typeof raw==='string'&&bytes(raw)<=MAX_BACKUP_BYTES,'Backup exceeds the supported size.');
 requireValue(validDatasetToken(expectedDatasetToken),'Invalid current dataset identity.');
 const value=JSON.parse(raw);
 requireValue(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join()===['format','version','datasetToken','createdAt','decisions'].sort().join(),'Unsupported backup format.');
 requireValue(value.format==='workforce-decision-backup'&&value.version===1,'Unsupported backup version.');
 requireValue(value.datasetToken===expectedDatasetToken,'Backup belongs to a different dataset.');
 requireValue(typeof value.createdAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt)&&Number.isFinite(Date.parse(value.createdAt))&&new Date(value.createdAt).toISOString()===value.createdAt,'Invalid backup date.');
 requireValue(typeof value.decisions==='string','Missing saved decisions.');
 return {version:1,datasetToken:value.datasetToken,createdAt:value.createdAt,...validated(value.decisions,expectedDatasetToken)};
}
/** Preview only. The store must atomically recheck the destination revision and storage receipt. No ID merging. */
export function prepareDecisionRestore(raw:string,datasetToken:string,currentRevision:number){
 requireValue(Number.isSafeInteger(currentRevision)&&currentRevision>=0,'Invalid destination revision.');
 return {...parseDecisionBackup(raw,datasetToken),expectedRevision:currentRevision,mode:'replace' as const};
}

