/** Disabled public saved-evidence reconstruction. No persistence, model calls or route wiring. */
import {isDeepStrictEqual as same} from 'node:util';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {isPublicProjectionVersion} from './public-projection-contract.mjs';
import {createPublicHomeGrounding} from './public-home-grounding.server.mjs';
import {loadPublicProjectionSource} from './public-projection-source.server.mjs';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';
import {normalizeHomePack} from './home-pack.mjs';
import {actionBinding,actionBindingKey} from './home-action-drafts.ts';
import {readSolutionRequest} from './home-solution-conversation.ts';
import {readPlanConversationRequest} from './home-plan-conversation.ts';
import {projectionCurrentnessFilters} from './home-projection-currentness.ts';
import {projectionDigest} from './home-solution-projection.ts';
import {validateJson} from './local-decisions.ts';
export const PUBLIC_SAVED_EVIDENCE_ENABLED=false;
const must=(v,m='Public saved evidence is unavailable or changed. Existing plans are preserved.')=>{if(!v)throw Error(m);};
const exact=(v,keys)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&same(Object.keys(v).sort(),[...keys].sort());
const size=v=>Buffer.byteLength(JSON.stringify(v),'utf8');
/** Plain replay material, never authorization: every recipe must be reverified against the public source. */
export function readPublicSavedEvidenceRecipe(raw){
 must(validateJson(raw)&&size(raw)<=160*1024&&exact(raw,['version','source','goal','filters','scope','evidence','planningInputs'])&&raw.version===1&&isPublicProjectionVersion(raw.source));
 must(exact(raw.goal,['id','statement'])&&typeof raw.goal.id==='string'&&typeof raw.goal.statement==='string'&&((raw.goal.id===''&&raw.goal.statement==='')||(/^[A-Za-z0-9_-]{1,80}$/.test(raw.goal.id)&&raw.goal.statement.trim()&&raw.goal.statement.length<=240)));
 must(exact(raw.filters,['country','org','level']));projectionCurrentnessFilters(new URLSearchParams(raw.filters));
 must(typeof raw.scope==='string'&&raw.scope.length>0&&raw.scope.length<=160&&size(raw.planningInputs)<=128*1024);
 must(!raw.evidence?.datasetContext&&same(raw.evidence,normalizeHomePack(raw.evidence)));
 return structuredClone(raw);
}
/** Fixed reviewed public factories. Test dependencies cannot enter this runtime factory. */
export function createPublicSavedEvidence({enabled=PUBLIC_SAVED_EVIDENCE_ENABLED,hostname,timeoutMs=30000}={}){
 const grounding=createPublicHomeGrounding({enabled,hostname,timeoutMs});
 return createPublicSavedEvidenceTestAdapter({enabled,timeoutMs,verifyHome:(request,signal)=>grounding.verify(request,signal),loadProjection:signal=>loadPublicProjectionSource({hostname,production:false},signal)});
}
/** Explicit isolated test seam, not a public authenticated interface. */
export function createPublicSavedEvidenceTestAdapter({enabled=PUBLIC_SAVED_EVIDENCE_ENABLED,timeoutMs=30000,verifyHome,loadProjection}={}){
 return Object.freeze({async verify(raw,incoming=new AbortController().signal){
  must(enabled===true&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=30000);
  must(validateJson(raw)&&size(raw)<=900000&&exact(raw,['kind','request','current','previous'])&&['solution','plan'].includes(raw.kind)&&Array.isArray(raw.previous)&&raw.previous.length<=16);
  const controller=new AbortController(),signal=AbortSignal.any([incoming,controller.signal]),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{signal.throwIfAborted();return await awaitPublicQaBinding((async()=>{
   signal.throwIfAborted();
   // Existing readers validate arithmetic, catalog ancestry, selection and revisions; clone because legacy readers normalize state.
   const request=raw.kind==='solution'?readSolutionRequest(structuredClone(raw.request)):readPlanConversationRequest(structuredClone(raw.request));
   const goal=raw.kind==='solution'?request.goal:{id:request.context.goalId,statement:request.context.goal};
   const exploration=raw.kind==='solution'&&goal.id===''&&goal.statement===''&&request.catalog===null;
   const current=readPublicSavedEvidenceRecipe(raw.current),previous=raw.previous.map(readPublicSavedEvidenceRecipe);
   must(same(current.goal,goal));
   if(raw.kind==='solution')must(same(current.filters,request.filters)&&current.scope===request.scope&&same(current.evidence,raw.request.evidence));
   const recipes=[current,...previous];
   const required=[...(request.catalog?.plans??[]).map(p=>p.draft.binding),...(request.state?.working??[]).map(p=>p.binding)];
   if(exploration){
    must((request.state?.working??[]).every(item=>item.binding.goalId==='exploration'&&item.binding.goal===item.candidate.goal.statement));
    must(previous.every(r=>r.goal.id==='exploration'&&required.some(b=>b.goalId===r.goal.id&&b.goal===r.goal.statement)));
   }else{
    must(recipes.every(r=>same(r.goal,goal)));
    must(required.every(b=>b.goalId===goal.id&&b.goal===goal.statement));
   }
   must(recipes.every(r=>same(r.source,current.source)));
   const checked=new Set();
   for(const recipe of recipes){
    signal.throwIfAborted();
    const receipt=await verifyHome({datasetToken:P.token,scope:recipe.scope,filters:recipe.filters,evidence:recipe.evidence},signal);
    signal.throwIfAborted();must(receipt?.datasetToken===P.token&&receipt.bundleDigest===recipe.source.publicDigest&&receipt.provenance==='synthetic-public-projection'&&receipt.databaseIntegrityCertified===false);
    // A blank exploration goal remains blank. Only explicit per-candidate replay
    // recipes bind working proposals; this never adopts a candidate as active goal.
    if(recipe.goal.id)checked.add(actionBindingKey(await actionBinding(recipe.goal.id,recipe.goal.statement,recipe.evidence,recipe.planningInputs)));
   }
   must(required.every(b=>checked.has(actionBindingKey(b))),'A saved or working plan has no matching current public evidence/input recipe. Existing plans are preserved.');
   const analyses=request.state?.analyses??[],loaded=new Map();
   if(analyses.length){
    const projection=await loadProjection(signal);signal.throwIfAborted();
    for(const item of analyses){
     must(same(item.inputs.datasetVersion,current.source),'Saved projection belongs to a different public source.');
     const key=JSON.stringify(item.inputs.filters);if(!loaded.has(key))loaded.set(key,await projection.projection(item.inputs.filters,signal));
     const inputs=loaded.get(key);must(same(item.inputs,inputs)&&item.inputDigest===await projectionDigest(inputs),'Saved projection inputs changed. Existing projections are preserved.');
    }
   }
   signal.throwIfAborted();
   return Object.freeze({contract:'public-saved-evidence-check-v1',datasetToken:P.token,publicDigest:current.source.publicDigest,goal:structuredClone(goal),selectedId:request.selectedId,verifiedBindingKeys:[...checked],verifiedProjectionIds:analyses.map(p=>({id:p.id,revision:p.revision})),databaseIntegrityCertified:false});
  })(),signal);}finally{clearTimeout(timer);controller.abort();}
 }});
}
