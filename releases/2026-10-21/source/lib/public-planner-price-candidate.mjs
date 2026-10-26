/** Reviewed-source price candidate, never an activation flag or auto-renewal.
 * Requires independent review and matching persistent multi-price admission.
 * https://developers.openai.com/api/docs/pricing
 * https://developers.openai.com/api/docs/models/gpt-6.1-sol
 * https://developers.openai.com/api/docs/models/gpt-5.6-luna
 * https://developers.openai.com/api/docs/guides/prompt-caching
 * Retrieved2026-10-26. Explicit caching/no breakpoints is mandatory in boundary.
 */
import {PUBLIC_PLANNER_ROUTE_LIMITS,readPublicPlannerPolicy} from './public-planner-round.server.mjs';
export const PUBLIC_PLANNER_PRICE_GROUP='planner-20261020-multiprice-v1';
export const PUBLIC_PLANNER_PRICE_MAX_RESERVATION=4800000;
export function publicPlannerPriceCandidate(route){
 const limit=PUBLIC_PLANNER_ROUTE_LIMITS[route];
 if(!limit)throw Error('Unsupported public planner route.');
 const sol=route==='home-solution';
 return readPublicPlannerPolicy({
  id:sol?'planner-sol-4k-20261022-v1':'planner-luna-20261020-v1',
  route,model:limit.model,verifiedAt:'2026-10-26T15:40:00.000Z',validUntil:'2026-10-27T15:40:00.000Z',
  contextTokens:1050000,maxOutputTokens:limit.outputTokens,maxInputBytes:1500000,maxRounds:limit.rounds,timeoutMs:60000,
  inputMicroUsdPerMillion:sol?4000000:400000,outputMicroUsdPerMillion:sol?15000000:1800000,
  safetyBasisPoints:11000,reserveMicroUsd:sol?4686000:500000,
 });
}
