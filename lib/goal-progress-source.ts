/** Explicit receipt adapter only. No fetch, automatic ingestion or candidate binding. */
// @ts-expect-error Native Node tests share TypeScript source.
import {HEADCOUNT_DEFINITION,validateProgressObservation,validateProgressScope,validateProgressSource,progressDay,type ProgressObservation,type ProgressSource,type GoalScope} from './goal-progress.ts';
export type HeadcountProgressReceipt={version:1;metric:'headcount';definition:typeof HEADCOUNT_DEFINITION;unit:'people';scope:GoalScope;observedOn:string;headcount:number|null;complete:boolean;suppressed:boolean;source:ProgressSource};
export function headcountProgressObservation(raw:unknown,binding:ProgressSource,capturedAt:string):ProgressObservation{
 validateProgressSource(binding);const receipt=raw as HeadcountProgressReceipt;
 if(!receipt||Object.keys(receipt).sort().join()!=='complete,definition,headcount,metric,observedOn,scope,source,suppressed,unit,version'||receipt.version!==1||receipt.metric!=='headcount'||receipt.definition!==HEADCOUNT_DEFINITION||receipt.unit!=='people'||!progressDay(receipt.observedOn)||typeof receipt.complete!=='boolean'||typeof receipt.suppressed!=='boolean'||receipt.headcount!==null&&(!Number.isSafeInteger(receipt.headcount)||receipt.headcount<0||receipt.headcount>1e9))throw Error('A checked point-in-time headcount receipt is required; no numeric prose is parsed.');
 validateProgressScope(receipt.scope);validateProgressSource(receipt.source);
 if(Object.keys(binding).some(key=>binding[key as keyof ProgressSource]!==receipt.source[key as keyof ProgressSource]))throw Error('Headcount source receipt differs from the explicitly bound source.');
 const value:ProgressObservation={metric:'headcount',definition:HEADCOUNT_DEFINITION,unit:'people',scope:structuredClone(receipt.scope),period:{kind:'point',start:receipt.observedOn,end:receipt.observedOn},value:receipt.suppressed?null:receipt.headcount,quality:{complete:receipt.complete,suppressed:receipt.suppressed,denominatorRequired:false,denominator:null},source:structuredClone(binding),capturedAt};validateProgressObservation(value);return value;
}
