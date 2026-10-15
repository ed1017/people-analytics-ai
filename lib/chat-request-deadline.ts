import {setTimeout as schedule,clearTimeout as unschedule} from 'node:timers';

export const CHAT_REQUEST_BUDGET_MS=60_000;
type Stop='timeout'|'cancelled';
export class ChatRequestStopped extends Error {
 readonly code:Stop;
 constructor(code:Stop){super(code==='timeout'?'The assistant took too long. Your work is kept; please try again.':'The request was cancelled. Your work is kept.');this.code=code;}
}
type Clock={now:()=>number;setTimer:(callback:()=>void,ms:number)=>unknown;clearTimer:(timer:unknown)=>void};
const realClock:Clock={now:Date.now,setTimer:(callback,ms)=>schedule(callback,ms),clearTimer:timer=>unschedule(timer as ReturnType<typeof schedule>)};

/** One request budget, not a fresh timeout for each provider/tool round. */
export function createChatRequestDeadline(incoming:AbortSignal,clock:Clock=realClock){
 const controller=new AbortController(),expiresAt=clock.now()+CHAT_REQUEST_BUDGET_MS;
 let stopped:ChatRequestStopped|null=null,disposed=false;
 const stop=(code:Stop)=>{if(!stopped){stopped=new ChatRequestStopped(code);controller.abort(stopped);}};
 const cancel=()=>stop('cancelled');
 const timer=clock.setTimer(()=>stop('timeout'),CHAT_REQUEST_BUDGET_MS);
 incoming.addEventListener('abort',cancel,{once:true});
 if(incoming.aborted)cancel();
 const check=()=>{
  if(!stopped&&clock.now()>=expiresAt)stop('timeout');
  if(stopped)throw stopped;
  if(disposed)throw new Error('Chat request has finished.');
 };
 return {
  check,
  failure:()=>stopped,
  options(){check();return {signal:controller.signal,timeout:Math.max(1,expiresAt-clock.now()),maxRetries:0 as const};},
  async run<T>(call:()=>T|PromiseLike<T>):Promise<T>{
   check();
   let remove=()=>{};
   const aborted=new Promise<never>((_,reject)=>{
    const listener=()=>reject(stopped!);
    controller.signal.addEventListener('abort',listener,{once:true});
    remove=()=>controller.signal.removeEventListener('abort',listener);
   });
   try{
    const result=await Promise.race([Promise.resolve().then(()=>{check();return call();}),aborted]);
    check();return result;
   }finally{remove();}
  },
  dispose(){if(!disposed){disposed=true;clock.clearTimer(timer);incoming.removeEventListener('abort',cancel);}},
 };
}
