/** LOCAL review composition, deliberately absent from production route imports.
 * These labeled envelopes are not legacy UI response contracts. Unsupported
 * v2 operations fail before legacy SQL/model code. Presenters need review before
 * any production binding; all current app handlers continue to use v1.
 */
import {DATASET_COMPONENTS, DatasetReleaseDispatcher} from './dataset-composition.mjs';
import {DATASET_ROUTES} from './dataset-identity.mjs';
import {deepFreeze, exact, validateDemoBundle, validateDemoRequest} from './dataset-demo-contracts.mjs';
import {createLocalApiPresenter} from './dataset-local-api.mjs';
import {createConversationAdapters} from './dataset-conversation-adapters.mjs';
import {createCandidateConversationInputs} from './dataset-conversation-inputs.mjs';

const supported = {
  '/api/workforce': ['workforce'],
  '/api/dashboard': ['workforce', 'ratings'],
  '/api/compensation-job-release': ['compensation'],
  '/api/career-growth-mobility': ['career'],
  '/api/skills': ['skills'],
  '/api/survey-sentiment': ['survey'],
  '/api/workforce-planning': ['planning'],
  '/api/succession-coverage': ['succession'],
};
export const LOCAL_ROUTE_POLICY = deepFreeze(Object.fromEntries(DATASET_ROUTES.map(path => [path,
  supported[path] ? {kind: 'sealed-review', components: supported[path]} : {kind: 'unavailable'},
])));
const argsFor = request => ({method: request.method, url: request.url, hasBody: request.body !== null});

export function createLocalDatasetIntegration({router, candidateDatasetId, retainedHandlers = {}, analytics = null, modelPorts = {}, conversationFeatures = {}, conversationTimeoutMs = 90000, now}) {
  if (candidateDatasetId !== 'workforce-demo-9847-2026-09-30-local-final-v1' || Object.hasOwn(retainedHandlers, candidateDatasetId) || Object.values(retainedHandlers).some(f => typeof f !== 'function')) throw Error('Explicit local integration registry required');
  const retained = Object.freeze({...retainedHandlers});
  const releases = new DatasetReleaseDispatcher(router);
  const api = analytics ? createLocalApiPresenter({router, analytics, releases}) : null;
  const conversationInputs = api ? createCandidateConversationInputs({api,metadata:identity}) : null;
  const conversations = api ? createConversationAdapters({api,inputs:conversationInputs,metadata:identity,modelPorts,features:conversationFeatures,timeoutMs:conversationTimeoutMs,now}) : null;
  function identity() {
    const bound = router.current();
    return {datasetToken: bound.token, datasetId: bound.datasetId, bundleDigest: bound.digest};
  }
  function candidate() {
    if (router.current().datasetId !== candidateDatasetId) throw Error('Sealed demo binding required');
  }
  async function bundle() {
    candidate();
    const request = {method: 'GET', url: 'http://local.invalid/', hasBody: false};
    const parts = Object.fromEntries(await Promise.all(DATASET_COMPONENTS.map(async name => [name, await releases.read(name, request)])));
    validateDemoBundle(parts);
    return deepFreeze({...identity(), dataClass: 'constructed-synthetic', publicationApproved: false, components: parts});
  }
  return Object.freeze({
    readComponent: (name, args) => {candidate(); return releases.read(name, args);},
    bundle,
    homeGrounding: (filters,selectionGoal,session) => {candidate(); if(!api)throw Error('Local analytics required'); return api.groundHome(filters,selectionGoal,session);},
    projectionInputs: () => {candidate(); if(!api)throw Error('Local analytics required'); return api.projectionInputs();},
    conversationProjectionInputs: (filters,signal) => {candidate(); if(!conversationInputs)throw Error('Local analytics required');return conversationInputs.projection(filters,signal);},
    intakeInputs: input => {candidate(); if(!api)throw Error('Local analytics required'); return api.intakeInputs(input);},
    async handle(request) {
      return router.request(request, async () => {
        const {datasetId} = router.current(), path = new URL(request.url).pathname;
        if (!Object.hasOwn(LOCAL_ROUTE_POLICY, path)) return Response.json({error: 'Unknown workforce endpoint.'}, {status: 404});
        if (Object.hasOwn(retained, datasetId)) return retained[datasetId](request);
        if (datasetId === candidateDatasetId && conversations?.supports(path)) return conversations.handle(request);
        if (datasetId === candidateDatasetId && api?.supports(path)) return api.handle(request);
        const policy = LOCAL_ROUTE_POLICY[path];
        if (datasetId !== candidateDatasetId || policy.kind !== 'sealed-review') return Response.json({...identity(), status: 'unavailable', error: 'This operation has no sealed dataset contract.'}, {status: 503});
        const args = argsFor(request);
        // Validate every constituent scope before any component read.
        if (policy.components.some(name => !validateDemoRequest(name, args, router.current().provider.components[name]))) return Response.json({...identity(), error: 'Unsupported release scope or method.'}, {status: 400});
        try {
          const components = Object.fromEntries(await Promise.all(policy.components.map(async name => [name, await releases.read(name, args)])));
          return Response.json({...identity(), contract: 'local-sealed-review-v1', dataClass: 'constructed-synthetic', publicationApproved: false, components});
        } catch {
          // Never expose a transport exception or substitute a legacy value.
          return Response.json({...identity(), status: 'unavailable', error: 'Sealed release verification failed.'}, {status: 503});
        }
      });
    },
    /** Test-injected AI port only. Build evidence on the server from all eight
     * verified components; callers cannot supply/rename old evidence. Authored
     * goal text is explicitly non-evidence. No model selection or fitting here.
     */
    async runAI(input, transport) {
      candidate();
      if (!exact(input, ['question', 'authoredGoal', 'datasetToken']) || typeof input.question !== 'string' || !input.question.trim() || input.question.length > 8000 || typeof input.authoredGoal !== 'string' || input.authoredGoal.length > 8000 || input.datasetToken !== router.assertAIContext() || typeof transport !== 'function') throw Error('Current dataset AI context required');
      const {question, authoredGoal} = input;
      const before = router.assertAIContext();
      const evidence = await bundle();
      if (router.assertAIContext() !== before) throw Error('Mixed AI context');
      const result = await transport(deepFreeze({question, authoredGoal: {text: authoredGoal, evidence: false}, evidence}));
      if (router.assertAIContext() !== before) throw Error('Mixed AI context');
      return deepFreeze({...identity(), result, evidence});
    },
  });
}
