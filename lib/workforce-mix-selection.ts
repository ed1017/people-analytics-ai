// Node facade for the shared selection contract.
// @ts-expect-error Native Node tests share TypeScript.
import {searchWorkforceMixes} from "./workforce-mix-search.ts";
// @ts-expect-error Native Node tests share TypeScript.
import {validateSelectionRequest,selectionFromReplay,type WorkforceSelectionContext,type StagedWorkforceMixSelection} from "./workforce-mix-selection-core.ts";
// @ts-expect-error Native Node tests share TypeScript.
import {canonical} from "./workforce-mix-search-core.ts";
// @ts-expect-error Native Node tests share TypeScript.
import {previewWorkforceAlternatives} from "./workforce-planning-agent.ts";
export type {WorkforceSelectionContext,StagedWorkforceMixSelection} from "./workforce-mix-selection-core.ts";
export function stageWorkforceMixSelection(context: WorkforceSelectionContext, snapshot: unknown, ids: string[]) {
 const {solution,supplied}=validateSelectionRequest(context,snapshot,ids);
 return selectionFromReplay(context,snapshot,ids,searchWorkforceMixes(solution,context.evidenceResultId,supplied.spec));
}
export function previewSelectedWorkforceMixes(context: WorkforceSelectionContext,snapshot: unknown,proposal: unknown,id: string,createdAt: string) {
 const checked=stageWorkforceMixSelection(context,snapshot,(proposal as StagedWorkforceMixSelection)?.selectedIds);
 if(canonical(checked)!==canonical(proposal))throw Error("Staged inputs were modified; select again.");
 return previewWorkforceAlternatives(context.solution,context.evidenceResultId,checked.revisions,id,createdAt);
}
