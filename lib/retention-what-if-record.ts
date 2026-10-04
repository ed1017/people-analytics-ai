// @ts-expect-error Native Node tests use the same TypeScript source.
import {calculateRetentionWhatIf,readRetentionInput,retentionMethod,type RetentionInput,type RetentionResult} from './retention-what-if.ts';
export const retentionStorageField='retentionWhatIfV1';
export const MAX_RETENTION_REVISIONS=10;
export const MAX_RETENTION_BYTES=64*1024;
export type RetentionRevision={id:string;goalId:string;goalStatement:string;savedAt:string;input:RetentionInput;result:RetentionResult};
export type RetentionRecord={version:1;method:typeof retentionMethod;goalId:string;revisions:RetentionRevision[]};
const plain=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const keys=(value:Record<string,unknown>,expected:string[])=>Object.keys(value).length===expected.length&&Object.keys(value).every(key=>expected.includes(key));
const identity=(value:unknown):value is string=>typeof value==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(value);
const statement=(value:unknown):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=240;
const timestamp=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const equal=(a:unknown,b:unknown):boolean=>{
 if(a===b)return true;
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((item,index)=>equal(item,b[index]));
 if(plain(a)&&plain(b))return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));
 return false;
};
export function readRetentionRecord(value:unknown,goalId:string):RetentionRecord {
 if(new TextEncoder().encode(JSON.stringify(value)??'').length>MAX_RETENTION_BYTES)throw Error('Retention review exceeds its local storage limit.');
 if(!plain(value)||!keys(value,['version','method','goalId','revisions'])||value.version!==1||value.method!==retentionMethod||value.goalId!==goalId||!identity(goalId)||!Array.isArray(value.revisions)||value.revisions.length<1||value.revisions.length>MAX_RETENTION_REVISIONS)throw Error('Saved retention review is invalid or belongs to another goal. The original record is retained.');
 const ids=new Set<string>();
 for(const raw of value.revisions){
  if(!plain(raw)||!keys(raw,['id','goalId','goalStatement','savedAt','input','result'])||!identity(raw.id)||ids.has(raw.id)||raw.goalId!==goalId||!statement(raw.goalStatement)||!timestamp(raw.savedAt))throw Error('Saved retention revision metadata is invalid.');
  ids.add(raw.id);
  const input=readRetentionInput(raw.input),result=calculateRetentionWhatIf(input);
  if(!equal(input,raw.input)||!equal(result,raw.result))throw Error('Saved retention result does not match its reviewed assumptions.');
 }
 // Return independent data so callers cannot edit a validated saved record by reference.
 return JSON.parse(JSON.stringify(value)) as RetentionRecord;
}
export function retainRetentionReview(previous:unknown,revision:RetentionRevision,current:{goalId:string;goalStatement:string;input:RetentionInput}):RetentionRecord {
 if(!identity(current.goalId)||!statement(current.goalStatement)||revision.goalId!==current.goalId||revision.goalStatement!==current.goalStatement||!equal(readRetentionInput(current.input),revision.input))throw Error('Goal or assumptions changed. Calculate the current draft again before saving.');
 const saved=previous===undefined?null:readRetentionRecord(previous,current.goalId);
 if(saved&&saved.revisions.length>=MAX_RETENTION_REVISIONS)throw Error('Ten retention reviews are already saved. Existing reviews are retained.');
 const next={version:1,method:retentionMethod,goalId:current.goalId,revisions:[...(saved?.revisions??[]),revision]};
 return readRetentionRecord(next,current.goalId);
}
