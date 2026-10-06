import type {BundleProposal, SolutionBundle} from './home-solution-bundles';

const normalized = (text: string) => text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');

/** Exact activity/owner/sequence comparison, not a semantic diversity or effectiveness score. */
function activitySignature(bundle: SolutionBundle) {
 const nodes = new Map(bundle.components.map(component => [component.id, JSON.stringify([
  component.domain, normalized(component.firstStep), normalized(component.ownerRole),
 ])]));
 const edges = bundle.components.flatMap(component => component.dependsOn.map(parent =>
  JSON.stringify([nodes.get(component.id), nodes.get(parent)]),
 ));
 return JSON.stringify([[...nodes.values()].sort(), edges.sort()]);
}

/** Use only at fresh-response boundaries; saved proposals must remain readable unchanged. */
export function hasDuplicatePlanActivities(proposal: BundleProposal) {
 const seen = new Set<string>();
 for (const bundle of proposal.bundles) {
  const signature = activitySignature(bundle);
  if (seen.has(signature)) return true;
  seen.add(signature);
 }
 return false;
}
