"use client";
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {decisionStore, useDecisionStorage} from '@/components/decision-store';
import {DECISIONS_STORAGE_KEY} from '@/lib/local-decisions';
import {actionPlanApplicationSource, actionPlanDevelopmentScopeKey, actionPlanQuoteKey, previewActionPlanApplication,
  type ApplicationContext, type ApplicationChoices, type ApplicationPreview} from '@/lib/action-plan-application-preview';
import {applyActionPlanPreview, currentApplicationContext, readApplicationHistory, applicationHistoryField} from '@/lib/action-plan-application';
import {readBundleWorkspace} from '@/lib/home-bundle-records';
import {bundleInputKey, type BundleDraft} from '@/lib/home-bundle-reconciliation';
import {readWorkforceSolution, currentSolutionVersion} from '@/lib/workforce-solution';
import {workforceInputGroups} from '@/lib/workforce-guided-intake';
import type {ActionBinding} from '@/lib/home-action-drafts';
import type {DevelopmentSession} from '@/components/development-workspace';

const button = 'min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
const control = 'min-h-11 w-full rounded border bg-background p-2 text-sm';
const labels: Record<string, string> = {goal: 'Development goal', selected: 'Selected quote', quote: 'Provider and quote', participants: 'Participants',
  sessions: 'Sessions per participant', hours: 'Hours per participant per session', fee: 'Fee per unit per session', additionalFees: 'Additional fees', hourlyCost: 'Loaded hourly cost',
  goalStatement: 'Workforce goal', selectedPlanningScenario: 'Catalogue scenario', headcount: 'Source headcount',
  ...Object.fromEntries(workforceInputGroups.flatMap(([, , fields]) => fields))};
const labelFor = (path: string) => labels[path.split('.').at(-1)!] ?? path;
const display = (value: unknown): string => value === null || value === '' ? 'Unknown' : typeof value === 'object' && value && 'provider' in value ?
  `${value.provider} · ${'currency' in value ? value.currency : ''} · ${'provenance' in value ? value.provenance : ''}` : String(value);
type Props = {binding: ActionBinding; draft: BundleDraft; attachmentId: string; disabled: boolean; isCurrent: () => boolean};

export function HomeActionPlanApplication(props: Props) {
  const storage = useDecisionStorage(), fields = storage.data.workspaces[props.binding.goalId]?.fields ?? {};
  const history = readApplicationHistory(fields[applicationHistoryField]);
  const last = history?.receipts.findLast(item => item.binding.attachmentId === props.attachmentId);
  // A store/draft transition remounts all explicit reviews and choices. An old
  // confirmation can never be silently rebound to newly rendered destinations.
  const key = JSON.stringify([props.attachmentId, bundleInputKey(props.draft), props.binding, storage.data.revision]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {if (event.key === null || event.key === DECISIONS_STORAGE_KEY) decisionStore.invalidateExternalChange();};
    window.addEventListener('storage', changed); return () => window.removeEventListener('storage', changed);
  }, []);
  return <section aria-label="Apply Action Plan locally" className="space-y-3 rounded border p-3">
    {last && <p role="status">Applied {last.changes.length} selected fields locally · saved revision {last.destinationRevisionAfter}. Previous inputs and results are retained. Calculate explicitly when ready.</p>}
    {!history && <p role="alert">Application history cannot be verified. Existing work is kept; applying is blocked.</p>}
    <ApplicationReview key={key} {...props} disabled={props.disabled || !history || !storage.saved}/>
    {!!history?.receipts.length && <details><summary className="min-h-11 cursor-pointer py-2">Application history ({history.receipts.length})</summary>
      {history.receipts.map(receipt => <div key={receipt.id} className="my-2 border-t pt-2 text-xs">
        <p>Action Plan revision {receipt.binding.revision} · {receipt.appliedAt} · saved revision {receipt.destinationRevisionAfter}</p>
        {receipt.changes.map(change => <p key={change.destination}>{labelFor(change.destination)}: {display(change.current)} → {display(change.after)}. {change.provenance.map(item => `${item.kind}: ${item.basis ?? ''}`).join(' ')}</p>)}
        <p>{receipt.skipped.length} fields retained or unavailable. {receipt.workforce ? `Workforce versions ${receipt.workforce.beforeVersion} and ${receipt.workforce.afterVersion} retained.` : ''}</p>
      </div>)}
    </details>}
  </section>;
}

function ApplicationReview(props: Props) {
  const storage = useDecisionStorage(), fields = storage.data.workspaces[props.binding.goalId]?.fields ?? {};
  const development = fields.development as DevelopmentSession | undefined;
  const solution = readWorkforceSolution(fields.workforceSolution);
  const [open, setOpen] = useState(false), [componentId, setComponentId] = useState(''), [optionIndex, setOptionIndex] = useState('');
  const [quoteReviewed, setQuoteReviewed] = useState(false), [hourlyReviewed, setHourlyReviewed] = useState(false), [capacityReviewed, setCapacityReviewed] = useState(false);
  const [choices, setChoices] = useState<ApplicationChoices>({}), [preview, setPreview] = useState<{selection: string; value: ApplicationPreview} | null>(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const live = useRef(props), mounted = useRef(true), pending = useRef(false);
  useLayoutEffect(() => {live.current = props;});
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const selection = JSON.stringify([componentId, optionIndex, quoteReviewed, hourlyReviewed, capacityReviewed, choices]);
  const validPreview = preview?.selection === selection ? preview.value : null;
  function guard() {return mounted.current && !live.current.disabled && live.current.isCurrent() && decisionStore.getSnapshot().saved;}
  function context(): ApplicationContext {
    const current = live.current, snapshot = decisionStore.getSnapshot(), saved = snapshot.data.workspaces[current.binding.goalId]?.fields ?? {};
    const workspace = readBundleWorkspace(saved.homeSolutionBundlesV1, current.binding.goalId), attachment = workspace?.attachments.find(item => item.id === current.attachmentId);
    if (!attachment) throw Error('Attached Action Plan changed; review again.');
    const source = actionPlanApplicationSource(attachment), session = saved.development as DevelopmentSession | undefined;
    const option = optionIndex !== '' ? session?.options?.[Number(optionIndex)] : null, workforce = readWorkforceSolution(saved.workforceSolution);
    return currentApplicationContext(decisionStore, {binding: current.binding, workspace, attachmentId: current.attachmentId, currentDraft: current.draft,
      destination: {goalId: current.binding.goalId, revision: snapshot.data.revision, development: null, workforceSolution: null, selectedPlanningScenario: null, headcount: null},
      developmentTarget: componentId && optionIndex !== '' ? {componentId, optionIndex: Number(optionIndex), quoteReview: quoteReviewed && option ? {
        source, componentId, optionIndex: Number(optionIndex), quoteKey: actionPlanQuoteKey(option.quote), scopeKey: actionPlanDevelopmentScopeKey(current.draft),
        confirmedCompatible: true, loadedHourlyCostCompatible: hourlyReviewed} : null} : null,
      capacityReview: capacityReviewed && workforce ? {source, solutionId: workforce.id, version: currentSolutionVersion(workforce).version, confirmedAdditionalCapacity: true} : null,
    });
  }
  async function buildPreview() {
    if (pending.current || !guard()) return;
    pending.current = true; setBusy(true); setNotice(''); setPreview(null);
    try {const value = await previewActionPlanApplication(context(), choices); if (guard()) setPreview({selection, value});}
    catch (error) {if (mounted.current) setNotice((error as Error).message);}
    finally {pending.current = false; if (mounted.current) setBusy(false);}
  }
  async function apply() {
    if (pending.current || !guard() || !validPreview) return;
    pending.current = true; setBusy(true); setNotice('');
    try {await applyActionPlanPreview(decisionStore, validPreview, choices, context, guard, crypto.randomUUID(), new Date().toISOString());}
    catch (error) {if (mounted.current) {setNotice((error as Error).message); setPreview(null);}}
    finally {pending.current = false; if (mounted.current) setBusy(false);}
  }
  const primaryRows = preview?.value.rows.filter(row => (choices[row.destination] ?? 'preserve') !== 'preserve' ||
    row.proposed !== null && row.status !== 'read-only' && row.status !== 'blocked' && JSON.stringify(row.current) !== JSON.stringify(row.proposed)) ?? [];
  const otherRows = preview?.value.rows.filter(row => !primaryRows.includes(row)) ?? [];
  const renderRow = (row: ApplicationPreview['rows'][number]) => {
    const choice = choices[row.destination] ?? 'preserve', unavailable = row.status === 'read-only' || row.proposed === null;
    return <div key={row.destination} className="grid gap-2 border-b py-2 sm:grid-cols-[1fr_9rem]">
      <div className="min-w-0 break-words text-xs"><strong>{labelFor(row.destination)}</strong><p>{display(row.current)} → {display(row.proposed)}</p><p className="text-muted-foreground">{row.unit} · {row.status}{row.conflict ? ' · existing value differs' : ''}</p>
        {row.reason && <p>{row.reason}</p>}{row.provenance.length > 0 && <details><summary className="cursor-pointer py-1">Provenance</summary>{row.provenance.map((item, index) => <p key={index}>{item.kind}: {item.basis ?? 'Exact attached goal'}</p>)}</details>}
      </div>
      <label className="text-xs">Choice<select aria-label={`${labelFor(row.destination)} application choice`} className={control} disabled={busy || props.disabled || unavailable && choice === 'preserve'} value={choice} onChange={event => setChoices(previous => ({...previous, [row.destination]: event.target.value as ApplicationChoices[string]}))}>
        <option value="preserve">Preserve</option><option value="fill-empty" disabled={unavailable}>Fill empty</option><option value="replace" disabled={unavailable}>Replace</option>
      </select></label>
    </div>;
  };
  return <>
    <button className={button} disabled={props.disabled || busy} onClick={() => setOpen(value => !value)}>{open ? 'Close application preview' : 'Preview application'}</button>
    {open && <div className="space-y-3">
      <p className="text-xs">Prepopulate this goal’s existing local planning fields. Every field starts at Preserve. Select changes, review the preview, then apply explicitly.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Action Plan component<select aria-label="Action Plan component" className={control} disabled={busy || props.disabled} value={componentId} onChange={event => {setComponentId(event.target.value); setQuoteReviewed(false); setHourlyReviewed(false); setChoices({});}}><option value="">Choose a component</option>{props.draft.bundle.components.filter(item => ['learning', 'manager_workload'].includes(item.domain)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm">Existing Development option<select aria-label="Existing Development option" className={control} disabled={busy || props.disabled} value={optionIndex} onChange={event => {setOptionIndex(event.target.value); setQuoteReviewed(false); setHourlyReviewed(false); setChoices({});}}><option value="">Choose an option</option>{Array.isArray(development?.options) && development.options.map((option, index) => <option key={index} value={index}>Option {index + 1}: {option.quote.provider}</option>)}</select></label>
      </div>
      {!development?.options?.length && <p className="text-xs">No Development option exists yet. Carry a selected quote from Training &amp; Coaching to Development Planning first.</p>}
      {componentId && optionIndex !== '' && <div className="space-y-2 text-xs">
        <label className="flex gap-2"><input type="checkbox" disabled={busy || props.disabled} checked={quoteReviewed} onChange={event => setQuoteReviewed(event.target.checked)}/>I reviewed the currently selected quote for this component, population and horizon, including currency and fee basis.</label>
        <label className="flex gap-2"><input type="checkbox" disabled={busy || props.disabled || !quoteReviewed} checked={hourlyReviewed} onChange={event => setHourlyReviewed(event.target.checked)}/>The loaded hourly rate applies to the same employee population in USD per hour.</label>
      </div>}
      {solution && props.draft.inputs.capacity ? <label className="flex gap-2 text-xs"><input type="checkbox" disabled={busy || props.disabled} checked={capacityReviewed} onChange={event => setCapacityReviewed(event.target.checked)}/>I reviewed these additional-capacity assumptions for workforce plan version {currentSolutionVersion(solution).version}, with the same goal and scope.</label> : <p className="text-xs">Capacity mapping needs an existing local workforce plan and explicit capacity assumptions in this Action Plan.</p>}
      <button className={button} disabled={busy || props.disabled} onClick={() => void buildPreview()}>{busy ? 'Checking…' : preview ? 'Update application preview' : 'Build application preview'}</button>
      {preview && <>
        {!validPreview && <p role="status" className="text-xs">Selections changed. Update the preview before applying.</p>}
        <div className="space-y-2 rounded border p-2" aria-label="Application field preview">
          <div className="max-h-[32rem] space-y-2 overflow-y-auto">{primaryRows.map(renderRow)}</div>
          {otherRows.length > 0 && <details><summary className="min-h-11 cursor-pointer py-2 text-xs">Unchanged fields and limitations ({otherRows.length})</summary>{otherRows.map(renderRow)}</details>}
        </div>
        {preview.value.blockers.map(message => <p key={message} role="alert" className="text-xs">{message}</p>)}
        <p className="text-xs">{validPreview?.selectedChanges.length ?? 0} selected changes. Other fields stay unchanged. Prior inputs and results are retained; no calculation or vendor action runs.</p>
        {validPreview && <ul className="space-y-1 text-xs" aria-label="Selected application changes">{validPreview.rows.filter(row => row.status === 'fill' || row.status === 'replace').map(row => <li key={row.destination}><strong>{labelFor(row.destination)}:</strong> {display(row.current)} → {display(row.after)} · {[...new Set(row.provenance.map(item => item.kind))].join(', ')}</li>)}</ul>}
        <button className={button} disabled={busy || props.disabled || !validPreview || !validPreview.selectedChanges.length || !!validPreview.blockers.length} onClick={() => void apply()}>Apply selected fields</button>
      </>}
      <p className="text-xs text-muted-foreground">Source data and catalogue scenarios stay read-only. Storage changes detected in another tab require reload. Checks are optimistic; simultaneous cross-tab edits cannot be strictly serialized.</p>
    </div>}
    {(notice || storage.notice) && <p role="alert" className="text-xs">{notice || storage.notice}</p>}
  </>;
}
