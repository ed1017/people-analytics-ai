import {prepareHomeMixCommit,readHomeMixHistory} from "./home-mix-history";
import {evaluateHomeMix,verifyHomeMix} from "./home-mix-runtime";
import {previewBundleCapacityAdoption} from "./home-capacity-adoption";
// Module worker: no fetch, SDK, database or storage access.
import {runLocalWorkforceSearch,stageWorkforceMixSelectionLocally,previewWorkforceSearchReview,readLocalWorkforceReview,retainLocalWorkforceReview} from "./workforce-local-search";
import {loadSolutionCards,previewSolutionWhatIf,saveSolutionWhatIf,pinSavedSolution,resolveSolutionPin} from "./workforce-solution-cards";
self.onmessage=async(event: MessageEvent)=>{
 try {
  const {action,args}=event.data;let value;
  switch(action){
   case "home-mix-history": value=await readHomeMixHistory(args.raw,args.goalId);break;
   case "home-mix-commit": value=await prepareHomeMixCommit(args.draft,args.evaluation,args.candidateId,args.at,args.previous);break;
   case "home-mix": value=await evaluateHomeMix(args.draft);break;
   case "home-mix-read": value=await verifyHomeMix(args.raw,args.draft);break;
   case "bundle-adoption": value=await previewBundleCapacityAdoption(args.draft,args.context,args.snapshot,args.candidateId);break;
   case "search": value=await runLocalWorkforceSearch(args.context,args.spec);break;
   case "select": value=await stageWorkforceMixSelectionLocally(args.context,args.snapshot,args.ids);break;
   case "preview": value=await previewWorkforceSearchReview(args.context,args.revisions,args.origin,args.id,args.createdAt);break;
   case "read": value=await readLocalWorkforceReview(args.review,args.solution);break;
   case "retain": value=await retainLocalWorkforceReview(args.previous,args.review,args.solution);break;
   case "cards": value=await loadSolutionCards(args.solution,args.resultId,args.history);break;
   case "what-if": value=await previewSolutionWhatIf(args.solution,args.resultId,args.history,args.cardId,args.draft,args.priority);break;
   case "save-what-if": value=await saveSolutionWhatIf(args.solution,args.resultId,args.history,args.preview,args.runId,args.newResultId,args.at);break;
   case "pin": value=await pinSavedSolution(args.pins,args.solution,args.resultId,args.id,args.at,args.history);break;
   case "resolve-pin": value=await resolveSolutionPin(args.pin,args.solution,args.history);break;
   default: throw Error("Unsupported local operation.");
  }
  self.postMessage({ok:true,value});
 }catch(error){self.postMessage({ok:false,error:error instanceof Error?error.message:"Local verification failed."})}
};
