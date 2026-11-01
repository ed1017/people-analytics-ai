import {publicPlannerPriceCandidate} from './public-planner-price-candidate.mjs';
import {readPublicPlannerPolicy} from './public-planner-round.server.mjs';

export const APPROVED_PRICING_DIGEST='ea1e9ef799beccc24cfe6b1a2e5720d1bcbef4579a16486768ea27385482a1b3';
/** Only dates come from the renewal record. Model ceilings and prices remain
 * reviewed code, with matching immutable database terms required. */
export function pricingPolicyForRoute(record,route,now=Date.now()){
 const reject=()=>{throw Error('Verified pricing unavailable.');};
 if(!record||record.status!=='current'||typeof record.version!=='string'||!record.version||!Number.isFinite(now))return reject();
 const t=record.terms;
 if(!t||record.verificationDigest!==APPROVED_PRICING_DIGEST||t.contextTokens!==1050000||t.safetyBasisPoints!==11000||!Array.isArray(t.policies))return reject();
 const candidate=publicPlannerPriceCandidate(route);
 const matches=t.policies.filter(p=>p.id===candidate.id);
 if(matches.length!==1)return reject();
 const p=matches[0];
 if(p.model!==candidate.model||p.inputMicroPerMillion!==candidate.inputMicroUsdPerMillion||p.outputMicroPerMillion!==candidate.outputMicroUsdPerMillion||p.reserveMicroUsd!==candidate.reserveMicroUsd||p.maxOutputTokens<candidate.maxOutputTokens)return reject();
 const policy=readPublicPlannerPolicy({...candidate,verifiedAt:record.verifiedAt,validUntil:record.validUntil});
 if(now<Date.parse(policy.verifiedAt)||(policy.validUntil!==null&&now+policy.timeoutMs+30000>=Date.parse(policy.validUntil)))return reject();
 return policy;
}
