/** Local proposals and replay only. No writes, saved-evidence IDs, approvals or implicit adoption. */
// @ts-expect-error Native Node tests share TypeScript source.
import {resolveHomeMixContext, type HomeMixRequest, type ReadyHomeMixContext} from './home-mix-context.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {searchHomeMixes, type HomeMixReport} from './home-mix-search.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {canonical, freeze} from './workforce-mix-search-core.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {reviseBundleDraft, unknownAssumption, type BundleDraft} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';

/** Fingerprints are content identity, not authentication. Recalculate before using an untrusted report. */
export async function readHomeMixReport(raw: unknown, context: ReadyHomeMixContext, signal?: AbortSignal): Promise<HomeMixReport | null> {
  signal?.throwIfAborted();
  try {
    if (!validateJson(raw) || JSON.stringify(raw).length > 2 * 1024 * 1024) return null;
    const current = await resolveHomeMixContext(context.source.request);
    if (current.status !== 'ready' || canonical(current) !== canonical(context)) return null;
    const replay = await searchHomeMixes(current, signal);
    return canonical(raw) === canonical(replay) ? replay : null;
  } catch (error) { if (signal?.aborted) throw error; return null; }
}

export async function homeMixReportIsCurrent(request: HomeMixRequest, report: Pick<HomeMixReport, 'sourceFingerprint'>): Promise<boolean> {
  try {
    const context = await resolveHomeMixContext(request);
    return context.status === 'ready' && context.sourceFingerprint === report.sourceFingerprint;
  } catch { return false; }
}

export type HomeMixProposal = {
  kind: 'home-assumption-mix-proposal'; schemaVersion: 1 | 2; status: 'proposed';
  sourceFingerprint: string; reportFingerprint: string; candidateId: string;
  baseInputKey: string; baseRevision: number; draft: BundleDraft;
  costReviewComponents: string[]; removedFlows: string[];
};
function proposalFromReport(context: ReadyHomeMixContext, report: HomeMixReport, candidateId: string, schemaVersion: 1 | 2 = 2): HomeMixProposal {
  if (schemaVersion !== 1 && schemaVersion !== 2) throw Error('Unsupported Home proposal version.');
  const candidate = report.results.find(item => item.id === candidateId);
  if (!candidate || candidate.status !== 'met' || candidate.cash.complete === null) throw Error('Choose an emitted, feasible Home assumption candidate from this exact report.');
  const before = context.source.draft, inputs = structuredClone(before.inputs), capacity = inputs.capacity!;
  const basis = `Home assumption ${candidateId}; source ${report.sourceFingerprint}; bounded ${report.methodVersion}.`;
  for (const path of ['build', 'move', 'buy'] as const) {
    capacity.input[path] = candidate.input[path];
    if (candidate.input[path] !== before.inputs.capacity!.input[path]) capacity.origins[path] = {kind: 'illustrative', basis};
  }
  const removed = capacity.flows.filter(flow => flow.path === 'backfills'
    ? candidate.mix.build + candidate.mix.move === 0 || Number(candidate.input.backfills) === 0 : candidate.mix[flow.path] === 0);
  capacity.flows = capacity.flows.filter(flow => !removed.includes(flow));
  // Keep unrelated expenses/component activities even when a staffing path becomes inactive.
  const changedCash = candidate.cash.ledger.filter(line => canonical(line.monthly) !== canonical(report.reference.cash.ledger.find(old => old.id === line.id)?.monthly));
  const changedComponents = [...new Set(changedCash.flatMap(line => line.componentIds))];
  // The bounded fictional scenario already assumes these unchanged cost sources
  // are exhaustive and distinct across its mixes. Keep that exact illustrative
  // premise, not a new factual approval. Ordinary reviewed costs still reopen.
  const retainScenarioPremise = schemaVersion === 2 && inputs.mixScenario?.basis.value === 'conditional-scenario'
    && inputs.mixScenario.basis.kind === 'illustrative' && inputs.costsDistinct.value === true && inputs.costsDistinct.kind === 'illustrative'
    && changedCash.every(line => line.id.startsWith('capacity:'))
    && changedComponents.every(id => inputs.costReviews.some(review => review.componentId === id && review.complete.value === true && review.complete.kind === 'illustrative'));
  const costReviewComponents = retainScenarioPremise ? [] : changedComponents;
  if (costReviewComponents.length) {
    inputs.costsDistinct = unknownAssumption();
    for (const review of inputs.costReviews) if (costReviewComponents.includes(review.componentId)) review.complete = unknownAssumption();
  }
  inputs.scope.comparisonConfirmed = unknownAssumption();
  return freeze({kind: 'home-assumption-mix-proposal', schemaVersion, status: 'proposed', sourceFingerprint: report.sourceFingerprint,
    reportFingerprint: report.reportFingerprint, candidateId, baseInputKey: context.source.binding.inputKey, baseRevision: context.source.binding.revision,
    draft: reviseBundleDraft(before, inputs), costReviewComponents, removedFlows: removed.map(flow => flow.path)});
}

/** Caller supplies the currently resolved context, not a context retained by an obsolete async job. */
export async function stageHomeMixCandidate(context: ReadyHomeMixContext, raw: unknown, candidateId: string, signal?: AbortSignal, schemaVersion: 1 | 2 = 2): Promise<HomeMixProposal> {
  const report = await readHomeMixReport(raw, context, signal);
  if (!report) throw Error('Home report is stale, altered or unsupported; resolve and evaluate the current assumptions.');
  signal?.throwIfAborted();
  return proposalFromReport(context, report, candidateId, schemaVersion);
}

export type HomeMixRecord = {
  kind: 'home-assumption-mix-record'; schemaVersion: 1; createdAt: string;
  request: HomeMixRequest; report: HomeMixReport; proposal: HomeMixProposal;
};
/** Prepare a single immutable payload for the caller's atomic local revision/report/snapshot commit. */
export async function createHomeMixRecord(context: ReadyHomeMixContext, report: HomeMixReport, candidateId: string, createdAt: string, signal?: AbortSignal, proposalVersion: 1 | 2 = 2): Promise<HomeMixRecord> {
  if (!/^\d{4}-\d\d-\d\dT/.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) throw Error('Supply an explicit record timestamp.');
  const proposal = await stageHomeMixCandidate(context, report, candidateId, signal, proposalVersion);
  return freeze({kind: 'home-assumption-mix-record', schemaVersion: 1, createdAt, request: structuredClone(context.source.request), report: structuredClone(report), proposal});
}

/** Historical replay uses the stored source, never today's draft or calculator policy. Unsupported versions remain unreadable. */
export async function readHomeMixRecord(raw: unknown, signal?: AbortSignal): Promise<HomeMixRecord | null> {
  signal?.throwIfAborted();
  try {
    if (!validateJson(raw) || JSON.stringify(raw).length > 2 * 1024 * 1024) return null;
    const record = raw as HomeMixRecord;
    if (record.kind !== 'home-assumption-mix-record' || record.schemaVersion !== 1) return null;
    const context = await resolveHomeMixContext(record.request);
    if (context.status !== 'ready') return null;
    const expected = await createHomeMixRecord(context, record.report, record.proposal.candidateId, record.createdAt, signal, record.proposal.schemaVersion);
    return canonical(expected) === canonical(record) ? freeze(structuredClone(record)) : null;
  } catch (error) { if (signal?.aborted) throw error; return null; }
}
