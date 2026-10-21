import {PUBLIC_9037} from './public-9037-contract.mjs';
import {isPublicProjectionVersion} from './public-projection-contract.mjs';
import {projectionDigest,readHeadcountProjections} from './home-solution-projection.ts';
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const same=(a,b)=>canonical(a)===canonical(b);
const must=v=>{if(!v)throw Error('The public projection is unavailable or changed.');};
/** Browser-safe verification of a fresh HTTP receipt. Server still owns the
 * source read; this is not authentication or independent forecast validation. */
export async function currentPublicProjectionForDisplay({selection,activeGoal,analyses,receipt,filters,datasetToken,isCurrent}){
 must(isCurrent()&&selection.goalId&&selection.goalId===activeGoal.id&&selection.goalStatement===activeGoal.statement);
 must(receipt&&Object.keys(receipt).sort().join(',')==='checkedAt,datasetToken,inputDigest,inputs,provenance,version'&&receipt.version===1&&receipt.provenance==='approved-public-projection-read'&&datasetToken===PUBLIC_9037.token&&receipt.datasetToken===datasetToken&&typeof receipt.checkedAt==='string'&&Number.isFinite(Date.parse(receipt.checkedAt))&&new Date(receipt.checkedAt).toISOString()===receipt.checkedAt);
 const item=readHeadcountProjections(analyses).find(v=>v.id===selection.id&&v.revision===selection.revision);
 if(!item)throw Error('Select an available projection revision.');
 must(isPublicProjectionVersion(item.inputs.datasetVersion)&&same(item.inputs,receipt.inputs)&&same(item.inputs.filters,filters));
 const digest=await projectionDigest(item.inputs);
 must(isCurrent()&&item.inputDigest===digest&&receipt.inputDigest===digest);
 return item;
}
