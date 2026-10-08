import {providerReceiptOutput} from './preview-receipt-log.mjs';
/** Finite manually supervised Preview batch. Importing this module makes no calls. */
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {CHAT_MODEL} from '../../lib/chat-model.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {solutionConversationInstructions, solutionTools, solutionResponseFormat} from '../../lib/home-solution-conversation-schema.ts';
import {emptySolutionState, readSolutionState, saveSolutionCandidate} from '../../lib/home-solution-conversation.ts';
import {associatePlanProposal, packPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
import {reviewBundleProposal} from '../../lib/home-bundle-reconciliation.ts';
import {DecisionStore} from '../../lib/local-decisions.ts';
import {fictionalProvenance, fictionalScenarios, fictionalRequest, fictionalProjection, fictionalEvidence} from '../fixtures/fictional-solution-evaluation.mjs';

export const checkpoint = Object.freeze({head: '5f106d43c0bfeb7ab0bfec4587015d3870dbb512', tree: '5e988b9942d2c590b7208260cd490350b68bf1aa'});
export const batchDefinitions = Object.freeze({
  'context-five': Object.freeze(['goal-select-refine', 'blend-replace', 'headcount-followup', 'same-people-correction', 'constraint-recovery']),
});
export const limits = Object.freeze({roundsPerTurn: 4, toolsPerTurn: 6, inputTokens: 100000, outputTokens: 5000, payloadBytes: 160000, countAllowanceMicrousd: 50000, generationMicrousd: 31000, pairMicrousd: 81000, requestsPerMinute: 6, callTimeoutMs: 30000, turnTimeoutMs: 360000, batchTimeoutMs: 1800000, trancheCapMicrousd: 4860000, totalCapMicrousd: 50000000});
export const apiBase = 'https://api.openai.com/v1';
export const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
function stop(code) { const error = new Error('Acceptance batch stopped.'); error.code = code; throw error; }
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const safeId = value => typeof value === 'string' && /^(?:req_|prj_|dpl_)[A-Za-z0-9_-]{1,100}$/.test(value) ? value : null;
const safeWord = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,60}$/.test(value) && !/^(?:sk_|github_pat_|gh[pousr]_)/.test(value) ? value : null;
export function safeFailure(error) { return {status: Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? error.status : null, category: safeWord(error?.constructor?.name), code: safeWord(error?.code ?? error?.error?.code), type: safeWord(error?.type ?? error?.error?.type), requestId: safeId(error?.request_id)}; }
export function safeText(value, max = 1200) {
  const original = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  // Receipt text may contain model-generated terminal controls; strip them deliberately.
  const cleaned = original.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '').replace(/(?:sk-[A-Za-z0-9_-]{8,}|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+|Bearer\s+\S+)/gi, '[REDACTED]');
  return {text: cleaned.slice(0, max), truncated: cleaned.length > max, redacted: cleaned !== original, sha256: sha256(original)};
}
export function batchPlan(name) {
  const ids = batchDefinitions[name]; if (!ids) stop('unknown_batch');
  const sequences = ids.map(id => fictionalScenarios.find(s => s.id === id));
  if (sequences.some(s => !s || s.turns.length !== 3)) stop('fixture_shape_changed');
  const turns = sequences.length * 3, rounds = turns * 4;
  return {name, sequenceIds: [...ids], turns, countCalls: rounds, generationCalls: rounds, maxProviderCalls: rounds * 2, maxGenerationInputTokens: rounds * 100000, maxOutputTokens: rounds * 5000, reservedMicrousd: rounds * 81000};
}
export function sourceManifest(root) {
  const files = ['preview-context.config.json', 'package.json', 'package-lock.json', 'tests/helpers/solution-preview-acceptance.mjs', 'tests/helpers/preview-receipt-log.mjs', 'tests/manual/solution-preview-acceptance.mjs', 'tests/fixtures/fictional-solution-evaluation.mjs'];
  function visit(dir) { for (const entry of readdirSync(join(root, dir), {withFileTypes: true})) { const path = dir + '/' + entry.name; if (entry.isDirectory()) visit(path); else if (/\.(?:ts|mjs)$/.test(path)) files.push(path); } }
  visit('lib'); return Object.fromEntries(files.sort().map(path => [path, sha256(readFileSync(join(root, path)))]));
}
export function unarmedManifest(root, batch = 'context-five') {
  return {version: 1, checkpoint, runId: null, reservationId: null, parentReserved: false, plan: batchPlan(batch), trancheAuthorization: 'parent-approved-context-five-2026-10-08', priorTrancheMicrousd: 0, priorTotalMicrousd: 1956960, pricingBasis: 'approved-envelope-input-0.25-output-1.20-per-million', projectId: null, createdAt: null, expiresAt: null, files: sourceManifest(root)};
}
export function validateManifest(manifest, env, now = Date.now()) {
  const plan = batchPlan(manifest?.plan?.name);
  if (manifest.version !== 1 || sha256(manifest.plan) !== sha256(plan) || manifest.parentReserved !== true || !uuid(manifest.runId) || !uuid(manifest.reservationId) || sha256(manifest.checkpoint) !== sha256(checkpoint)) stop('invalid_reservation');
  const a = manifest.priorTrancheMicrousd, b = manifest.priorTotalMicrousd;
  if (manifest.trancheAuthorization !== 'parent-approved-context-five-2026-10-08' || a !== 0 || !Number.isSafeInteger(b) || b !== 1956960 || a + plan.reservedMicrousd > 4860000 || b + plan.reservedMicrousd > 50000000) stop('budget_exhausted');
  if (manifest.pricingBasis !== 'approved-envelope-input-0.25-output-1.20-per-million') stop('pricing_basis_changed');
  const start = Date.parse(manifest.createdAt), expiry = Date.parse(manifest.expiresAt);
  if (!Number.isFinite(start) || !Number.isFinite(expiry) || start > now || expiry <= now || expiry - start > 3600000) stop('reservation_expired');
  if (env.VERCEL !== '1' || env.VERCEL_ENV !== 'preview' || !safeId(env.VERCEL_DEPLOYMENT_ID)?.startsWith('dpl_') || !safeId(manifest.projectId)?.startsWith('prj_') || env.VERCEL_PROJECT_ID !== manifest.projectId || env.SOLUTION_ACCEPTANCE_RUN_ID !== manifest.runId) stop('wrong_preview');
  if (env.OPENAI_BASE_URL || env.OPENAI_ORG_ID || env.OPENAI_PROJECT_ID || env.OPENAI_LOG) stop('client_override');
  return plan;
}

/** Parent owns the complete reservation. This limiter bounds this one invocation. */
export function createPacer({now = Date.now, sleep = ms => pause(ms)} = {}) {
  const starts = [];
  return async signal => {
    signal.throwIfAborted();
    while (starts.filter(t => now() - t < 60000).length >= 6) {
      const oldest = starts.find(t => now() - t < 60000);
      await sleep(Math.min(1000, Math.max(1, 60001 - (now() - oldest)))); signal.throwIfAborted();
    }
    signal.throwIfAborted(); starts.push(now());
  };
}
export async function selectFictionalCandidate(request, reply) {
  if (request.goal.id || request.catalog) stop('selection_was_not_unpinned');
  const item = reply.state.working.findLast(row => reply.candidateIds.includes(row.id) && row.requestId === request.requestId);
  if (!item) stop('selection_candidate_missing');
  const desired = {id: 'selected-fictional-turnover', statement: item.candidate.goal.statement};
  const saved = await saveSolutionCandidate({...request, state: reply.state}, null, item, desired, fictionalEvidence(), true);
  if (saved.status !== 'ready') stop('selection_not_ready');
  const catalog = associatePlanProposal(saved.catalog, saved.catalog, saved.plan.id, {inputKey: saved.plan.result.inputKey, attachmentId: saved.plan.requestId, at: fictionalProvenance.syntheticClock, acknowledgeUnknowns: true});
  let state = structuredClone(reply.state);
  for (const proposal of state.working) {
    proposal.binding = {...proposal.binding, goalId: desired.id, goal: desired.statement};
    if (proposal.draft) { proposal.draft.binding = proposal.binding; if (proposal.draft.inputs.successMeasure) proposal.draft.inputs.successMeasure.goal = desired.statement; proposal.result = reviewBundleProposal(proposal.draft); }
  }
  state = readSolutionState(state);
  const values = new Map(), store = new DecisionStore();
  store.initialize({getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)});
  store.commitGoalSelection(desired.id, desired.statement, store.getSnapshot().data.revision, fictionalProvenance.syntheticClock, () => ({homePlanAlternativesV1: packPlanAlternatives(catalog), homeSolutionConversationV1: state}));
  const passed = store.getSnapshot().data.goals.activeId === desired.id && catalog.attachments.at(-1)?.purpose === 'proposal-selection' && !saved.plan.applied;
  if (!passed) stop('selection_contract_failed');
  return {goal: desired, catalog, state, receipt: {passed, mode: 'in_memory_product_helper_simulation', browserPersistenceVerified: false, goal: safeText(desired.statement), selectedPlanId: saved.plan.id}};
}
function turnSummary(request, reply, checks, selection, toolReceipts) {
  const candidates = reply.state.working.filter(row => reply.candidateIds.includes(row.id) && row.requestId === request.requestId);
  const analyses = [...new Map(reply.state.analyses.map(row => [row.id, row])).values()].filter(row => reply.analysisIds.includes(row.id));
  return {requestId: request.requestId, inputSha256: sha256(request), outputSha256: sha256(reply), question: safeText(request.message.text), answer: safeText(reply.answer, 6000), modelRounds: reply.usage.modelRounds, toolCalls: reply.usage.toolCalls, checks, selection, toolReceipts, constraints: safeText(reply.state.constraints, 3000), questions: safeText(reply.state.questions, 3000), verifiedMetrics: safeText(reply.state.verifiedMetrics, 3000),
    candidates: candidates.map(row => ({id: safeText(row.id, 100), revision: row.revision, name: safeText(row.candidate.name), goal: safeText(row.candidate.goal), objective: safeText(row.candidate.objective), nextStep: safeText(row.candidate.nextStep), successMeasure: safeText(row.candidate.successMeasure), effectiveTiming: safeText(row.draft?.inputs.timing, 4000), effectiveScope: safeText(row.draft?.inputs.scope, 4000), approach: safeText(row.candidate.approach), rationale: safeText(row.candidate.rationale), tradeoffs: safeText(row.candidate.tradeoffs), activities: safeText(row.candidate.activities, 6000), interpretedQuantities: safeText(row.candidate.quantities, 4000), verifiedCalculation: safeText({uniqueParticipants: row.result?.uniqueParticipants, cashEstimate: row.result?.cashEstimate, status: row.result?.calculationStatus, blocking: row.blocking}, 3000)})),
    analyses: analyses.map(row => ({id: safeText(row.id, 100), revision: row.revision, method: row.spec.method, assumptions: safeText(row.assumptions, 3000), interpretations: safeText(row.interpretations, 3000), limitations: safeText(row.limitations, 3000), scope: safeText(row.inputs.scope), opening: row.inputs.opening, points: row.points, displayedFlowTolerance: row.spec.method === 'configured_scenario' ? 0.2 : 1e-8})), semanticReview: 'pending', browserPersistenceVerified: false};
}

export function deadlineChecks(request, reply, toolReceipts) {
 const original=request.catalog.plans.find(p=>p.id==='A').draft;
 const items=reply.state.working.filter(row=>reply.candidateIds.includes(row.id)&&row.requestId===request.requestId);
 const item=items.length===1?items[0]:null;
 const expected=structuredClone(original.inputs);
 if(item?.draft) expected.timing.find(row=>row.componentId==='c1').finish=structuredClone(item.draft.inputs.timing.find(row=>row.componentId==='c1')?.finish);
 const q=item?.candidate.quantities;
 return {
  parameterOperation:toolReceipts.some(row=>row.name==='revise_parameters')&&!toolReceipts.some(row=>row.name==='evaluate_candidate'),
  exactSource:item?.candidate.base?.kind==='saved'&&item.candidate.base.id==='A'&&item.candidate.base.revision===original.revision,
  deadlineOnly:q?.length===1&&q[0].field==='activity_finish'&&q[0].target==='c1'&&q[0].turnId===request.message.id&&item?.draft?.inputs.timing.find(row=>row.componentId==='c1')?.finish.value==='2026-11-20',
  strategyPreserved:!!item?.draft&&sha256(item.draft.bundle)===sha256(original.bundle),
  unrelatedInputsPreserved:!!item?.draft&&sha256(item.draft.inputs)===sha256(expected),
  calculationValid:!!item?.result&&item.blocking.length===0&&item.result.deliveryEstimate?.hours===28&&item.result.cashEstimate?.cash===3000&&item.result.uniqueParticipants===10,
 };
}

export function remainingChecks(id,index,request,reply){
 let newest=reply.state.working.findLast(row=>reply.candidateIds.includes(row.id)&&row.requestId===request.requestId);
 const checks={};
 if(id==='blend-replace'&&index===2&&!newest&&reply.candidateIds.length===0){checks.priorWorkingPreserved=sha256(reply.state.working)===sha256(request.state.working);newest=request.state.working.findLast(row=>row.draft&&row.blocking.length===0);}
 if(['goal-select-refine','same-people-correction'].includes(id)||id==='blend-replace'&&index<2||id==='constraint-recovery'&&index<2){
  checks.reviewableCandidate=!!newest?.draft&&!!newest?.result&&newest.blocking.length===0;
 }
 if(id==='goal-select-refine'){
  checks.desiredGoalPreserved=!!newest?.candidate.goal.statement&&(index===0||newest.candidate.goal.statement===request.goal.statement);
  checks.unprovidedResourcesUnknown=!!newest?.draft&&newest.draft.inputs.timing.every(row=>row.start.value===null&&row.finish.value===null)&&newest.draft.inputs.expenses.every(row=>row.amount.value===null)&&newest.draft.inputs.groups.every(row=>row.count.value===null)&&(newest.result?.cashEstimate?.cash??null)===null&&(newest.result?.deliveryEstimate?.hours??null)===null;
 }
 if(id==='blend-replace'){
  const learning=request.catalog.plans.find(p=>p.id==='B').draft.bundle.components[0];
  const sameActivity=(a,b)=>['name','domain','firstStep','ownerRole','evidence','limitation'].every(key=>sha256(a[key])===sha256(b[key]));
  checks.learningRetained=!!newest?.draft?.bundle.components.some(c=>sameActivity(c,learning));
  checks.twoActivities=!!newest?.draft&&newest.draft.bundle.components.length===2;
  if(index===0){checks.actualSourceLineage=['A','B'].every(id=>newest?.sourceRefs.some(ref=>ref.id===id));checks.unprovenOverlapUnknown=newest?.result?.uniqueParticipants===null;}
 }
 if(id==='same-people-correction'){
  checks.sharedPeople=newest?.result?.uniqueParticipants===[10,5,8][index];
  const memberships=newest?.draft?.inputs.memberships??[];
  checks.bothActivitiesSameCohort=memberships.length===2&&memberships[0].groupIds.length===1&&sha256(memberships[0].groupIds)===sha256(memberships[1].groupIds);
 }
 if(id==='constraint-recovery'&&index===0)checks.correctedFeeWithinCap=newest?.result?.cashEstimate?.cash===2000&&newest?.draft?.inputs.budget?.amount.value===2500;
 if(id==='constraint-recovery'&&index===1)checks.capRemovedFeePreserved=newest?.draft?.inputs.budget?.amount.value===null&&newest?.result?.cashEstimate?.cash===2000;
 if(id==='headcount-followup'&&index<2){
  const analysis=reply.state.analyses.findLast(a=>reply.analysisIds.includes(a.id));
  checks.roundedProjectionReconciles=!!analysis&&analysis.points.every(p=>Math.abs(p.headcount-(p.opening+p.hires-p.exits+p.transfersIn-p.transfersOut))<=(analysis.spec.method==='configured_scenario'?0.2+1e-8:1e-8));
  checks.fictionalOpening=analysis?.inputs.opening===127;
  if(index===1){const base=analysis?.spec.base&&request.state.analyses.find(a=>a.id===analysis.spec.base.id&&a.revision===analysis.spec.base.revision);checks.exactPriorProjection=!!base;checks.halvedHiring=!!base&&analysis.assumptions.fill_rate_pct===base.assumptions.fill_rate_pct*0.5&&analysis.spec.changes.some(c=>c.field==='fill_rate_pct'&&c.basis==='user'&&c.turnId===request.message.id);checks.otherProjectionAssumptionsPreserved=!!base&&analysis.spec.months===base.spec.months&&sha256(analysis.assumptions)===sha256({...base.assumptions,fill_rate_pct:base.assumptions.fill_rate_pct*0.5});}
 }
 if(id==='headcount-followup'&&index===2)checks.scopedCompanyDefaultsRefused=reply.analysisIds.length===0;
 return checks;
}

export async function runAcceptance({manifest, env, client, claim, record, now = Date.now, sleep, signal: outerSignal = new AbortController().signal}) {
  const plan = validateManifest(manifest, env, now());
  if (client.baseURL !== apiBase || CHAT_MODEL !== 'gpt-5.6-luna') stop('model_endpoint_changed');
  claim(manifest.runId);
  const signal = AbortSignal.any([outerSignal, AbortSignal.timeout(limits.batchTimeoutMs)]), pace = createPacer({now, sleep});
  const pending = plan.sequenceIds.flatMap(id => [1, 2, 3].map(n => id + '-' + n));
  const report = {kind: 'fictional-preview-acceptance-v1', runId: manifest.runId, reservationId: manifest.reservationId, deploymentId: env.VERCEL_DEPLOYMENT_ID, checkpoint, plan, sourceManifestSha256: sha256(manifest.files), fixtureSha256: sha256({fictionalProvenance, fictionalScenarios, projection: fictionalProjection()}), fixtureOnly: true, model: CHAT_MODEL, limits, reservedMicrousd: plan.reservedMicrousd, cumulativeReservedMicrousd: manifest.priorTotalMicrousd + plan.reservedMicrousd, attemptedCountStages: 0, attemptedGenerationStages: 0, countedInputTokens: 0, generatedInputTokens: 0, generatedOutputTokens: 0, projectionReads: 0, completedTurns: [], pendingTurns: pending, turns: [], semanticReview: 'pending', browserPersistenceVerified: false, fullAcceptance: false};
  const emit = (stage, value) => record(stage, structuredClone(value));
  let currentTurn = null, stage = 'local', lastProviderOutput = null, toolRecordCount = 0;
  const serviceDiagnostic = error => ['service', 'service_checks'].includes(stage) ? {message: safeText(error?.message ?? '', 2000), frames: String(error?.stack ?? '').split('\n').slice(1).filter(line => /[\\/]lib[\\/]home-/.test(line)).slice(0, 8).map(line => safeText(line, 800))} : null;
  try {
    emit('start', report);
    for (const id of plan.sequenceIds) {
      const scenario = fictionalScenarios.find(s => s.id === id);
      let state = emptySolutionState(), goal, catalog;
      for (let index = 0; index < 3; index++) {
        signal.throwIfAborted(); currentTurn = id + '-' + (index + 1); stage = 'input'; lastProviderOutput = null;
        const request = await fictionalRequest(scenario, index, state, goal, catalog), before = sha256(request), savedBefore = sha256(request.catalog);
        if (/https?:\/\/|@[A-Za-z0-9.-]+\.|(?:ghp_|github_pat_|sk-proj-)/.test(JSON.stringify(request))) stop('unexpected_fixture_reference');
        emit('input-' + currentTurn, {currentTurn, fixtureOnly: true, request: safeText(request, 120000)});
        const turnSignal = AbortSignal.any([signal, AbortSignal.timeout(limits.turnTimeoutMs)]);
        let rounds = 0; const toolReceipts = new Map();
        const reply = await converseSolutions(request, {
          now: () => new Date(fictionalProvenance.syntheticClock),
          loadProjection: async filters => { report.projectionReads++; return fictionalProjection(filters); },
          complete: async (input, finalOnly, activeSignal) => {
            stage = 'payload';
            if (++rounds > 4 || report.attemptedCountStages >= plan.countCalls || report.attemptedGenerationStages >= plan.generationCalls) stop('call_limit');
            for (const item of input) if (item.type === 'function_call_output' && !toolReceipts.has(item.call_id)) {
              const output = JSON.parse(item.output), call = input.find(row => row.type === 'function_call' && row.call_id === item.call_id);
              toolReceipts.set(item.call_id, {name: safeWord(call?.name), outputSha256: sha256(output), ok: output.ok !== false, boundary: output.ok === false ? safeText(output.error, 2000) : null});
              emit('tool-result-' + (++toolRecordCount), {currentTurn, fixtureOnly: true, callId: safeText(item.call_id, 200), name: safeWord(call?.name), arguments: safeText(call?.arguments ?? '', 32000), result: safeText(item.output, 65000)});
            }
            const pair = report.attemptedCountStages + 1;
            const payload = {model: CHAT_MODEL, instructions: solutionConversationInstructions, input, tools: solutionTools, text: {format: solutionResponseFormat}, tool_choice: finalOnly ? 'none' : 'auto', parallel_tool_calls: false};
            if (Buffer.byteLength(JSON.stringify(payload)) > limits.payloadBytes) stop('payload_limit');
            const options = phase => ({maxRetries: 0, timeout: 30000, signal: activeSignal, headers: {'X-Client-Request-Id': manifest.runId + '-' + pair + '-' + phase}});
            await pace(activeSignal); activeSignal.throwIfAborted(); stage = 'count'; report.attemptedCountStages++;
            emit('before-count-' + pair, {runId: manifest.runId, deploymentId: env.VERCEL_DEPLOYMENT_ID, currentTurn, pair, payloadSha256: sha256(payload), pairReservationMicrousd: 81000, fullReservedMicrousd: plan.reservedMicrousd});
            activeSignal.throwIfAborted();
            const counted = await client.responses.inputTokens.count(payload, options('count')).withResponse();
            activeSignal.throwIfAborted();
            const tokens = counted.data?.input_tokens;
            if (counted.data?.object !== 'response.input_tokens' || !Number.isSafeInteger(tokens) || tokens < 0 || tokens > 100000) stop('input_token_limit');
            report.countedInputTokens += tokens;
            emit('count-' + pair, {currentTurn, pair, status: counted.response.status, requestId: safeId(counted.request_id), inputTokens: tokens});
            await pace(activeSignal); activeSignal.throwIfAborted(); stage = 'generation'; report.attemptedGenerationStages++;
            emit('before-generation-' + pair, {currentTurn, pair, fullReservedMicrousd: plan.reservedMicrousd});
            activeSignal.throwIfAborted();
            const generated = await client.responses.create({...payload, max_output_tokens: 5000, service_tier: 'default'}, options('generation')).withResponse();
            activeSignal.throwIfAborted();
            const response = generated.data, usage = response?.usage;
            if (!usage || !Number.isSafeInteger(usage.input_tokens) || !Number.isSafeInteger(usage.output_tokens) || usage.input_tokens < 0 || usage.output_tokens < 0 || usage.input_tokens > 100000 || usage.output_tokens > 5000) stop('usage_limit');
            report.generatedInputTokens += usage.input_tokens; report.generatedOutputTokens += usage.output_tokens;
            emit('generation-' + pair, {currentTurn, pair, status: generated.response.status, requestId: safeId(generated.request_id), inputTokens: usage.input_tokens, outputTokens: usage.output_tokens});
            if (response.service_tier !== 'default' || response.status !== 'completed' || !Array.isArray(response.output)) stop('incomplete_or_tier');
            lastProviderOutput = {sha256: sha256(response.output), text: safeText(response.output_text, 6000), calls: response.output.filter(item => item.type === 'function_call').slice(0, 6).map(item => ({name: safeWord(item.name), arguments: safeText(item.arguments, 2000)}))};
            emit('provider-output-' + pair, {currentTurn, pair, fixtureOnly: true, output: safeText(providerReceiptOutput(response.output), 70000), omittedProviderInternals: true, text: safeText(response.output_text, 20000)});
            activeSignal.throwIfAborted();
            stage = 'service';
            return {completed: true, items: response.output, calls: response.output.filter(item => item.type === 'function_call').map(item => ({id: item.call_id, name: item.name, arguments: item.arguments})), text: response.output_text};
          },
        }, turnSignal);
        stage = 'service_checks';
        const checks = {inputPreserved: sha256(request) === before, savedPlansPreserved: sha256(request.catalog) === savedBefore, historyCarried: reply.state.turns.length === (index + 1) * 2};
        state = reply.state; goal = request.goal; catalog = request.catalog;
        let selection = null;
        if (scenario.selectAfterTurn === index + 1) { const selected = await selectFictionalCandidate(request, reply); ({state, goal, catalog} = selected); selection = selected.receipt; checks.intentionalSelection = true; }
        if(id==='clock-deadline'&&index===2)Object.assign(checks,deadlineChecks(request,reply,[...toolReceipts.values()]));
        Object.assign(checks,remainingChecks(id,index,request,reply));
        const summary = turnSummary(request, reply, checks, selection, [...toolReceipts.values()]); emit('turn-' + currentTurn, summary); report.turns.push(summary);
        if (Object.values(checks).some(pass => !pass)) stop('mechanical_check_failed');
        report.completedTurns.push(currentTurn); report.pendingTurns = report.pendingTurns.filter(turn => turn !== currentTurn);
      }
    }
  } catch (error) { report.failure = {currentTurn, stage, ...safeFailure(error), serviceDiagnostic: serviceDiagnostic(error), lastProviderOutput}; }
  report.executionComplete = report.pendingTurns.length === 0 && !report.failure;
  emit('result', {...report, turns: report.turns.map(turn => ({requestId: turn.requestId, outputSha256: turn.outputSha256, checks: turn.checks}))});
  return report;
}
