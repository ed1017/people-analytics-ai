/** Offline adapter. Caller supplies the existing server-only Supabase RPC client.
 * No credentials, client construction, retries, fallback or local quota counter.
 * An ambiguous/failed RPC may consume its reservation; never retry or refund it.
 */
export function createPublicQaAdmission(client) {
 return async function admit(reservation, signal) {
  if (typeof client?.rpc !== 'function' || signal?.aborted) return {granted:false};
  try {
   const pending = client.rpc('reserve_public_ai', {
    p_request_id:reservation.requestId,
    p_context_id:reservation.contextId,
    p_policy_id:reservation.policyId,
    p_reserve_micro_usd:reservation.reserveMicroUsd,
   });
   // Supabase's request builder supports abortSignal. Do not require an SDK here.
   const {data,error} = await (typeof pending?.abortSignal === 'function' ? pending.abortSignal(signal) : pending);
   return error || signal?.aborted || !data ? {granted:false} : data;
  } catch { return {granted:false}; }
 };
}
