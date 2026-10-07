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
