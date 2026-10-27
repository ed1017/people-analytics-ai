import {createPricingRenewalHandler} from '@/lib/public-pricing-renewal.server.mjs';
import {verifyPublicPlannerPricing} from '@/lib/public-pricing-verifier.server.mjs';
import {createPublicPlannerLedger} from '@/lib/public-planner-ledger.server.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

export async function GET(request:Request){
 const separateSecrets=Boolean(process.env.PRICING_RENEWAL_TOKEN&&process.env.SUPABASE_SECRET_KEY&&process.env.CRON_SECRET&&new Set([process.env.PRICING_RENEWAL_TOKEN,process.env.SUPABASE_SECRET_KEY,process.env.CRON_SECRET]).size===3);
 const ledger=createPublicPlannerLedger({transport:fetch,url:process.env.SUPABASE_URL,secretKey:process.env.SUPABASE_SECRET_KEY,renewalToken:process.env.PRICING_RENEWAL_TOKEN});
 return createPricingRenewalHandler({
  production:process.env.VERCEL_ENV==='production'&&separateSecrets,deploymentHostname:process.env.VERCEL_URL,cronSecret:process.env.CRON_SECRET,
  verify:(signal:AbortSignal)=>verifyPublicPlannerPricing({fetchImpl:(url:RequestInfo|URL,init?:RequestInit)=>fetch(url,{...init,signal:AbortSignal.any([signal,...(init?.signal?[init.signal]:[])])})}),
  renew:(proof,signal)=>ledger.renewPricing(proof,signal),
 })(request);
}
// Next may automatically map HEAD to GET; explicitly refuse without side effects.
export function HEAD(){return new Response(null,{status:405,headers:{'Cache-Control':'no-store',Allow:'GET'}});}
