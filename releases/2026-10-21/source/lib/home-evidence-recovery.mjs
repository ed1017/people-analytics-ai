import {correlationReceipt} from './data-source-failure.mjs';

const unavailable='Current database evidence could not be read. Try sending your question again later.';
const refresh='Refresh Home, review the updated evidence, then send your question again.';
const evidenceMessages={
 evidence_source_auth_unavailable:'The server could not authenticate to its data source. Try sending your question again later. If this continues, contact the site administrator with the reference below.',
 evidence_reader_failed:unavailable,
 evidence_deadline:'Reading current database evidence took too long. Try sending your question again later.',
 evidence_cancelled:'The evidence check was cancelled. Send your question again when ready.',
 evidence_facts_changed:'Current database evidence has changed. '+refresh,
 evidence_dataset_mismatch:'Current evidence does not match the selected dataset. '+refresh,
 evidence_scope_mismatch:'The evidence does not match the selected scope. '+refresh,
 evidence_verification_failed:'Current database evidence could not be verified. '+refresh,
};
/** @param {{trigger:string,readFailure?:string|null}} diagnostic */
export function solutionEvidenceCode(diagnostic){
 return diagnostic.trigger==='reader_failed'&&diagnostic.readFailure==='source_authentication'?'evidence_source_auth_unavailable':'evidence_'+diagnostic.trigger;
}
/** @param {string} code */
export function solutionEvidenceMessage(code){
 return Object.hasOwn(evidenceMessages,code)?evidenceMessages[code]:evidenceMessages.evidence_verification_failed;
}
/** Keep the failed attempt distinct from the previous answer; retry remains an explicit Send.
 * @param {unknown} value */
export function homeConversationErrorMessage(value){
 const raw=value&&typeof value==='object'?value:{};
 if(typeof raw.code==='string'&&Object.hasOwn(evidenceMessages,raw.code)){
  const reference=correlationReceipt(raw.correlationId);
  return 'Your latest request was not answered. '+solutionEvidenceMessage(raw.code)+' Your draft and earlier work are kept.'+(reference?' Reference: '+reference+'.':'');
 }
 return typeof raw.error==='string'?raw.error:'The conversation response is unavailable.';
}
