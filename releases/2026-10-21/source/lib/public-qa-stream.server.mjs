/** Read at most limit bytes. Cancel oversized or aborted producers promptly. */
export async function boundedJson(stream, limit, signal) {
 if (!stream) throw Error('missing_body');
 const reader=stream.getReader();const chunks=[];let length=0;
 const abort=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
 try {
  while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit)throw Error('body_too_large');chunks.push(value);}
  signal.throwIfAborted();
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 } catch(error){void reader.cancel().catch(()=>{});throw error;}finally{signal.removeEventListener('abort',abort);reader.releaseLock();}
}
