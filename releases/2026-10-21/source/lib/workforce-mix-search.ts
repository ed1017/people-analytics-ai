/** Node facade; browser and worker use the same pure search core. */
import {createHash} from "node:crypto";
// @ts-expect-error Native Node tests share TypeScript.
import {canonical, prepareWorkforceMixSource, preflightWorkforceMixes, evaluateWorkforceMixes, workforceSearchMethodVersion, workforceSearchCalculator, type MixBinding, type WorkforceMixSearch} from "./workforce-mix-search-core.ts";
import type {WorkforceSolution} from "./workforce-solution";
// @ts-expect-error Native Node tests share TypeScript.
export {workforceMixSearchLimits, type WorkforceMixSearchSpec, type WorkforceMixCandidate, type WorkforceMixSearch} from "./workforce-mix-search-core.ts";
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export function searchWorkforceMixes(solution: WorkforceSolution, evidenceResultId: string, rawSpec: unknown) {
 const source = prepareWorkforceMixSource(solution, evidenceResultId), {spec} = preflightWorkforceMixes(Number(source.input.roles), rawSpec);
 const binding = {...source.identity, ...Object.fromEntries(Object.entries(source.parts).map(([key,value]) => [key,hash(value)]))} as MixBinding;
 return evaluateWorkforceMixes(source, binding, spec, hash({binding,spec,methodVersion:workforceSearchMethodVersion,calculator:workforceSearchCalculator}));
}
export function workforceMixSearchIsCurrent(solution: WorkforceSolution, search: Pick<WorkforceMixSearch,"binding">): boolean {
 try {
  const source = prepareWorkforceMixSource(solution, search.binding.evidenceResultId);
  const binding = {...source.identity,...Object.fromEntries(Object.entries(source.parts).map(([key,value])=>[key,hash(value)]))};
  return canonical(binding) === canonical(search.binding);
 } catch {return false}
}
