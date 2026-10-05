// Real React/store integration fixture. Never imported by the product.
import {createRoot} from 'react-dom/client';
import {HomeBundlePlans, type BundleSession} from '../../components/home-bundle-plans';
import {decisionStore, useDecisionStorage} from '../../components/decision-store';
import {useGoalWorkspace} from '../../components/use-goal-workspace';
import {applicationFixture} from './action-plan-application.mjs';
import {encodeDecisions, DECISIONS_STORAGE_KEY} from '../../lib/local-decisions';
import {actionBindingKey} from '../../lib/home-action-drafts';
import type {BundleDraft} from '../../lib/home-bundle-reconciliation';
import type {DevelopmentSession} from '../../components/development-workspace';
const context = applicationFixture(), id = context.binding.goalId;
const seed = {version: 1 as const, revision: 12, goals: {version: 1 as const, activeId: id, goals: [{id, statement: context.binding.goal}]},
  workspaces: {[id]: {savedAt: '2026-10-05T12:00:00Z', fields: {homeSolutionBundlesV1: context.workspace, development: context.destination.development,
    workforceSolution: context.destination.workforceSolution, selectedPlanningScenario: 'Baseline'}}}};
if (!localStorage.getItem(DECISIONS_STORAGE_KEY)) localStorage.setItem(DECISIONS_STORAGE_KEY, encodeDecisions(seed));
let failWrite = false, writes = 0;
decisionStore.initialize({getItem: key => localStorage.getItem(key), setItem: (key, value) => {
  if (failWrite) throw Error('Fixture quota exceeded'); writes++; localStorage.setItem(key, value);
}, removeItem: key => localStorage.removeItem(key)});
const cache = new Map<string, BundleSession>([[actionBindingKey(context.binding), {drafts: {A: context.currentDraft as BundleDraft}, results: {A: context.workspace.attachments[0].result}}]]);
const initialDevelopment = () => context.destination.development as DevelopmentSession;
function Harness() {
  const storage = useDecisionStorage();
  const [development] = useGoalWorkspace('0:' + id, ['0:' + id], initialDevelopment, 'development');
  return <><output id="participants">{development.options[0].inputs.participants || 'Unknown'}</output><output id="saved">{String(storage.saved)}</output>
    <HomeBundlePlans proposal={{version: 1, goal: context.binding.goal, bundles: [context.currentDraft.bundle], question: null, unavailableReason: null}}
      binding={context.binding} preparedAt="2026-10-05T12:00:00Z" contextCurrent disabled={false} isCurrent={() => true} cache={cache} onDiscuss={() => {}}/>
  </>;
}
declare global {interface Window {applicationFixture: {snapshot: () => unknown; fail: () => void; writes: () => number; editDestination: () => void}}}
window.applicationFixture = {snapshot: () => decisionStore.getSnapshot().data, fail: () => {failWrite = true;}, writes: () => writes,
  editDestination: () => decisionStore.setField(id, 'development', {...context.destination.development, goal: context.binding.goal + ' edited'})};
createRoot(document.getElementById('root')!).render(<Harness/>);
