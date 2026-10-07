/** One bounded local operation per worker. Abort/unmount terminates work and ignores late replies. */
export function localWorkforceTask<T>(action: "home-mix-commit"|"home-mix"|"home-mix-read"|"bundle-adoption"|"search"|"select"|"preview"|"read"|"retain"|"cards"|"what-if"|"save-what-if"|"pin"|"resolve-pin",args: unknown,signal: AbortSignal): Promise<T> {
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(Error("Local operation cancelled."));return}
  let worker: Worker;
  try{worker=new Worker(new URL("./workforce-search.worker.ts",import.meta.url),{type:"module"})}
  catch{reject(Error("Local worker unavailable; saved records are retained and no service fallback is used."));return}
  let done=false;
  const finish=(error: Error|null,value?:T)=>{if(done)return;done=true;signal.removeEventListener("abort",cancel);worker.terminate();if(error)reject(error);else resolve(value!)};
  const cancel=()=>finish(Error("Local operation cancelled."));signal.addEventListener("abort",cancel,{once:true});
  worker.onmessage=event=>event.data?.ok?finish(null,event.data.value):finish(Error(event.data?.error??"Local verification failed."));
  worker.onerror=()=>finish(Error("Local worker unavailable; no service fallback is used."));
  try{worker.postMessage({action,args})}catch{finish(Error("Local inputs could not be copied to the worker."))}
 });
}
