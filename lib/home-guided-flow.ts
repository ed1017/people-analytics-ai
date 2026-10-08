/** A click owns one action. Going Back never replays completed work. */
export class HomeGuidedFlow {
 private epoch=0;
 private pending=false;
 private completed=new Set<number>();
 cancel(){this.epoch++;this.pending=false;}
 done(step:number){return this.completed.has(step);}
 async run(step:number,action:()=>Promise<void>,verify:()=>void=()=>{},replay=false):Promise<boolean>{
  if(this.pending)return false;
  this.pending=true;const epoch=this.epoch;
  try{
   if(replay||!this.completed.has(step))await action();
   if(epoch!==this.epoch)return false;
   verify();this.completed.add(step);return true;
  }finally{if(epoch===this.epoch)this.pending=false;}
 }
}

export type GuidedReceipt={type:'answered'|'pinned'|'selected'|'attached'|'edited'|'proposal-reviewed'|'proposal-chosen';goalId:string;goal?:string;planId?:string;number?:number;sourcePlanId?:string};
/** Conversational progress follows completed replies and atomic selections. */
export function conversationalReceiptStep(step:number,event:GuidedReceipt,goalId:string,originalId:string|null):number|null {
 if(event.goalId!==goalId)return null;
 if((step===1||step===2||step===4)&&event.type==='proposal-reviewed'&&event.planId)return step+1;
 if((step===3||step===5)&&event.type==='proposal-chosen'&&event.planId&&Number.isSafeInteger(event.number)&&event.number!>0&&(step===3||event.planId!==originalId))return step+1;
 return null;
}
/** Receipts advance only the expected real control in this isolated goal. */
export function guidedReceiptStep(step:number,event:GuidedReceipt,goalId:string,originalId:string|null,revisedId:string|null):number|null {
 if(event.goalId!==goalId)return null;
 if(step===1&&event.type==='answered')return 2;
 if(step===2&&event.type==='pinned')return 3;
 if(step===3&&event.type==='selected'&&event.planId&&Number.isSafeInteger(event.number)&&event.number!>0)return 4;
 if(step===4&&event.type==='attached'&&event.planId===originalId)return 5;
 if(step===5&&event.type==='edited'&&event.planId&&event.planId!==originalId&&event.sourcePlanId===originalId&&Number.isSafeInteger(event.number)&&event.number!>0)return 6;
 if(step===6&&event.type==='selected'&&event.planId===revisedId)return 7;
 if(step===7&&event.type==='attached'&&(event.planId===revisedId||event.sourcePlanId===revisedId))return 8;
 return null;
}
