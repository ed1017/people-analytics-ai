import {readHomeSource} from './home-pack.mjs';
export type SurveySourceResult = {status:'loaded'|'unavailable'|'timeout';data:unknown};
const unavailable:SurveySourceResult={status:'unavailable',data:null};
/** One company-wide source per browser session. No timers trigger requests or retries. */
export class SurveySourceRequests {
 private pending:Promise<SurveySourceResult>|null=null;
 private cached:{result:SurveySourceResult;expires:number}|null=null;
 private load:()=>Promise<SurveySourceResult>;
 private now:()=>number;
 constructor(load:()=>Promise<SurveySourceResult>,now=()=>Date.now()){this.load=load;this.now=now;}
 invalidate(){this.cached=null;}
 read(signal?:AbortSignal):Promise<SurveySourceResult>{
  if(signal?.aborted)return Promise.resolve(unavailable);
  if(!this.pending&&(!this.cached||this.cached.expires<=this.now())){
   const pending=Promise.resolve().then(this.load).catch(()=>unavailable).then(result=>{
    const safe=result.status==='loaded'?result:{status:result.status,data:null};
    this.cached={result:safe,expires:this.now()+(safe.status==='loaded'?300000:30000)};
    return safe;
   }).finally(()=>{if(this.pending===pending)this.pending=null;});
   this.pending=pending;
  }
  const result=this.pending??Promise.resolve(this.cached!.result);
  if(!signal)return result;
  // Leaving Home stops only its subscriber, not another page's shared request.
  return new Promise(resolve=>{
   const abort=()=>{signal.removeEventListener('abort',abort);resolve(unavailable)};
   signal.addEventListener('abort',abort,{once:true});
   void result.then(value=>{signal.removeEventListener('abort',abort);resolve(signal.aborted?unavailable:value)});
  });
 }
}
const surveyRequests=new SurveySourceRequests(()=>readHomeSource('/api/survey-sentiment',undefined));
export const readSurveySource=(signal?:AbortSignal)=>surveyRequests.read(signal);
export const refreshSurveySource=()=>surveyRequests.invalidate();
