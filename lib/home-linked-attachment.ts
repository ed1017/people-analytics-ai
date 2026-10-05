// Reviewed local transaction: attachment, compatible inputs, receipt and context transition.
// @ts-expect-error Native Node tests share TypeScript source.
import {DecisionStore,encodeDecisions,validateJson,type Json} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey,validActionBinding,type ActionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,type BundleDraft,type BundleResult} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleWorkspace,saveBundleCalculationPatch,attachBundlePatch} from './home-bundle-records.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {previewActionPlanApplication,actionPlanApplicationSource,actionPlanQuoteKey,actionPlanDevelopmentScopeKey,type ApplicationContext,type ApplicationChoices,type ApplicationPreview,type ApplicationDestination} from './action-plan-application-preview.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {applyActionPlanPreview,readApplicationHistory,applicationHistoryField} from './action-plan-application.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readWorkforceSolution,currentSolutionVersion} from './workforce-solution.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {plain,exactKeys} from './home-action-proposal.ts';
export const linkedAttachmentField='homeActionPlanLinksV1';
export type PlanningDestination=Pick<ApplicationDestination,'development'|'workforceSolution'|'selectedPlanningScenario'>;
export type ProjectPlanningBinding=(destination:PlanningDestination)=>Promise<ActionBinding>;
type FieldLink={destination:string;written:string;sourcePaths:string[];receiptId:string;ownerBindingKey:string;ownerPreparedAt:string;ownerSignature:string;bundleId:string};
export type AttachmentTransition={id:string;preparedAt:string;sourceBinding:ActionBinding;fromBinding:ActionBinding;toBinding:ActionBinding;attachmentId:string;inputKey:string;destinationBefore:PlanningDestination;destinationAfter:PlanningDestination;links:FieldLink[];receiptId:string|null};
export type AttachmentLinks={version:1;entries:AttachmentTransition[]};
export type LinkedAttachmentRequest={preparedAt:string;draft:BundleDraft;result:BundleResult;attachmentId:string;at:string;replaceId:string|null;reviewed:boolean;acknowledgeUnknowns:boolean;development:null|{componentId:string;optionIndex:number;quoteReviewed:boolean;hourlyReviewed:boolean};capacityReviewed:boolean};
export type LinkedAttachmentPreview={request:LinkedAttachmentRequest;revision:number;physicalBinding:ActionBinding;application:ApplicationPreview;choices:ApplicationChoices;manualConflicts:string[]};
const canonical=(value:unknown):string=>JSON.stringify(value,(_,item)=>plain(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
function check(value:unknown,message:string):asserts value{if(!value)throw Error(message)}
export const planningDestination=(fields:Record<string,unknown>):PlanningDestination=>({development:(fields.development??null) as PlanningDestination['development'],workforceSolution:fields.workforceSolution??null,selectedPlanningScenario:typeof fields.selectedPlanningScenario==='string'?fields.selectedPlanningScenario:null});
const sourcePaths=(row:ApplicationPreview['rows'][number])=>[...new Set(row.provenance.map(item=>item.sourcePath))].sort();
function destinationValue(destination:PlanningDestination,path:string):unknown{
 if(path==='development.goal')return destination.development?.goal??null;
 const development=/^development\.options\[([0-2])\]\.inputs\.(participants|sessions|hours|fee|additionalFees|hourlyCost)$/.exec(path);
 if(development)return destination.development?.options[Number(development[1])]?.inputs[development[2] as keyof NonNullable<PlanningDestination['development']>['options'][number]['inputs']]??null;
 const workforce=/^workforceSolution\.([A-Za-z]+)\.([A-Za-z]+)$/.exec(path),solution=readWorkforceSolution(destination.workforceSolution);
 return workforce&&solution?currentSolutionVersion(solution).inputs[workforce[1] as keyof ReturnType<typeof currentSolutionVersion>['inputs']]?.[workforce[2]]??null:null;
}
/** Cross-check links against actual immutable attachments and original application receipts. */
export function readAttachmentLinks(raw:unknown,fields:Record<string,unknown>):AttachmentLinks|null{
 if(raw===undefined)return {version:1,entries:[]};
 try{
  check(validateJson(raw)&&new TextEncoder().encode(JSON.stringify(raw)).length<=512*1024,'Link history is too large.');
  const history=plain(raw);check(history&&exactKeys(history,['version','entries'])&&history.version===1&&Array.isArray(history.entries)&&history.entries.length<=12,'Invalid link history.');
  const receipts=readApplicationHistory(fields[applicationHistoryField]);check(receipts,'Invalid application receipts.');
  for(const entry of history.entries as AttachmentTransition[]){
   check(plain(entry)&&exactKeys(entry,['id','preparedAt','sourceBinding','fromBinding','toBinding','attachmentId','inputKey','destinationBefore','destinationAfter','links','receiptId'])&&typeof entry.preparedAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(entry.preparedAt)&&Number.isFinite(Date.parse(entry.preparedAt))&&typeof entry.id==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(entry.id)&&validActionBinding(entry.sourceBinding)&&validActionBinding(entry.fromBinding)&&validActionBinding(entry.toBinding),'Invalid transition.');
   check([entry.fromBinding,entry.toBinding].every(binding=>binding.goalId===entry.sourceBinding.goalId&&binding.goal===entry.sourceBinding.goal),'Transition changed goal.');
   const workspace=readBundleWorkspace(fields.homeSolutionBundlesV1,entry.sourceBinding.goalId),attachment=workspace?.attachments.find(item=>item.id===entry.attachmentId);
   check(attachment&&same(attachment.draft.binding,entry.sourceBinding)&&bundleInputKey(attachment.draft)===entry.inputKey,'Transition source changed.');
   check([entry.destinationBefore,entry.destinationAfter].every(destination=>plain(destination)&&exactKeys(destination,['development','workforceSolution','selectedPlanningScenario'])&&(destination.workforceSolution===null||readWorkforceSolution(destination.workforceSolution)))&&Array.isArray(entry.links)&&entry.links.length<=40&&new Set(entry.links.map(item=>item.destination)).size===entry.links.length,'Invalid destination transition.');
   const application=receipts.receipts.find(receipt=>receipt.id===entry.receiptId);
   check(entry.receiptId===null?same(entry.destinationBefore,entry.destinationAfter):application&&application.binding.attachmentId===entry.attachmentId&&application.binding.inputKey===entry.inputKey&&application.changes.every(row=>same(row.current,destinationValue(entry.destinationBefore,row.destination))&&same(row.after,destinationValue(entry.destinationAfter,row.destination))),'Transition receipt is missing or inconsistent.');
   for(const link of entry.links){
    check(plain(link)&&exactKeys(link,['destination','written','sourcePaths','receiptId','ownerBindingKey','ownerPreparedAt','ownerSignature','bundleId'])&&typeof link.written==='string'&&Array.isArray(link.sourcePaths)&&link.sourcePaths.every(item=>typeof item==='string'),'Invalid field link.');
    const receipt=receipts.receipts.find(item=>item.id===link.receiptId),row=receipt?.changes.find(item=>item.destination===link.destination),owner=workspace?.attachments.find(item=>item.id===receipt?.binding.attachmentId);
    check(row&&row.after===link.written&&same(sourcePaths(row),link.sourcePaths)&&owner?.draft.bundle.id===link.bundleId&&receipt?.binding.bindingKey===link.ownerBindingKey&&owner?.draft.signature===link.ownerSignature&&(history.entries as AttachmentTransition[]).some(entry=>entry.receiptId===link.receiptId&&entry.preparedAt===link.ownerPreparedAt),'Field link does not match its receipt.');
   }
  }
  check(new Set(history.entries.map((entry:AttachmentTransition)=>entry.id)).size===history.entries.length,'Repeated transition.');
  return structuredClone(raw) as AttachmentLinks;
 }catch{return null}
}
/** Only linked value edits and their appended input versions qualify for conflict review. */
export function linkedDestinationIsReviewable(current:PlanningDestination,expected:PlanningDestination,links:FieldLink[]):boolean{
 try{
  const left=structuredClone(current),right=structuredClone(expected),paths=new Set(links.map(link=>link.destination).filter(path=>path!=='development.goal'));
  for(const path of paths){const match=/^development\.options\[([0-2])\]\.inputs\.(participants|sessions|hours|fee|additionalFees|hourlyCost)$/.exec(path);if(match){const index=Number(match[1]),field=match[2] as keyof NonNullable<PlanningDestination['development']>['options'][number]['inputs'];check(left.development?.options[index]&&right.development?.options[index],'Missing Development option.');left.development.options[index].inputs[field]=right.development.options[index].inputs[field];}}
  if(!same(left.development,right.development)||left.selectedPlanningScenario!==right.selectedPlanningScenario)return false;
  if(same(left.workforceSolution,right.workforceSolution))return true;
  const actual=readWorkforceSolution(left.workforceSolution),prior=readWorkforceSolution(right.workforceSolution);if(!actual||!prior||actual.pending||actual.versions.length<prior.versions.length)return false;
  if(!same({...actual,versions:[]},{...prior,versions:[]})||!same(actual.versions.slice(0,prior.versions.length),prior.versions))return false;
  for(const version of actual.versions.slice(prior.versions.length)){
   const inputs=structuredClone(version.inputs),original=currentSolutionVersion(prior);if(!same(version.evidenceIds,original.evidenceIds))return false;
   for(const path of paths){const match=/^workforceSolution\.([A-Za-z]+)\.([A-Za-z]+)$/.exec(path);if(match){const section=match[1] as keyof typeof inputs;check(inputs[section]&&original.inputs[section],'Unknown workforce section.');inputs[section][match[2]]=original.inputs[section][match[2]];}}
   if(!same(inputs,original.inputs))return false;
  }
  return true;
 }catch{return false}
}
export async function resolveAttachedSourceBinding(source:ActionBinding,physical:ActionBinding,fields:Record<string,unknown>,project:ProjectPlanningBinding,preparedAt?:string):Promise<ActionBinding|null>{
 const history=readAttachmentLinks(fields[linkedAttachmentField],fields),last=history?.entries.at(-1);
 if(!history)return null;
 if(!last||!same(last.sourceBinding,source)||preparedAt!==undefined&&last.preparedAt!==preparedAt)return same(source,physical)?source:null;
 if(!linkedDestinationIsReviewable(planningDestination(fields),last.destinationAfter,last.links))return null;
 // Project the recorded post-application destination through CURRENT evidence/request inputs.
 // External changes therefore fail even when the linked destinations still match.
 return same(await project(last.destinationAfter),last.toBinding)&&same(await project(last.destinationBefore),last.fromBinding)?source:null;
}
function applicationContext(store:DecisionStore,request:LinkedAttachmentRequest):ApplicationContext{
 const snapshot=store.getSnapshot(),draft=request.draft,fields=snapshot.data.workspaces[draft.binding.goalId]?.fields??{};
 check(snapshot.ready&&snapshot.saved&&snapshot.data.goals.activeId===draft.binding.goalId&&snapshot.data.goals.goals.find(item=>item.id===draft.binding.goalId)?.statement===draft.binding.goal,'Goal or saved storage changed.');
 check(request.reviewed,'Review this exact plan before attaching.');
 check(typeof request.preparedAt==='string'&&Number.isFinite(Date.parse(request.preparedAt)),'Preparation identity is unavailable.');
 const preparation=plain(fields.homeBundlePreparationV1);if(preparation)check(preparation.preparedAt===request.preparedAt&&same(preparation.binding,draft.binding),'Preparation changed before attachment.');
 const saved=saveBundleCalculationPatch(fields.homeSolutionBundlesV1,draft,request.result);
 const workspace=attachBundlePatch(saved.value,draft,{confirmed:true,bindingKey:actionBindingKey(draft.binding),inputKey:bundleInputKey(draft),acknowledgeUnknowns:request.acknowledgeUnknowns},request.attachmentId,request.at,request.replaceId).value;
 const source=actionPlanApplicationSource(workspace.attachments.at(-1)!),destination=planningDestination(fields),selection=request.development,option=selection?destination.development?.options[selection.optionIndex]:null,solution=readWorkforceSolution(destination.workforceSolution);
 return {binding:draft.binding,workspace,attachmentId:request.attachmentId,currentDraft:draft,destination:{...destination,goalId:draft.binding.goalId,revision:snapshot.data.revision,headcount:null},
  developmentTarget:selection?{componentId:selection.componentId,optionIndex:selection.optionIndex,quoteReview:selection.quoteReviewed&&option?{source,componentId:selection.componentId,optionIndex:selection.optionIndex,quoteKey:actionPlanQuoteKey(option.quote),scopeKey:actionPlanDevelopmentScopeKey(draft),confirmedCompatible:true,loadedHourlyCostCompatible:selection.hourlyReviewed}:null}:null,
  capacityReview:request.capacityReviewed&&solution?{source,solutionId:solution.id,version:currentSolutionVersion(solution).version,confirmedAdditionalCapacity:true}:null};
}
export async function previewLinkedAttachment(store:DecisionStore,request:LinkedAttachmentRequest,overrides:ApplicationChoices,project:ProjectPlanningBinding):Promise<LinkedAttachmentPreview>{
 const context=applicationContext(store,request),fields=store.getSnapshot().data.workspaces[request.draft.binding.goalId].fields,history=readAttachmentLinks(fields[linkedAttachmentField],fields);check(history,'Link history cannot be verified.');
 const physicalBinding=await project(planningDestination(fields));check(await resolveAttachedSourceBinding(request.draft.binding,physicalBinding,fields,project,request.preparedAt),'Evidence, unlinked planning inputs or prior history changed. Review the current plan context.');
 const unselected=await previewActionPlanApplication(context),choices:ApplicationChoices={},manualConflicts:string[]=[],links=history.entries.at(-1)?.links??[];
 for(const row of unselected.rows){
  const link=links.find(item=>item.destination===row.destination&&item.ownerBindingKey===actionBindingKey(request.draft.binding)&&item.bundleId===request.draft.bundle.id&&item.ownerPreparedAt===request.preparedAt&&item.ownerSignature===request.draft.signature&&same(item.sourcePaths,sourcePaths(row)));
  if(link&&!same(row.current,link.written))manualConflicts.push(row.destination);
  if(!['blocked','read-only','missing'].includes(row.status)&&row.proposed!==null){
   if(link&&same(row.current,link.written))choices[row.destination]='replace';
   else if(!request.replaceId&&(row.current===null||row.current===''))choices[row.destination]='fill-empty';
  }
 }
 Object.assign(choices,overrides);
 const application=await previewActionPlanApplication(context,choices);
 return structuredClone({request,revision:context.destination.revision,physicalBinding,application,choices,manualConflicts});
}
const inFlight=new WeakSet<DecisionStore>();
export async function commitLinkedAttachment(store:DecisionStore,preview:LinkedAttachmentPreview,overrides:ApplicationChoices,project:ProjectPlanningBinding,isCurrent:()=>boolean,receiptId:string):Promise<void>{
 check(!inFlight.has(store),'An attachment is already pending.');inFlight.add(store);
 try{
  check(isCurrent(),'Working draft or context changed.');
  const checked=await previewLinkedAttachment(store,preview.request,overrides,project);check(same(checked,preview)&&isCurrent(),'The reviewed source or destination changed. Review again.');
  check(!preview.application.blockers.length,'Resolve blocked application choices before attaching.');
  const before=store.getSnapshot().data,goalId=preview.request.draft.binding.goalId,fields=before.workspaces[goalId].fields,context=applicationContext(store,preview.request),history=readAttachmentLinks(fields[linkedAttachmentField],fields);check(history&&history.entries.length<12,'Link history is invalid or full.');
  const shadowData=structuredClone(before);shadowData.workspaces[goalId].fields.homeSolutionBundlesV1=context.workspace as Json;
  const shadow=new DecisionStore();let memory=encodeDecisions(shadowData);shadow.initialize({getItem:()=>memory,setItem:(_key,value)=>{memory=value;},removeItem:()=>{memory='';}});
  if(preview.application.selectedChanges.length)await applyActionPlanPreview(shadow,preview.application,preview.choices,()=>context,()=>true,receiptId,preview.request.at);
  const next=shadow.getSnapshot().data.workspaces[goalId].fields,after=planningDestination(next),toBinding=await project(after),links=[...history.entries.at(-1)?.links??[]];
  for(const row of preview.application.rows.filter(item=>item.status==='fill'||item.status==='replace')){
   const link:FieldLink={destination:row.destination,written:String(row.after),sourcePaths:sourcePaths(row),receiptId,ownerBindingKey:actionBindingKey(preview.request.draft.binding),ownerPreparedAt:preview.request.preparedAt,ownerSignature:preview.request.draft.signature,bundleId:preview.request.draft.bundle.id};const index=links.findIndex(item=>item.destination===row.destination);if(index<0)links.push(link);else links[index]=link;
  }
  history.entries.push({id:preview.request.attachmentId,preparedAt:preview.request.preparedAt,sourceBinding:preview.request.draft.binding,fromBinding:preview.physicalBinding,toBinding,attachmentId:preview.request.attachmentId,inputKey:bundleInputKey(preview.request.draft),destinationBefore:planningDestination(fields),destinationAfter:after,links,receiptId:preview.application.selectedChanges.length?receiptId:null});
  const patch:Record<string,Json>={homeSolutionBundlesV1:next.homeSolutionBundlesV1,[linkedAttachmentField]:history as unknown as Json};
  for(const field of ['development','workforceSolution',applicationHistoryField])if(!same(fields[field]??null,next[field]??null))patch[field]=next[field];
  check(readAttachmentLinks(patch[linkedAttachmentField],{...fields,...patch}),'The complete attachment transition cannot be verified.');
  check(isCurrent()&&same(store.getSnapshot().data,before)&&same(await project(planningDestination(fields)),preview.physicalBinding),'Context changed during attachment validation.');
  store.commitGoalFields(goalId,preview.request.draft.binding.goal,preview.revision,preview.request.at,live=>{check(isCurrent()&&same(live,fields),'Saved destination changed before commit.');return patch;});
 }finally{inFlight.delete(store)}
}
