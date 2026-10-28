import type {ManualResults,ResultTarget} from './manual-plan-results';
// @ts-expect-error Native Node tests share TypeScript source.
import {activeResults,resultDifference} from './manual-plan-results.ts';

/** Read-only projection of the existing, validated ledger. Never joins nearby targets. */
export function reviewPlanResult(ledger:ManualResults,target:ResultTarget){
 const latest=activeResults(ledger,target).at(-1)??null;
 const difference=latest?resultDifference(target,latest).difference:null;
 const status=!latest?'Not recorded':latest.value===null?'Unknown':latest.measuredOn<target.date?'Interim result':latest.measuredOn>target.date?'After target date':'Target-date result';
 return {latest,difference,status,corrected:!!latest?.supersedes};
}
