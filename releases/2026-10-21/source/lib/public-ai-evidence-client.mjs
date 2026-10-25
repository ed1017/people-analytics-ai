import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {isPublicProjectionVersion} from './public-projection-contract.mjs';
import {normalizeHomePack} from './home-pack.mjs';
import {actionBinding,actionBindingKey} from './home-action-drafts.ts';
import {validateJson} from './local-decisions.ts';
export const publicAiEvidenceField='publicAiEvidenceRecipesV1';
/** Copy only the explicitly selected objective; callers retain the original
 * exploration workspace atomically when creating its named goal. */
export function selectedPublicObjectiveState(state,objective){
 const copy=structuredClone(state);
 copy.working=copy.working.filter(item=>item.binding.goal===objective);
 if(copy.verifiedMetrics)copy.verifiedMetrics=copy.verifiedMetrics.filter(ref=>ref.kind!=='candidate'||copy.working.some(item=>item.id===ref.id&&item.revision===ref.revision));
 if(!copy.working.some(item=>item.id===copy.focusCandidateId))copy.focusCandidateId=null;
 return copy;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const bytes=v=>new TextEncoder().encode(JSON.stringify(v)).length;
export class PublicEvidenceUnavailableError extends Error {
 constructor(){super('Current workforce evidence could not be verified. Refresh evidence, then send your question again. Your draft is kept.');this.name='PublicEvidenceUnavailableError';}
}
export const canRefreshPublicEvidence=error=>error instanceof PublicEvidenceUnavailableError;
const must=v=>{if(!v)throw Error('Exact public evidence for this saved plan is unavailable. Earlier plans are kept.');};
export function publicHomeSourceVersion(results){
 const metadata=Object.values(results??{}).filter(v=>v?.status==='loaded').map(v=>v.data?.data_meta).filter(Boolean);
 if(!metadata.length)return null;
 const m=metadata[0];
 if(metadata.some(v=>v.datasetToken!==P.token||v.bundleDigest!==m.bundleDigest||v.publicationApproved!==true||v.dataClass!=='constructed-synthetic'))return null;
 const source={datasetId:m.datasetId,datasetToken:m.datasetToken,publicDigest:m.bundleDigest,cutoff:m.cutoff,provenance:'approved-public-projection-v1',contract:m.contract,publicationReceiptId:m.publicationReceiptId};
 return isPublicProjectionVersion(source)?source:null;
}
export function readPublicAiRecipes(raw){
 if(raw===undefined)return [];
 must(Array.isArray(raw)&&raw.length<=16&&validateJson(raw)&&bytes(raw)<=600000);
 for(const r of raw)must(r?.version===1&&Object.keys(r).sort().join(',')==='evidence,filters,goal,planningInputs,scope,source,version'&&isPublicProjectionVersion(r.source)&&r.goal&&Object.keys(r.goal).sort().join(',')==='id,statement'&&typeof r.goal.id==='string'&&r.goal.id.length<=80&&typeof r.goal.statement==='string'&&r.goal.statement.length<=240&&Boolean(r.goal.id)===Boolean(r.goal.statement.trim())&&typeof r.scope==='string'&&r.scope.length<=160&&Object.keys(r.filters??{}).sort().join(',')==='country,level,org'&&Object.values(r.filters).every(v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(v))&&!r.evidence?.datasetContext&&same(r.evidence,normalizeHomePack(r.evidence))&&bytes(r)<=160*1024);
 return structuredClone(raw);
}
export function publicAiRecipe({source,goal,filters,scope,evidence,planningInputs}){
 return readPublicAiRecipes([{version:1,source,goal,filters,scope,evidence,planningInputs}])[0];
}
export function retainPublicAiRecipes(previous,added){
 const next=readPublicAiRecipes(previous);
 for(const recipe of readPublicAiRecipes(added))if(!next.some(r=>same(r,recipe)))next.push(recipe);
 return readPublicAiRecipes(next); // Never silently evict recipes needed by older plans.
}
export async function recipeBinding(recipe){return actionBinding(recipe.goal.id,recipe.goal.statement,recipe.evidence,recipe.planningInputs);}
export async function publicSolutionEnvelope(request,source,stored){
 // A settled fetch can lack a verified source after failed retrieval or mixed receipts.
 // Never send or silently substitute evidence.
 if(!isPublicProjectionVersion(source))throw new PublicEvidenceUnavailableError();
 const goal=request.goal;
 const required=[...(request.catalog?.plans??[]).map(p=>p.draft.binding),...(request.state.working??[]).map(p=>p.binding)];
 const current=publicAiRecipe({source,goal,filters:request.filters,scope:request.scope,evidence:request.evidence,planningInputs:{scope:request.scope,constraints:request.state.constraints}});
 const previous=readPublicAiRecipes(stored).filter(r=>(same(r.goal,goal)||!goal.id&&r.goal.id==='exploration'&&required.some(b=>b.goalId===r.goal.id&&b.goal===r.goal.statement))&&same(r.source,source)&&!same(r,current));
 const keys=new Set(await Promise.all([current,...previous].filter(r=>r.goal.id).map(async r=>actionBindingKey(await recipeBinding(r)))));
 must(required.every(b=>keys.has(actionBindingKey(b))));
 return {request,current,previous};
}
export async function publicPlanEnvelope(request,stored,binding){
 const recipes=readPublicAiRecipes(stored),key=actionBindingKey(binding);
 let selected;
 for(const recipe of recipes)if(actionBindingKey(await recipeBinding(recipe))===key){selected=recipe;break;}
 must(selected&&selected.goal.id===request.context.goalId&&selected.goal.statement===request.context.goal);
 return {request,current:selected,previous:recipes.filter(r=>r!==selected&&same(r.goal,selected.goal)&&same(r.source,selected.source))};
}
/** Retain only packets whose exact hashes match newly returned working records.
 * This does not manufacture recipes for older or differently scoped bindings. */
export async function capturePublicWorkingRecipes(request,state,source,stored){
 const added=[];
 for(const item of state.working??[]){
  const goal=request.goal.id?request.goal:{id:'exploration',statement:item.candidate.goal.statement};
  if(!request.goal.id&&(item.binding.goalId!=='exploration'||item.binding.goal!==goal.statement))continue;
  const recipe=publicAiRecipe({source,goal,filters:request.filters,scope:request.scope,evidence:request.evidence,planningInputs:{scope:request.scope,constraints:item.constraints}});
  if(actionBindingKey(await recipeBinding(recipe))===actionBindingKey(item.binding))added.push(recipe);
 }
 return retainPublicAiRecipes(stored,added);
}
