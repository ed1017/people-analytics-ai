import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeReceipt,decodeReceipt,receiptLineLimit,providerReceiptOutput} from './helpers/preview-receipt-log.mjs';
import {safeText} from './helpers/solution-preview-acceptance.mjs';
test('large Unicode receipt reassembles out of order under observed 4096-byte event limit',()=>{
 const receipt={stage:'input-1',text:'Fictional café 漢字 🧪'.repeat(15000)},lines=encodeReceipt('run-1_input-1',receipt);
 assert.ok(lines.length>100);assert.ok(lines.every(line=>Buffer.byteLength(line)<=receiptLineLimit&&Buffer.byteLength(line)<4096));
 assert.deepEqual(decodeReceipt(lines.toReversed()).receipt,receipt);
});
test('missing duplicate mixed truncated and tampered chunks fail closed',()=>{
 const lines=encodeReceipt('run-1_final',{text:'x'.repeat(10000)});
 for(const broken of [lines.slice(1),[...lines.slice(1),lines[1]],[...lines.slice(0,-1),encodeReceipt('run-2_final',{x:1})[0]],lines.map((line,i)=>i===0?line.slice(0,-4):line),lines.map((line,i)=>i===0?line.replace('eHh4','eHl4'):line)])assert.throws(()=>decodeReceipt(broken));
});
test('provider receipt allowlist drops SDK headers keys reasoning and encrypted content',()=>{
 const output=[{type:'reasoning',encrypted_content:'PRIVATE_BLOB'},{type:'message',headers:{authorization:'SECRET_HEADER'},api_key:'SECRET_KEY',content:[{type:'output_text',text:'Fictional answer',annotations:[{secret:'PRIVATE_ANNOTATION'}]}]},{type:'function_call',name:'read_clock',call_id:'call-1',arguments:'{}',headers:{secret:'PRIVATE_HEADER'}}];
 const text=JSON.stringify(providerReceiptOutput(output));assert.doesNotMatch(text,/PRIVATE_|SECRET_|headers|api_key|reasoning|encrypted_content/);assert.match(text,/Fictional answer/);assert.match(text,/read_clock/);
 assert.doesNotMatch(safeText('Bearer hypothetical-token sk-fictionalsecret123').text,/hypothetical-token|sk-fictional/);
});
