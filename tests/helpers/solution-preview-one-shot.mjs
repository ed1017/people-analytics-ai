/** Manual, parent-supervised transport probe. Importing this module makes no calls. */
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {emptySolutionState, readSolutionRequest} from '../../lib/home-solution-conversation.ts';
import {solutionConversationInstructions, solutionTools, solutionResponseFormat} from '../../lib/home-solution-conversation-schema.ts';
import {normalizeHomePack} from '../../lib/home-pack.mjs';
import {CHAT_MODEL} from '../../lib/chat-model.ts';

export const oneShotLimits = Object.freeze({countCalls: 1, generationCalls: 1, inputTokens: 100000, outputTokens: 5000, countAllowanceMicrousd: 50000, generationReservationMicrousd: 31000, reservationMicrousd: 81000, initialCapMicrousd: 4500000, totalCapMicrousd: 50000000});
export const checkpoint = Object.freeze({head: '256a4a9569c0a8ae52c2331ba5a71b4ccfb0225e', tree: 'bf40c71febd5624d0633a131a9c40f45e93746b2'});
export const apiBase = 'https://api.openai.com/v1';
export const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const safeId = value => typeof value === 'string' && /^(?:req_|dpl_|prj_)[A-Za-z0-9_-]{1,100}$/.test(value) ? value : null;
const safeWord = value => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(value) && !/^(?:sk_|github_pat_|gh[pousr]_)/.test(value) ? value : null;
const status = value => Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
export function safeFailure(error) {
  return {status: status(error?.status), category: safeWord(error?.constructor?.name), code: safeWord(error?.code ?? error?.error?.code), type: safeWord(error?.type ?? error?.error?.type), requestId: safeId(error?.request_id)};
}
function stop(code) { const error = new Error('One-shot stopped.'); error.code = code; throw error; }

// Entirely new literals. No caller-supplied context, files, saved plans or history.
export function oneShotFixture() {
  return readSolutionRequest({version: 1, requestId: 'fictional-blocks-probe-v1', goal: {id: '', statement: ''}, scope: 'Wholly fictional workshop Finch', filters: {country: 'all', org: 'all', level: 'all'}, timeZone: 'UTC', evidence: normalizeHomePack({workforceScope: 'Wholly fictional workshop Finch', sources: []}), goalContext: null, selectedId: null, catalog: null, state: emptySolutionState(), message: {id: 'fictional-blocks-question', text: 'In a wholly fictional workshop, a box contains two blue blocks and one red block. State the total number of blocks in a short answer. Do not create a plan.'}});
}
export function oneShotProjection(filters) {
  return {asOf: '2026-11-01', opening: 3, filters: structuredClone(filters), scope: 'Wholly fictional workshop Finch', relations: ['new_fictional_probe_literal'], datasetVersion: null, defaults: null, baseline: []};
}

/** A review manifest, not authorization or a globally consumed permit. */
export function sourceManifest(root) {
  const files = ['package.json', 'package-lock.json', 'tests/helpers/solution-preview-one-shot.mjs', 'tests/manual/solution-preview-one-shot.mjs'];
  function visit(relative) { for (const item of readdirSync(join(root, relative), {withFileTypes: true})) { const path = relative + '/' + item.name; if (item.isDirectory()) visit(path); else if (/\.(?:ts|mjs)$/.test(path)) files.push(path); } }
  visit('lib');
  return Object.fromEntries(files.sort().map(path => [path, sha256(readFileSync(join(root, path)))]));
}
export function unarmedManifest(root) {
  return {version: 1, runId: null, reservationId: null, parentReserved: false, reservedMicrousd: 81000, priorInitialMicrousd: 174960, priorTotalMicrousd: 174960, pricingBasis: 'approved-envelope-input-0.25-output-1.20-per-million', checkpoint, projectId: null, createdAt: null, expiresAt: null, files: sourceManifest(root)};
}
export function validateReservation(manifest, env, now = Date.now()) {
  if (manifest?.version !== 1 || !uuid(manifest.runId) || !uuid(manifest.reservationId) || manifest.parentReserved !== true || manifest.reservedMicrousd !== 81000 || manifest.checkpoint?.head !== checkpoint.head || manifest.checkpoint?.tree !== checkpoint.tree) stop('invalid_reservation');
  const prior = [manifest.priorInitialMicrousd, manifest.priorTotalMicrousd];
  if (!prior.every(n => Number.isSafeInteger(n) && n >= 174960) || prior[0] > prior[1] || prior[0] + 81000 > 4500000 || prior[1] + 81000 > 50000000) stop('budget_exhausted');
  if (manifest.pricingBasis !== 'approved-envelope-input-0.25-output-1.20-per-million') stop('pricing_basis_changed');
  const created = Date.parse(manifest.createdAt), expires = Date.parse(manifest.expiresAt);
  if (!Number.isFinite(created) || !Number.isFinite(expires) || created > now || expires <= now || expires - created > 3600000) stop('reservation_expired');
  if (env.VERCEL !== '1' || env.VERCEL_ENV !== 'preview' || !safeId(env.VERCEL_DEPLOYMENT_ID)?.startsWith('dpl_') || !safeId(manifest.projectId)?.startsWith('prj_') || env.VERCEL_PROJECT_ID !== manifest.projectId || env.SOLUTION_PREVIEW_RUN_ID !== manifest.runId) stop('wrong_preview_identity');
  if (env.OPENAI_BASE_URL || env.OPENAI_ORG_ID || env.OPENAI_PROJECT_ID || env.OPENAI_LOG) stop('unexpected_client_override');
}

/** One invocation; parent reserves once and controls deployment/redeployment.
 * claim() persists a local used marker; it is NOT a cross-build global lock.
 */
export async function runPreviewOneShot({manifest, env, client, claim, record, now = Date.now()}) {
  validateReservation(manifest, env, now);
  if (client.baseURL !== apiBase || CHAT_MODEL !== 'gpt-5.6-luna') stop('unexpected_model_endpoint');
  claim(manifest.runId); // must complete before any API request
  const receipt = {kind: 'fictional-preview-one-shot-v1', runId: manifest.runId, reservationId: manifest.reservationId, deploymentId: env.VERCEL_DEPLOYMENT_ID, projectId: manifest.projectId, checkpoint, sourceManifestSha256: sha256(manifest.files), fixtureSha256: sha256(oneShotFixture()), fixtureOnly: true, model: CHAT_MODEL, apiBase, countCalls: 0, generationCalls: 0, projectionReads: 0, toolExecutions: 0, serviceValidated: false, providerGenerationReturned: false, fullConversationAcceptance: false, reservedMicrousd: 81000, cumulativeReservedMicrousd: manifest.priorTotalMicrousd + 81000, stages: [], stopped: true};
  const emit = stage => record(stage, structuredClone(receipt));
  const signal = AbortSignal.timeout(70000);
  let stage = 'local';
  try {
    emit('claimed');
    const reply = await converseSolutions(oneShotFixture(), {
      now: () => new Date('2026-11-01T15:24:00.000Z'),
      loadProjection: async filters => { receipt.projectionReads++; return oneShotProjection(filters); },
      complete: async input => {
        if (receipt.countCalls || receipt.generationCalls) stop('continuation_forbidden');
        const payload = {model: CHAT_MODEL, instructions: solutionConversationInstructions, input, tools: solutionTools, text: {format: solutionResponseFormat}, tool_choice: 'none', parallel_tool_calls: false};
        if (Buffer.byteLength(JSON.stringify(payload)) > 90000) stop('payload_too_large');
        receipt.payloadSha256 = sha256(payload);
        stage = 'count'; receipt.countCalls++; emit('before_count');
        const counted = await client.responses.inputTokens.count(payload, {maxRetries: 0, timeout: 30000, signal, headers: {'X-Client-Request-Id': manifest.runId + '-count'}}).withResponse();
        receipt.stages.push({stage, status: status(counted.response?.status), requestId: safeId(counted.request_id)});
        const tokens = counted.data?.input_tokens;
        if (counted.data?.object !== 'response.input_tokens' || !Number.isSafeInteger(tokens) || tokens < 0 || tokens > 100000) stop('input_token_limit');
        receipt.inputTokenCount = tokens;
        stage = 'generation'; receipt.generationCalls++; emit('before_generation');
        const generated = await client.responses.create({...payload, max_output_tokens: 5000, service_tier: 'default'}, {maxRetries: 0, timeout: 30000, signal, headers: {'X-Client-Request-Id': manifest.runId + '-generation'}}).withResponse();
        receipt.providerGenerationReturned = true;
        receipt.stages.push({stage, status: status(generated.response?.status), requestId: safeId(generated.request_id)});
        const response = generated.data, usage = response?.usage;
        if (!usage || !Number.isSafeInteger(usage.input_tokens) || !Number.isSafeInteger(usage.output_tokens) || usage.input_tokens < 0 || usage.output_tokens < 0 || usage.input_tokens > 100000 || usage.output_tokens > 5000) stop('usage_outside_envelope');
        receipt.usage = {inputTokens: usage.input_tokens, outputTokens: usage.output_tokens};
        if (response.service_tier !== 'default' || response.status !== 'completed' || !Array.isArray(response.output)) stop('incomplete_or_unexpected_tier');
        // Do not return function calls to the service: no tool execution or continuation.
        if (response.output.some(item => item.type === 'function_call')) stop('tool_call_forbidden');
        return {completed: true, items: response.output, calls: [], text: response.output_text};
      },
    }, signal);
    receipt.serviceValidated = true;
    receipt.answerSha256 = sha256(reply.answer);
  } catch (error) { receipt.failure = {stage, ...safeFailure(error)}; }
  emit('result');
  return receipt;
}
