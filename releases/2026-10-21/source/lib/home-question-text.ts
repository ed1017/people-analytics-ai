/** Remove conversational framing only. Never remove dates, populations or qualifiers. */
export function normalizeHomeQuestion(text:string){
 return text.trim().toLowerCase().replace(/[’']/g,'').replace(/^(?:please\s+)?(?:(?:can|could|would)\s+you\s+(?:please\s+)?)/,'').replace(/^please\s+/,'').replace(/(?:[,\s]+please)?[?.!]*$/,'').trim();
}
