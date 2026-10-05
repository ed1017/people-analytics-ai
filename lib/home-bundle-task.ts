// @ts-expect-error Native Node tests share TypeScript source.
import {planningStatements} from './home-planning-intent.ts';
/** Select the requested task from the existing user-authored goal envelope; adds no model inputs. */
export type HomeBundleTask='delivery'|'diagnostic';
export function homeBundleTask(context:unknown):HomeBundleTask{
 const statements=planningStatements(context),goal=statements[0]??'';
 const outcome=/\b(?:reduce|lower|decrease|improve|increase|retain|implement|launch)\b/i.test(goal)||statements.some(text=>/\b(?:reduce|lower|decrease)\s+(?:(?:regrettable|employee|voluntary|company-wide|annualized|annualised|YTD)\s+)*turnover\b|\b(?:propose|develop|create)\b[^.!?]{0,60}\b(?:interventions|action plans?|delivery)\b/i.test(text));
 return outcome?'delivery':'diagnostic';
}
export function homeBundleTaskInstructions(context:unknown):string{
 const outcome=homeBundleTask(context)==='delivery';
 if(!outcome)return 'REQUESTED TASK: Follow the stated goal stage. A diagnostic or investigation request can receive analysis; do not imply operational implementation.';
 return 'REQUESTED TASK: Propose practical interventions for the user\'s outcome goal, not another catalogue of investigations. Classify each component activity as delivery (introducing, running or changing a concrete practice, process or programme) or diagnostic (analysis, review or evaluation). The firstStep of a delivery component must describe the proposed change and who would receive it, not only preparation or a decision about whether to pilot later. Each returned bundle must specify at least one concrete practice, process or programme the proposed owner would introduce, run or change as a reviewed pilot. Segmentation, signal triangulation, feedback analysis, hypothesis testing and capability/mobility reviews alone do not fulfill this task. Use them only to support a specified delivery action. Choose only relevant methods; do not force a method mix or three options. Existing evidence establishes context for proposing an unproven action; it need not prove the intervention\'s effect or already describe the action. Label actions as proposals requiring review and effects as unproven. Preserve user constraints; unknown feasibility, costs or timing remain unknown. Before returning, check each bundle for an actual proposed delivery activity. If none can responsibly be proposed, return no bundle and explain the missing information rather than relabeling diagnostics as interventions.';
}
