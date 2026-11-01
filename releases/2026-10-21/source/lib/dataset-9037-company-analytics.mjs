/** Inactive company-GET analytics for explicitly pinned private 9037 captures.
 * No SQL, filesystem, network, model or selector mutation. Separate from the
 * original 9847 artifact format and from unverified filtered/POST operations.
 */
import {create9037JointDashboard} from './dataset-9037-joint-dashboard.mjs';
import {createHash} from 'node:crypto';
import {DATASET_COMPONENTS} from './dataset-composition.mjs';
import {ANALYTICS_QUERIES} from './dataset-analytics-source.mjs';
import {deepFreeze, exact} from './dataset-demo-contracts.mjs';
import {isReviewed9037Provider} from './dataset-9037-offline-provider.mjs';
import {validateAggregateRows} from './dataset-aggregate-validation.mjs';
import {DatasetRouter} from './dataset-router.mjs';
import {createLocalDatasetIntegration} from './dataset-local-integration.mjs';
import {LOCAL_COMPANY_GET_ROUTES} from './dataset-local-api.mjs';

const bindings = new WeakMap();
export const is9037CompanyAnalytics = (analytics, provider) => bindings.get(analytics) === provider && isReviewed9037Provider(provider);
const must = (condition, message) => {if (!condition) throw Error(message);};

/** expectedAggregateDigest must come from the separate reviewed capture handoff,
 * never from a digest embedded in the same untrusted input. Root is the exact
 * 62-query-name -> ordered rows map, with no executable queries or metadata.
 */
export async function create9037CompanyAnalytics({aggregateBytes, expectedAggregateDigest, provider, jointBytes=null}) {
  must(isReviewed9037Provider(provider), 'Reviewed 9037 provider required');
  must(aggregateBytes instanceof Uint8Array && aggregateBytes.byteLength > 0 && aggregateBytes.byteLength <= 16 * 1024 * 1024 &&
    typeof expectedAggregateDigest === 'string' && /^[a-f0-9]{64}$/.test(expectedAggregateDigest), 'Bounded capture bytes and reviewed pin required');
  const bytes = Buffer.from(aggregateBytes);
  must(createHash('sha256').update(bytes).digest('hex') === expectedAggregateDigest, '9037 capture digest mismatch');
  const rows = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
  must(exact(rows, Object.keys(ANALYTICS_QUERIES)), 'Complete 62-query capture required');
  const components = Object.fromEntries(await Promise.all(DATASET_COMPONENTS.map(async name =>
    [name, await provider.componentAdapters[name].read(provider.client, {org:'all'}, provider.components[name])])));
  validateAggregateRows(rows, components, {provider});
  deepFreeze(rows);
  const joint=jointBytes===null?null:await create9037JointDashboard({jointBytes,provider,rows});
  const analytics = Object.freeze({datasetId:provider.datasetId, bundleDigest:provider.digest,
    captureDigest:expectedAggregateDigest, scope:joint?'company-get-and-dashboard-filters':'company-get-only',
    ...(joint?{dashboardAggregateDigest:joint.digest,dashboardMetricContract:joint.metricContract,dashboardResponse:joint.dashboardResponse,turnoverHistory:joint.turnoverHistory}:{}),
    async read(name, params=[]) {
      if(name==='dashboard'&&joint)return joint.read(params);
      must(Object.hasOwn(rows, name) && Array.isArray(params) && (name==='dashboard' ? params.length===3 && params.every(v=>v===null) : params.length===0), 'Uncaptured analytics scope');
      return deepFreeze(structuredClone(rows[name]));
    }});
  bindings.set(analytics, provider);
  try {
    const id=provider.datasetId;
    const router=new DatasetRouter({[id]:provider},{read:async()=>({datasetId:id,digest:provider.digest,generation:1})});
    const integration=createLocalDatasetIntegration({router,candidateDatasetId:id,candidateProvider:provider,analytics});
    for (const route of LOCAL_COMPANY_GET_ROUTES) {
      const response=await integration.handle(new Request('http://local.invalid'+route,{headers:{'x-workforce-dataset':id+':1'}}));
      must(response.ok, '9037 presenter preflight failed: '+route);
    }
  } catch (error) {bindings.delete(analytics);throw error;}
  return analytics;
}
