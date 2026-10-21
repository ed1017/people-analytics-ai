import type {DashboardFilters} from './dashboard-scope';
import {PUBLIC_9037} from './public-9037-contract.mjs';
import {currentPublicProjectionForDisplay} from './public-projection-currentness-client.mjs';
import type {HeadcountProjection} from './home-solution-projection';
// @ts-expect-error Native offline tests share TypeScript source.
import {readHeadcountProjections} from './home-solution-projection.ts';
// @ts-expect-error Native offline tests share TypeScript source.
import {currentHeadcountProjection, type ProjectionSelection, type ProjectionCurrentnessReceipt} from './home-projection-currentness.ts';

export type HomeProjectionContext={key:string;enabled:boolean;goal:{id:string;statement:string};datasetToken:string;filters:DashboardFilters;analyses:unknown;snapshot:{asOf:string;headcount:number}|null};
export type CheckedHomeProjection={analysis:HeadcountProjection;checkedAt:string;provenance:'legacy-live-source-read'|'approved-public-projection-read'};
export type HomeProjectionView={requested:boolean;key:string;status:'idle'|'checking'|'ready'|'unavailable';value:CheckedHomeProjection|null};
const empty:HomeProjectionView={requested:false,key:'',status:'idle',value:null};

/** Ephemeral explicit selection. No persistence, automatic choice, polling or model calls. */
export class HomeProjectionSelection {
  private view=empty;
  private epoch=0;
  private abort:AbortController|null=null;
  private listeners=new Set<()=>void>();
  private context:()=>HomeProjectionContext;
  private transport:(url:string,init:RequestInit)=>Promise<Response>;
  constructor(context:()=>HomeProjectionContext,transport:(url:string,init:RequestInit)=>Promise<Response>){this.context=context;this.transport=transport;}
  setContext(context:()=>HomeProjectionContext){this.context=context;}
  snapshot=()=>this.view;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private publish(value:HomeProjectionView){this.view=value;for(const listener of this.listeners)listener();}
  invalidate=()=>{this.epoch++;this.abort?.abort();this.abort=null;if(this.view.requested)this.publish({...this.view,status:'unavailable',value:null});};
  async show(id:string,revision:number){
    this.invalidate();
    const context=this.context(),epoch=this.epoch;
    if(!context.enabled||!context.goal.id||!context.snapshot)return;
    const selection:ProjectionSelection={goalId:context.goal.id,goalStatement:context.goal.statement,id,revision};
    try{if(!readHeadcountProjections(context.analyses).some(item=>item.id===id&&item.revision===revision))return;}catch{return;}
    const abort=new AbortController();this.abort=abort;
    const isCurrent=()=>!abort.signal.aborted&&this.epoch===epoch&&this.context().enabled&&this.context().key===context.key;
    this.publish({requested:true,key:context.key,status:'checking',value:null});
    try{
      const query=new URLSearchParams(context.filters);
      const response=await this.transport('/api/home-solution-conversation?'+query,{method:'GET',cache:'no-store',signal:abort.signal});
      if(!response.ok)throw Error('Current source unavailable');
      const receipt:unknown=await response.json();
      if(!isCurrent())return;
      const verify=context.datasetToken===PUBLIC_9037.token?currentPublicProjectionForDisplay:currentHeadcountProjection;
      const analysis=await verify({selection,activeGoal:context.goal,analyses:context.analyses,receipt,filters:context.filters,datasetToken:context.datasetToken,isCurrent});
      if(!isCurrent())return;
      if(analysis.inputs.asOf!==context.snapshot.asOf||analysis.inputs.opening!==context.snapshot.headcount)throw Error('Opening snapshot changed');
      this.publish({requested:true,key:context.key,status:'ready',value:{analysis,checkedAt:(receipt as ProjectionCurrentnessReceipt).checkedAt,provenance:context.datasetToken===PUBLIC_9037.token?'approved-public-projection-read':'legacy-live-source-read'}});
    }catch{if(isCurrent())this.publish({requested:true,key:context.key,status:'unavailable',value:null});}
    finally{if(this.abort===abort)this.abort=null;}
  }
}
