/** Fictional browser-local records only. No services or dataset ingestion. */
import {emptyGoalProgress,appendGoalProgressEvent,HEADCOUNT_DEFINITION} from '../../lib/goal-progress.ts';
export const day='2026-10-08',scope={country:'all',org:'all',level:'all'};
export function progressFixture(goalId='growth',direction='increase',{missing=false,stale=false,unsupported=false,noBaseline=false,baselineOnly=false,classification='user-reported'}={}){
 let ledger=emptyGoalProgress(goalId,'demo');
 const observation=(id,value,date)=>({id,kind:'observed',at:date+'T12:00:00Z',supersedes:null,data:{metric:'headcount',definition:HEADCOUNT_DEFINITION,unit:'people',scope,period:{kind:'point',start:date,end:date},value,quality:{complete:true,suppressed:false,denominatorRequired:false,denominator:null},source:{classification,datasetToken:'legacy-v1:0',releaseId:'fixture-'+id,releaseDigest:'a'.repeat(64),lineageId:'user-reported:'+goalId},capturedAt:date+'T12:00:00Z'}});
 if(!missing)ledger=appendGoalProgressEvent(ledger,observation('base',100,'2026-08-01'));
 ledger=appendGoalProgressEvent(ledger,{id:'measure',kind:'measurement',at:'2026-08-02T12:00:00Z',supersedes:null,data:{metric:unsupported?'turnover':'headcount',definition:unsupported?'unsupported-v1':HEADCOUNT_DEFINITION,unit:unsupported?'percent':'people',direction,scope,lineageId:'user-reported:'+goalId,baselineId:missing||noBaseline?null:'base',target:{value:direction==='increase'?120:80,date:'2026-12-31'},maxAgeDays:30,provenance:'Explicit fictional planning target.'}});
 if(!missing&&!baselineOnly)ledger=appendGoalProgressEvent(ledger,observation('latest',direction==='increase'?110:90,stale?'2026-08-20':'2026-09-20'));
 ledger=appendGoalProgressEvent(ledger,{id:'milestone',kind:'milestone-proposed',at:'2026-09-21T12:00:00Z',supersedes:null,data:{measurementId:'measure',value:direction==='increase'?115:85,date:'2026-11-01',provenance:'Proposed synthetic checkpoint, not achieved.'}});
 return ledger;
}
