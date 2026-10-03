// Module worker: no fetch, SDK, database or storage access.
import {runLocalWorkforceSearch,stageWorkforceMixSelectionLocally,previewWorkforceSearchReview,readLocalWorkforceReview,retainLocalWorkforceReview} from "./workforce-local-search";
self.onmessage=async(event: MessageEvent)=>{
 try {
  const {action,args}=event.data;let value;
  switch(action){
   case "search": value=await runLocalWorkforceSearch(args.context,args.spec);break;
   case "select": value=await stageWorkforceMixSelectionLocally(args.context,args.snapshot,args.ids);break;
   case "preview": value=await previewWorkforceSearchReview(args.context,args.revisions,args.origin,args.id,args.createdAt);break;
   case "read": value=await readLocalWorkforceReview(args.review,args.solution);break;
   case "retain": value=await retainLocalWorkforceReview(args.previous,args.review,args.solution);break;
   default: throw Error("Unsupported local operation.");
  }
  self.postMessage({ok:true,value});
 }catch(error){self.postMessage({ok:false,error:error instanceof Error?error.message:"Local verification failed."})}
};
