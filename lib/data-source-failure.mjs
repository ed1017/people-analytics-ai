/** Fixed, non-secret receipts only. Upstream messages and JWT claims never cross this boundary. */
/** @param {unknown} value */
export function sourceAuthenticationCode(value){
 return typeof value==='string'&&['PGRST300','PGRST301','PGRST302','PGRST303'].includes(value)?value:null;
}
/** @param {unknown} value */
export function correlationReceipt(value){
 return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:null;
}
