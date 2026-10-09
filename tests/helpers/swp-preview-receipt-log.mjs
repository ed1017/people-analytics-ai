/** ASCII-only bounded transport for already-sanitized private build receipts. */
import {createHash} from 'node:crypto';
export const receiptPrefix='SOLUTION_ACCEPTANCE_CHUNK ';
export const receiptLineLimit=3000;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function encodeReceipt(recordId,receipt){
 if(!/^[A-Za-z0-9_-]{1,160}$/.test(recordId))throw Error('Invalid receipt ID.');
 const bytes=Buffer.from(JSON.stringify(receipt),'utf8');
 if(bytes.length>2000000)throw Error('Receipt exceeds bounded transport.');
 const encoded=bytes.toString('base64'),size=1800,total=Math.ceil(encoded.length/size),digest=hash(bytes);
 return Array.from({length:total},(_,index)=>{
  const line=receiptPrefix+JSON.stringify({version:1,recordId,index,total,bytes:bytes.length,sha256:digest,data:encoded.slice(index*size,(index+1)*size)});
  if(Buffer.byteLength(line)>receiptLineLimit)throw Error('Receipt line exceeds transport limit.');
  return line;
 });
}
export function decodeReceipt(lines){
 if(!Array.isArray(lines)||!lines.length||lines.length>1500)throw Error('Missing or oversized receipt.');
 const rows=lines.map(line=>{
  if(typeof line!=='string'||Buffer.byteLength(line)>receiptLineLimit||!line.startsWith(receiptPrefix))throw Error('Invalid receipt line.');
  return JSON.parse(line.slice(receiptPrefix.length));
 });
 const first=rows[0],{version,recordId,total,bytes,sha256}=first;
 if(version!==1||typeof recordId!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(recordId)||!Number.isInteger(total)||total<1||total>1500||!Number.isInteger(bytes)||bytes<1||bytes>2000000||typeof sha256!=='string'||!/^[a-f0-9]{64}$/.test(sha256)||rows.length!==total)throw Error('Incomplete receipt.');
 const parts=new Map();
 for(const row of rows){
  if(Object.keys(row).sort().join(',')!=='bytes,data,index,recordId,sha256,total,version'||row.version!==version||row.recordId!==recordId||row.total!==total||row.bytes!==bytes||row.sha256!==sha256||!Number.isInteger(row.index)||row.index<0||row.index>=total||parts.has(row.index)||typeof row.data!=='string'||row.data.length>1800||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(row.data))throw Error('Mixed, duplicate or malformed receipt chunks.');
  parts.set(row.index,row.data);
 }
 const encoded=Array.from({length:total},(_,i)=>parts.get(i)).join(''),body=Buffer.from(encoded,'base64');
 if(body.toString('base64')!==encoded||body.length!==bytes||hash(body)!==sha256)throw Error('Receipt integrity mismatch.');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(body);
 return {recordId,sha256,receipt:JSON.parse(text)};
}
/** Only application-visible text and tool arguments; no SDK envelope or reasoning. */
export function providerReceiptOutput(output){
 return output.flatMap(item=>item.type==='function_call'?[{type:'function_call',call_id:item.call_id,name:item.name,arguments:item.arguments}]:item.type==='message'?[{type:'message',content:(item.content??[]).flatMap(part=>part.type==='output_text'?[{type:'output_text',text:part.text}]:[])}]:[]);
}
